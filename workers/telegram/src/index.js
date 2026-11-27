import { Bot, webhookCallback } from "grammy";

const json = (value, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

async function telegramApi(token, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(`Telegram API ${method} failed: ${result.description || response.status}`);
  return result.result;
}

async function dispatchProduction(env, brief, chatId) {
  const urls = [...brief.matchAll(/https?:\/\/[^\s]+/g)].map((m) => m[0].replace(/[),.;]+$/, ""));
  const cleanBrief = brief.replace(/https?:\/\/[^\s]+/g, " ").replace(/\s+/g, " ").trim()
    || "Create a documentary based on the supplied reference videos.";
  if (cleanBrief.length > 60000) throw new Error("The production brief is too long (maximum 60,000 characters).");
  const response = await fetch(
    `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/render-demo.yml/dispatches`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "Michkatt-grammy-worker",
      },
      body: JSON.stringify({
        ref: env.PRODUCTION_BRANCH || "integrate/openmontage",
        inputs: {
          production_script: cleanBrief,
          reference_urls: urls.join("\n"),
          telegram_chat_id: String(chatId),
        },
      }),
    },
  );
  if (response.status !== 204) {
    const detail = await response.text();
    throw new Error(`GitHub workflow dispatch failed (HTTP ${response.status}): ${detail.slice(0, 500)}`);
  }
  return urls.length;
}

function makeBot(env) {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.command("start", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    await ctx.reply(
      "مرحباً بك في Michkatt.\n\nأرسل موضوع الوثائقي أو موجز الإنتاج، وأرفق روابط YouTube المرجعية إن وجدت.\n\nالأوامر: /help /status /whoami"
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      "أرسل رسالة واحدة تتضمن موضوع الفيديو وتعليماتك وروابط المراجع.\n\nمثال:\n/produce The Great Molasses Flood of 1919\nhttps://youtube.com/...\n\nسأحوّل الطلب إلى مسار الإنتاج. لا أرسل الفيديو إلا بعد نجاح الرندر وفحوص الجودة."
    );
  });

  bot.command("whoami", async (ctx) => {
    await ctx.reply(`Telegram user ID: ${ctx.from.id}\nأرسل هذا الرقم إلى إعدادات مسؤول البوت لإضافته إلى قائمة السماح.`);
  });

  bot.command("status", async (ctx) => {
    const allowed = Boolean(env.ALLOWED_TELEGRAM_USER_ID)
      && String(ctx.from.id) === String(env.ALLOWED_TELEGRAM_USER_ID);
    await ctx.reply(allowed
      ? "البوت يعمل عبر Webhook، وحسابك مخوّل بإرسال طلبات الإنتاج."
      : "البوت يعمل عبر Webhook ويستقبل الرسائل. إرسال طلبات الإنتاج مقفل حتى ضبط ALLOWED_TELEGRAM_USER_ID لحماية رصيد الخدمات.");
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.chat.type !== "private") return;
    const text = ctx.message.text.trim();
    if (text.startsWith("/")) {
      await ctx.reply("الأمر غير معروف. أرسل /help.");
      return;
    }
    if (!env.ALLOWED_TELEGRAM_USER_ID || String(ctx.from.id) !== String(env.ALLOWED_TELEGRAM_USER_ID)) {
      await ctx.reply("وصلت رسالتك، لكن حسابك غير مخوّل بإطلاق الإنتاج بعد. أرسل /whoami لمعرفة رقم Telegram الخاص بك.");
      return;
    }
    if (!env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) {
      await ctx.reply("البوت يستقبل الرسائل، لكن ربط GitHub لم يكتمل بعد.");
      return;
    }
    await ctx.reply("وصلني طلبك. أتحقق من إرساله إلى مسار الإنتاج...");
    try {
      const count = await dispatchProduction(env, text, ctx.chat.id);
      await ctx.reply(`تم إرسال طلب الإنتاج إلى GitHub Actions بنجاح. عدد روابط YouTube المرفقة: ${count}. سأرسل نتيجة التشغيل إلى هذه المحادثة عند اكتمال مسار الإنتاج.`);
    } catch (error) {
      await ctx.reply(`تعذر إطلاق مسار الإنتاج: ${String(error.message || error).slice(0, 700)}`);
    }
  });

  return bot;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "michkatt-telegram-webhook", framework: "grammY" });
    }

    if (request.method === "POST" && url.pathname === `/setup/${env.SETUP_SECRET || "disabled"}`) {
      if (!env.SETUP_SECRET || !env.WORKER_URL || !env.TELEGRAM_WEBHOOK_SECRET) {
        return json({ ok: false, error: "Webhook setup secrets are incomplete." }, 503);
      }
      try {
        const result = await telegramApi(env.TELEGRAM_BOT_TOKEN, "setWebhook", {
          url: env.WORKER_URL,
          secret_token: env.TELEGRAM_WEBHOOK_SECRET,
          allowed_updates: ["message"],
          drop_pending_updates: false,
        });
        return json({ ok: true, webhook_set: result });
      } catch (error) {
        return json({ ok: false, error: String(error.message || error) }, 502);
      }
    }

    if (request.method !== "POST") return new Response("Not found", { status: 404 });
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false, error: "Telegram secrets are not configured." }, 503);
    }

    try {
      const bot = makeBot(env);
      const handleUpdate = webhookCallback(bot, "cloudflare-mod", {
        secretToken: env.TELEGRAM_WEBHOOK_SECRET,
      });
      return await handleUpdate(request);
    } catch (error) {
      return json({ ok: false, error: String(error.message || error) }, 500);
    }
  },
};
