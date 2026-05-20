import { Hono } from "hono";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { cycleProfiles, dailyLogs, routineEvents } from "../db/schema";
import { db, requireAuth, userId, type AppEnv } from "../lib/http";
import { calculateCycleSeason } from "../services/season";

const logSchema = z.object({
  logDate: z.string().min(10),
  symptoms: z.array(z.string()).default([]),
  reactionSeverity: z.number().int().min(0).max(3).default(0),
  notes: z.string().optional().nullable(),
  usedProducts: z
    .array(
      z.object({
        productId: z.string().uuid(),
        timeOfDay: z.string().default("both"),
        wasNewProduct: z.boolean().default(false),
      }),
    )
    .default([]),
});

export const logRoutes = new Hono<AppEnv>();

logRoutes.use("*", requireAuth);

logRoutes.get("/recent", async (c) => {
  const rows = await db(c)
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, userId(c)))
    .orderBy(desc(dailyLogs.logDate))
    .limit(14);

  return c.json({ logs: rows });
});

logRoutes.post("/", async (c) => {
  const body = logSchema.parse(await c.req.json());
  const database = db(c);
  const id = userId(c);
  const [profile] = await database.select().from(cycleProfiles).where(eq(cycleProfiles.userId, id));
  const season = calculateCycleSeason({
    today: body.logDate,
    lastPeriodStart: profile?.lastPeriodStart ?? null,
    averageCycleDays: profile?.averageCycleDays ?? 28,
    averagePeriodDays: profile?.averagePeriodDays ?? 5,
  });

  const [log] = await database
    .insert(dailyLogs)
    .values({
      userId: id,
      logDate: body.logDate,
      cycleDay: season.cycleDay,
      season: season.season,
      symptoms: body.symptoms,
      reactionSeverity: body.reactionSeverity,
      notes: body.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [dailyLogs.userId, dailyLogs.logDate],
      set: {
        cycleDay: season.cycleDay,
        season: season.season,
        symptoms: body.symptoms,
        reactionSeverity: body.reactionSeverity,
        notes: body.notes ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (body.usedProducts.length > 0) {
    await database.delete(routineEvents).where(eq(routineEvents.dailyLogId, log.id));
    await database.insert(routineEvents).values(
      body.usedProducts.map((event) => ({
        userId: id,
        dailyLogId: log.id,
        productId: event.productId,
        timeOfDay: event.timeOfDay,
        wasNewProduct: event.wasNewProduct,
      })),
    );
  }

  return c.json({ log, season });
});
