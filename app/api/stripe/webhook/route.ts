import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
const stripe = getStripe();
import { updateSubscriptionStatus } from "lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isSubscription(obj: unknown): obj is Stripe.Subscription {
  return !!obj && typeof obj === "object" && "id" in obj && "status" in obj && "customer" in obj;
}

function hasPeriodEnd(
  sub: Stripe.Subscription
): sub is Stripe.Subscription & { current_period_end: number } {
  return "current_period_end" in sub && typeof (sub as Record<string, unknown>).current_period_end === "number";
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const obj = event.data.object;
    if (!isSubscription(obj)) return new NextResponse("Bad payload", { status: 400 });

    const periodEnd = hasPeriodEnd(obj) ? obj.current_period_end * 1000 : null;
    await updateSubscriptionStatus(String(obj.customer), {
      status: obj.status,
      current_period_end: periodEnd,
      cancel_at_period_end: obj.cancel_at_period_end ?? false,
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const obj = event.data.object;
    if (!isSubscription(obj)) return new NextResponse("Bad payload", { status: 400 });

    await updateSubscriptionStatus(String(obj.customer), {
      status: "canceled",
      current_period_end: null,
    });
  }

  return new NextResponse("OK", { status: 200 });
}
