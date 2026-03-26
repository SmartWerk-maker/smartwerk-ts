"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";

/* ================= TYPES ================= */

export interface Expense {
  id: string;
  
  title?: string;
  amount: number;        // net
  total: number;         // gross (з ПДВ) ✅
  category: string;
  status: "paid" | "pending" | "overdue" | "scheduled";
  createdAt: Timestamp;
}

/* ================= MAPPER ================= */

function mapExpenseSnap(
  snap: QueryDocumentSnapshot<DocumentData>
): Expense {
  const d = snap.data();

  const createdAt =
    d.createdAt instanceof Timestamp
      ? d.createdAt
      : Timestamp.fromDate(new Date(d.createdAt ?? Date.now()));

  return {
    id: snap.id,
    title: typeof d.title === "string" ? d.title : "",
    category: typeof d.category === "string" ? d.category : "",
    amount: Number.isFinite(Number(d.amount)) ? Number(d.amount) : 0,
    total: Number.isFinite(Number(d.total)) ? Number(d.total) : 0,
    status: (d.status ?? "paid") as Expense["status"],
    createdAt,
  };
}

/* ================= HOOK ================= */

export function useExpenses(uid: string | undefined): Expense[] {
  const [items, setItems] = useState<Expense[]>([]);

  useEffect(() => {
  if (!uid) return;

  const qRef = query(
    collection(db, "users", uid, "expenses"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    qRef,
    (snap) => setItems(snap.docs.map(mapExpenseSnap)),
    () => setItems([])
  );
}, [uid]);

return useMemo(() => (uid ? items : []), [uid, items]);
}
