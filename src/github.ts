import { Octokit } from "@octokit/rest";
import type { RepoSummary } from "./types.js";

export function createClient(token: string): Octokit {
  // Expected 404/403s (vulnerability alerts disabled, Dependabot inaccessible)
  // are already handled and reflected in the report — silence the built-in
  // per-request warning log so the CLI output stays readable.
  return new Octokit({ auth: token, log: { debug() {}, info() {}, warn() {}, error: console.error } });
}

interface RawRepo {
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string } | null;
  private: boolean;
  archived?: boolean | null;
  default_branch?: string | null;
  pushed_at?: string | null;
  open_issues_count?: number | null;
}

function toSummary(repo: RawRepo, fallbackOwner: string): RepoSummary {
  return {
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    owner: repo.owner?.login ?? fallbackOwner,
    private: repo.private,
    archived: repo.archived ?? false,
    defaultBranch: repo.default_branch ?? "main",
    pushedAt: repo.pushed_at ?? null,
    openIssueAndPrCount: repo.open_issues_count ?? 0,
  };
}

export async function listOrgRepos(octokit: Octokit, org: string): Promise<RepoSummary[]> {
  try {
    const repos = await octokit.paginate(octokit.repos.listForOrg, {
      org,
      per_page: 100,
      type: "all",
    });
    return repos.map((r) => toSummary(r, org));
  } catch {
    // `org` isn't a GitHub organization. If the token belongs to that same
    // user account, use the authenticated-user endpoint so private repos are
    // included too — /users/{username}/repos only ever returns public ones.
    const { data: me } = await octokit.users.getAuthenticated();
    if (me.login.toLowerCase() === org.toLowerCase()) {
      const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
        per_page: 100,
        visibility: "all",
        affiliation: "owner",
      });
      return repos.map((r) => toSummary(r, org));
    }

    const repos = await octokit.paginate(octokit.repos.listForUser, {
      username: org,
      per_page: 100,
      type: "all",
    });
    return repos.map((r) => toSummary(r, org));
  }
}
