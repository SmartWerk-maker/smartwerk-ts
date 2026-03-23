import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateSubscriptionStatus } from "@/lib/billing";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// -----------------------------
// TYPE GUARDS
// -----------------------------
function isSubscription(obj: unknown): obj is Stripe.Subscription {
  return (
    !!obj &&
    typeof obj === "object" &&
    "id" in obj &&
    "status" in obj &&
    "customer" in obj
  );
}

function hasPeriodEnd(
  sub: Stripe.Subscription
): sub is Stripe.Subscription & { current_period_end: number } {
  return (
    "current_period_end" in sub &&
    typeof (sub as Record<string, unknown>).current_period_end === "number"
  );
}

// -----------------------------
// WEBHOOK HANDLER
// -----------------------------
export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    console.error("❌ Missing signature");
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Webhook signature error:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  console.log("🔥 Webhook event:", event.type);

  // -----------------------------------------
  // SUBSCRIPTION CREATED / UPDATED
  // -----------------------------------------
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const obj = event.data.object;

    if (!isSubscription(obj)) {
      console.error("❌ Invalid subscription payload");
      return new NextResponse("Bad payload", { status: 400 });
    }

    const sub = obj;
    const customerId = sub.customer as string;

    const periodEnd = hasPeriodEnd(sub)
      ? sub.current_period_end * 1000
      : null;

    console.log("📌 Updating subscription in Firestore:", {
      customerId,
      status: sub.status,
      periodEnd,
    });

    await updateSubscriptionStatus(customerId, {
      status: sub.status,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    });
  }

  // -----------------------------------------
  // SUBSCRIPTION CANCELLED
  // -----------------------------------------
  if (event.type === "customer.subscription.deleted") {
    const obj = event.data.object;

    if (!isSubscription(obj)) {
      console.error("❌ Invalid subscription payload on delete");
      return new NextResponse("Bad payload", { status: 400 });
    }

    const sub = obj;
    const customerId = sub.customer as string;

    console.log("⚠️ Subscription cancelled:", customerId);

    await updateSubscriptionStatus(customerId, {
      status: "canceled",
      current_period_end: null,
    });
  }

  return new NextResponse("OK", { status: 200 });
}