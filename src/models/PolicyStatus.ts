import type { GitPullRequestCompletionOptions } from "azure-devops-extension-api/Git/Git";
import { AzureGitModels, EvaluationPolicyType } from "./GitModels";

/**
 * Azure evaluates the merge-strategy policy as rejected until completion
 * options are selected. That choice is normally deferred to the Complete
 * dialog, so it must not keep an otherwise ready active PR in a waiting state.
 */
export function isPolicyApprovedForReadiness(
  policy: AzureGitModels.Value,
  isActivePullRequest: boolean,
  completionOptions: GitPullRequestCompletionOptions | null | undefined
): boolean {
  if (policy.status === "approved") {
    return true;
  }

  return (
    policy.status === "rejected" &&
    policy.configuration.type.id === EvaluationPolicyType.MergeStrategy &&
    isActivePullRequest &&
    completionOptions == null
  );
}
