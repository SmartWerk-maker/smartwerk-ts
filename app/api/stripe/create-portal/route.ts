import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/server/billing";
import { requireUserFromBodyToken } from "@/server/api-auth";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const decoded = await requireUserFromBodyToken(token);
    const user = await getUser(decoded.uid);

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer ID" }, { status: 404 });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getBaseUrl()}/dashboard/billing`
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500 });
  }
}
