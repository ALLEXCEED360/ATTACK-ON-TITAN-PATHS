import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";
import type { Neighborhood } from "../../api/client";
import { toElements } from "./elements";
import { clearHighlight, highlight } from "./focus";
import { nextCategories } from "../explore/params";
import { KIND_SHAPES, graphStyle, readPalette } from "./style";

const neighborhood: Neighborhood = {
  center: "character_a",
  nodes: [
    { id: "character_a", name: "A", kind: "character", uncertain: false, depth: 0 },
    { id: "character_b", name: "B", kind: "character", uncertain: true, depth: 1 },
    { id: "event_c", name: "C", kind: "event", uncertain: false, depth: 1 },
    { id: "titan_d", name: "D", kind: "titan", uncertain: false, depth: 2 },
  ],
  edges: [
    {
      id: "e1",
      source: "character_a",
      target: "character_b",
      type: "parent_of",
      category: "structural",
      uncertain: false,
    },
    {
      id: "e2",
      source: "character_a",
      target: "event_c",
      type: "participated_in",
      category: "event",
      uncertain: true,
    },
    {
      id: "e3",
      source: "character_b",
      target: "titan_d",
      type: "holds",
      category: "structural",
      uncertain: false,
    },
  ],
};

const headless = () => cytoscape({ headless: true, elements: toElements(neighborhood) });

describe("toElements", () => {
  it("marks the centre, kinds, categories and uncertainty as classes", () => {
    const cy = headless();
    expect(cy.getElementById("character_a").hasClass("center")).toBe(true);
    expect(cy.getElementById("character_b").hasClass("uncertain")).toBe(true);
    expect(cy.getElementById("event_c").hasClass("kind-event")).toBe(true);
    expect(cy.getElementById("e2").classes()).toEqual(["category-event", "uncertain"]);
  });

  it("labels edges from the source's point of view", () => {
    expect(headless().getElementById("e1").data("label")).toBe("Parent of");
  });
});

describe("focus", () => {
  it("highlights a node's neighbourhood and fades the rest", () => {
    const cy = headless();
    highlight(cy, "character_b");
    const faded = cy
      .elements(".faded")
      .map((e) => e.id())
      .sort();
    // B's neighbours are A and D; C and the A–C edge fade.
    expect(faded).toEqual(["e2", "event_c"]);
    clearHighlight(cy);
    expect(cy.elements(".faded").length).toBe(0);
  });

  it("clears the highlight for an unknown node", () => {
    const cy = headless();
    highlight(cy, "character_a");
    highlight(cy, "character_nobody");
    expect(cy.elements(".faded").length).toBe(0);
  });
});

describe("style", () => {
  it("gives every kind a shape", () => {
    const style = graphStyle(readPalette());
    for (const kind of Object.keys(KIND_SHAPES)) {
      expect(style.some((rule) => rule.selector === `node.kind-${kind}`)).toBe(true);
    }
  });
});

describe("nextCategories", () => {
  it("starts from 'everything' and turns one category off", () => {
    expect(nextCategories([], "event")).toEqual(["structural", "causal", "paths"]);
  });

  it("returns to 'no filter' when everything is on again", () => {
    expect(nextCategories(["structural", "causal", "paths"], "event")).toEqual([]);
  });

  it("treats switching the last category off as 'no filter'", () => {
    expect(nextCategories(["event"], "event")).toEqual([]);
  });
});
