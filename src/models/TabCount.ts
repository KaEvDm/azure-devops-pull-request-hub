export const UNLOADED_TAB_COUNT = "…";

export function formatTabCount(count: number, capped: boolean = false): string {
  return capped ? `${count}+` : count.toString();
}
