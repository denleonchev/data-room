/** Unknown, malformed, or revoked — all three look identical to the caller. */
export class ShareNotFoundError extends Error {
  constructor() {
    super("This link is no longer valid");
    this.name = "ShareNotFoundError";
  }
}
