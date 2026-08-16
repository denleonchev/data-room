import { z } from "zod";

export const createShareSchema = z.object({
  nodeId: z.string().min(1),
});

export type CreateShareInput = z.infer<typeof createShareSchema>;

export const listSharesQuerySchema = z.object({
  nodeId: z.string().min(1),
});

export type ListSharesQuery = z.infer<typeof listSharesQuerySchema>;

export type ShareMode = "PUBLIC_LINK";

export type ShareRole = "VIEWER";

// token stays server-side-derived but is what the client needs to build the
// share URL — unlike ownerId/path on NodeDto, it's meant to leave the server.
export interface ShareDto {
  id: string;
  nodeId: string;
  mode: ShareMode;
  role: ShareRole;
  token: string | null;
  createdAt: string;
  updatedAt: string;
}
