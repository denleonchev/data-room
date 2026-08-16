import { createZodDto } from "nestjs-zod";
import {
  createFolderSchema,
  listNodesQuerySchema,
  renameNodeSchema,
  type NodeDto,
} from "@data-room/shared";
import type { Node } from "../generated/prisma/client";

// Request shapes come from the shared schemas, so the browser and the API agree
// on what a valid name is.
export class CreateFolderDto extends createZodDto(createFolderSchema) {}
export class RenameNodeDto extends createZodDto(renameNodeSchema) {}
export class ListNodesQueryDto extends createZodDto(listNodesQuerySchema) {}

export function toNodeDto(node: Node): NodeDto {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    parentId: node.parentId,
    size: node.size,
    mimeType: node.mimeType,
    status: node.status,
    createdAt: node.createdAt.toISOString(),
    updatedAt: node.updatedAt.toISOString(),
  };
}
