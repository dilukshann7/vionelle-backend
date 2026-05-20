import type { Context, Next } from "hono";

import { createDb } from "./db";
import type { AuthSession } from "./auth";

export type AppEnv = {
  Bindings: {
    DATABASE_URL: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    CORS_ORIGIN?: string;
    AI_API_KEY?: string;
    AI_MODEL?: string;
  };
  Variables: {
    user: AuthSession["user"] | null;
    session: AuthSession["session"] | null;
  };
};

export type AppContext = Context<AppEnv>;

export function db(c: AppContext) {
  return createDb(c.env.DATABASE_URL);
}

export async function requireAuth(c: AppContext, next: Next) {
  if (!c.get("user") || !c.get("session")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
}

export function userId(c: AppContext) {
  const user = c.get("user");
  if (!user) throw new Error("Authenticated user missing");
  return user.id;
}
