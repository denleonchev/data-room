/** Unknown, malformed, or revoked — all three look identical to the caller. */
export class ShareNotFoundError extends Error {
  constructor() {
    super("This link is no longer valid");
    this.name = "ShareNotFoundError";
  }
}

/** You already own it — a restricted share of your own item to yourself is meaningless. */
export class SelfInviteError extends Error {
  constructor() {
    super("You already have full access to your own item");
    this.name = "SelfInviteError";
  }
}
