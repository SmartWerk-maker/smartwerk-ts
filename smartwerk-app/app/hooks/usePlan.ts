"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export function usePlan() {
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    let unsub = () => {};

    // Виконуємо асинхронну логіку всередині функції,
    // а не прямо в body useEffect — це вирішує warning.
    const init = async () => {
      const user = auth.currentUser;

      // Якщо користувача нема → план FREE
      if (!user) {
        // setState в callback — дозволено
        queueMicrotask(() => setPlan("FREE"));
        return;
      }

      const ref = doc(db, "users", user.uid);

      unsub = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          queueMicrotask(() => setPlan("FREE"));
          return;
        }

        const data = snap.data();
        const userPlan = (data.plan || "FREE").toUpperCase();

        queueMicrotask(() => setPlan(userPlan));
      });
    };

    init();

    return () => unsub();
  }, []);

  return plan;
}