import { subtreePrefix } from "./node-path";

/** True when moving `source` into `destination` would nest it inside itself. */
export function isSelfOrDescendant(
  source: { id: string; path: string },
  destination: { id: string; path: string },
): boolean {
  return destination.id === source.id || destination.path.startsWith(subtreePrefix(source));
}

/** True when `source` already sits directly inside `destinationId` — nothing to do. */
export function isNoopMove(
  source: { parentId: string | null },
  destinationId: string,
): boolean {
  return source.parentId === destinationId;
}
