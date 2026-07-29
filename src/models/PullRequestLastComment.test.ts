import type {
  Comment,
  CommentThreadStatus,
  CommentType,
  GitPullRequestCommentThread,
} from "azure-devops-extension-api/Git/Git";
import {
  comparePullRequestsByLastComment,
  formatLastCommentAge,
  getPullRequestCommentHref,
  ILastCommentDateProvider,
  summarizePullRequestThreads,
} from "./PullRequestLastComment";

const UNKNOWN_COMMENT = 0 as CommentType;
const TEXT_COMMENT = 1 as CommentType;
const CODE_CHANGE_COMMENT = 2 as CommentType;
const SYSTEM_COMMENT = 3 as CommentType;
const ACTIVE_THREAD = 1 as CommentThreadStatus;
const FIXED_THREAD = 2 as CommentThreadStatus;

function comment(
  id: number,
  commentType: CommentType,
  publishedDate: string,
  options: { deleted?: boolean; updatedDate?: string } = {}
): Comment {
  return {
    author: { displayName: `Author ${id}` },
    commentType,
    content: `Comment ${id}`,
    id,
    isDeleted: options.deleted || false,
    lastContentUpdatedDate: new Date(
      options.updatedDate || publishedDate
    ),
    lastUpdatedDate: new Date(options.updatedDate || publishedDate),
    publishedDate: new Date(publishedDate),
  } as Comment;
}

function thread(
  id: number,
  comments: Comment[],
  options: {
    deleted?: boolean;
    status?: CommentThreadStatus;
    updatedDate?: string;
  } = {}
): GitPullRequestCommentThread {
  return {
    comments,
    id,
    isDeleted: options.deleted || false,
    lastUpdatedDate: new Date(
      options.updatedDate || "2026-07-29T12:00:00Z"
    ),
    status:
      options.status === undefined
        ? ACTIVE_THREAD
        : options.status,
  } as GitPullRequestCommentThread;
}

function provider(date?: string): ILastCommentDateProvider {
  return {
    getLastCommentDate: () => (date ? new Date(date) : undefined),
  };
}

describe("last pull request comment", () => {
  const now = new Date("2026-07-29T12:00:00Z");

  it("selects the newest published text comment, including replies", () => {
    const summary = summarizePullRequestThreads([
      thread(10, [
        comment(1, TEXT_COMMENT, "2026-07-29T09:00:00Z"),
        comment(2, SYSTEM_COMMENT, "2026-07-29T11:30:00Z"),
      ]),
      thread(20, [
        comment(3, TEXT_COMMENT, "2026-07-29T11:00:00Z"),
      ]),
    ]);

    expect(summary.lastComment!.commentId).toBe(3);
    expect(summary.lastComment!.threadId).toBe(20);
    expect(summary.lastComment!.author!.displayName).toBe("Author 3");
  });

  it("ignores deleted threads, deleted comments and non-user messages", () => {
    const summary = summarizePullRequestThreads([
      thread(
        1,
        [comment(1, TEXT_COMMENT, "2026-07-29T11:59:00Z")],
        { deleted: true }
      ),
      thread(2, [
        comment(2, TEXT_COMMENT, "2026-07-29T11:58:00Z", {
          deleted: true,
        }),
        comment(3, CODE_CHANGE_COMMENT, "2026-07-29T11:57:00Z"),
        comment(4, UNKNOWN_COMMENT, "2026-07-29T11:56:00Z"),
      ]),
    ]);

    expect(summary.lastComment).toBeUndefined();
  });

  it("uses publication time rather than a later edit time", () => {
    const summary = summarizePullRequestThreads([
      thread(1, [
        comment(1, TEXT_COMMENT, "2026-07-29T09:00:00Z", {
          updatedDate: "2026-07-29T11:59:00Z",
        }),
        comment(2, TEXT_COMMENT, "2026-07-29T10:00:00Z"),
      ]),
    ]);

    expect(summary.lastComment!.commentId).toBe(2);
  });

  it("handles an empty response and reports thread counts safely", () => {
    expect(summarizePullRequestThreads(undefined)).toEqual({
      lastComment: undefined,
      lastThreadUpdatedDate: undefined,
      terminatedThreads: 0,
      totalThreads: 0,
    });

    const summary = summarizePullRequestThreads([
      thread(1, [], { status: FIXED_THREAD }),
      thread(2, [], { status: ACTIVE_THREAD }),
    ]);
    expect(summary.totalThreads).toBe(2);
    expect(summary.terminatedThreads).toBe(1);
  });

  it("formats the same hourly age as the commit column", () => {
    expect(
      formatLastCommentAge(new Date("2026-07-29T11:30:00Z"), now)
    ).toBe("<1h ago");
    expect(
      formatLastCommentAge(new Date("2026-07-27T11:00:00Z"), now)
    ).toBe("49h ago");
  });

  it("sorts known dates newest first and missing dates last", () => {
    const newest = provider("2026-07-29T11:00:00Z");
    const older = provider("2026-07-28T11:00:00Z");
    const missing = provider();

    expect(comparePullRequestsByLastComment(newest, older)).toBeLessThan(0);
    expect(comparePullRequestsByLastComment(older, newest)).toBeGreaterThan(0);
    expect(comparePullRequestsByLastComment(newest, missing)).toBeLessThan(0);
  });

  it("builds a direct discussion link", () => {
    expect(
      getPullRequestCommentHref(
        "https://dev.azure.com/org/project/_git/repo/pullrequest/42",
        17
      )
    ).toBe(
      "https://dev.azure.com/org/project/_git/repo/pullrequest/42?discussionId=17"
    );
    expect(getPullRequestCommentHref("https://example/pr?x=1", 2)).toBe(
      "https://example/pr?x=1&discussionId=2"
    );
  });
});
