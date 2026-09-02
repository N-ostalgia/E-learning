// src/server/modules/auth/auth.router.ts
import { router, publicProcedure } from "@/server/trpc/trpc";
import { auth } from "@/server/modules/auth/auth.config";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => ctx.session),
  signOut: publicProcedure.mutation(async ({ ctx }) => {
    await auth.api.signOut({
      headers: ctx.req.headers,
    });
    return { success: true };
  }),
});
