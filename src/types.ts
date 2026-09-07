export type Status = "green" | "yellow" | "red";

export interface RepoSummary {
  name: string;
  fullName: string;
  htmlUrl: string;
  owner: string;
  private: boolean;
  archived: boolean;
  defaultBranch: string;
  pushedAt: string | null;
  openIssueAndPrCount: number;
}

export interface ActivityHealth {
  defaultBranch: string;
  lastPushedAt: string | null;
  daysSinceLastPush: number | null;
}

export interface CiHealth {
  hasWorkflows: boolean;
  latestStatus: string | null;
  latestConclusion: string | null;
  runUrl: string | null;
}

export interface IssuesPrHealth {
  openIssueCount: number;
  openPrCount: number;
  oldestOpenPrDays: number | null;
}

export interface SecurityHealth {
  vulnerabilityAlertsEnabled: boolean | null;
  dependabotAlertCount: number | null;
  dependabotAlertsAccessible: boolean;
}

export interface RepoHealth {
  name: string;
  fullName: string;
  url: string;
  private: boolean;
  archived: boolean;
  activity: ActivityHealth;
  ci: CiHealth;
  issuesPrs: IssuesPrHealth;
  security: SecurityHealth;
  status: Status;
  notes: string[];
  error?: string;
}
