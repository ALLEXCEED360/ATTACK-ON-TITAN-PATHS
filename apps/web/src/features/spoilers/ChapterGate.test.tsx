import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useReader } from "../../stores/reader";
import { ChapterGate } from "./ChapterGate";

beforeEach(() => {
  useReader.setState({ cutoff: null });
});

describe("ChapterGate", () => {
  it("shows nothing from the app until a chapter is chosen", async () => {
    render(<ChapterGate>secret content</ChapterGate>);
    expect(screen.queryByText("secret content")).toBeNull();
    expect(screen.getByRole("heading", { name: "Where are you in the story?" })).toBeTruthy();

    const number = screen.getByRole("spinbutton", { name: "Chapter number" });
    await userEvent.clear(number);
    await userEvent.type(number, "20");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(useReader.getState().cutoff).toBe(20);
    expect(screen.getByText("secret content")).toBeTruthy();
  });

  it("offers a one-click 'finished' option", async () => {
    render(<ChapterGate>secret content</ChapterGate>);
    await userEvent.click(screen.getByRole("button", { name: "I've finished the manga" }));
    expect(useReader.getState().cutoff).toBe(139);
  });

  it("clamps typed chapters to the real range", async () => {
    render(<ChapterGate>secret content</ChapterGate>);
    const number = screen.getByRole("spinbutton", { name: "Chapter number" });
    await userEvent.clear(number);
    await userEvent.type(number, "500");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(useReader.getState().cutoff).toBe(139);
  });

  it("skips the question for returning readers", () => {
    useReader.setState({ cutoff: 50 });
    render(<ChapterGate>secret content</ChapterGate>);
    expect(screen.getByText("secret content")).toBeTruthy();
  });
});
