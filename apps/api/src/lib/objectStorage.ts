import { randomUUID } from "node:crypto";
import { supabase } from "./supabase";

/**
 * Object storage backed by Supabase Storage.
 * (Previously used Replit's object-storage sidecar on 127.0.0.1:1106, which only exists on Replit.)
 *
 * Objects are addressed as "/objects/<key>", where <key> is the path inside the bucket.
 * The bucket is private; files are served through GET /api/storage/objects/*.
 */
const BUCKET = process.env.STORAGE_BUCKET || "listing-images";

export class ObjectNotFoundError extends Error {}

let bucketReady: Promise<void> | null = null;

function ensureBucket(): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await supabase.storage.getBucket(BUCKET);
      if (data) return;
      const { error } = await supabase.storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: "10MB",
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
      if (error && !/already exists/i.test(error.message)) {
        throw new Error(`Could not create storage bucket "${BUCKET}": ${error.message}`);
      }
    })().catch((error) => {
      bucketReady = null; // retry on next request
      throw error;
    });
  }
  return bucketReady;
}

function keyFromObjectPath(objectPath: string) {
  if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError("Invalid object path");
  const key = objectPath.slice("/objects/".length);
  if (!key || key.includes("..")) throw new ObjectNotFoundError("Invalid object path");
  return key;
}

export class ObjectStorageService {
  /** Returns a one-time URL the client can PUT the raw file to. */
  async getUpload() {
    await ensureBucket();
    const key = `uploads/${randomUUID()}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key);
    if (error || !data) throw new Error(`Object storage signing failed: ${error?.message ?? "unknown error"}`);
    return { uploadURL: data.signedUrl, objectPath: `/objects/${key}` };
  }

  async getObject(objectPath: string) {
    const key = keyFromObjectPath(objectPath);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, 60);
    if (error || !data) throw new ObjectNotFoundError("Object not found");
    const response = await fetch(data.signedUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new ObjectNotFoundError("Object not found");
    return response;
  }

  async deleteObject(objectPath: string) {
    const key = keyFromObjectPath(objectPath);
    const { error } = await supabase.storage.from(BUCKET).remove([key]);
    if (error) throw new Error(`Object deletion failed: ${error.message}`);
  }
}