// types/TaxResult.ts
import { TaxRules } from "./TaxRules";
import { TaxWarning } from "../modules/domain/warnings";
import { TaxInput } from "./TaxInput";
import { ExplainableAmount, Explanation } from "../types/explanationTypes";

export type TaxResult = TaxResultSuccess | TaxResultError;

/**
 * VAT settlement result (BTW)
 */
export interface VatResult {
  period?: "Q1" | "Q2" | "Q3" | "Q4";

  korApplied: boolean;

  salesExVat: {
    standard: number;
    reduced: number;
    zero: number;
    total: number;
  };

  outputVat: number;
  inputVat: number;

  /**
   * Final VAT payable (>0) or receivable (<0)
   * This is the ONLY legally relevant VAT amount.
   */
  payableVat: number;
}

/**
 * Successful tax calculation result
 */
export interface TaxResultSuccess {
  success: true;
  meta: TaxRules["meta"];

  inputSnapshot: {
    hoursWorked: number;
    hourlyRate: number;
    kvkRegistered: boolean;
    isStarter: boolean;
    korApplied: boolean;
    btwRate: number;
    meta?: TaxInput["meta"];
    vat?: TaxInput["vat"];
  };

  warnings: TaxWarning[];

  income: {
    gross: number;
    expenses: number;
    profit: number;
  };

  deductions: {
    zzp: number;
    mkb: number;
    appliedTotal: number;
  };

  eligibility: {
    zzp: boolean;
    capApplied: boolean;
  };

  taxableIncome: number;

  taxes: {
    incomeTax: number;
    zvw: number;

    /** total = incomeTax + zvw (VAT excluded) */
    total: number;

    explainables: {
      taxableIncome: ExplainableAmount;
      incomeTax: ExplainableAmount;
      taxCredits: ExplainableAmount;
      zvw: ExplainableAmount;
      totalTax: ExplainableAmount;
      vatPayable: ExplainableAmount;
      netIncome: ExplainableAmount;
      netCashPosition: ExplainableAmount;
    };

    kortingen: {
      algemene: number;
      arbeids: number;
      total: number;
    };
  };

  /** VAT settlement (always present) */
  vat: VatResult;

  /**
   * Net income after income tax + ZVW (VAT excluded)
   */
  netIncome: number;
explanations?: Explanation[];
  /**
   * Net cash position after:
   * income tax + ZVW + VAT settlement
   *
   * netCashPosition = netIncome − payableVat
   */
  netCashPosition: number;
}

/**
 * Failed tax calculation result
 */
export interface TaxResultError {
  success: false;
  meta: TaxRules["meta"];

  inputSnapshot: {
    hoursWorked: number;
    hourlyRate: number;
    kvkRegistered: boolean;
    isStarter: boolean;
    korApplied: boolean;
    btwRate: number;
    meta?: TaxInput["meta"];
    vat?: TaxInput["vat"];
  };

  errors: string[];
  warnings: TaxWarning[];
}