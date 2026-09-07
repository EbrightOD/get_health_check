import nodemailer from "nodemailer";
import type { RepoHealth } from "../types.js";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  to: string;
}

export function loadEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.ALERT_EMAIL_TO;

  if (!host || !port || !user || !pass || !to) return null;

  return {
    host,
    port: Number(port),
    secure: process.env.SMTP_SECURE !== "false",
    user,
    pass,
    to,
  };
}

export async function sendFailureAlert(config: EmailConfig, failing: RepoHealth[]): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  const lines = failing.map((repo) => {
    const notes = repo.notes.length ? repo.notes.join("; ") : repo.error ?? "";
    return `- ${repo.name} (${repo.url})\n  ${notes}`;
  });

  const subject = `[Repo Health Check] ${failing.length} repo(s) failing`;
  const text = `The following repos are failing health checks:\n\n${lines.join("\n\n")}\n`;

  await transporter.sendMail({
    from: `"Repo Health Check" <${config.user}>`,
    to: config.to,
    subject,
    text,
  });
}
