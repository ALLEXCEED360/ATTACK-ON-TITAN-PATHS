import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";
import { useReader } from "../../stores/reader";
import { ChapterGate } from "./ChapterGate";

// Accessibility checks with axe. jsdom has no layout, so colour contrast is checked in a real
// browser instead (decision 0010); everything structural is checked here.
async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`);
}

beforeEach(() => {
  useReader.setState({ cutoff: null });
});

describe("the chapter gate is accessible", () => {
  it("on the chapter question", async () => {
    const { container } = render(<ChapterGate>app</ChapterGate>);
    await screen.findByRole("heading", { name: "Where are you in the story?" });
    expect(await violations(container)).toEqual([]);
  });
});
