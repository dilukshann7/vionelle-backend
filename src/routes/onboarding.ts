import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { cycleProfiles } from "../db/schema";
import { calculateCycleSeason } from "../services/season";
import { db, requireAuth, userId, type AppEnv } from "../lib/http";

const onboardingSchema = z.object({
  lastPeriodStart: z.string().min(10),
  averageCycleDays: z.number().int().min(15).max(60).default(28),
  averagePeriodDays: z.number().int().min(1).max(14).default(5),
  goals: z.array(z.string()).default([]),
  sensitivities: z.array(z.string()).default([]),
});

export const onboardingRoutes = new Hono<AppEnv>();

onboardingRoutes.use("*", requireAuth);

onboardingRoutes.post("/", async (c) => {
  const body = onboardingSchema.parse(await c.req.json());
  const database = db(c);
  const id = userId(c);

  const [profile] = await database
    .insert(cycleProfiles)
    .values({
      userId: id,
      lastPeriodStart: body.lastPeriodStart,
      averageCycleDays: body.averageCycleDays,
      averagePeriodDays: body.averagePeriodDays,
      goals: body.goals,
      sensitivities: body.sensitivities,
    })
    .onConflictDoUpdate({
      target: cycleProfiles.userId,
      set: {
        lastPeriodStart: body.lastPeriodStart,
        averageCycleDays: body.averageCycleDays,
        averagePeriodDays: body.averagePeriodDays,
        goals: body.goals,
        sensitivities: body.sensitivities,
        updatedAt: new Date(),
      },
    })
    .returning();

  return c.json({ profile });
});

onboardingRoutes.get("/season", async (c) => {
  const database = db(c);
  const id = userId(c);
  const [profile] = await database.select().from(cycleProfiles).where(eq(cycleProfiles.userId, id));

  const season = calculateCycleSeason({
    lastPeriodStart: profile?.lastPeriodStart ?? null,
    averageCycleDays: profile?.averageCycleDays ?? 28,
    averagePeriodDays: profile?.averagePeriodDays ?? 5,
  });

  return c.json({ profile: profile ?? null, season });
});
