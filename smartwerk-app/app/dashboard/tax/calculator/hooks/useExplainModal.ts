// modules/ui/hooks/useExplainModal.ts
"use client";

import { useState, useCallback } from "react";
import { ExplainableAmount } from "../types/explanationTypes";

/**
 * useExplainModal
 *
 * UI hook for managing explainable modal state.
 * Responsible ONLY for open/close & data storage.
 */
export function useExplainModal() {
  const [explainData, setExplainData] =
    useState<ExplainableAmount | null>(null);

  const openExplainModal = useCallback(
    (explainable: ExplainableAmount) => {
      setExplainData((current) =>
        current === explainable ? current : explainable
      );
    },
    []
  );

  const closeExplainModal = useCallback(() => {
    setExplainData(null);
  }, []);

  return {
    explainData,
    openExplainModal,
    closeExplainModal,
    isOpen: explainData !== null,
  };
}