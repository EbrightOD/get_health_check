import type { Octokit } from "@octokit/rest";
import type { SecurityHealth } from "../types.js";

export async function checkSecurity(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<SecurityHealth> {
  let vulnerabilityAlertsEnabled: boolean | null = null;
  try {
    await octokit.repos.checkVulnerabilityAlerts({ owner, repo });
    vulnerabilityAlertsEnabled = true;
  } catch (err: any) {
    vulnerabilityAlertsEnabled = err?.status === 404 ? false : null;
  }

  let dependabotAlertCount: number | null = null;
  let dependabotAlertsAccessible = true;
  try {
    const alerts = await octokit.paginate(octokit.dependabot.listAlertsForRepo, {
      owner,
      repo,
      state: "open",
      per_page: 100,
    });
    dependabotAlertCount = alerts.length;
  } catch {
    dependabotAlertsAccessible = false;
  }

  return { vulnerabilityAlertsEnabled, dependabotAlertCount, dependabotAlertsAccessible };
}
