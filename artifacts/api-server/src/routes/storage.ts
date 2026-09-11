import { getAuth } from "@clerk/express";
import { Router, type IRouter } from "express";
import * as api from "@workspace/api-zod";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post("/storage/uploads/request-url", async (req, res) => {
  if (!getAuth(req).userId) return res.status(401).json({ error: "Authentication required" });
  const parsed = api.RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  try {
    const result = await storage.getUpload();
    return res.json(api.RequestUploadUrlResponse.parse({ ...result, metadata: parsed.data }));
  } catch (error) {
    req.log.error({ error }, "Failed to create object upload URL");
    return res.status(503).json({ error: "Storage unavailable" });
  }
});

router.get("/storage/objects/*path", async (req, res) => {
  try {
    const raw = req.params.path;
    const objectPath = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
    const upstream = await storage.getObject(objectPath);
    upstream.headers.forEach((value, key) => res.setHeader(key, value));
    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    res.on("close", () => void reader.cancel());
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      res.write(Buffer.from(next.value));
    }
    return res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) return res.status(404).json({ error: "Object not found" });
    req.log.error({ error }, "Failed to serve object");
    return res.status(503).json({ error: "Storage unavailable" });
  }
});

export default router;