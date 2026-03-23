"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export function useSubscription() {
  const [plan, setPlan] = useState<"FREE" | "TRIAL" | "PRO" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};

    const init = async () => {
      const user = auth.currentUser;

      // Якщо користувача немає → FREE
      if (!user) {
        queueMicrotask(() => {
          setPlan("FREE");
          setLoading(false);
        });
        return;
      }

      const ref = doc(db, "users", user.uid);

      unsub = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          queueMicrotask(() => {
            setPlan("FREE");
            setLoading(false);
          });
          return;
        }

        const data = snap.data();

        const normalized =
          (data.plan || "FREE").toString().toUpperCase() as
            "FREE" | "TRIAL" | "PRO";

        queueMicrotask(() => {
          setPlan(normalized);
          setLoading(false);
        });
      });
    };

    init();

    return () => unsub();
  }, []);

  return { plan, loading };
}