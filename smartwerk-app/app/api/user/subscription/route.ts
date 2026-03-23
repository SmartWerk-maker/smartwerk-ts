import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) {
      return NextResponse.json({ plan: "FREE" });
    }

    const data = snap.data() || {};

    // === DERIVE PLAN ===
    let plan = data.plan || "FREE";

    // Stripe subscription data
    const sub = data.subscription;

    if (sub?.status === "active") {
      plan = "PRO";
    } else if (sub?.status === "trialing") {
      plan = "TRIAL";
    } else if (sub?.status === "canceled") {
      plan = "FREE";
    }

    return NextResponse.json({
      plan,
      subscription: data.subscription || null,
    });

  } catch (err) {
    console.error("Subscription API error:", err);
    return NextResponse.json(
      { error: "Could not load subscription" },
      { status: 500 }
    );
  }
}