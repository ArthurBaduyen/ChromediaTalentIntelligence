import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes/api";
import { attachAuth } from "./middleware/auth";
import { requireCsrf } from "./middleware/csrf";
import { getAppEnv } from "./config/env";

const env = getAppEnv();

function getAllowedOrigins() {
  const configured = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
    : [];
  const origins = [env.CORS_ORIGIN, ...configured];
  return [...new Set(origins)];
}

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  app.use(
    helmet({
      hsts: env.NODE_ENV === "production",
      referrerPolicy: { policy: "no-referrer" },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "base-uri": ["'none'"],
          "frame-ancestors": ["'none'"],
          "form-action": ["'self'"],
          "object-src": ["'none'"],
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'", ...allowedOrigins]
        }
      }
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"]
    })
  );

  app.use(
    rateLimit({
      windowMs: env.GLOBAL_RATE_LIMIT_WINDOW_MS,
      max: env.GLOBAL_RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(attachAuth);
  app.use(requireCsrf);

  app.use("/api", apiRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Unexpected error";
    res.status(500).json({ message });
  });

  return app;
}
