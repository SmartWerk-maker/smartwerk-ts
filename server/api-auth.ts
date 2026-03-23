import "server-only";

import { auth } from "@/server/firebase-admin";

export async function requireUserFromBearer(authHeader: string | null | undefined) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    throw new Error("Missing Bearer token");
  }

  return auth.verifyIdToken(token);
}

export async function requireUserFromBodyToken(token: unknown) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing token");
  }

  return auth.verifyIdToken(token);
}
