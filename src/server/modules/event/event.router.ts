import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc/trpc";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "./event.service";

export const eventRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        communityId: z.string().trim().min(1),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return listEvents(
        input.communityId,
        input.startDate,
        input.endDate,
        ctx.session.user.id
      );
    }),

  create: protectedProcedure
    .input(
      z.object({
        communityId: z.string().trim().min(1),
        title: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        isFullDay: z.boolean().optional().default(false),
        location: z.string().max(200).optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createEvent(ctx.session.user.id, input);
    }),

  update: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        title: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        startDate: z.date().optional(),
        endDate: z.date().nullable().optional(),
        isFullDay: z.boolean().optional(),
        location: z.string().max(200).nullable().optional(),
        color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { eventId, ...data } = input;
      return updateEvent(ctx.session.user.id, eventId, data);
    }),

  delete: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deleteEvent(ctx.session.user.id, input.eventId);
      return { success: true };
    }),
});