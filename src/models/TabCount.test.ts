import { formatTabCount, UNLOADED_TAB_COUNT } from "./TabCount";

describe("tab counts", () => {
  it("does not represent an unloaded tab as zero", () => {
    expect(UNLOADED_TAB_COUNT).toBe("…");
    expect(UNLOADED_TAB_COUNT).not.toBe("0");
  });

  it("formats exact and capped counts", () => {
    expect(formatTabCount(0)).toBe("0");
    expect(formatTabCount(17)).toBe("17");
    expect(formatTabCount(25, true)).toBe("25+");
  });
});
