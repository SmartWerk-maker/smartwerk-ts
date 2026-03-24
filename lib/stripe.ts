import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
      throw new Error("Stripe not configured");
    }

    stripe = new Stripe(key, {
      apiVersion: "2024-06-20",
    });
  }

  return stripe;
}