import { defineApp } from "convex/server";
import { v } from "convex/values";
import auth from "@convex-dev/auth/convex.config.js";
import authPassword from "@convex-dev/auth/components/password/convex.config.js";
import authUsername from "@convex-dev/auth/components/username/convex.config.js";

const app = defineApp({
  env: {
    RESEND_API_KEY: v.optional(v.string()),
  },
});
app.use(auth);
app.use(authPassword);
app.use(authUsername);

export default app;
