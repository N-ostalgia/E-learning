// src/server/trpc/context.ts
import { db } from "@/lib/db";
import { auth } from "@/server/modules/auth/auth.config";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type TRPCContextOptions = {
  req: Request;
};

export const createTRPCContext = async (opts: TRPCContextOptions) => {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  // Auto-unsuspend expired users: ensure session reflects DB state
  if (session?.user?.id) {
    try {
      const user = await db.select().from(users).where(eq(users.id, session.user.id)).then((r) => r[0]);
      if (user && user.globalRole === "suspended") {
        const suspendedUntil = user.suspendedUntil ? Number(user.suspendedUntil) : null;
        if (suspendedUntil && suspendedUntil <= Date.now()) {
          // restore previous role
          const restore = user.previousRole ?? "member";
          await db.update(users).set({ globalRole: restore, previousRole: null, suspendedUntil: null }).where(eq(users.id, session.user.id));
          // reflect in session object
          session.user.globalRole = restore;
        }
      }
    } catch (err) {
      // ignore errors here — context creation should not crash on this
      console.error("auto-unsuspend check failed", err);
    }
  }

  return {
    db,
    req: opts.req,
    session,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;
