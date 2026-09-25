import { describe, expect, it } from "vitest";
import { edgeLabel, formatCitations, formatDate, formatYear } from "./format";

describe("formatDate", () => {
  it("formats each precision", () => {
    expect(formatDate({ year: 850 })).toBe("850");
    expect(formatDate({ year: 850, month: 3 })).toBe("March 850");
    expect(formatDate({ year: 850, month: 3, day: 10 })).toBe("10 March 850");
  });

  it("formats ranges", () => {
    expect(formatDate({ between: [{ year: 743 }, { year: 745 }] })).toBe("between 743 and 745");
  });

  it("formats years before year 1", () => {
    expect(formatYear(-1150)).toBe("year −1150");
    expect(formatYear(0)).toBe("year −0");
  });
});

describe("formatCitations", () => {
  it("joins chapters and ranges", () => {
    expect(formatCitations([2, [40, 42]])).toBe("ch. 2, 40–42");
    expect(formatCitations([])).toBe("");
  });
});

describe("edgeLabel", () => {
  it("reads from either side of the edge", () => {
    expect(edgeLabel("parent_of", true)).toBe("Parent of");
    expect(edgeLabel("parent_of", false)).toBe("Child of");
    expect(edgeLabel("unknown_type", true)).toBe("unknown_type");
  });
});
