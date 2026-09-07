import type { ActivityHealth, RepoSummary } from "../types.js";

export function checkActivity(repo: RepoSummary): ActivityHealth {
  const lastPushedAt = repo.pushedAt;
  const daysSinceLastPush = lastPushedAt
    ? Math.floor((Date.now() - new Date(lastPushedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    defaultBranch: repo.defaultBranch,
    lastPushedAt,
    daysSinceLastPush,
  };
}
