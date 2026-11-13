import { ConvexError, v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { emailStatus, pushStatus } from "./schema";
import { requireUser } from "./guards";

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const notification = await ctx.db.get("notifications", args.notificationId);
    if (notification === null || notification.recipientId !== user._id) {
      throw new ConvexError("Nie znaleziono powiadomienia.");
    }
    await ctx.db.patch("notifications", notification._id, {
      inAppStatus: "read",
    });
    return null;
  },
});

export const registerDevice = mutation({
  args: {
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const token = args.token.trim();
    if (token.length < 8 || token.length > 256) {
      throw new ConvexError("Niepoprawny token urządzenia.");
    }
    const existing = await ctx.db
      .query("deviceTokens")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    const updatedAt = Date.now();
    if (existing === null) {
      await ctx.db.insert("deviceTokens", {
        userId: user._id,
        token,
        platform: args.platform,
        updatedAt,
      });
    } else {
      await ctx.db.patch("deviceTokens", existing._id, {
        userId: user._id,
        platform: args.platform,
        updatedAt,
      });
    }
    return null;
  },
});

export const setEmailStatus = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    emailStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get("notifications", args.notificationId);
    if (notification === null) {
      return null;
    }
    await ctx.db.patch("notifications", notification._id, {
      emailStatus: args.emailStatus,
    });
    return null;
  },
});

export const setPushStatus = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    pushStatus,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get("notifications", args.notificationId);
    if (notification === null) {
      return null;
    }
    await ctx.db.patch("notifications", notification._id, {
      pushStatus: args.pushStatus,
    });
    return null;
  },
});
