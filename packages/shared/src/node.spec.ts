import { describe, expect, it } from "vitest";
import { createFolderSchema, nodeNameSchema, updateNodeSchema } from "./node";

const parse = (name: string) => nodeNameSchema.safeParse(name);

describe("nodeNameSchema", () => {
  it("trims the name, so a stray space can't create a second 'Legal '", () => {
    expect(parse("  Legal  ").data).toBe("Legal");
  });

  it("rejects a name that is only whitespace", () => {
    expect(parse("   ").success).toBe(false);
  });

  it("rejects an empty name", () => {
    expect(parse("").success).toBe(false);
  });

  it("accepts a name at the length limit and rejects one past it", () => {
    expect(parse("a".repeat(255)).success).toBe(true);
    expect(parse("a".repeat(256)).success).toBe(false);
  });

  it("rejects a slash, which would read as a path", () => {
    expect(parse("Legal/Contracts").success).toBe(false);
  });

  it("rejects control characters", () => {
    expect(parse("Legal\nContracts").success).toBe(false);
    expect(parse("Legal\u0007Contracts").success).toBe(false);
  });

  it("keeps case, so Report.pdf and report.pdf are two names", () => {
    expect(parse("Report.pdf").data).toBe("Report.pdf");
    expect(parse("report.pdf").data).toBe("report.pdf");
  });

  it("accepts the punctuation and scripts real documents use", () => {
    expect(parse("Отчёт (2026) — final v2.pdf").success).toBe(true);
    expect(parse("100% done 🎉.pdf").success).toBe(true);
  });
});

describe("createFolderSchema", () => {
  it("requires a parent: the Data Room is a folder, so there is always one", () => {
    expect(createFolderSchema.safeParse({ name: "Legal" }).success).toBe(false);
  });

  it("applies the same name rules as a rename", () => {
    const result = createFolderSchema.safeParse({
      parentId: "room-id",
      name: "  Legal  ",
    });
    expect(result.data?.name).toBe("Legal");
  });
});

describe("updateNodeSchema", () => {
  it("accepts a rename alone", () => {
    expect(updateNodeSchema.safeParse({ name: "Legal" }).success).toBe(true);
  });

  it("accepts a move alone", () => {
    expect(updateNodeSchema.safeParse({ parentId: "archive-id" }).success).toBe(true);
  });

  it("accepts a rename and a move in the same request", () => {
    expect(
      updateNodeSchema.safeParse({ name: "Legal", parentId: "archive-id" }).success,
    ).toBe(true);
  });

  it("rejects a body with neither field — nothing to do", () => {
    expect(updateNodeSchema.safeParse({}).success).toBe(false);
  });

  it("still applies the name rules to the rename field", () => {
    expect(updateNodeSchema.safeParse({ name: "" }).success).toBe(false);
  });
});
