import type { GitPullRequestCompletionOptions } from "azure-devops-extension-api/Git/Git";
import { AzureGitModels, EvaluationPolicyType } from "./GitModels";
import { isPolicyApprovedForReadiness } from "./PolicyStatus";

function createPolicy(
  typeId: string,
  status: string
): AzureGitModels.Value {
  return {
    status,
    configuration: {
      type: { id: typeId },
    },
  } as AzureGitModels.Value;
}

describe("isPolicyApprovedForReadiness", () => {
  it("accepts an approved policy", () => {
    const policy = createPolicy(EvaluationPolicyType.MinimumReviewers, "approved");

    expect(
      isPolicyApprovedForReadiness(policy, true, null)
    ).toBe(true);
  });

  it("keeps a rejected ordinary blocking policy rejected", () => {
    const policy = createPolicy(EvaluationPolicyType.MinimumReviewers, "rejected");

    expect(
      isPolicyApprovedForReadiness(policy, true, null)
    ).toBe(false);
  });

  it("accepts a deferred merge-strategy choice for an active PR", () => {
    const policy = createPolicy(EvaluationPolicyType.MergeStrategy, "rejected");

    expect(
      isPolicyApprovedForReadiness(policy, true, null)
    ).toBe(true);
    expect(
      isPolicyApprovedForReadiness(policy, true, undefined)
    ).toBe(true);
  });

  it("trusts the evaluation after completion options are selected", () => {
    const policy = createPolicy(EvaluationPolicyType.MergeStrategy, "rejected");
    const completionOptions = {} as GitPullRequestCompletionOptions;

    expect(
      isPolicyApprovedForReadiness(
        policy,
        true,
        completionOptions
      )
    ).toBe(false);
  });

  it("does not override merge-strategy evaluations for closed PRs", () => {
    const policy = createPolicy(EvaluationPolicyType.MergeStrategy, "rejected");

    expect(
      isPolicyApprovedForReadiness(policy, false, null)
    ).toBe(false);
  });

  it("does not mask a non-rejected merge-strategy status", () => {
    const policy = createPolicy(EvaluationPolicyType.MergeStrategy, "broken");

    expect(
      isPolicyApprovedForReadiness(policy, true, null)
    ).toBe(false);
  });
});
