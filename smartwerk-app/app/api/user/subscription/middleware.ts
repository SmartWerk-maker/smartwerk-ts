import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();

  // Routes that really require PRO
  const PRO_ONLY = ["/dashboard/pro-tools", "/dashboard/invoices"];

  if (!PRO_ONLY.includes(url.pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("__session")?.value;

  if (!token) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const snap = await db.collection("users").doc(decoded.uid).get();
    const data = snap.data() ?? {};

    const isPro = data.subscription?.status === "active";

    if (!isPro) {
      url.pathname = "/pricing";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch (err) {
    console.error("Middleware error:", err);
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/dashboard/pro-tools",
    "/dashboard/invoices",
  ],
};