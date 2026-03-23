import { NextResponse } from "next/server";
import { db } from "@/server/firebase-admin";
import { requireUserFromBodyToken } from "@/server/api-auth";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    const decoded = await requireUserFromBodyToken(token);
    const snap = await db.collection("users").doc(decoded.uid).get();

    if (!snap.exists) {
      return NextResponse.json({}, { status: 200 });
    }

    return NextResponse.json(snap.data());
  } catch (err) {
    console.error("GET PROFILE ERROR:", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
