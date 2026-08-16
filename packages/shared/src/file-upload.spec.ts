import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  findDuplicateNamesInBatch,
  uploadFileSchema,
} from "./file-upload";

const valid = { name: "Report.pdf", size: 1024, mimeType: "application/pdf" as const };

describe("uploadFileSchema", () => {
  it("accepts a PDF under the size cap", () => {
    expect(uploadFileSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects anything that isn't a PDF", () => {
    const result = uploadFileSchema.safeParse({ ...valid, mimeType: "image/png" });
    expect(result.success).toBe(false);
  });

  it("accepts a file exactly at the size cap and rejects one byte over", () => {
    expect(
      uploadFileSchema.safeParse({ ...valid, size: MAX_FILE_SIZE_BYTES }).success,
    ).toBe(true);
    expect(
      uploadFileSchema.safeParse({ ...valid, size: MAX_FILE_SIZE_BYTES + 1 }).success,
    ).toBe(false);
  });

  it("rejects a non-positive size", () => {
    expect(uploadFileSchema.safeParse({ ...valid, size: 0 }).success).toBe(false);
  });

  it("applies the same name rule a folder already has", () => {
    expect(uploadFileSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(uploadFileSchema.safeParse({ ...valid, name: "a/b.pdf" }).success).toBe(false);
  });
});

describe("findDuplicateNamesInBatch", () => {
  it("flags a name that appears more than once", () => {
    const duplicates = findDuplicateNamesInBatch(["a.pdf", "b.pdf", "a.pdf"]);
    expect(duplicates).toEqual(new Set(["a.pdf"]));
  });

  it("doesn't flag names that only appear once", () => {
    expect(findDuplicateNamesInBatch(["a.pdf", "b.pdf"]).size).toBe(0);
  });

  it("is case-sensitive, like the name rule itself", () => {
    expect(findDuplicateNamesInBatch(["Report.pdf", "report.pdf"]).size).toBe(0);
  });
});
