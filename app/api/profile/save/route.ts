import { NextResponse } from "next/server";
import { db } from "@/server/firebase-admin";
import { requireUserFromBodyToken } from "@/server/api-auth";

export async function POST(req: Request) {
  try {
    const { token, profile } = await req.json();
    const decoded = await requireUserFromBodyToken(token);

    await db.collection("users").doc(decoded.uid).set(
      {
        ...profile,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Save profile error:", err);
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }
}
