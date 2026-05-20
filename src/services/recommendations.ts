import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const recommendationOutputSchema = z.object({
  season: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
  summary: z.string(),
  pause: z
    .array(
      z.object({
        productId: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
  keep: z
    .array(
      z.object({
        productId: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
  replaceWithOwned: z
    .array(
      z.object({
        fromProductId: z.string(),
        toProductId: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
  buyingCriteria: z.array(z.string()).default([]),
  safetyNote: z.string(),
});

export type RecommendationOutput = z.infer<typeof recommendationOutputSchema>;

type RecommendationInput = {
  apiKey: string;
  model?: string;
  season: {
    season: string;
    cycleDay: number | null;
    confidence: string;
    reason: string;
  };
  products: unknown[];
  logs: unknown[];
};

export async function generateRoutineRecommendation(input: RecommendationInput) {
  const openai = createOpenAI({ apiKey: input.apiKey });
  const model = openai(input.model || "gpt-4o-mini");

  const result = await generateObject({
    model,
    schema: recommendationOutputSchema,
    temperature: 0.2,
    system:
      "You are Vionelle, a cautious skincare routine assistant. Give routine guidance only. Do not diagnose medical conditions, allergies, or hormonal disorders. Prefer simple barrier-safe routines and recommend dermatology care for severe or persistent symptoms.",
    prompt: JSON.stringify({
      task: "Create a conservative cycle-aware skincare routine recommendation.",
      currentSeason: input.season,
      products: input.products,
      recentLogs: input.logs,
      outputRules: [
        "Prefer products the user already owns before buying criteria.",
        "Do not invent product IDs.",
        "If data is sparse, lower confidence and explain uncertainty.",
        "Use pause only when a product looks risky for the current symptoms or season.",
      ],
    }),
  });

  return result.object;
}
