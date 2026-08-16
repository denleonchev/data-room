import { createZodDto } from "nestjs-zod";
import {
  createShareSchema,
  listSharesQuerySchema,
  type ShareDto,
} from "@data-room/shared";
import type { Share } from "../generated/prisma/client";

export class CreateShareDto extends createZodDto(createShareSchema) {}
export class ListSharesQueryDto extends createZodDto(listSharesQuerySchema) {}

export function toShareDto(share: Share): ShareDto {
  return {
    id: share.id,
    nodeId: share.nodeId,
    mode: share.mode,
    role: share.role,
    token: share.token,
    createdAt: share.createdAt.toISOString(),
    updatedAt: share.updatedAt.toISOString(),
  };
}
