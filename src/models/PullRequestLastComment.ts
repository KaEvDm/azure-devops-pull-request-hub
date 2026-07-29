import type {
  Comment,
  CommentThreadStatus,
  CommentType,
  GitPullRequestCommentThread,
} from "azure-devops-extension-api/Git/Git";
import type { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";
import { formatHoursAgo, getValidDateTimestamp } from "./PullRequestAge";

// Numeric API values are kept local so Jest does not have to execute the
// Azure DevOps SDK's AMD bundle when testing these pure helpers.
const TEXT_COMMENT_TYPE = 1 as CommentType;
const TERMINATED_THREAD_STATUSES: CommentThreadStatus[] = [
  2 as CommentThreadStatus,
  3 as CommentThreadStatus,
  4 as CommentThreadStatus,
];

export interface ILastPublishedPullRequestComment {
  author: IdentityRef | undefined;
  commentId: number;
  content: string;
  publishedDate: Date;
  threadId: number;
}

export interface IPullRequestThreadSummary {
  lastComment: ILastPublishedPullRequestComment | undefined;
  lastThreadUpdatedDate: Date | undefined;
  terminatedThreads: number;
  totalThreads: number;
}

export interface ILastCommentDateProvider {
  getLastCommentDate(): Date | undefined;
}

function asValidDate(value: Date | string | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return getValidDateTimestamp(date) === undefined ? undefined : date;
}

function getPublishedComment(
  thread: GitPullRequestCommentThread,
  comment: Comment
): ILastPublishedPullRequestComment | undefined {
  if (
    comment === undefined ||
    comment.isDeleted ||
    comment.commentType !== TEXT_COMMENT_TYPE
  ) {
    return undefined;
  }

  const publishedDate = asValidDate(
    comment.publishedDate as Date | string | undefined
  );

  if (publishedDate === undefined) {
    return undefined;
  }

  return {
    author: comment.author,
    commentId: comment.id,
    content: comment.content || "",
    publishedDate,
    threadId: thread.id,
  };
}

/**
 * Summarizes PR discussions while keeping thread activity separate from the
 * publication time of the newest regular user comment. Resolving a thread or
 * a system/code-change message must not make the Last comment column newer.
 */
export function summarizePullRequestThreads(
  threads: GitPullRequestCommentThread[] | undefined
): IPullRequestThreadSummary {
  const visibleThreads = (threads || []).filter(
    (thread) => thread !== undefined && !thread.isDeleted
  );
  const countedThreads = visibleThreads.filter(
    (thread) => thread.status !== undefined
  );
  let lastComment: ILastPublishedPullRequestComment | undefined;
  let lastThreadUpdatedDate: Date | undefined;

  visibleThreads.forEach((thread) => {
    (thread.comments || []).forEach((comment) => {
      const candidate = getPublishedComment(thread, comment);

      if (
        candidate !== undefined &&
        (lastComment === undefined ||
          candidate.publishedDate > lastComment.publishedDate)
      ) {
        lastComment = candidate;
      }
    });
  });

  countedThreads.forEach((thread) => {
    const candidate = asValidDate(
      thread.lastUpdatedDate as Date | string | undefined
    );

    if (
      candidate !== undefined &&
      (lastThreadUpdatedDate === undefined ||
        candidate > lastThreadUpdatedDate)
    ) {
      lastThreadUpdatedDate = candidate;
    }
  });

  return {
    lastComment,
    lastThreadUpdatedDate,
    terminatedThreads: countedThreads.filter(
      (thread) => TERMINATED_THREAD_STATUSES.indexOf(thread.status) >= 0
    ).length,
    totalThreads: countedThreads.length,
  };
}

export function formatLastCommentAge(
  commentDate: Date,
  now: Date = new Date()
): string {
  return formatHoursAgo(commentDate, now);
}

export function getPullRequestCommentHref(
  pullRequestHref: string,
  threadId: number
): string {
  const separator = pullRequestHref.indexOf("?") >= 0 ? "&" : "?";
  return `${pullRequestHref}${separator}discussionId=${threadId}`;
}

/**
 * Orders pull requests from the newest published user comment to the oldest.
 * Rows without comments are kept after rows with known dates.
 */
export function comparePullRequestsByLastComment(
  a: ILastCommentDateProvider,
  b: ILastCommentDateProvider
): number {
  const aTimestamp = getValidDateTimestamp(a.getLastCommentDate());
  const bTimestamp = getValidDateTimestamp(b.getLastCommentDate());

  if (aTimestamp === undefined) {
    return bTimestamp === undefined ? 0 : 1;
  }

  if (bTimestamp === undefined) {
    return -1;
  }

  return bTimestamp - aTimestamp;
}
