import { describe, expect, it } from "vitest";
import {
  ROOT_PATH,
  ancestorIds,
  childPath,
  depthOf,
  rebasePath,
  subtreePrefix,
} from "./node-path";

const room = { id: "room", path: ROOT_PATH };
const legal = { id: "legal", path: childPath(room) };
const contracts = { id: "contracts", path: childPath(legal) };

describe("childPath", () => {
  it("puts a folder directly inside the Data Room", () => {
    expect(legal.path).toBe("/room/");
  });

  it("nests one level further down", () => {
    expect(contracts.path).toBe("/room/legal/");
  });
});

describe("subtreePrefix", () => {
  it("matches everything below the node", () => {
    const prefix = subtreePrefix(legal);
    expect(contracts.path.startsWith(prefix)).toBe(true);
    expect(childPath(contracts).startsWith(prefix)).toBe(true);
  });

  it("does not match the node itself — a subtree is what's inside", () => {
    expect(legal.path.startsWith(subtreePrefix(legal))).toBe(false);
  });

  it("does not match a sibling whose id starts with the same characters", () => {
    const legalese = { id: "legalese", path: childPath(room) };
    expect(childPath(legalese).startsWith(subtreePrefix(legal))).toBe(false);
  });
});

describe("ancestorIds", () => {
  it("lists ancestors from the Data Room down to the parent", () => {
    expect(ancestorIds(childPath(contracts))).toEqual(["room", "legal", "contracts"]);
  });

  it("gives a Data Room no ancestors", () => {
    expect(ancestorIds(ROOT_PATH)).toEqual([]);
  });
});

describe("depthOf", () => {
  it("counts the Data Room as zero", () => {
    expect(depthOf(ROOT_PATH)).toBe(0);
    expect(depthOf(legal.path)).toBe(1);
    expect(depthOf(contracts.path)).toBe(2);
  });
});

describe("rebasePath", () => {
  it("moves a subtree while keeping its shape", () => {
    const archive = { id: "archive", path: ROOT_PATH };
    const before = childPath(contracts); // "/room/legal/contracts/"
    const after = rebasePath(before, subtreePrefix(legal), subtreePrefix(archive));
    expect(after).toBe("/archive/contracts/");
  });

  it("moves a node up to the Data Room", () => {
    expect(rebasePath(contracts.path, subtreePrefix(room), ROOT_PATH)).toBe("/legal/");
  });

  it("leaves paths outside the moved subtree alone", () => {
    const other = { id: "other", path: childPath(room) };
    expect(rebasePath(other.path, subtreePrefix(legal), subtreePrefix(contracts))).toBe(
      other.path,
    );
  });
});
