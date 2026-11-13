import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Zaloguj się.");
  }
  const user = await ctx.db.get("users", userId);
  if (user === null) {
    throw new ConvexError("Nie znaleziono konta.");
  }
  return user;
}

export function requireTrainer(user: Doc<"users">): Doc<"users"> {
  if (user.role !== "trainer") {
    throw new ConvexError("To konto nie jest kontem trenera.");
  }
  return user;
}

export function requireClient(user: Doc<"users">): Doc<"users"> {
  if (user.role !== "client") {
    throw new ConvexError("To konto nie jest kontem klienta.");
  }
  return user;
}

export function normalizeEmail(email: string): string {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 100) {
    throw new ConvexError("Podaj poprawny e-mail.");
  }
  return value;
}

export function endOfUtcDay(isoDate: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    throw new ConvexError("Podaj datę w formacie RRRR-MM-DD.");
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const stamp = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
  const check = new Date(stamp);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new ConvexError("Niepoprawna data.");
  }
  return stamp;
}

export function formatPolishDate(stamp: number): string {
  const date = new Date(stamp);
  const months = [
    "sty",
    "lut",
    "mar",
    "kwi",
    "maj",
    "cze",
    "lip",
    "sie",
    "wrz",
    "paź",
    "lis",
    "gru",
  ];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export async function requireLink(
  ctx: Ctx,
  trainerId: Id<"users">,
  clientId: Id<"users">,
) {
  const link = await ctx.db
    .query("trainerClients")
    .withIndex("by_pair", (q) =>
      q.eq("trainerId", trainerId).eq("clientId", clientId),
    )
    .unique();
  if (link === null) {
    throw new ConvexError("Ten klient nie jest na Twojej liście.");
  }
  return link;
}
