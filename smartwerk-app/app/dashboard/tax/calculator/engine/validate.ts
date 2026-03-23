// engine/validate.ts
import { TaxInput } from "../types/TaxInput";
import { TaxWarning } from "../modules/domain/warnings";

export interface ValidationResult {
  errors: string[];
  warnings: TaxWarning[];
}

const isNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function validateTaxInput(
  input: TaxInput
): ValidationResult {
  const errors: string[] = [];
  const warnings: TaxWarning[] = [];

  /* =========================
     BASIC NUMERIC VALIDATION
  ========================= */

  if (!isNumber(input.hoursWorked) || input.hoursWorked < 0) {
    errors.push("tax.input.hours.invalid");
  }

  if (!isNumber(input.hourlyRate) || input.hourlyRate < 0) {
    errors.push("tax.input.rate.invalid");
  }

  if (typeof input.expenses !== "object" || input.expenses === null) {
    errors.push("tax.input.expenses.invalid");
  } else {
    for (const [key, value] of Object.entries(input.expenses)) {
      if (!isNumber(value) || value < 0) {
        errors.push(`tax.input.expense.${key}.invalid`);
      }
    }
  }

  if (
    input.btwRate != null &&
    (!isNumber(input.btwRate) || input.btwRate < 0)
  ) {
    errors.push("tax.input.btwRate.invalid");
  }

  /* =========================
     VAT SANITY
  ========================= */

  const vat = input.vat;

  if (vat) {
    if (
      vat.inputVatDeductible != null &&
      (!isNumber(vat.inputVatDeductible) ||
        vat.inputVatDeductible < 0)
    ) {
      errors.push("tax.input.vat.inputVat.invalid");
    }

    if (
      vat.turnoverExVat != null &&
      (!isNumber(vat.turnoverExVat) ||
        vat.turnoverExVat < 0)
    ) {
      errors.push("tax.input.vat.turnover.invalid");
    }

    if (vat.salesExVat) {
      for (const key of ["standard", "reduced", "zero"] as const) {
        const v = vat.salesExVat[key];
        if (v != null && (!isNumber(v) || v < 0)) {
          errors.push(`tax.input.vat.sales.${key}.invalid`);
        }
      }
    }
  }

  /* =========================
     STOP IF HARD ERRORS
  ========================= */

  if (errors.length > 0) {
    return { errors, warnings };
  }

  /* =========================
     DERIVED WARNINGS
  ========================= */

  const income =
    isNumber(input.hoursWorked) && isNumber(input.hourlyRate)
      ? input.hoursWorked * input.hourlyRate
      : 0;

  const totalExpenses = Object.values(input.expenses).reduce(
    (sum, v) => (isNumber(v) ? sum + v : sum),
    0
  );

  if (totalExpenses > income) {
    warnings.push({
      code: "EXPENSES_GT_INCOME",
      level: "warning",
      meta: { income, expenses: totalExpenses },
    });
  }

  /* =========================
     KOR CONSISTENCY WARNINGS
  ========================= */

  if (input.korApplied && input.btwRate !== 0) {
    warnings.push({
      code: "KOR_BTW_RATE_MISMATCH",
      level: "warning",
    });
  }

  const hasVatDetails =
    typeof vat?.turnoverExVat === "number" ||
    typeof vat?.inputVatDeductible === "number" ||
    typeof vat?.salesExVat?.standard === "number" ||
    typeof vat?.salesExVat?.reduced === "number" ||
    typeof vat?.salesExVat?.zero === "number";

  if (input.korApplied && hasVatDetails) {
    warnings.push({
      code: "KOR_WITH_VAT_DETAILS",
      level: "info",
    });
  }

  return { errors, warnings };
}