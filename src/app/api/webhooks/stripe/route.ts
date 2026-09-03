// src\app\api\webhooks\stripe\route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import * as paymentService from "@/server/modules/payment/payment.service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
   apiVersion: "2026-06-24.dahlia",
});

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature") || request.headers.get("Stripe-Signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const buf = await request.arrayBuffer();
  const rawBody = Buffer.from(buf);

  try {
    const event = stripe.webhooks.constructEvent(rawBody, sig || "", webhookSecret);
    // delegate to service
    await paymentService.handleWebhook(event as Stripe.Event);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    console.error("Stripe webhook error:", message);
    return new NextResponse("Webhook Error", { status: 400 });
  }
}
