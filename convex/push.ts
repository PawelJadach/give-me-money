import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// Push stub. Device tokens are stored by registerDevice. This action records
// the send and does not call APNs or FCM. No push credentials are read.
export const deliver = internalAction({
  args: {
    notificationId: v.id("notifications"),
    tokens: v.array(v.string()),
  },
  returns: v.object({
    status: v.literal("recorded"),
    tokenCount: v.number(),
  }),
  handler: async (ctx, args) => {
    console.log("push recorded", args.tokens.length);
    await ctx.runMutation(internal.notifications.setPushStatus, {
      notificationId: args.notificationId,
      pushStatus: "recorded",
    });
    return { status: "recorded" as const, tokenCount: args.tokens.length };
  },
});
