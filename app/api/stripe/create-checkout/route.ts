import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/server/billing";
import { requireUserFromBodyToken } from "@/server/api-auth";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  try {
    const { token, priceId } = await req.json();

    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const decoded = await requireUserFromBodyToken(token);
    const user = await getUser(decoded.uid);

    if (!user?.email) {
      return NextResponse.json({ error: "User email is missing" }, { status: 400 });
    }

    const baseUrl = getBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/billing?success=1`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
      metadata: { firebaseUid: decoded.uid }
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
