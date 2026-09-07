import type { Octokit } from "@octokit/rest";
import type { CiHealth } from "../types.js";

export async function checkCi(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
): Promise<CiHealth> {
  try {
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      branch,
      per_page: 1,
    });

    const run = data.workflow_runs[0];
    if (!run) {
      return { hasWorkflows: false, latestStatus: null, latestConclusion: null, runUrl: null };
    }

    return {
      hasWorkflows: true,
      latestStatus: run.status,
      latestConclusion: run.conclusion,
      runUrl: run.html_url,
    };
  } catch {
    return { hasWorkflows: false, latestStatus: null, latestConclusion: null, runUrl: null };
  }
}
