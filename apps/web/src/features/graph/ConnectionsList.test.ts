import { describe, expect, it } from "vitest";
import type { Neighborhood } from "../../api/client";
import { groupConnections } from "./ConnectionsList";

const node = (id: string, name: string) => ({
  id,
  name,
  kind: "character" as const,
  uncertain: false,
  depth: 1,
});

const edge = (source: string, type: string, target: string) => ({
  id: `${source}-${type}-${target}`,
  source,
  target,
  type,
  category: "structural" as const,
  uncertain: false,
});

describe("groupConnections", () => {
  it("labels each connection from the center's point of view", () => {
    const neighborhood: Neighborhood = {
      center: "character_child",
      nodes: [
        { ...node("character_child", "Child"), depth: 0 },
        node("character_mother", "Mother"),
        node("character_father", "Father"),
        node("character_victim", "Victim"),
      ],
      edges: [
        edge("character_mother", "parent_of", "character_child"),
        edge("character_father", "parent_of", "character_child"),
        edge("character_child", "killed", "character_victim"),
        // Not touching the center: ignored.
        edge("character_mother", "spouse_of", "character_father"),
      ],
    };

    expect(groupConnections(neighborhood)).toEqual([
      {
        label: "Child of",
        items: [
          { id: "character_mother", name: "Mother", kind: "character", uncertain: false },
          { id: "character_father", name: "Father", kind: "character", uncertain: false },
        ],
      },
      {
        label: "Killed",
        items: [{ id: "character_victim", name: "Victim", kind: "character", uncertain: false }],
      },
    ]);
  });
});
