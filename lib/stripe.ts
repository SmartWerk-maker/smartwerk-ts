import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    console.warn("⚠️ Stripe not configured");
    return null;
  }

  stripeInstance = new Stripe(key, {
    apiVersion: "2026-02-25.clover",
  });

  return stripeInstance;
}