import "dotenv/config";
import chalk from "chalk";
import { createClient, listOrgRepos } from "./github.js";
import { checkActivity } from "./checks/activity.js";
import { checkCi } from "./checks/ci.js";
import { checkIssuesPrs } from "./checks/issuesPrs.js";
import { checkSecurity } from "./checks/security.js";
import { computeStatus, printReport, writeMarkdownReport } from "./report.js";
import { loadEmailConfig, sendFailureAlert } from "./notify/email.js";
import { loadTelegramConfig, sendTelegramAlert } from "./notify/telegram.js";
import type { RepoHealth } from "./types.js";

const CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG || "EbrightOD";

  if (!token) {
    console.error(chalk.red("Missing GITHUB_TOKEN. Copy .env.example to .env and fill it in."));
    process.exit(1);
  }

  const octokit = createClient(token);

  console.log(chalk.cyan(`Fetching repos for ${org}...`));
  const repos = await listOrgRepos(octokit, org);
  console.log(chalk.cyan(`Found ${repos.length} repos. Running health checks...\n`));

  const results = await mapWithConcurrency(repos, CONCURRENCY, async (repo): Promise<RepoHealth> => {
    const owner = repo.owner;
    const name = repo.name;

    try {
      const activity = checkActivity(repo);
      const [ci, issuesPrs, security] = await Promise.all([
        checkCi(octokit, owner, name, activity.defaultBranch),
        checkIssuesPrs(octokit, owner, name, repo.openIssueAndPrCount),
        checkSecurity(octokit, owner, name),
      ]);

      const partial = {
        name,
        fullName: repo.fullName,
        url: repo.htmlUrl,
        private: repo.private,
        archived: repo.archived,
        activity,
        ci,
        issuesPrs,
        security,
      };

      const { status, notes } = computeStatus(partial);
      return { ...partial, status, notes };
    } catch (err: any) {
      return {
        name,
        fullName: repo.fullName,
        url: repo.htmlUrl,
        private: repo.private,
        archived: repo.archived,
        activity: { defaultBranch: "unknown", lastPushedAt: null, daysSinceLastPush: null },
        ci: { hasWorkflows: false, latestStatus: null, latestConclusion: null, runUrl: null },
        issuesPrs: { openIssueCount: 0, openPrCount: 0, oldestOpenPrDays: null },
        security: { vulnerabilityAlertsEnabled: null, dependabotAlertCount: null, dependabotAlertsAccessible: false },
        status: "red",
        notes: [],
        error: err?.message ?? "Unknown error",
      };
    }
  });

  printReport(results);
  const reportPath = writeMarkdownReport(results, "reports");
  console.log(chalk.gray(`\nFull report written to ${reportPath}`));

  const failing = results.filter((r) => r.status === "red");
  if (failing.length > 0) {
    const emailConfig = loadEmailConfig();
    const telegramConfig = loadTelegramConfig();

    if (emailConfig) {
      try {
        await sendFailureAlert(emailConfig, failing);
        console.log(chalk.gray(`Failure alert emailed to ${emailConfig.to}`));
      } catch (err: any) {
        console.error(chalk.red("Failed to send email alert:"), err?.message ?? err);
      }
    }

    if (telegramConfig) {
      try {
        await sendTelegramAlert(telegramConfig, failing);
        console.log(chalk.gray("Failure alert sent to Telegram"));
      } catch (err: any) {
        console.error(chalk.red("Failed to send Telegram alert:"), err?.message ?? err);
      }
    }

    if (!emailConfig && !telegramConfig) {
      console.log(
        chalk.yellow(
          `${failing.length} repo(s) failing, but no notification channel is configured (see .env.example).`
        )
      );
    }
  }
}

main().catch((err) => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
