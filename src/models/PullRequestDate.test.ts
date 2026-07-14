import {
  comparePullRequestActivityDates,
  getPullRequestActivityDate,
  IPullRequestDates,
} from "./PullRequestDate";

function createDates(created: string, closed?: string): IPullRequestDates {
  return {
    creationDate: new Date(created),
    closedDate: closed ? new Date(closed) : undefined,
  };
}

describe("pull request activity dates", () => {
  it("uses creation time for active PRs", () => {
    const dates = createDates("2026-07-09T12:00:00Z", "2026-07-13T20:00:00Z");

    expect(getPullRequestActivityDate(dates, true)).toEqual(
      new Date("2026-07-09T12:00:00Z")
    );
  });

  it("uses close time for completed and abandoned PRs", () => {
    const dates = createDates("2026-07-09T12:00:00Z", "2026-07-13T20:00:00Z");

    expect(getPullRequestActivityDate(dates, false)).toEqual(
      new Date("2026-07-13T20:00:00Z")
    );
  });

  it("falls back to creation time when close time is unavailable", () => {
    const dates = createDates("2026-07-09T12:00:00Z");

    expect(getPullRequestActivityDate(dates, false)).toEqual(
      new Date("2026-07-09T12:00:00Z")
    );
  });

  it("places the most recently completed PR first", () => {
    const createdLaterButClosedEarlier = createDates(
      "2026-07-13T10:00:00Z",
      "2026-07-13T18:00:00Z"
    );
    const createdEarlierButClosedLater = createDates(
      "2026-07-09T10:00:00Z",
      "2026-07-13T20:00:00Z"
    );

    expect(
      comparePullRequestActivityDates(
        createdEarlierButClosedLater,
        false,
        createdLaterButClosedEarlier,
        false
      )
    ).toBeLessThan(0);
  });

  it("keeps active PRs ordered by creation time", () => {
    const newer = createDates("2026-07-13T10:00:00Z");
    const older = createDates("2026-07-09T10:00:00Z");

    expect(
      comparePullRequestActivityDates(newer, true, older, true)
    ).toBeLessThan(0);
  });
});
