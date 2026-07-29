const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export interface ILastSourceCommitDateProvider {
  getLastSourceCommitDate(): Date | undefined;
}

function getValidTimestamp(date: Date | undefined): number | undefined {
  if (date === undefined) {
    return undefined;
  }

  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function getElapsedCommitHours(
  commitDate: Date,
  now: Date = new Date()
): number {
  return Math.max(
    0,
    Math.floor((now.getTime() - commitDate.getTime()) / MILLISECONDS_PER_HOUR)
  );
}

export function formatLastCommitAge(
  commitDate: Date,
  now: Date = new Date()
): string {
  const hours = getElapsedCommitHours(commitDate, now);
  return hours === 0 ? "<1h ago" : `${hours}h ago`;
}

/**
 * Orders pull requests from the newest source commit to the oldest one.
 * Rows without commit metadata are kept after rows with known dates.
 */
export function comparePullRequestsByLastCommit(
  a: ILastSourceCommitDateProvider,
  b: ILastSourceCommitDateProvider
): number {
  const aTimestamp = getValidTimestamp(a.getLastSourceCommitDate());
  const bTimestamp = getValidTimestamp(b.getLastSourceCommitDate());

  if (aTimestamp === undefined) {
    return bTimestamp === undefined ? 0 : 1;
  }

  if (bTimestamp === undefined) {
    return -1;
  }

  return bTimestamp - aTimestamp;
}
