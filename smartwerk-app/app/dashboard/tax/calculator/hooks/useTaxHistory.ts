// hooks/useTaxHistory.ts
import { useEffect, useState, useCallback, useRef } from "react";
import {
  loadTaxHistory,
  deleteTaxHistoryEntry,
  type TaxHistoryEntry,
} from "../services/taxFirestore";

/* ======================
   Types
====================== */

type HistoryStatus = "idle" | "loading" | "success" | "error";

type HistoryError =
  | "tax.history.load_failed"
  | "tax.history.delete_failed"
  | null;

/* ======================
   Hook
====================== */

export function useTaxHistory(userId?: string) {
  const [history, setHistory] =
    useState<TaxHistoryEntry[]>([]);

  const [status, setStatus] =
    useState<HistoryStatus>("idle");

  const [error, setError] =
    useState<HistoryError>(null);

  // Prevent race conditions
  const requestIdRef = useRef(0);

  /* ======================
     Load history
  ====================== */

  const fetchHistory = useCallback(
    async (uid: string) => {
      const requestId = ++requestIdRef.current;

      setStatus("loading");
      setError(null);

      try {
        const data = await loadTaxHistory(uid);

        if (requestId !== requestIdRef.current) return;

        setHistory(data);
        setStatus("success");
      } catch (err) {
        if (requestId !== requestIdRef.current) return;

        console.error("Failed to load tax history:", err);
        setHistory([]);
        setStatus("error");
        setError("tax.history.load_failed");
      }
    },
    []
  );

  /* ======================
     Delete entry (optimistic)
  ====================== */

  const deleteEntry = useCallback(
    async (entryId: string) => {
      if (!userId) return;

      let previous: TaxHistoryEntry[] = [];

      // optimistic update
      setHistory((current) => {
        previous = current;
        return current.filter(
          (e) => e.id !== entryId
        );
      });

      try {
        await deleteTaxHistoryEntry(userId, entryId);
      } catch (err) {
        console.error(
          "Failed to delete tax history entry:",
          err
        );

        // rollback
        setHistory(previous);
        setError("tax.history.delete_failed");
      }
    },
    [userId]
  );

  /* ======================
     Reset
  ====================== */

  const reset = useCallback(() => {
    requestIdRef.current++;
    setHistory([]);
    setStatus("idle");
    setError(null);
  }, []);

  /* ======================
     Lifecycle
  ====================== */

  useEffect(() => {
    if (!userId) {
      reset();
      return;
    }

    fetchHistory(userId);
  }, [userId, fetchHistory, reset]);

  /* ======================
     Public API
  ====================== */

  return {
    history,
    status,
    loading: status === "loading",
    error,

    reload: () => {
      if (userId) {
        fetchHistory(userId);
      }
    },

    deleteEntry, // 🗑️
    reset,
  };
}