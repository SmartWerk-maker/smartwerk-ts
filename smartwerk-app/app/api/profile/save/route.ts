import { NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { token, profile } = await req.json();

    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    await db.collection("users").doc(uid).set(
      {
        ...profile,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Save profile error:", err);
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }
}