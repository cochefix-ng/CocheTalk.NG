import { randomUUID } from "node:crypto";

const SIDECAR = "http://127.0.0.1:1106";

export class ObjectNotFoundError extends Error {}

function privateDir() {
  const value = process.env.PRIVATE_OBJECT_DIR;
  if (!value) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  return value.replace(/\/+$/, "");
}

function parsePath(value: string) {
  const url = new URL(value.startsWith("http") ? value : `https://storage.googleapis.com${value}`);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new ObjectNotFoundError("Invalid object path");
  return { bucket: parts[0], object: parts.slice(1).join("/") };
}

async function sign(bucket: string, object: string, method: "GET" | "PUT") {
  const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bucket_name: bucket, object_name: object, method, expires_at: new Date(Date.now() + 900_000).toISOString() }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Object storage signing failed: ${response.status}`);
  return (await response.json() as { signed_url: string }).signed_url;
}

export class ObjectStorageService {
  async getUpload() {
    const { bucket, object } = parsePath(`${privateDir()}/uploads/${randomUUID()}`);
    const uploadURL = await sign(bucket, object, "PUT");
    return { uploadURL, objectPath: `/objects/${object}` };
  }

  async getObject(objectPath: string) {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError("Invalid object path");
    const { bucket, object } = parsePath(`${privateDir()}/${objectPath.slice("/objects/".length)}`);
    const signedURL = await sign(bucket, object, "GET");
    const response = await fetch(signedURL, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new ObjectNotFoundError("Object not found");
    return response;
  }
}