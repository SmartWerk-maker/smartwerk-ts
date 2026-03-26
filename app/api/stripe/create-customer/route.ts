import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
const stripe = getStripe();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin");
    const auth = getAdminAuth();
    const db = getAdminDb();

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email ?? undefined;

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    if (snap.exists && snap.data()?.stripeCustomerId) {
      return NextResponse.json({ ok: true, customerId: snap.data()?.stripeCustomerId });
    }

    const customer = await stripe.customers.create({
      email,
      metadata: { uid },
    });

    await ref.set({
      stripeCustomerId: customer.id,
      email: email ?? null,
      plan: "FREE",
      subscription: null,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({ ok: true, customerId: customer.id });
  } catch (err) {
    console.error("create-customer error:", err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
