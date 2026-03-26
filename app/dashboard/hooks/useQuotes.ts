"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

/* ================= TYPES ================= */

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

export interface QuoteItem {
  desc: string;
  qty: number;
  price: number;
  vat: number;
}

export interface Quote {
  id: string;
  uid: string;
  number: string;
  items: QuoteItem[];
  total: number;
  status: QuoteStatus;
  clientId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/* ================= MAPPER ================= */

function mapQuoteSnap(
  snap: QueryDocumentSnapshot<DocumentData>
): Quote {
  const d = snap.data();

  const createdAt =
    d.createdAt instanceof Timestamp
      ? d.createdAt
      : d.createdAt
      ? Timestamp.fromDate(new Date(d.createdAt))
      : Timestamp.fromDate(new Date(0));

  const updatedAt =
    d.updatedAt instanceof Timestamp
      ? d.updatedAt
      : d.updatedAt
      ? Timestamp.fromDate(new Date(d.updatedAt))
      : createdAt;

  const status = String(d.status ?? "draft").toLowerCase() as QuoteStatus;

  return {
    id: snap.id,
    uid: d.uid,
    number: d.number ?? "",
    status,
    total: d.total ?? d.grandTotal ?? 0,
    clientId: d.clientId ?? null,
    items: d.items ?? [],
    createdAt,
    updatedAt,
  };
}

/* ================= HOOK ================= */

export function useQuotes(uid: string | undefined): Quote[] {
  const [items, setItems] = useState<Quote[]>([]);

  useEffect(() => {
    if (!uid) return;

    const qRef = query(
      collection(db, "users", uid, "quotes"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setItems(snap.docs.map(mapQuoteSnap));
      },
      (err) => {
        console.error("useQuotes snapshot error:", err);
        setItems([]);
      }
    );

    return () => unsub();
  }, [uid]);

  return useMemo(() => (uid ? items : []), [uid, items]);
}