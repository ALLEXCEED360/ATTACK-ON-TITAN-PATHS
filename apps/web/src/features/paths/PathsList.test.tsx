import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Paths } from "../../api/client";
import { PathsList, formatRange } from "./PathsList";

const y = (year: number) => ({ earliest: year * 10_000 + 101, latest: year * 10_000 + 1231 });

// A synthetic lineage — never real story facts.
const data: Paths = {
  center: "titan_x",
  supported: true,
  hiddenLanes: 0,
  lanes: [
    {
      id: "titan_x",
      kind: "titan",
      name: "The X Titan",
      span: { start: null, end: null },
      segments: [
        { holder: "character_a", holderName: "Anna", span: { start: y(810), end: y(813) } },
      ],
    },
    {
      id: "character_a",
      kind: "character",
      name: "Anna",
      span: { start: null, end: null },
      segments: [],
    },
    {
      id: "character_b",
      kind: "character",
      name: "Bram",
      span: { start: null, end: null },
      segments: [],
    },
  ],
  events: [
    {
      id: "event_e",
      name: "The Event",
      span: { start: y(812), end: y(812) },
      seq: null,
      lanes: ["character_a"],
    },
  ],
  causal: [],
  memories: [
    {
      id: "memory_m",
      name: "A Memory",
      date: y(812),
      experiencedBy: "character_a",
      received: [{ by: "character_b", span: { start: y(809), end: null } }],
      depicts: "event_e",
    },
  ],
};

describe("PathsList", () => {
  it("tells the same story as the diagram, in world order", () => {
    render(
      <MemoryRouter>
        <PathsList data={data} search="?mode=paths" />
      </MemoryRouter>,
    );
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toEqual([
      "809Bram receives the memory A Memory, originally experienced by Anna in 812 — before it happened.",
      "810Anna holds The X Titan until 813.",
      "812The Event — Anna",
    ]);
    expect(screen.getAllByRole("link", { name: "Anna" })[0]?.getAttribute("href")).toBe(
      "/explore/character_a?mode=paths",
    );
  });
});

describe("formatRange", () => {
  it("shows a year, a span of years, or that the date is unknown", () => {
    expect(formatRange(y(850))).toBe("850");
    expect(formatRange({ earliest: y(743).earliest, latest: y(745).latest })).toBe(
      "between 743 and 745",
    );
    expect(formatRange(null)).toBe("date unknown");
  });
});
