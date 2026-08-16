import { z } from "zod";

// The name rules the browser and the API share, so the form rejects what the
// server would.

const MAX_NAME_LENGTH = 255;

// eslint-disable-next-line no-control-regex -- matching them is the point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export const nodeNameSchema = z
  .string()
  .trim()
  .min(1, "Name can't be empty")
  .max(MAX_NAME_LENGTH, `Name can't be longer than ${MAX_NAME_LENGTH} characters`)
  .refine((name) => !name.includes("/"), "Name can't contain a slash")
  .refine(
    (name) => !CONTROL_CHARACTERS.test(name),
    "Name can't contain control characters",
  );

// A Data Room is a folder, so there is always a parent to create inside.
export const createFolderSchema = z.object({
  parentId: z.string().min(1),
  name: nodeNameSchema,
});

export const renameNodeSchema = z.object({
  name: nodeNameSchema,
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type RenameNodeInput = z.infer<typeof renameNodeSchema>;
