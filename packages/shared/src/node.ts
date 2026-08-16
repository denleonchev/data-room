import { z } from "zod";

// One set of name rules for the browser and the API, so a name the form accepts
// is a name the server accepts. Names are case-sensitive: "Report.pdf" and
// "report.pdf" are two different files in the same folder, as they are in
// Google Drive — the database's unique index agrees.

// Postgres holds far longer strings; the limit is about what stays readable in
// a row and in a breadcrumb.
const MAX_NAME_LENGTH = 255;

// Newlines and friends: a name is one line by definition, and a stray control
// character renders as a blank the user can't see or retype.
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

// The Data Room is a folder too, so there is always a parent to create inside.
export const createFolderSchema = z.object({
  parentId: z.string().min(1),
  name: nodeNameSchema,
});

export const renameNodeSchema = z.object({
  name: nodeNameSchema,
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type RenameNodeInput = z.infer<typeof renameNodeSchema>;
