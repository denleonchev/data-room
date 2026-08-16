import { useMemo, useState } from "react";
import type { NodeDto } from "@data-room/shared";
import { ROOT_ID, seedNodes } from "./mock-nodes";

export type MutationResult = { ok: true } | { ok: false; error: string };

export interface SubtreeStats {
  folders: number;
  files: number;
}

export interface MockNodeTree {
  currentFolder: NodeDto | undefined;
  notFound: boolean;
  children: NodeDto[];
  breadcrumb: NodeDto[];
  createFolder: (name: string) => MutationResult;
  rename: (id: string, name: string) => MutationResult;
  remove: (id: string) => void;
  subtreeStats: (id: string) => SubtreeStats;
}

// Stands in for the S2 endpoints (GET /nodes, /nodes/:id/breadcrumb, POST
// /folders, PATCH /nodes/:id, DELETE /nodes/:id, /nodes/:id/subtree-stats)
// until the wire-up PR swaps this for TanStack Query. Same shape on purpose.
export function useMockNodeTree(folderId: string | undefined): MockNodeTree {
  const [nodes, setNodes] = useState<NodeDto[]>(seedNodes);
  const currentId = folderId ?? ROOT_ID;
  const currentFolder = nodes.find((node) => node.id === currentId);

  const children = useMemo(
    () =>
      nodes
        .filter((node) => node.parentId === currentId)
        .sort(byFolderThenName),
    [nodes, currentId],
  );

  const breadcrumb = useMemo(
    () => buildBreadcrumb(nodes, currentId),
    [nodes, currentId],
  );

  function nameConflict(parentId: string, name: string, excludeId?: string) {
    return nodes.some(
      (node) =>
        node.id !== excludeId &&
        node.parentId === parentId &&
        node.name.toLowerCase() === name.toLowerCase(),
    );
  }

  function createFolder(name: string): MutationResult {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name can't be empty" };
    if (nameConflict(currentId, trimmed)) {
      return { ok: false, error: "A folder or file with that name already exists" };
    }
    const now = new Date().toISOString();
    setNodes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "FOLDER",
        name: trimmed,
        parentId: currentId,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    return { ok: true };
  }

  function rename(id: string, name: string): MutationResult {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Name can't be empty" };
    const target = nodes.find((node) => node.id === id);
    if (!target) return { ok: false, error: "This item no longer exists" };
    if (nameConflict(target.parentId ?? "", trimmed, id)) {
      return { ok: false, error: "A folder or file with that name already exists" };
    }
    setNodes((prev) =>
      prev.map((node) =>
        node.id === id
          ? { ...node, name: trimmed, updatedAt: new Date().toISOString() }
          : node,
      ),
    );
    return { ok: true };
  }

  function remove(id: string) {
    const toRemove = new Set(collectSubtreeIds(nodes, id));
    setNodes((prev) => prev.filter((node) => !toRemove.has(node.id)));
  }

  function subtreeStats(id: string): SubtreeStats {
    const descendantIds = collectSubtreeIds(nodes, id).filter(
      (candidateId) => candidateId !== id,
    );
    const descendants = nodes.filter((node) => descendantIds.includes(node.id));
    return {
      folders: descendants.filter((node) => node.type === "FOLDER").length,
      files: descendants.filter((node) => node.type === "FILE").length,
    };
  }

  return {
    currentFolder,
    notFound: !currentFolder,
    children,
    breadcrumb,
    createFolder,
    rename,
    remove,
    subtreeStats,
  };
}

function byFolderThenName(a: NodeDto, b: NodeDto) {
  if (a.type !== b.type) return a.type === "FOLDER" ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function buildBreadcrumb(nodes: NodeDto[], id: string): NodeDto[] {
  const path: NodeDto[] = [];
  let current = nodes.find((node) => node.id === id);
  while (current) {
    path.unshift(current);
    const parentId = current.parentId;
    current = parentId ? nodes.find((node) => node.id === parentId) : undefined;
  }
  return path;
}

function collectSubtreeIds(nodes: NodeDto[], id: string): string[] {
  const ids = [id];
  for (const child of nodes.filter((node) => node.parentId === id)) {
    ids.push(...collectSubtreeIds(nodes, child.id));
  }
  return ids;
}
