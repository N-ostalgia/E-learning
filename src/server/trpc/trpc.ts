import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const activeUserProcedure = protectedProcedure.use(({ ctx, next }) => {
  const user = ctx.session.user;
  const suspendedUntil = user.suspendedUntil
    ? new Date(user.suspendedUntil).getTime()
    : null;

  if (
    user.globalRole === "suspended" &&
    (suspendedUntil === null || suspendedUntil > Date.now())
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Account is suspended" });
  }

  return next({ ctx });
});

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const role = ctx.session.user.globalRole ?? "";
  if (!["admin", "super_admin"].includes(role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const superAdminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.globalRole !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super Admin access required" });
  }
  return next({ ctx });
});
