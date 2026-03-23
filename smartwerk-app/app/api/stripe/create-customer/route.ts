import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // ----------------------------
    // Verify Firebase token
    // ----------------------------
    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch (err) {
      console.error("❌ Invalid Firebase token:", err);
      return NextResponse.json({ error: "Invalid Firebase token" }, { status: 401 });
    }

    const uid = decoded.uid;
    const email = decoded.email ?? undefined;

    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    // ----------------------------
    // CASE 1 — Customer already exists
    // ----------------------------
    if (snap.exists && snap.data()?.stripeCustomerId) {
      const existingId = snap.data()?.stripeCustomerId;

      console.log("⚠️ Stripe customer already exists:", existingId);

      // Return existing ID so frontend can use it
      return NextResponse.json({
        ok: true,
        customerId: existingId,
      });
    }

    // ----------------------------
    // CASE 2 — Create new Stripe Customer
    // ----------------------------
    const customer = await stripe.customers.create({
      email,
      metadata: { uid }, // ← This connects Stripe → Firebase ALWAYS
    });

    console.log("✅ Created Stripe customer:", customer.id);

    // Save to Firestore
    await ref.set(
      {
        stripeCustomerId: customer.id,
        email: email ?? null,
        plan: "FREE",
        subscription: null,
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      customerId: customer.id,
    });

  } catch (err) {
    console.error("❌ create-customer error:", err);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}