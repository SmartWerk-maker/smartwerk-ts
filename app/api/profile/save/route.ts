import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { token, profile } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { getAdminAuth, getAdminDb } = await import("@/lib/firebase-admin");
    const auth = getAdminAuth();
    const db = getAdminDb();

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
