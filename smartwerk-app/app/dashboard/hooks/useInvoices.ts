"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/firebase";
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

export type InvoiceStatus = "draft" | "sent" | "paid" ;

export interface InvoiceItem {
  desc: string;
  qty: number;
  price: number;
  vat: number;
}

export interface Invoice {
  id: string;
  uid: string;
  number: string;
  items: InvoiceItem[];
  total: number;
  status: InvoiceStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp | string;
   clientId?: string | null;
   

}

/* ================= MAPPER ================= */

function mapInvoiceSnap(snap: QueryDocumentSnapshot<DocumentData>): Invoice {
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

  const status = String(d.status ?? "draft").toLowerCase() as InvoiceStatus;

  return {
    id: snap.id,
    uid: d.uid,
    number: d.number,
    status,
    total: d.total ?? 0,
    items: d.items ?? [],
    createdAt,
    updatedAt,
    dueDate: d.dueDate,
    clientId: d.clientId ?? null,
    

  };
}
/* ================= HOOK ================= */

export function useInvoices(uid: string | undefined): Invoice[] {
  const [items, setItems] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "invoices"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map(mapInvoiceSnap));
      },
      (err) => {
        console.error("useInvoices snapshot error:", err);
        setItems([]);
      }
    );

    return () => unsub();
  }, [uid]);

  return useMemo(() => (uid ? items : []), [uid, items]);
}