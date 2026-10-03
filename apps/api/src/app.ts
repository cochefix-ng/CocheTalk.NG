import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middleware/authMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const rawOrigins = process.env.CORS_ALLOWED_ORIGINS ?? "*";
const allowedOrigins = new Set(
  rawOrigins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.size === 0 || allowedOrigins.has("*") || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed"));
    },
  }),
);

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));
app.use(authMiddleware);

app.get("/", (_req, res) => res.json({ status: "ok", service: "CocheTalk API" }));
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.use("/api", router);

app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  req.log.error({ error }, "Unhandled API error");
  if (res.headersSent) return;
  const message = error instanceof Error ? error.message : "Request failed";
  const status = message.includes("entity.too.large") ? 413 : message === "Origin not allowed" ? 403 : 500;
  return res.status(status).json({ error: status === 500 ? "Internal server error" : message });
});

export default app;
