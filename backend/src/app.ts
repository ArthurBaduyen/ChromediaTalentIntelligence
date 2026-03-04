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

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "img-src": ["'self'", "data:", "https:"],
          "connect-src": ["'self'", env.CORS_ORIGIN]
        }
      }
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"]
    })
  );

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 300,
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
