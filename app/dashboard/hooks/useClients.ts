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

export interface Client {
  id: string;          // Firestore doc id
  clientId: string;    // CL-2025-001
  clientName: string;
  status: "Active" | "Prospect" | "Inactive";
  createdAt: Timestamp;
}

/* ================= MAPPER ================= */

function mapClientSnap(
  snap: QueryDocumentSnapshot<DocumentData>
): Client {
  const d = snap.data();

  const createdAt =
  d.createdAt instanceof Timestamp
    ? d.createdAt
    : d.createdAt
      ? Timestamp.fromDate(new Date(d.createdAt))
      : Timestamp.fromDate(new Date(0));

  return {
    id: snap.id,
    clientId: d.clientId ?? "",
    clientName: d.clientName ?? "",
    status: d.status ?? "Active",
    createdAt,
  };
}

/* ================= HOOK ================= */

export function useClients(uid: string | undefined): Client[] {
  const [items, setItems] = useState<Client[]>([]);

  useEffect(() => {
    if (!uid) return;

    const qRef = query(
      collection(db, "users", uid, "clients"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      qRef,
      (snap) => setItems(snap.docs.map(mapClientSnap)),
      () => setItems([])
    );
  }, [uid]);

  return useMemo(() => (uid ? items : []), [uid, items]);
}