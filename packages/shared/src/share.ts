import { z } from "zod";

export const createShareSchema = z.object({
  nodeId: z.string().min(1),
  // Absent -> a public link; present -> invite that email to a restricted
  // share. Normalized here so the browser and the API agree on what "the
  // same email" means, the same reasoning nodeNameSchema already applies.
  granteeEmail: z.email("Enter a valid email").trim().toLowerCase().optional(),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;

export const listSharesQuerySchema = z.object({
  nodeId: z.string().min(1),
});

export type ListSharesQuery = z.infer<typeof listSharesQuerySchema>;

// RESTRICTED lands with slice 7's logic/endpoints/ui — the type widens here
// because it mirrors the DB enum the migration just added a value to, not
// because anything reads or writes a restricted share yet.
export type ShareMode = "PUBLIC_LINK" | "RESTRICTED";

export type ShareRole = "VIEWER";

// token stays server-side-derived but is what the client needs to build the
// share URL — unlike ownerId/path on NodeDto, it's meant to leave the server.
export interface ShareDto {
  id: string;
  nodeId: string;
  mode: ShareMode;
  role: ShareRole;
  token: string | null;
  granteeEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
