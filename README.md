# get_health_check

On-demand CLI tool that checks the health of every repository in the **EbrightOD** GitHub org.

For each repo it reports:

- **Activity** — last push date, days since last push
- **CI** — latest GitHub Actions run status on the default branch
- **Issues & PRs** — open issue/PR counts, age of the oldest open PR
- **Security** — dependency vulnerability alert status, open Dependabot alert count

Each repo gets an overall status: `OK` (green), `WARN` (yellow), or `FAIL` (red), based on thresholds in [src/report.ts](src/report.ts).

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `GITHUB_TOKEN` — a personal access token with `repo` scope (add `security_events` too if you want Dependabot alert counts for private repos)
- `GITHUB_ORG` — defaults to `EbrightOD`
- `SMTP_USER` / `SMTP_PASS` / `ALERT_EMAIL_TO` — optional, only needed for email alerts (see below). `SMTP_PASS` is a Gmail App Password for the `SMTP_USER` account (Google Account → Security → App Passwords, requires 2FA enabled)

## Notifications

If any repo comes back with a `FAIL` status, the CLI sends a summary of the failing repos through whichever channels are configured in `.env`:

- **Email** — set `SMTP_USER`/`SMTP_PASS`/`ALERT_EMAIL_TO`
- **Telegram** — set `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (create a bot via [@BotFather](https://t.me/BotFather), message it once, then read your chat ID from `https://api.telegram.org/bot<TOKEN>/getUpdates`)

Both are optional and independent — configure either, both, or neither. If neither is set, failures are just noted in the console output.

## Usage

```bash
npm run check
```

This prints a summary table to the console and writes the same report as Markdown to `reports/health-report-<timestamp>.md` (git-ignored).

This is a manual, on-demand script only — no scheduled job is configured.
