import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const cycleProfiles = pgTable(
  "cycle_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lastPeriodStart: date("last_period_start").notNull(),
    averageCycleDays: integer("average_cycle_days").default(28).notNull(),
    averagePeriodDays: integer("average_period_days").default(5).notNull(),
    goals: text("goals").array().default([]).notNull(),
    sensitivities: text("sensitivities").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("cycle_profiles_user_id_idx").on(table.userId)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category").notNull(),
    ingredientsRaw: text("ingredients_raw"),
    ingredientTags: text("ingredient_tags").array().default([]).notNull(),
    usageFrequency: text("usage_frequency"),
    usageTimeOfDay: text("usage_time_of_day"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("products_user_id_idx").on(table.userId)],
);

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    cycleDay: integer("cycle_day"),
    season: text("season").default("unknown").notNull(),
    symptoms: text("symptoms").array().default([]).notNull(),
    reactionSeverity: integer("reaction_severity").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("daily_logs_user_id_idx").on(table.userId),
    uniqueIndex("daily_logs_user_date_idx").on(table.userId, table.logDate),
  ],
);

export const routineEvents = pgTable(
  "routine_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dailyLogId: uuid("daily_log_id")
      .notNull()
      .references(() => dailyLogs.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    timeOfDay: text("time_of_day").notNull(),
    wasNewProduct: boolean("was_new_product").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("routine_events_user_id_idx").on(table.userId),
    index("routine_events_daily_log_id_idx").on(table.dailyLogId),
    index("routine_events_product_id_idx").on(table.productId),
  ],
);

export const aiRecommendations = pgTable(
  "ai_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    season: text("season").notNull(),
    inputSummary: jsonb("input_summary").notNull(),
    recommendation: jsonb("recommendation").notNull(),
    safetyNotes: text("safety_notes").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("ai_recommendations_user_id_idx").on(table.userId)],
);

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  cycleProfile: one(cycleProfiles),
  products: many(products),
  dailyLogs: many(dailyLogs),
  routineEvents: many(routineEvents),
  aiRecommendations: many(aiRecommendations),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const cycleProfileRelations = relations(cycleProfiles, ({ one }) => ({
  user: one(user, {
    fields: [cycleProfiles.userId],
    references: [user.id],
  }),
}));

export const productRelations = relations(products, ({ many, one }) => ({
  user: one(user, {
    fields: [products.userId],
    references: [user.id],
  }),
  routineEvents: many(routineEvents),
}));

export const dailyLogRelations = relations(dailyLogs, ({ many, one }) => ({
  user: one(user, {
    fields: [dailyLogs.userId],
    references: [user.id],
  }),
  routineEvents: many(routineEvents),
}));

export const routineEventRelations = relations(routineEvents, ({ one }) => ({
  user: one(user, {
    fields: [routineEvents.userId],
    references: [user.id],
  }),
  dailyLog: one(dailyLogs, {
    fields: [routineEvents.dailyLogId],
    references: [dailyLogs.id],
  }),
  product: one(products, {
    fields: [routineEvents.productId],
    references: [products.id],
  }),
}));

export const aiRecommendationRelations = relations(aiRecommendations, ({ one }) => ({
  user: one(user, {
    fields: [aiRecommendations.userId],
    references: [user.id],
  }),
}));
