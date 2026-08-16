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

/** A Data Room is a folder with no parent, and some things can't happen to it. */
export class RootNodeError extends Error {
  constructor(attempted: string) {
    super(`A Data Room can't be ${attempted}`);
    this.name = "RootNodeError";
  }
}

export class TreeTooDeepError extends Error {
  constructor() {
    super("Folders can't be nested any deeper");
    this.name = "TreeTooDeepError";
  }
}

/** A folder can't become its own descendant — checked before any write. */
export class NodeMoveIntoOwnSubtreeError extends Error {
  constructor() {
    super("A folder can't be moved into itself or one of its own subfolders");
    this.name = "NodeMoveIntoOwnSubtreeError";
  }
}

const UNIQUE_VIOLATION = "P2002";
const NAME_INDEX = "node_parentId_name_key";

type PrismaishError = {
  code?: unknown;
  meta?: {
    target?: unknown;
    constraint?: unknown;
    driverAdapterError?: {
      cause?: {
        originalMessage?: unknown;
        constraint?: { index?: unknown; fields?: unknown };
      };
    };
  };
};

/** True when a write lost to any unique index. */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return (error as PrismaishError).code === UNIQUE_VIOLATION;
}

/**
 * True when the write lost specifically to the name index — the folder already
 * holds that name.
 *
 * Where the offending index is named depends on how Prisma reached the
 * database. Through the pg driver adapter it arrives under
 * `meta.driverAdapterError`; the engine's own `meta.target` is what older setups
 * report. Both are read, because getting this wrong turns a 409 the user can act
 * on into a 500 they can't.
 */
export function isNameConflict(error: unknown): boolean {
  if (!isUniqueViolation(error)) return false;

  const meta = (error as PrismaishError).meta;
  const cause = meta?.driverAdapterError?.cause;
  const named = [
    meta?.target,
    meta?.constraint,
    cause?.originalMessage,
    cause?.constraint?.index,
  ]
    .flat()
    .some((value) => typeof value === "string" && value.includes(NAME_INDEX));
  if (named) return true;

  // Some adapter versions report the columns instead of the index name.
  const fields = [cause?.constraint?.fields].flat().map(String);
  return (
    fields.some((field) => field.includes("parentId")) &&
    fields.some((field) => field.includes("name"))
  );
}
