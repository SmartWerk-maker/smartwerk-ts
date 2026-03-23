import { useState, useCallback, useMemo } from "react";
import { TaxInput } from "../types/TaxInput";
import { TaxResult } from "../types/TaxResult";
import { TaxRules } from "../types/TaxRules";
import { calculateTaxNL } from "../engine/calculateTaxNL";
import { saveTaxResult } from "../services/taxFirestore";
import NL_2026_RULES from "../config/nl/2026";

/* ======================
   Constants
====================== */

export const DEFAULT_TAX_INPUT: TaxInput = {
  hoursWorked: 0,
  hourlyRate: 0,
  expenses: {
    vehicle: 0,
    office: 0,
    internet: 0,
    marketing: 0,
    other: 0,
    extraBenefits: 0,
  },
  kvkRegistered: false,
  isStarter: false,
  btwRate: 0.21,
  korApplied: false,
  meta: {
    period: "Q1",
  },
};

type CalculatorStatus =
  | "idle"
  | "calculating"
  | "success"
  | "invalid";

/* ======================
   Hook
====================== */

export function useTaxCalculator(
  rules: TaxRules = NL_2026_RULES,
  initialInput: TaxInput = DEFAULT_TAX_INPUT
) {
  const [input, setInput] = useState<TaxInput>(
    () => ({ ...initialInput })
  );

  const [result, setResult] =
    useState<TaxResult | null>(null);

  const [status, setStatus] =
    useState<CalculatorStatus>("idle");

  const isCalculating = status === "calculating";

  /* ======================
     Derived state
  ====================== */

  const errors = useMemo(
    () =>
      result && !result.success
        ? result.errors
        : [],
    [result]
  );

  const warnings = useMemo(
    () =>
      result && result.success
        ? result.warnings
        : [],
    [result]
  );

  /* ======================
     Actions
  ====================== */

  const calculate = useCallback(
    async (userId?: string) => {
      if (isCalculating) return;

      setStatus("calculating");
      setResult(null);

      const res = calculateTaxNL(input, rules);

      if (!res.success) {
        setResult(res);
        setStatus("invalid");
        return;
      }

      setResult(res);
      setStatus("success");

      if (userId) {
        try {
          await saveTaxResult(userId, res, input);
        } catch (err) {
          console.error("Failed to save tax result:", err);
        }
      }
    },
    [input, rules, isCalculating]
  );

  const restoreFromHistory = useCallback(
    (snapshot: TaxInput) => {
      setInput({ ...snapshot });
      setResult(null);
      setStatus("idle");
    },
    []
  );

  const reset = useCallback(() => {
    setInput({ ...initialInput });
    setResult(null);
    setStatus("idle");
  }, [initialInput]);

  /* ======================
     Public API
  ====================== */

  return {
    input,
    setInput,

    result,
    errors,
    warnings,

    status,
    loading: isCalculating,

    calculate,
    restoreFromHistory,
    reset,
  };
}