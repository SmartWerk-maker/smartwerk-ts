// lib/billing.ts
import { db } from "@/lib/firebase-admin";

/* ------------------------------
   USER TYPE
------------------------------ */
export interface UserRecord {
  email: string | null;
  stripeCustomerId: string | null;
  subscription: {
    status: string;
    current_period_end: number | null;
    cancel_at_period_end: boolean;
  } | null;
}

/* ------------------------------
   GET USER
------------------------------ */
export async function getUser(uid: string): Promise<UserRecord | null> {
  const docSnap = await db.collection("users").doc(uid).get();
  if (!docSnap.exists) return null;

  const data = docSnap.data() as Partial<UserRecord>;

  return {
    email: data.email ?? null,
    stripeCustomerId: data.stripeCustomerId ?? null,
    subscription: data.subscription ?? null,
  };
}

/* ------------------------------
   UPDATE SUBSCRIPTION STATUS
------------------------------ */
export interface SubUpdate {
  status: string;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
}

export async function updateSubscriptionStatus(
  stripeCustomerId: string,
  data: SubUpdate
) {
  // find Firestore user by stripeCustomerId
  const snap = await db
    .collection("users")
    .where("stripeCustomerId", "==", stripeCustomerId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.error("❌ No user found for stripeCustomerId:", stripeCustomerId);
    return;
  }

  const ref = snap.docs[0].ref;

  const isActive =
    data.status === "active" ||
    data.status === "trialing";

  const payload = {
    plan: isActive ? "PRO" : "FREE",
    subscription: {
      status: data.status,
      current_period_end: data.current_period_end ?? null,
      cancel_at_period_end: data.cancel_at_period_end ?? false,
    },
    updatedAt: new Date().toISOString(),
  };

  await ref.set(payload, { merge: true });

  console.log("✅ Subscription updated:", payload);
}