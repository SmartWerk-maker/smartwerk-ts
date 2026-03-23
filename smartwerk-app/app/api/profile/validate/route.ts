import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const { uid, kvk, iban, vat } = await req.json();

    let kvkTaken = false;
    let ibanTaken = false;
    let vatTaken = false;

    // KvK
    if (kvk) {
      const s = await db
        .collection("users")
        .where("kvk", "==", kvk)
        .get();

      kvkTaken = s.docs.some((d) => d.id !== uid);
    }

    // IBAN
    if (iban) {
      const s = await db
        .collection("users")
        .where("iban", "==", iban)
        .get();

      ibanTaken = s.docs.some((d) => d.id !== uid);
    }

    // VAT
    if (vat) {
      const s = await db
        .collection("users")
        .where("vatNumber", "==", vat)
        .get();

      vatTaken = s.docs.some((d) => d.id !== uid);
    }

    return NextResponse.json({ kvkTaken, ibanTaken, vatTaken });
  } catch (err) {
    console.error("Validate error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}