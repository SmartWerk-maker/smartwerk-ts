// services/taxFirestore.ts

import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { TaxInput } from "../types/TaxInput";
import { db } from "@/firebase";
import { TaxResultSuccess } from "../types/TaxResult";

/* ======================
   Types
====================== */

export interface TaxHistoryEntry {
  id: string;

  createdAt: Timestamp;

  /**
   * Convenience field for fast filtering / display
   * (duplicated from snapshot.meta.year)
   */
  year: number;

  /**
   * Exact user input at calculation time
   */
  snapshot: TaxInput;

  /**
   * Minimal result needed for history UI
   */
  result: {
    taxableIncome: number;
    totalTax: number;
    netIncome: number;
  };
}

/* ======================
   Save
====================== */

export async function saveTaxResult(
  userId: string,
  result: TaxResultSuccess,
  input: TaxInput
): Promise<void> {
  const ref = collection(db, "users", userId, "taxHistory");

  const safeSnapshot: TaxInput = {
    ...input,
    meta: input.meta ?? {}, // 🔒 Firestore-safe
  };

  await addDoc(ref, {
    createdAt: Timestamp.now(),
    year: result.meta.year,

    snapshot: safeSnapshot,

    result: {
      taxableIncome: result.taxableIncome,
      totalTax: result.taxes.total,
      netIncome: result.netIncome,
    },
  });
}

/* ======================
   Load
====================== */

export async function loadTaxHistory(
  userId: string
): Promise<TaxHistoryEntry[]> {
  const ref = collection(db, "users", userId, "taxHistory");

  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<TaxHistoryEntry, "id">),
  }));
}

/* ======================
   Delete
====================== */

export async function deleteTaxHistoryEntry(
  userId: string,
  entryId: string
): Promise<void> {
  if (!userId || !entryId) {
    throw new Error(
      "deleteTaxHistoryEntry: missing userId or entryId"
    );
  }

  const ref = doc(
    db,
    "users",
    userId,
    "taxHistory",
    entryId
  );

  await deleteDoc(ref);
}