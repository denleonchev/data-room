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

// Absent parentId means the caller's own Data Room.
export const listNodesQuerySchema = z.object({
  parentId: z.string().min(1).optional(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type RenameNodeInput = z.infer<typeof renameNodeSchema>;
export type ListNodesQuery = z.infer<typeof listNodesQuerySchema>;

export type NodeKind = "FOLDER" | "FILE";

// What the API returns. `ownerId` and `path` stay server-side: the client has no
// use for either, and one that grew a dependency on the path would make the
// column harder to change.
export interface NodeDto {
  id: string;
  type: NodeKind;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbDto {
  id: string;
  name: string;
}

export interface SubtreeStatsDto {
  folders: number;
  files: number;
}
