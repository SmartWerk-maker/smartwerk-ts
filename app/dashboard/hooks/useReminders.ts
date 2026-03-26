"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ReminderStatus = "draft" | "sent" | "paid";

export interface Reminder {
  id: string;
  linkedInvoiceId?: string;
  status: "draft" | "sent" | "paid";
  createdAt?: unknown;
}

export function useReminders(uid?: string): Reminder[] {
  const [items, setItems] = useState<Reminder[]>([]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "reminders"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Reminder, "id">),
        }))
      );
    });

    return () => unsub();
  }, [uid]);

  return useMemo(() => (uid ? items : []), [uid, items]);
}