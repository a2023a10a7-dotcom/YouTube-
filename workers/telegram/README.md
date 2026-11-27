# Michkatt Telegram webhook (grammY + Cloudflare Workers)

This replaces the scheduled GitHub Actions `getUpdates` poller with Telegram webhooks.
Do not run `getUpdates` polling while the webhook is active; Telegram does not support both modes simultaneously.

## Deploy

1. Create/sign in to a Cloudflare account and open **Workers & Pages**.
2. Connect this repository as a Worker build, set the root directory to `workers/telegram`, build command to `npm install`, and deploy command to `npm run deploy`; or deploy this folder with Wrangler after `npx wrangler login`.
3. Copy the deployed `workers.dev` URL. Set `WORKER_URL` in the Worker's variables to that exact URL.
4. Add these encrypted Worker secrets in **Settings → Variables and Secrets**:
   - `TELEGRAM_BOT_TOKEN`: the existing token already stored in GitHub Secrets.
   - `TELEGRAM_WEBHOOK_SECRET`: a random 32+ character secret (letters, numbers, underscore, hyphen).
   - `SETUP_SECRET`: another independent random secret used only for one-time webhook setup.
   - `GITHUB_TOKEN`: a GitHub fine-grained PAT scoped to this repository with **Actions: Read and write**. The Actions token inside GitHub Actions cannot be reused by Cloudflare.
5. Call the one-time setup endpoint with POST:
   `https://YOUR-WORKER-URL/setup/YOUR-SETUP-SECRET`
   It calls Telegram `setWebhook` and configures the webhook secret header.
6. Open `@Michkatt_bot` and send `/whoami`. Copy the numeric ID into the Worker's encrypted secret `ALLOWED_TELEGRAM_USER_ID`. This locks paid workflow dispatch to your account.
7. Send `/start`, then `/status`. Only after the allowed ID is configured should you send a production brief.

## Security and behavior

- Bot token, webhook secret, setup secret, GitHub PAT, and allowed Telegram user ID must be Worker secrets, never committed to Git.
- The Worker answers Telegram messages immediately and dispatches `.github/workflows/render-demo.yml` on `integrate/openmontage`.
- The production workflow still needs its own repository secrets (for example `OPENAI_API_KEY` and `PEXELS_API_KEY`) and may fail if the relevant API account has no quota.
- `/whoami`, `/help`, and `/status` are available before production authorization. Production is blocked until `ALLOWED_TELEGRAM_USER_ID` is set.
- A successful dispatch means only that GitHub accepted the job; it does not mean a video was rendered.
