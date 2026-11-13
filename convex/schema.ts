import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("trainer"), v.literal("client"));

export const emailStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("skipped"),
  v.literal("failed"),
);

export const pushStatus = v.union(
  v.literal("pending"),
  v.literal("recorded"),
  v.literal("skipped"),
  v.literal("failed"),
);

export const inAppStatus = v.union(v.literal("unread"), v.literal("read"));

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(role),
  }).index("by_email", ["email"]),

  trainerClients: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_trainer", ["trainerId"])
    .index("by_client", ["clientId"])
    .index("by_pair", ["trainerId", "clientId"]),

  lessonPacks: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    lessonsRemaining: v.number(),
    updatedAt: v.number(),
  }).index("by_pair", ["trainerId", "clientId"]),

  passes: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    paidThrough: v.number(),
    updatedAt: v.number(),
  }).index("by_pair", ["trainerId", "clientId"]),

  deviceTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  notifications: defineTable({
    recipientId: v.id("users"),
    trainerId: v.id("users"),
    title: v.string(),
    body: v.string(),
    inAppStatus,
    emailStatus,
    pushStatus,
    createdAt: v.number(),
  }).index("by_recipient", ["recipientId"]),
});
