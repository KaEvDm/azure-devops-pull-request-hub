import {
  formatHoursAgo,
  getElapsedHours,
  getValidDateTimestamp,
} from "./PullRequestAge";

export interface ILastSourceCommitDateProvider {
  getLastSourceCommitDate(): Date | undefined;
}

export function getElapsedCommitHours(
  commitDate: Date,
  now: Date = new Date()
): number {
  return getElapsedHours(commitDate, now);
}

export function formatLastCommitAge(
  commitDate: Date,
  now: Date = new Date()
): string {
  return formatHoursAgo(commitDate, now);
}

/**
 * Orders pull requests from the newest source commit to the oldest one.
 * Rows without commit metadata are kept after rows with known dates.
 */
export function comparePullRequestsByLastCommit(
  a: ILastSourceCommitDateProvider,
  b: ILastSourceCommitDateProvider
): number {
  const aTimestamp = getValidDateTimestamp(a.getLastSourceCommitDate());
  const bTimestamp = getValidDateTimestamp(b.getLastSourceCommitDate());

  if (aTimestamp === undefined) {
    return bTimestamp === undefined ? 0 : 1;
  }

  if (bTimestamp === undefined) {
    return -1;
  }

  return bTimestamp - aTimestamp;
}
