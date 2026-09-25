import { beforeEach, describe, expect, it } from "vitest";
import { isChapter, useReader } from "./reader";

beforeEach(() => {
  useReader.setState({ cutoff: null });
});

describe("reader store", () => {
  it("accepts only real chapters", () => {
    expect([1, 139].every(isChapter)).toBe(true);
    expect([0, 140, 1.5, Number.NaN, "5"].some(isChapter)).toBe(false);
  });

  it("stores the chosen chapter in the browser", () => {
    useReader.getState().setCutoff(42);
    expect(useReader.getState().cutoff).toBe(42);
    expect(JSON.parse(localStorage.getItem("paths:reader") ?? "{}")).toMatchObject({
      state: { cutoff: 42 },
    });
  });

  it("ignores invalid chapters", () => {
    useReader.getState().setCutoff(500);
    expect(useReader.getState().cutoff).toBeNull();
  });

  it("discards a tampered stored value", async () => {
    localStorage.setItem("paths:reader", JSON.stringify({ state: { cutoff: 999 }, version: 1 }));
    await useReader.persist.rehydrate();
    expect(useReader.getState().cutoff).toBeNull();
  });
});
