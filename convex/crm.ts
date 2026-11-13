import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  endOfUtcDay,
  formatPolishDate,
  normalizeEmail,
  requireClient,
  requireLink,
  requireTrainer,
  requireUser,
} from "./guards";

const clientRow = v.object({
  clientId: v.id("users"),
  name: v.string(),
  email: v.string(),
  lessonsRemaining: v.union(v.number(), v.null()),
  paidThrough: v.union(v.number(), v.null()),
});

async function balance(
  ctx: QueryCtx | MutationCtx,
  trainerId: Id<"users">,
  clientId: Id<"users">,
) {
  const pack = await ctx.db
    .query("lessonPacks")
    .withIndex("by_pair", (q) =>
      q.eq("trainerId", trainerId).eq("clientId", clientId),
    )
    .unique();
  const pass = await ctx.db
    .query("passes")
    .withIndex("by_pair", (q) =>
      q.eq("trainerId", trainerId).eq("clientId", clientId),
    )
    .unique();
  return {
    lessonsRemaining: pack?.lessonsRemaining ?? null,
    paidThrough: pass?.paidThrough ?? null,
  };
}

export const listClients = query({
  args: {},
  returns: v.array(clientRow),
  handler: async (ctx) => {
    const trainer = requireTrainer(await requireUser(ctx));
    const links = await ctx.db
      .query("trainerClients")
      .withIndex("by_trainer", (q) => q.eq("trainerId", trainer._id))
      .take(50);
    const rows = [];
    for (const link of links) {
      const client = await ctx.db.get("users", link.clientId);
      if (client === null) {
        continue;
      }
      const amounts = await balance(ctx, trainer._id, client._id);
      rows.push({
        clientId: client._id,
        name: client.name ?? "Klient",
        email: client.email ?? "",
        ...amounts,
      });
    }
    return rows;
  },
});

const notificationRow = v.object({
  id: v.id("notifications"),
  title: v.string(),
  body: v.string(),
  inAppStatus: v.union(v.literal("unread"), v.literal("read")),
  emailStatus: v.union(
    v.literal("pending"),
    v.literal("sent"),
    v.literal("skipped"),
    v.literal("failed"),
  ),
  pushStatus: v.union(
    v.literal("pending"),
    v.literal("recorded"),
    v.literal("skipped"),
    v.literal("failed"),
  ),
  createdAt: v.number(),
});

export const clientHome = query({
  args: {},
  returns: v.object({
    name: v.string(),
    email: v.string(),
    trainerName: v.union(v.string(), v.null()),
    lessonsRemaining: v.union(v.number(), v.null()),
    paidThrough: v.union(v.number(), v.null()),
    notifications: v.array(notificationRow),
  }),
  handler: async (ctx) => {
    const client = requireClient(await requireUser(ctx));
    const link = (
      await ctx.db
        .query("trainerClients")
        .withIndex("by_client", (q) => q.eq("clientId", client._id))
        .take(1)
    )[0];
    const trainer = link ? await ctx.db.get("users", link.trainerId) : null;
    const amounts = link
      ? await balance(ctx, link.trainerId, client._id)
      : { lessonsRemaining: null, paidThrough: null };
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q) => q.eq("recipientId", client._id))
      .order("desc")
      .take(30);
    return {
      name: client.name ?? "Klient",
      email: client.email ?? "",
      trainerName: trainer?.name ?? null,
      ...amounts,
      notifications: notifications.map((item) => ({
        id: item._id,
        title: item.title,
        body: item.body,
        inAppStatus: item.inAppStatus,
        emailStatus: item.emailStatus,
        pushStatus: item.pushStatus,
        createdAt: item.createdAt,
      })),
    };
  },
});

export const addClient = mutation({
  args: { email: v.string() },
  returns: v.id("trainerClients"),
  handler: async (ctx, args) => {
    const trainer = requireTrainer(await requireUser(ctx));
    const email = normalizeEmail(args.email);
    const rawId = await ctx.runQuery(
      components.authUsername.public.getUserIdByUsername,
      { username: email },
    );
    if (rawId === null) {
      throw new ConvexError(
        "Nie ma klienta z tym e-mailem. Osoba musi najpierw założyć konto.",
      );
    }
    const clientId = ctx.db.normalizeId("users", rawId);
    if (clientId === null) {
      throw new ConvexError("Nie udało się znaleźć konta klienta.");
    }
    const client = await ctx.db.get("users", clientId);
    if (client === null || client.role !== "client") {
      throw new ConvexError(
        "To konto nie jest kontem klienta. Poproś o dokończenie rejestracji.",
      );
    }
    if (client._id === trainer._id) {
      throw new ConvexError("Nie możesz dodać siebie.");
    }
    const existing = await ctx.db
      .query("trainerClients")
      .withIndex("by_pair", (q) =>
        q.eq("trainerId", trainer._id).eq("clientId", client._id),
      )
      .unique();
    if (existing !== null) {
      return existing._id;
    }
    const other = await ctx.db
      .query("trainerClients")
      .withIndex("by_client", (q) => q.eq("clientId", client._id))
      .take(1);
    if (other.length > 0) {
      throw new ConvexError("Ten klient jest już przypisany do innego trenera.");
    }
    return await ctx.db.insert("trainerClients", {
      trainerId: trainer._id,
      clientId: client._id,
      createdAt: Date.now(),
    });
  },
});

export const setLessons = mutation({
  args: {
    clientId: v.id("users"),
    lessonsRemaining: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trainer = requireTrainer(await requireUser(ctx));
    await requireLink(ctx, trainer._id, args.clientId);
    if (
      !Number.isInteger(args.lessonsRemaining) ||
      args.lessonsRemaining < 0 ||
      args.lessonsRemaining > 500
    ) {
      throw new ConvexError("Podaj liczbę treningów od 0 do 500.");
    }
    const existing = await ctx.db
      .query("lessonPacks")
      .withIndex("by_pair", (q) =>
        q.eq("trainerId", trainer._id).eq("clientId", args.clientId),
      )
      .unique();
    const updatedAt = Date.now();
    if (existing === null) {
      await ctx.db.insert("lessonPacks", {
        trainerId: trainer._id,
        clientId: args.clientId,
        lessonsRemaining: args.lessonsRemaining,
        updatedAt,
      });
    } else {
      await ctx.db.patch("lessonPacks", existing._id, {
        lessonsRemaining: args.lessonsRemaining,
        updatedAt,
      });
    }
    return null;
  },
});

export const setPass = mutation({
  args: {
    clientId: v.id("users"),
    paidThrough: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trainer = requireTrainer(await requireUser(ctx));
    await requireLink(ctx, trainer._id, args.clientId);
    const paidThrough = endOfUtcDay(args.paidThrough);
    const existing = await ctx.db
      .query("passes")
      .withIndex("by_pair", (q) =>
        q.eq("trainerId", trainer._id).eq("clientId", args.clientId),
      )
      .unique();
    const updatedAt = Date.now();
    if (existing === null) {
      await ctx.db.insert("passes", {
        trainerId: trainer._id,
        clientId: args.clientId,
        paidThrough,
        updatedAt,
      });
    } else {
      await ctx.db.patch("passes", existing._id, { paidThrough, updatedAt });
    }
    return null;
  },
});

export const sendReminder = mutation({
  args: {
    clientId: v.id("users"),
    note: v.optional(v.string()),
  },
  returns: v.id("notifications"),
  handler: async (ctx, args) => {
    const trainer = requireTrainer(await requireUser(ctx));
    await requireLink(ctx, trainer._id, args.clientId);
    const client = await ctx.db.get("users", args.clientId);
    if (client === null) {
      throw new ConvexError("Nie znaleziono klienta.");
    }
    const note = args.note?.trim() ?? "";
    if (note.length > 500) {
      throw new ConvexError("Notatka może mieć najwyżej 500 znaków.");
    }
    const amounts = await balance(ctx, trainer._id, client._id);
    const lessonsLine =
      amounts.lessonsRemaining === null
        ? "Pakiet treningów nie jest ustawiony."
        : `Zostało treningów: ${amounts.lessonsRemaining}.`;
    const passLine =
      amounts.paidThrough === null
        ? "Karnet nie jest opłacony."
        : `Karnet opłacony do ${formatPolishDate(amounts.paidThrough)}.`;
    const who = trainer.name ?? "Twój trener";
    const body = `Cześć ${client.name ?? ""}! ${who} przypomina: ${lessonsLine} ${passLine}${note ? ` ${note}` : ""}`;
    const tokens = await ctx.db
      .query("deviceTokens")
      .withIndex("by_user", (q) => q.eq("userId", client._id))
      .take(20);
    const notificationId = await ctx.db.insert("notifications", {
      recipientId: client._id,
      trainerId: trainer._id,
      title: "Przypomnienie o karnecie",
      body,
      inAppStatus: "unread",
      emailStatus: client.email ? "pending" : "skipped",
      pushStatus: tokens.length > 0 ? "pending" : "skipped",
      createdAt: Date.now(),
    });
    if (client.email) {
      await ctx.scheduler.runAfter(0, internal.email.sendTransactional, {
        notificationId,
        to: client.email,
        subject: "Przypomnienie o karnecie",
        text: body,
      });
    }
    if (tokens.length > 0) {
      await ctx.scheduler.runAfter(0, internal.push.deliver, {
        notificationId,
        tokens: tokens.map((item) => item.token),
      });
    }
    return notificationId;
  },
});
