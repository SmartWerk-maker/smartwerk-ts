import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

const PRO_ONLY = ["/dashboard/pro-tools", "/dashboard/invoices"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PRO_ONLY.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
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
  } catch (error) {
    console.error("Middleware error:", error);
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/pro-tools/:path*", "/dashboard/invoices/:path*"],
};
