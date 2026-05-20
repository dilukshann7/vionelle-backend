import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";

import { aiRecommendations, cycleProfiles, dailyLogs, products } from "../db/schema";
import { db, requireAuth, userId, type AppEnv } from "../lib/http";
import { generateRoutineRecommendation } from "../services/recommendations";
import { calculateCycleSeason } from "../services/season";

export const recommendationRoutes = new Hono<AppEnv>();

recommendationRoutes.use("*", requireAuth);

recommendationRoutes.get("/latest", async (c) => {
  const [latest] = await db(c)
    .select()
    .from(aiRecommendations)
    .where(eq(aiRecommendations.userId, userId(c)))
    .orderBy(desc(aiRecommendations.createdAt))
    .limit(1);

  return c.json({ recommendation: latest ?? null });
});

recommendationRoutes.post("/generate", async (c) => {
  if (!c.env.AI_API_KEY) {
    return c.json({ error: "AI_API_KEY is not configured" }, 503);
  }

  const database = db(c);
  const id = userId(c);
  const [profile] = await database.select().from(cycleProfiles).where(eq(cycleProfiles.userId, id));
  const productRows = await database.select().from(products).where(eq(products.userId, id));
  const logRows = await database
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, id))
    .orderBy(desc(dailyLogs.logDate))
    .limit(14);

  const season = calculateCycleSeason({
    lastPeriodStart: profile?.lastPeriodStart ?? null,
    averageCycleDays: profile?.averageCycleDays ?? 28,
    averagePeriodDays: profile?.averagePeriodDays ?? 5,
  });

  const recommendation = await generateRoutineRecommendation({
    apiKey: c.env.AI_API_KEY,
    model: c.env.AI_MODEL,
    season,
    products: productRows,
    logs: logRows,
  });

  const [saved] = await database
    .insert(aiRecommendations)
    .values({
      userId: id,
      season: recommendation.season,
      inputSummary: {
        season,
        productCount: productRows.length,
        logCount: logRows.length,
      },
      recommendation,
      safetyNotes: [recommendation.safetyNote],
    })
    .returning();

  return c.json({ recommendation: saved });
});
