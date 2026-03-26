import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
const stripe = getStripe();
import { getUser } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body.token;
    const priceId = body.priceId;

    if (!token) return NextResponse.json({ error: "Missing authentication token" }, { status: 400 });
    if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });

    const { getAdminAuth } = await import("@/lib/firebase-admin");
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);

    const user = await getUser(decoded.uid);
    if (!user) return NextResponse.json({ error: "User not found in Firestore" }, { status: 404 });
    if (!user.email) return NextResponse.json({ error: "User email is missing" }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/billing?success=1`,
      cancel_url: `${baseUrl}/pricing?canceled=1`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Unable to start checkout" }, { status: 500 });
  }
}
