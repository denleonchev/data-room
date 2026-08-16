/**
 * `/complete` was called for a node whose bytes never actually landed in
 * Storage — a client-timing issue (the PUT hasn't finished, or never
 * happened), not a 404: the node itself exists and is owned by the caller.
 */
export class UploadNotFoundError extends Error {
  constructor(readonly nodeId: string) {
    super("Nothing has been uploaded to this location yet");
    this.name = "UploadNotFoundError";
  }
}
