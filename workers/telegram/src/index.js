import { Bot, webhookCallback } from "grammy";

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { "content-type": "application/json; charset=utf-8" },
});

async function telegramApi(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram API ${method} failed: ${result.description || response.status}`);
  return result.result;
}

async function dispatch(env, inputs) {
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/render-demo.yml/dispatches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: "application/vnd.github+json",
      "content-type": "application/json", "x-github-api-version": "2022-11-28",
      "user-agent": "Michkatt-grammy-worker",
    },
    body: JSON.stringify({ ref: env.PRODUCTION_BRANCH || "main", inputs }),
  });
  if (response.status !== 204) throw new Error(`GitHub workflow dispatch failed (HTTP ${response.status}): ${(await response.text()).slice(0, 500)}`);
}

function makeBot(env) {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  const authorized = (ctx) => Boolean(env.ALLOWED_TELEGRAM_USER_ID) && String(ctx.from?.id) === String(env.ALLOWED_TELEGRAM_USER_ID);
  const ready = () => Boolean(env.GITHUB_TOKEN && env.GITHUB_REPOSITORY);

  bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") await ctx.reply("مرحباً بك في Michkatt.\n\nأرسل ملف ZIP الذي يحتوي على ملفات المشروع الستة، وسأشغّل خط الإنتاج الكامل: OpenMontage لاختيار الأصول، Piper للتعليق الصوتي، وRemotion للمونتاج وإنتاج MP4، ثم أرسل الفيديو هنا. لا نستخدم OpenAI API.\n\nالأوامر: /help /status /whoami");
  });
  bot.command("help", async (ctx) => {
    await ctx.reply("أرسل ملف ZIP كمستند (Document)، وليس كصورة. يجب أن يحتوي على project_brief.md وresearch_analysis.md وdocumentary_screenplay.md وdirector_blueprint.md وdirector_blueprint.json وasset_manifest.json. سأنتج الوثائقي فعلياً عبر OpenMontage وPiper وRemotion، ثم أرسل MP4 هنا. لا يتم استدعاء OpenAI API.");
  });
  bot.command("whoami", async (ctx) => ctx.reply(`Telegram user ID: ${ctx.from.id}`));
  bot.command("status", async (ctx) => ctx.reply(authorized(ctx) ? "البوت يعمل وحسابك مخوّل." : "البوت يعمل، لكن حسابك غير مخوّل بعد."));

  bot.on("message:document", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const doc = ctx.message.document;
    const filename = doc.file_name || "";
    if (!filename.toLowerCase().endsWith(".zip") || doc.mime_type && !["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(doc.mime_type)) {
      await ctx.reply("أرسل الملف بصيغة ZIP كمستند Telegram.");
      return;
    }
    if (doc.file_size && doc.file_size > 20 * 1024 * 1024) {
      await ctx.reply("حجم ZIP يتجاوز حد Telegram Bot API البالغ 20 ميغابايت.");
      return;
    }
    if (!authorized(ctx)) { await ctx.reply("وصل الملف، لكن حسابك غير مخوّل. أرسل /whoami."); return; }
    if (!ready()) { await ctx.reply("إعداد GitHub غير مكتمل في Worker."); return; }
    await ctx.reply("استلمت ملف ZIP. أبدأ الآن إنتاج الوثائقي من الحزمة المرفقة باستخدام OpenMontage وPiper وRemotion. لن أعيد كتابة السيناريو أو أستدعي OpenAI API.");
    try {
      await dispatch(env, {
        telegram_zip_file_id: doc.file_id,
        telegram_zip_name: filename.slice(0, 200),
        telegram_chat_id: String(ctx.chat.id),
      });
      await ctx.reply("تم إطلاق خط إنتاج الوثائقي على GitHub Actions. بعد اكتمال المونتاج وفحص MP4 سأرسله إلى هذه المحادثة.");
    } catch (error) {
      await ctx.reply(`تعذر إطلاق فك الضغط: ${String(error.message || error).slice(0, 600)}`);
    }
  });

  const rejectText = async (ctx) => {
    if (ctx.chat.type !== "private") return;
    await ctx.reply("لإنتاج الوثائقي، أرسل حزمة ZIP الكاملة كمستند. مسار النص المنفصل متوقف حتى لا يستخدم أي خدمة OpenAI.");
  };
  bot.command("produce", rejectText);
  bot.command("topic", rejectText);
  bot.on("message:text", async (ctx) => {
    if (!ctx.message.text.trim().startsWith("/")) return rejectText(ctx);
  });
  return bot;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "michkatt-telegram-webhook", framework: "grammY" });
    if ((request.method === "GET" || request.method === "POST") && url.pathname === `/setup/${env.SETUP_SECRET || "disabled"}`) {
      if (!env.SETUP_SECRET || !env.WORKER_URL || !env.TELEGRAM_WEBHOOK_SECRET || !env.TELEGRAM_BOT_TOKEN) return json({ ok: false, error: "Webhook setup secrets are incomplete." }, 503);
      try {
        const result = await telegramApi(env.TELEGRAM_BOT_TOKEN, "setWebhook", { url: env.WORKER_URL, secret_token: env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"], drop_pending_updates: false });
        return json({ ok: true, webhook_set: result });
      } catch (error) { return json({ ok: false, error: String(error.message || error) }, 502); }
    }
    if (request.method !== "POST") return new Response("Not found", { status: 404 });
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return json({ ok: false, error: "Telegram secrets are not configured." }, 503);
    try {
      const bot = makeBot(env);
      return await webhookCallback(bot, "cloudflare-mod", { secretToken: env.TELEGRAM_WEBHOOK_SECRET })(request);
    } catch (error) { return json({ ok: false, error: String(error.message || error) }, 500); }
  },
};
