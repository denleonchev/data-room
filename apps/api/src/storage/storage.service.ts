import { Injectable } from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";

// Thin wrapper around the Storage SDK, service_role only (server-side, never
// shipped to the client) — see docs/architecture.md's File storage section.
@Injectable()
export class StorageService {
  private readonly client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET!;

  /**
   * A URL the browser PUTs the file's bytes to directly, no further auth
   * needed — the token is embedded in the URL itself. Deliberately not
   * `uploadToSignedUrl()`: that SDK helper wraps `fetch` with no progress
   * hook, and real per-file progress needs the browser doing its own
   * `XMLHttpRequest` PUT against this URL.
   */
  async createSignedUploadUrl(objectKey: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(objectKey);
    if (error) throw error;
    return data.signedUrl;
  }

  /** The uploaded object's actual size, or null if nothing was ever PUT there. */
  async getUploadedSize(objectKey: string): Promise<number | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list("", { search: objectKey, limit: 1 });
    if (error) throw error;

    const object = data.find((item) => item.name === objectKey);
    return object?.metadata?.size ?? null;
  }

  /** A short-lived URL the browser GETs the file's bytes from directly. */
  async createSignedDownloadUrl(objectKey: string, expiresInSeconds: number): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(objectKey, expiresInSeconds);
    if (error) throw error;
    return data.signedUrl;
  }
}
