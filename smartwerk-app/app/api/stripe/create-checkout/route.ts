// app/api/stripe/create-checkout/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/firebase-admin";
import { getUser } from "@/lib/billing";

export async function POST(req: Request) {
  try {
    console.log("🔥 create-checkout CALLED");

    // Read body ONCE
    const raw = await req.text();
    console.log("RAW BODY:", raw);

    const body = JSON.parse(raw);
    const token = body.token;
    const priceId = body.priceId;

    // ----------------------------
    // Validate request
    // ----------------------------
    if (!token) {
      return NextResponse.json(
        { error: "Missing authentication token" },
        { status: 400 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Missing priceId" },
        { status: 400 }
      );
    }

    console.log("Parsed body:", body);

    // ----------------------------
    // Verify Firebase token
    // ----------------------------
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (error) {
      console.error("Token invalid:", error);
      return NextResponse.json(
        { error: "Invalid Firebase token" },
        { status: 401 }
      );
    }

    // ----------------------------
    // Load user from Firestore
    // ----------------------------
    const user = await getUser(decoded.uid);

    if (!user) {
      return NextResponse.json(
        { error: "User not found in Firestore" },
        { status: 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "User email is missing" },
        { status: 400 }
      );
    }

    // ----------------------------
    // Stripe Checkout
    // ----------------------------
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer_email: user.email,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });

  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Unable to start checkout" },
      { status: 500 }
    );
  }
}