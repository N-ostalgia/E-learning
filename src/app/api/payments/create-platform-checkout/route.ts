// src/app/api/payments/create-platform-checkout/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/server/modules/auth/auth.config";
import * as paymentService from "@/server/modules/payment/payment.service";
import { z } from "zod";

const checkoutInput = z.object({ plan: z.enum(["pro", "enterprise"]).default("pro") });

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { plan } = checkoutInput.parse(await request.json());
    const checkoutSession = await paymentService.createPlatformCheckout(session.user.id, plan);
    return NextResponse.json({ url: checkoutSession.url, id: checkoutSession.id });
  } catch (err: any) {
    console.error("create-platform-checkout error:", err);
    return new NextResponse(err.message || "Error", { status: 500 });
  }
}