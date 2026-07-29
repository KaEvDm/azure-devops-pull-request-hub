const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

export function getValidDateTimestamp(
  date: Date | undefined
): number | undefined {
  if (date === undefined) {
    return undefined;
  }

  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

export function getElapsedHours(
  activityDate: Date,
  now: Date = new Date()
): number {
  return Math.max(
    0,
    Math.floor(
      (now.getTime() - activityDate.getTime()) / MILLISECONDS_PER_HOUR
    )
  );
}

export function formatHoursAgo(
  activityDate: Date,
  now: Date = new Date()
): string {
  const hours = getElapsedHours(activityDate, now);
  return hours === 0 ? "<1h ago" : `${hours}h ago`;
}
