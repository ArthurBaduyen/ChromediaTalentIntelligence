import type { AccessTokenPayload } from "./auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export {};
