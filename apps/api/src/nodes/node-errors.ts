/**
 * Two names can't collide inside one folder — the database says so through the
 * `node_parentId_name_key` unique index, and it says so under concurrency,
 * which a read-then-write check in the service cannot. The service lets the
 * insert run and translates the violation here; the controller turns this into
 * a 409 with the name in it.
 *
 * The rule is: reject. No silent "Report (2).pdf" — the user chose a name, and
 * a rename they didn't ask for is worse than being told.
 */
export class NodeNameConflictError extends Error {
  // Not `name`: Error already owns that, and it holds the class name.
  constructor(readonly nodeName: string) {
    super(`A file or folder named "${nodeName}" already exists here`);
    this.name = "NodeNameConflictError";
  }
}

/** The node isn't there — deleted by another session, or never existed. */
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
 * Prisma reports the offending constraint differently depending on the driver,
 * hence both `target` and `constraint`.
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
