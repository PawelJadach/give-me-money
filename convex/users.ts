import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { normalizeEmail, requireUser } from "./guards";

export const createFromUsernamePassword = internalMutation({
  args: {
    method: v.object({
      name: v.literal("usernamePassword"),
      profile: v.object({}),
    }),
  },
  returns: v.id("users"),
  handler: async (ctx) => {
    return await ctx.db.insert("users", {});
  },
});

export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      id: v.id("users"),
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
      role: v.union(v.literal("trainer"), v.literal("client"), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (user === null) {
      return null;
    }
    return {
      id: user._id,
      name: user.name ?? null,
      email: user.email ?? null,
      role: user.role ?? null,
    };
  },
});

export const completeProfile = mutation({
  args: {
    name: v.string(),
    role: v.union(v.literal("trainer"), v.literal("client")),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const email = normalizeEmail(args.email);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new ConvexError("Podaj imię i nazwisko (2–80 znaków).");
    }
    if (user.role !== undefined && user.role !== args.role) {
      throw new ConvexError("Rola konta jest już ustawiona.");
    }
    const username = await ctx.runQuery(
      components.authUsername.public.getUsername,
      { userId: user._id },
    );
    if (username === null || username.toLowerCase() !== email) {
      throw new ConvexError("E-mail musi być taki sam jak login.");
    }
    const taken = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (taken !== null && taken._id !== user._id) {
      throw new ConvexError("Ten e-mail jest już używany.");
    }
    await ctx.db.patch("users", user._id, {
      name,
      email,
      role: args.role,
    });
    return null;
  },
});
