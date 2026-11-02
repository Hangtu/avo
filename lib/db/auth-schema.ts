import { relations, sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Generated with `auth@1.7.15 generate --adapter drizzle --dialect postgresql`.
 * Reviewed changes: Runo table/index names, timestamptz, normalized-email and
 * provider-identity uniqueness. No auth endpoint or provider is enabled here.
 */
const instant = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const authUsers = pgTable("runo_auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: instant("created_at").defaultNow().notNull(),
  updatedAt: instant("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [
  // Do not collapse Gmail dots/aliases or infer ownership from this index.
  uniqueIndex("runo_auth_users_email_normalized_idx").on(sql`lower(btrim(${table.email}))`),
]);

export const authSessions = pgTable("runo_auth_sessions", {
  id: text("id").primaryKey(),
  expiresAt: instant("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: instant("created_at").defaultNow().notNull(),
  updatedAt: instant("updated_at").$onUpdate(() => new Date()).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
}, (table) => [index("runo_auth_sessions_user_idx").on(table.userId)]);

export const authAccounts = pgTable("runo_auth_accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: instant("access_token_expires_at"),
  refreshTokenExpiresAt: instant("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: instant("created_at").defaultNow().notNull(),
  updatedAt: instant("updated_at").$onUpdate(() => new Date()).notNull(),
}, (table) => [
  index("runo_auth_accounts_user_idx").on(table.userId),
  uniqueIndex("runo_auth_accounts_provider_identity_idx").on(table.providerId, table.accountId),
]);

export const authVerifications = pgTable("runo_auth_verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: instant("expires_at").notNull(),
  createdAt: instant("created_at").defaultNow().notNull(),
  updatedAt: instant("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => [index("runo_auth_verifications_identifier_idx").on(table.identifier)]);

export const authUsersRelations = relations(authUsers, ({ many }) => ({
  sessions: many(authSessions),
  accounts: many(authAccounts),
}));
export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, { fields: [authSessions.userId], references: [authUsers.id] }),
}));
export const authAccountsRelations = relations(authAccounts, ({ one }) => ({
  user: one(authUsers, { fields: [authAccounts.userId], references: [authUsers.id] }),
}));

/** Use default Better Auth model names without sharing the legacy domain users table. */
export const authAdapterSchema = {
  user: authUsers,
  session: authSessions,
  account: authAccounts,
  verification: authVerifications,
};
