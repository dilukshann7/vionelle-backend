import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import * as schema from "../db/schema";
import { createDb } from "./db";

type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CORS_ORIGIN?: string;
};

export function createAuth(env: AuthEnv) {
  return betterAuth({
    appName: "Vionelle",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(createDb(env.DATABASE_URL), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: env.CORS_ORIGIN?.split(",").map((origin) => origin.trim()) ?? [],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];
