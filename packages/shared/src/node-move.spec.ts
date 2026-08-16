import { describe, expect, it } from "vitest";
import { ROOT_PATH, childPath } from "./node-path";
import { isNoopMove, isSelfOrDescendant } from "./node-move";

const room = { id: "room", parentId: null, path: ROOT_PATH };
const legal = { id: "legal", parentId: room.id, path: childPath(room) };
const contracts = { id: "contracts", parentId: legal.id, path: childPath(legal) };
const archive = { id: "archive", parentId: room.id, path: childPath(room) };

describe("isSelfOrDescendant", () => {
  it("is true when the destination is the node itself", () => {
    expect(isSelfOrDescendant(legal, legal)).toBe(true);
  });

  it("is true when the destination is a descendant of the node", () => {
    expect(isSelfOrDescendant(legal, contracts)).toBe(true);
  });

  it("is false when the destination is an unrelated folder", () => {
    expect(isSelfOrDescendant(legal, archive)).toBe(false);
  });

  it("is false when the destination is the node's own ancestor", () => {
    expect(isSelfOrDescendant(contracts, legal)).toBe(false);
  });

  it("does not match a sibling whose id starts with the same characters", () => {
    const legalese = { id: "legalese", path: childPath(room) };
    expect(isSelfOrDescendant(legal, legalese)).toBe(false);
  });
});

describe("isNoopMove", () => {
  it("is true when the node already sits in the destination", () => {
    expect(isNoopMove(contracts, legal.id)).toBe(true);
  });

  it("is false when the destination is a different folder", () => {
    expect(isNoopMove(contracts, archive.id)).toBe(false);
  });

  it("is false for a Data Room moved against any destination", () => {
    expect(isNoopMove(room, archive.id)).toBe(false);
  });
});
