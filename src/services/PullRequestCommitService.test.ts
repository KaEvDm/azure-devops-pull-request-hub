import {
  GitCommitRef,
  GitPullRequest,
} from "azure-devops-extension-api/Git/Git";
import {
  createCommitKey,
  ICommitBatchClient,
  loadLastSourceCommits,
} from "./PullRequestCommitService";

function pullRequest(
  repositoryId: string,
  commitId: string,
  forkRepositoryId?: string
): GitPullRequest {
  return {
    repository: { id: repositoryId },
    forkSource: forkRepositoryId
      ? { repository: { id: forkRepositoryId } }
      : undefined,
    lastMergeSourceCommit: { commitId },
  } as GitPullRequest;
}

function commit(commitId: string, date: string): GitCommitRef {
  return {
    commitId,
    committer: { date: new Date(date) },
  } as GitCommitRef;
}

describe("PullRequestCommitService", () => {
  it("deduplicates commits and loads one batch per repository", async () => {
    const getCommitsBatch = jest.fn().mockImplementation(
      async (criteria, repositoryId): Promise<GitCommitRef[]> =>
        criteria.ids.map((id: string) =>
          commit(id, `2026-07-29T${repositoryId === "repo-a" ? "10" : "11"}:00:00Z`)
        )
    );
    const client = { getCommitsBatch } as ICommitBatchClient;

    const result = await loadLastSourceCommits(client, [
      pullRequest("repo-a", "aaa"),
      pullRequest("repo-a", "aaa"),
      pullRequest("repo-a", "bbb"),
      pullRequest("repo-b", "ccc"),
    ]);

    expect(getCommitsBatch).toHaveBeenCalledTimes(2);
    expect(getCommitsBatch.mock.calls[0]).toEqual([
      { ids: ["aaa", "bbb"] },
      "repo-a",
    ]);
    expect(result.get(createCommitKey("repo-a", "aaa"))!.commitId).toBe(
      "aaa"
    );
    expect(result.get(createCommitKey("repo-b", "ccc"))!.commitId).toBe(
      "ccc"
    );
  });

  it("queries the source repository for a fork pull request", async () => {
    const getCommitsBatch = jest
      .fn()
      .mockResolvedValue([commit("fork-sha", "2026-07-29T10:00:00Z")]);

    await loadLastSourceCommits(
      { getCommitsBatch } as ICommitBatchClient,
      [pullRequest("target-repo", "fork-sha", "fork-repo")]
    );

    expect(getCommitsBatch.mock.calls[0][1]).toBe("fork-repo");
  });

  it("limits concurrent repository batches", async () => {
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const getCommitsBatch = jest.fn().mockImplementation(
      async (criteria): Promise<GitCommitRef[]> => {
        activeRequests++;
        maximumActiveRequests = Math.max(
          maximumActiveRequests,
          activeRequests
        );

        await new Promise((resolve) => window.setTimeout(resolve, 1));
        activeRequests--;

        return criteria.ids.map((id: string) =>
          commit(id, "2026-07-29T10:00:00Z")
        );
      }
    );
    const pullRequests: GitPullRequest[] = [];

    for (let index = 0; index < 12; index++) {
      pullRequests.push(pullRequest(`repo-${index}`, `commit-${index}`));
    }

    await Promise.all([
      loadLastSourceCommits(
        { getCommitsBatch } as ICommitBatchClient,
        pullRequests.slice(0, 6)
      ),
      loadLastSourceCommits(
        { getCommitsBatch } as ICommitBatchClient,
        pullRequests.slice(6)
      ),
    ]);

    expect(maximumActiveRequests).toBe(6);
  });

  it("keeps successful repositories when another batch fails", async () => {
    const consoleLog = jest.spyOn(console, "log").mockImplementation(() => {
      return;
    });
    const getCommitsBatch = jest.fn().mockImplementation(
      async (searchCriteria, repositoryId): Promise<GitCommitRef[]> => {
        if (!searchCriteria.ids) {
          throw new Error("Expected commit ids");
        }

        if (repositoryId === "forbidden-repo") {
          throw new Error("Forbidden");
        }

        return [commit("available", "2026-07-29T10:00:00Z")];
      }
    );

    const result = await loadLastSourceCommits(
      { getCommitsBatch } as ICommitBatchClient,
      [
        pullRequest("forbidden-repo", "missing"),
        pullRequest("available-repo", "available"),
      ]
    );

    expect(result.has(createCommitKey("forbidden-repo", "missing"))).toBe(
      false
    );
    expect(result.has(createCommitKey("available-repo", "available"))).toBe(
      true
    );
    consoleLog.mockRestore();
  });
});
