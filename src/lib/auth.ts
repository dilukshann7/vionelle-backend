import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

import * as schema from "../db/schema";
import { createDb } from "./db";

type AuthEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CORS_ORIGIN?: string;
};

const defaultTrustedOrigins = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
];

function getTrustedOrigins(env: AuthEnv) {
  const configuredOrigins =
    env.CORS_ORIGIN?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  return Array.from(new Set([...defaultTrustedOrigins, ...configuredOrigins]));
}

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
    plugins: [bearer()],
    trustedOrigins: getTrustedOrigins(env),
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth["$Infer"]["Session"];
