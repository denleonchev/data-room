// A node's `path` holds the ids of its ancestors, oldest first, wrapped in
// slashes: a Data Room is "/", a folder directly inside it "/roomId/", a file
// two levels down "/roomId/legalId/". Ids never contain a slash, so the string
// parses by splitting.
//
// Keeping ancestry in a column is what turns "everything inside this folder"
// into a prefix scan rather than a walk down parentId, and what lets the
// browser render breadcrumbs without asking the server. The trade is that the
// column is only as correct as the code writing it — the helpers below are the
// single place that builds one, on both sides of the wire.

const SEPARATOR = "/";

// Deep enough for any real folder structure, shallow enough that a path stays
// far below Postgres' ~2.7KB limit on an index key: each level adds an id plus
// a separator, and the path is indexed.
export const MAX_TREE_DEPTH = 32;

/** The path a Data Room itself carries: no ancestors. */
export const ROOT_PATH = SEPARATOR;

/** The path children of `parent` get. */
export function childPath(parent: { id: string; path: string }): string {
  return `${parent.path}${parent.id}${SEPARATOR}`;
}

/**
 * Prefix matching everything below `node`, for `path LIKE prefix || '%'`. The
 * node itself doesn't match — subtree questions are about what's inside.
 */
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

/**
 * The path a node keeps after its subtree moves: everything below the moved
 * node keeps its position relative to it. Mirrors the SQL that rewrites the
 * subtree in one statement, so both sides can't drift.
 */
export function rebasePath(path: string, oldPrefix: string, newPrefix: string): string {
  if (!path.startsWith(oldPrefix)) return path;
  return `${newPrefix}${path.slice(oldPrefix.length)}`;
}
