import { compare } from "../lib/date";

export interface IPullRequestDates {
  creationDate: Date;
  closedDate?: Date;
}

/**
 * Active PRs are ordered by creation. Completed and abandoned PRs are ordered
 * by the event that put them into their current tab.
 */
export function getPullRequestActivityDate(
  pullRequest: IPullRequestDates,
  isActive: boolean
): Date {
  return !isActive && pullRequest.closedDate
    ? pullRequest.closedDate
    : pullRequest.creationDate;
}

export function comparePullRequestActivityDates(
  a: IPullRequestDates,
  aIsActive: boolean,
  b: IPullRequestDates,
  bIsActive: boolean
): number {
  return compare(
    getPullRequestActivityDate(b, bIsActive),
    getPullRequestActivityDate(a, aIsActive)
  );
}
