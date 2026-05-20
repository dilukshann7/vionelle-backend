import { Hono } from "hono";
import { cors } from "hono/cors";

import { createAuth, type AuthSession } from "./lib/auth";
import { logRoutes } from "./routes/logs";
import { onboardingRoutes } from "./routes/onboarding";
import { productRoutes } from "./routes/products";
import { recommendationRoutes } from "./routes/recommendations";

type Env = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  CORS_ORIGIN?: string;
  AI_API_KEY?: string;
  AI_MODEL?: string;
};

type Variables = {
  user: AuthSession["user"] | null;
  session: AuthSession["session"] | null;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedOrigins =
        c.env.CORS_ORIGIN?.split(",").map((value: string) => value.trim()) ?? [];
      if (!origin) return "";
      if (allowedOrigins.includes(origin)) return origin;
      if (allowedOrigins.length === 0 && origin.startsWith("http://localhost")) return origin;
      return allowedOrigins[0] ?? "";
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use("*", async (c, next) => {
  if (new URL(c.req.url).pathname.startsWith("/api/auth")) {
    await next();
    return;
  }

  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);

  await next();
});

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

app.get("/health", (c) => {
  return c.json({ ok: true, service: "vionelle-backend" });
});

app.get("/api/me", (c) => {
  const user = c.get("user");
  const session = c.get("session");

  if (!user || !session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({ user, session });
});

app.route("/api/onboarding", onboardingRoutes);
app.route("/api/products", productRoutes);
app.route("/api/logs", logRoutes);
app.route("/api/recommendations", recommendationRoutes);

export default app;
