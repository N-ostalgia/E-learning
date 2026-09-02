// src/server/modules/auth/auth.config.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email";
import { getSettings } from "@/server/modules/admin/admin.service";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({
      user,
      url,
      token,
    }: {
      user: { email: string; name: string };
      url: string;
      token: string;
    }) => {
      await sendPasswordResetEmail(user.email, url, user.name);
    },
  },
  user: {
    additionalFields: {
      username: { type: "string", required: true, unique: true },
      bio: { type: "string", required: false },
      globalRole: { type: "string", required: false, defaultValue: "member", input: false },
      suspendedUntil: { type: "date", required: false, input: false },
      stripeCustomerId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (context?.path !== "/sign-up/email") return;

          const settings = await getSettings();
          const username = typeof user.username === "string" ? user.username : "";
          if (!settings.allowRegistration) return false;
          if (
            username.length < settings.usernameMinLength ||
            username.length > settings.usernameMaxLength
          ) {
            return false;
          }

          return {
            data: {
              ...user,
              globalRole: settings.defaultUserRole || "member",
            },
          };
        },
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({
      user,
      url,
      token,
    }: {
      user: { email: string; name: string };
      url: string;
      token: string;
    }) => {
      await sendWelcomeEmail(user.email, user.name, url);
    },
    autoSignInAfterVerification: true,
  },
});
