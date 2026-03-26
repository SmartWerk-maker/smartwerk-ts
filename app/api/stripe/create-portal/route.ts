import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
const stripe = getStripe();
import { getUser } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const { getAdminAuth } = await import("@/lib/firebase-admin");
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);

    const user = await getUser(decoded.uid);
    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer ID" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500 });
  }
}
