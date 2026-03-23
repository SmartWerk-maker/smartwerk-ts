import { NextResponse } from "next/server";
import { db } from "@/server/firebase-admin";
import { requireUserFromBodyToken } from "@/server/api-auth";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const decoded = await requireUserFromBodyToken(token);

    const snap = await db.collection("users").doc(decoded.uid).get();
    if (!snap.exists) {
      return NextResponse.json({ plan: "FREE" });
    }

    const data = snap.data() || {};
    let plan = data.plan || "FREE";
    const sub = data.subscription;

    if (sub?.status === "active") plan = "PRO";
    else if (sub?.status === "trialing") plan = "TRIAL";
    else if (sub?.status === "canceled") plan = "FREE";

    return NextResponse.json({
      plan,
      subscription: data.subscription || null
    });
  } catch (err) {
    console.error("Subscription API error:", err);
    return NextResponse.json({ error: "Could not load subscription" }, { status: 500 });
  }
}
