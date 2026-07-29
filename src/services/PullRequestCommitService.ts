import {
  GitCommitRef,
  GitPullRequest,
  GitQueryCommitsCriteria,
  GitRepository,
} from "azure-devops-extension-api/Git/Git";

export interface ICommitBatchClient {
  getCommitsBatch(
    searchCriteria: GitQueryCommitsCriteria,
    repositoryId: string,
    project?: string,
    skip?: number,
    top?: number,
    includeStatuses?: boolean
  ): Promise<GitCommitRef[]>;
}

interface ICommitBatch {
  repositoryId: string;
  commitIds: Set<string>;
}

const MAX_CONCURRENT_COMMIT_BATCHES = 6;
let activeCommitBatches = 0;
const waitingCommitBatches: Array<() => void> = [];

function acquireCommitBatchSlot(): Promise<void> {
  if (activeCommitBatches < MAX_CONCURRENT_COMMIT_BATCHES) {
    activeCommitBatches++;
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => waitingCommitBatches.push(resolve));
}

function releaseCommitBatchSlot(): void {
  const next = waitingCommitBatches.shift();

  if (next) {
    // Transfer the occupied slot directly to the next waiting request.
    next();
  } else {
    activeCommitBatches--;
  }
}

function getSourceRepository(pullRequest: GitPullRequest): GitRepository {
  return pullRequest.forkSource && pullRequest.forkSource.repository
    ? pullRequest.forkSource.repository
    : pullRequest.repository;
}

export function createCommitKey(
  repositoryId: string,
  commitId: string
): string {
  return `${repositoryId.toLowerCase()}:${commitId.toLowerCase()}`;
}

export function getLastSourceCommitKey(
  pullRequest: GitPullRequest
): string | undefined {
  const sourceRepository = getSourceRepository(pullRequest);
  const sourceCommit = pullRequest.lastMergeSourceCommit;

  if (
    !sourceRepository ||
    !sourceRepository.id ||
    !sourceCommit ||
    !sourceCommit.commitId
  ) {
    return undefined;
  }

  return createCommitKey(sourceRepository.id, sourceCommit.commitId);
}

/**
 * Loads source-head commit metadata in one request per repository. The pull
 * request list only contains shallow commit refs in Azure DevOps Cloud, so the
 * batch response supplies the committer date used by the Last commit column.
 */
export async function loadLastSourceCommits(
  gitClient: ICommitBatchClient,
  pullRequests: GitPullRequest[]
): Promise<Map<string, GitCommitRef>> {
  const commitsByKey = new Map<string, GitCommitRef>();
  const batchesByRepository = new Map<string, ICommitBatch>();

  pullRequests.forEach((pullRequest) => {
    const sourceRepository = getSourceRepository(pullRequest);
    const sourceCommit = pullRequest.lastMergeSourceCommit;
    const key = getLastSourceCommitKey(pullRequest);

    if (!sourceRepository || !sourceCommit || !key) {
      return;
    }

    if (sourceCommit.committer && sourceCommit.committer.date) {
      commitsByKey.set(key, sourceCommit);
      return;
    }

    const repositoryKey = sourceRepository.id.toLowerCase();
    let batch = batchesByRepository.get(repositoryKey);

    if (!batch) {
      batch = {
        repositoryId: sourceRepository.id,
        commitIds: new Set<string>(),
      };
      batchesByRepository.set(repositoryKey, batch);
    }

    batch.commitIds.add(sourceCommit.commitId);
  });

  await Promise.all(
    Array.from(batchesByRepository.values()).map(async (batch) => {
      const commitIds = Array.from(batch.commitIds);
      await acquireCommitBatchSlot();

      try {
        const commits = await gitClient.getCommitsBatch(
          { ids: commitIds } as GitQueryCommitsCriteria,
          batch.repositoryId
        );

        (commits || []).forEach((commit) => {
          if (commit && commit.commitId) {
            commitsByKey.set(
              createCommitKey(batch.repositoryId, commit.commitId),
              commit
            );
          }
        });
      } catch (error) {
        // A missing/inaccessible fork must not prevent commit ages from other
        // repositories from being displayed.
        console.log(
          `Unable to load last source commits for repository ${batch.repositoryId}.`
        );
        console.log(error);
      } finally {
        releaseCommitBatchSlot();
      }
    })
  );

  return commitsByKey;
}
