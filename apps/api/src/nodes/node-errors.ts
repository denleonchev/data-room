/**
 * A name already taken in that folder. Raised from the unique index rather than
 * a read-then-write check, which two concurrent creates would slip through.
 */
export class NodeNameConflictError extends Error {
  // Not `name`: Error already owns that, and it holds the class name.
  constructor(readonly nodeName: string) {
    super(`A file or folder named "${nodeName}" already exists here`);
    this.name = "NodeNameConflictError";
  }
}

export class NodeNotFoundError extends Error {
  constructor(readonly nodeId: string) {
    super("Node not found");
    this.name = "NodeNotFoundError";
  }
}

const UNIQUE_VIOLATION = "P2002";
const NAME_INDEX = "node_parentId_name_key";

type PrismaishError = {
  code?: unknown;
  meta?: { target?: unknown; constraint?: unknown };
};

/**
 * True when Prisma rejected a write because the folder already holds that name.
 * Which of `target` / `constraint` names the index depends on the driver.
 */
export function isNameConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, meta } = error as PrismaishError;
  if (code !== UNIQUE_VIOLATION) return false;

  const reported = [meta?.constraint, meta?.target].flat();
  return reported.some(
    (value) => typeof value === "string" && value.includes(NAME_INDEX),
  );
}
