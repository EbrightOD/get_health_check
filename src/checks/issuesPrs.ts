import type { Octokit } from "@octokit/rest";
import type { IssuesPrHealth } from "../types.js";

export async function checkIssuesPrs(
  octokit: Octokit,
  owner: string,
  repo: string,
  totalOpenIssuesAndPrs: number
): Promise<IssuesPrHealth> {
  const { data: openPrs } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    per_page: 100,
    sort: "created",
    direction: "asc",
  });

  const oldestOpenPrDays = openPrs[0]
    ? Math.floor((Date.now() - new Date(openPrs[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    openIssueCount: Math.max(totalOpenIssuesAndPrs - openPrs.length, 0),
    openPrCount: openPrs.length,
    oldestOpenPrDays,
  };
}
