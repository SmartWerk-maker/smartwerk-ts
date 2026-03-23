import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/server/firebase-admin";
import { requireUserFromBodyToken } from "@/server/api-auth";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const decoded = await requireUserFromBodyToken(token);

    const uid = decoded.uid;
    const email = decoded.email ?? undefined;
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    if (snap.exists && snap.data()?.stripeCustomerId) {
      return NextResponse.json({ ok: true, customerId: snap.data()?.stripeCustomerId });
    }

    const customer = await stripe.customers.create({
      email,
      metadata: { uid }
    });

    await ref.set(
      {
        stripeCustomerId: customer.id,
        email: email ?? null,
        plan: "FREE",
        subscription: null,
        createdAt: new Date().toISOString()
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, customerId: customer.id });
  } catch (err) {
    console.error("create-customer error:", err);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
