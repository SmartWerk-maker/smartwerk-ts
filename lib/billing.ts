export interface UserRecord {
  email: string | null;
  stripeCustomerId: string | null;
  subscription: {
    status: string;
    current_period_end: number | null;
    cancel_at_period_end: boolean;
  } | null;
}

export async function getUser(uid: string): Promise<UserRecord | null> {
  try {
    const { getAdminDb } = await import("./firebase-admin");
    const db = getAdminDb();

    const docSnap = await db.collection("users").doc(uid).get();
    if (!docSnap.exists) return null;

    const data = docSnap.data() as Partial<UserRecord>;

    return {
      email: data.email ?? null,
      stripeCustomerId: data.stripeCustomerId ?? null,
      subscription: data.subscription ?? null,
    };
  } catch (err) {
    console.error("❌ getUser error:", err);
    return null;
  }
}

export interface SubUpdate {
  status: string;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
}

export async function updateSubscriptionStatus(
  stripeCustomerId: string,
  data: SubUpdate
) {
  try {
    const { getAdminDb } = await import("./firebase-admin");
    const db = getAdminDb();

    const snap = await db
      .collection("users")
      .where("stripeCustomerId", "==", stripeCustomerId)
      .limit(1)
      .get();

    if (snap.empty) {
      console.warn("⚠️ No user found for stripeCustomerId:", stripeCustomerId);
      return;
    }

    const ref = snap.docs[0].ref;
    const isActive = ["active", "trialing"].includes(data.status);

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
  } catch (err) {
    console.error("❌ updateSubscriptionStatus error:", err);
  }
}