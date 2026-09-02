// src/app/api/payments/create-community-checkout/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/server/modules/auth/auth.config";
import * as paymentService from "@/server/modules/payment/payment.service";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const checkoutInput = z.object({ communityId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const input = checkoutInput.parse(await request.json());
    const checkoutSession = await paymentService.createCommunityCheckout(session.user.id, input);
    return NextResponse.json({ url: checkoutSession.url, id: checkoutSession.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error";
    const status = error instanceof TRPCError && error.code === "NOT_FOUND" ? 404 : 400;
    console.error("create-community-checkout error:", message);
    return new NextResponse(message, { status });
  }
}