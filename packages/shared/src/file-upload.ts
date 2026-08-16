import { z } from "zod";
import { nodeNameSchema } from "./node";

// Generous for due-diligence PDFs, including large scanned contracts, but
// small enough that this check catches a real mistake (a video dragged in by
// accident) rather than being theatre.
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// "PDF is enough" per the task — one allowed type, kept as a list so adding
// another is a one-line change, not a rewritten schema.
export const ALLOWED_FILE_MIME_TYPES = ["application/pdf"] as const;

// The browser and the API validate an upload's metadata with this before any
// bytes move — a file shares the same name rule a folder already has, so
// nothing file-specific to decide there.
export const uploadFileSchema = z.object({
  name: nodeNameSchema,
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE_BYTES, "File is larger than the 50 MB limit"),
  mimeType: z.enum(ALLOWED_FILE_MIME_TYPES, {
    message: "Only PDF files are supported",
  }),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;

// The folder the upload lands in, same shape createFolderSchema already uses.
export const createFileUploadSchema = uploadFileSchema.extend({
  parentId: z.string().min(1),
});

export type CreateFileUploadInput = z.infer<typeof createFileUploadSchema>;

/**
 * Names that appear more than once in a single drop, so the upload queue can
 * flag the second occurrence before a signed URL is ever requested for a file
 * that's going to 409 anyway. Case-sensitive, matching nodeNameSchema's own
 * "Report.pdf" vs "report.pdf" rule — collisions against what's already in
 * the folder are still caught server-side, by the same unique index a
 * duplicate folder name hits.
 */
export function findDuplicateNamesInBatch(names: string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name);
    } else {
      seen.add(name);
    }
  }

  return duplicates;
}
