// app/api/stripe/create-portal/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/firebase-admin";
import { getUser } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: "Invalid Firebase token" },
        { status: 401 }
      );
    }

    const user = await getUser(decoded.uid);

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer ID" },
        { status: 404 }
      );
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("Portal error:", err);
    return NextResponse.json(
      { error: "Unable to open billing portal" },
      { status: 500 }
    );
  }
}