import { Hono } from "hono";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

import { products } from "../db/schema";
import { db, requireAuth, userId, type AppEnv } from "../lib/http";

const productSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional().nullable(),
  category: z.string().min(1),
  ingredientsRaw: z.string().optional().nullable(),
  ingredientTags: z.array(z.string()).default([]),
  usageFrequency: z.string().optional().nullable(),
  usageTimeOfDay: z.string().optional().nullable(),
});

export const productRoutes = new Hono<AppEnv>();

productRoutes.use("*", requireAuth);

productRoutes.get("/", async (c) => {
  const rows = await db(c)
    .select()
    .from(products)
    .where(eq(products.userId, userId(c)))
    .orderBy(desc(products.createdAt));

  return c.json({ products: rows });
});

productRoutes.post("/", async (c) => {
  const body = productSchema.parse(await c.req.json());
  const [product] = await db(c)
    .insert(products)
    .values({
      userId: userId(c),
      name: body.name,
      brand: body.brand ?? null,
      category: body.category,
      ingredientsRaw: body.ingredientsRaw ?? null,
      ingredientTags: body.ingredientTags,
      usageFrequency: body.usageFrequency ?? null,
      usageTimeOfDay: body.usageTimeOfDay ?? null,
    })
    .returning();

  return c.json({ product }, 201);
});
