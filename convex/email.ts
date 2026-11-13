import { v } from "convex/values";
import { internal } from "./_generated/api";
import { env, internalAction } from "./_generated/server";

// Transactional mail. Set RESEND_API_KEY on the Convex deployment.
// No key is invented here: without it the notification stays in the app
// and the email status is "skipped".
export const sendTransactional = internalAction({
  args: {
    notificationId: v.id("notifications"),
    to: v.string(),
    subject: v.string(),
    text: v.string(),
  },
  returns: v.union(
    v.literal("sent"),
    v.literal("skipped"),
    v.literal("failed"),
  ),
  handler: async (ctx, args) => {
    const apiKey = env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("RESEND_API_KEY is unset; email skipped");
      await ctx.runMutation(internal.notifications.setEmailStatus, {
        notificationId: args.notificationId,
        emailStatus: "skipped",
      });
      return "skipped";
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Karnet <onboarding@resend.dev>",
        to: [args.to],
        subject: args.subject,
        text: args.text,
      }),
    });
    const emailStatus = response.ok ? "sent" : "failed";
    if (!response.ok) {
      console.log("Resend rejected the email", response.status);
    }
    await ctx.runMutation(internal.notifications.setEmailStatus, {
      notificationId: args.notificationId,
      emailStatus,
    });
    return emailStatus;
  },
});
