import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import Table from "cli-table3";
import type { RepoHealth, Status } from "./types.js";

export function computeStatus(repo: Omit<RepoHealth, "status" | "notes">): {
  status: Status;
  notes: string[];
} {
  const notes: string[] = [];
  let status: Status = "green";

  const bump = (next: Status, note: string) => {
    notes.push(note);
    if (next === "red" || status === "green") status = next;
  };

  if (repo.ci.latestConclusion === "failure") {
    bump("red", "Latest CI run failed");
  }

  if ((repo.activity.daysSinceLastPush ?? 0) > 365) {
    bump("red", `No push in ${repo.activity.daysSinceLastPush} days`);
  } else if ((repo.activity.daysSinceLastPush ?? 0) > 90) {
    bump("yellow", `No push in ${repo.activity.daysSinceLastPush} days`);
  }

  if ((repo.security.dependabotAlertCount ?? 0) > 5) {
    bump("red", `${repo.security.dependabotAlertCount} open Dependabot alerts`);
  } else if ((repo.security.dependabotAlertCount ?? 0) > 0) {
    bump("yellow", `${repo.security.dependabotAlertCount} open Dependabot alerts`);
  }

  if (repo.security.vulnerabilityAlertsEnabled === false) {
    bump("yellow", "Dependency vulnerability alerts disabled");
  }

  if ((repo.issuesPrs.oldestOpenPrDays ?? 0) > 30) {
    bump("yellow", `Oldest open PR is ${repo.issuesPrs.oldestOpenPrDays} days old`);
  }

  if (repo.issuesPrs.openPrCount > 10) {
    bump("yellow", `${repo.issuesPrs.openPrCount} open PRs`);
  }

  if (repo.archived) {
    notes.push("Repository is archived");
  }

  return { status, notes };
}

function statusLabel(status: Status): string {
  if (status === "green") return chalk.bgGreen.black(" OK ");
  if (status === "yellow") return chalk.bgYellow.black(" WARN ");
  return chalk.bgRed.white(" FAIL ");
}

export function printReport(repos: RepoHealth[]): void {
  const table = new Table({
    head: ["Status", "Repo", "Last push", "CI", "Open PRs", "Issues", "Dependabot", "Notes"],
    wordWrap: true,
    colWidths: [8, 30, 12, 10, 10, 8, 12, 40],
  });

  for (const repo of repos) {
    if (repo.error) {
      table.push([statusLabel("red"), repo.name, "-", "-", "-", "-", "-", repo.error]);
      continue;
    }

    table.push([
      statusLabel(repo.status),
      repo.name,
      repo.activity.daysSinceLastPush !== null ? `${repo.activity.daysSinceLastPush}d ago` : "n/a",
      repo.ci.hasWorkflows ? repo.ci.latestConclusion ?? repo.ci.latestStatus ?? "pending" : "none",
      String(repo.issuesPrs.openPrCount),
      String(repo.issuesPrs.openIssueCount),
      repo.security.dependabotAlertsAccessible
        ? String(repo.security.dependabotAlertCount ?? 0)
        : "n/a",
      repo.notes.join("; ") || "-",
    ]);
  }

  console.log(table.toString());

  const summary = {
    green: repos.filter((r) => r.status === "green").length,
    yellow: repos.filter((r) => r.status === "yellow").length,
    red: repos.filter((r) => r.status === "red").length,
  };
  console.log(
    `\n${chalk.green(`${summary.green} healthy`)}  ${chalk.yellow(`${summary.yellow} warning`)}  ${chalk.red(`${summary.red} failing`)}  (${repos.length} total)`
  );
}

function statusText(status: Status): string {
  if (status === "green") return "OK";
  if (status === "yellow") return "WARN";
  return "FAIL";
}

export function writeMarkdownReport(repos: RepoHealth[], outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(outDir, `health-report-${timestamp}.md`);

  const summary = {
    green: repos.filter((r) => r.status === "green").length,
    yellow: repos.filter((r) => r.status === "yellow").length,
    red: repos.filter((r) => r.status === "red").length,
  };

  const lines: string[] = [];
  lines.push("# Repo Health Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(
    `**${summary.green} healthy** &nbsp;|&nbsp; **${summary.yellow} warning** &nbsp;|&nbsp; **${summary.red} failing** &nbsp;|&nbsp; ${repos.length} total`
  );
  lines.push("");
  lines.push("| Status | Repo | Last push | CI | Open PRs | Issues | Dependabot | Notes |");
  lines.push("|---|---|---|---|---|---|---|---|");

  for (const repo of repos) {
    if (repo.error) {
      lines.push(`| FAIL | ${repo.name} | - | - | - | - | - | ${repo.error} |`);
      continue;
    }

    const lastPush =
      repo.activity.daysSinceLastPush !== null ? `${repo.activity.daysSinceLastPush}d ago` : "n/a";
    const ci = repo.ci.hasWorkflows ? repo.ci.latestConclusion ?? repo.ci.latestStatus ?? "pending" : "none";
    const dependabot = repo.security.dependabotAlertsAccessible
      ? String(repo.security.dependabotAlertCount ?? 0)
      : "n/a";
    const notes = repo.notes.join("; ") || "-";

    lines.push(
      `| ${statusText(repo.status)} | [${repo.name}](${repo.url}) | ${lastPush} | ${ci} | ${repo.issuesPrs.openPrCount} | ${repo.issuesPrs.openIssueCount} | ${dependabot} | ${notes} |`
    );
  }

  fs.writeFileSync(filePath, lines.join("\n") + "\n");
  return filePath;
}
