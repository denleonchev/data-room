// A node's `path` holds the ids of its ancestors, oldest first, wrapped in
// slashes: "/" on a Data Room, "/roomId/" one level down, "/roomId/legalId/"
// two. Ids never contain a slash, so the string parses by splitting.

const SEPARATOR = "/";

export const MAX_TREE_DEPTH = 32;

/** The path a Data Room itself carries: no ancestors. */
export const ROOT_PATH = SEPARATOR;

/** The path children of `parent` get. */
export function childPath(parent: { id: string; path: string }): string {
  return `${parent.path}${parent.id}${SEPARATOR}`;
}

/** Prefix matching everything below `node` — the node itself doesn't match. */
export function subtreePrefix(node: { id: string; path: string }): string {
  return childPath(node);
}

/** Ids of the node's ancestors, from the Data Room down to its parent. */
export function ancestorIds(path: string): string[] {
  return path.split(SEPARATOR).filter((id) => id.length > 0);
}

/** How deep the node sits: a Data Room is 0, a folder inside it 1. */
export function depthOf(path: string): number {
  return ancestorIds(path).length;
}

/** The path a node keeps after the subtree it sits in moves. */
export function rebasePath(path: string, oldPrefix: string, newPrefix: string): string {
  if (!path.startsWith(oldPrefix)) return path;
  return `${newPrefix}${path.slice(oldPrefix.length)}`;
}
