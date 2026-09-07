import type { RepoHealth } from "../types.js";

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export function loadTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}

export async function sendTelegramAlert(config: TelegramConfig, failing: RepoHealth[]): Promise<void> {
  const lines = failing.map((repo) => {
    const notes = repo.notes.length ? repo.notes.join("; ") : repo.error ?? "";
    return `• ${repo.name}\n  ${notes}\n  ${repo.url}`;
  });

  const text = `⚠️ Repo Health Check: ${failing.length} repo(s) failing\n\n${lines.join("\n\n")}`;

  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: config.chatId, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
}
