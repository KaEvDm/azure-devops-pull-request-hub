import {
  comparePullRequestsByLastCommit,
  formatLastCommitAge,
  getElapsedCommitHours,
  ILastSourceCommitDateProvider,
} from "./PullRequestLastCommit";

function provider(date?: string): ILastSourceCommitDateProvider {
  return {
    getLastSourceCommitDate: () => (date ? new Date(date) : undefined),
  };
}

describe("last commit age", () => {
  const now = new Date("2026-07-29T12:00:00Z");

  it("shows elapsed time only in hours", () => {
    expect(formatLastCommitAge(new Date("2026-07-29T11:30:00Z"), now)).toBe(
      "<1h ago"
    );
    expect(formatLastCommitAge(new Date("2026-07-29T10:59:59Z"), now)).toBe(
      "1h ago"
    );
    expect(formatLastCommitAge(new Date("2026-07-27T11:00:00Z"), now)).toBe(
      "49h ago"
    );
  });

  it("clamps clock skew to zero hours", () => {
    expect(
      getElapsedCommitHours(new Date("2026-07-29T12:05:00Z"), now)
    ).toBe(0);
  });

  it("sorts known commit dates newest first and missing dates last", () => {
    const newest = provider("2026-07-29T11:00:00Z");
    const older = provider("2026-07-28T11:00:00Z");
    const missing = provider();

    expect(comparePullRequestsByLastCommit(newest, older)).toBeLessThan(0);
    expect(comparePullRequestsByLastCommit(older, newest)).toBeGreaterThan(0);
    expect(comparePullRequestsByLastCommit(newest, missing)).toBeLessThan(0);
  });
});
