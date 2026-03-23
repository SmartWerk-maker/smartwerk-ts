"use client";

import { useCallback } from "react";
import { TaxResult } from "../../../types/TaxResult";
import { TaxExplanationsPanel } from "./TaxExplanationsPanel";
import {
  Explanation,
  ExplainableAmount,
} from "../../../types/explanationTypes";

import type { TaxExplanationsPanelLabels } from "./TaxExplanationsPanel";
/* ======================
   i18n types
====================== */

export interface AccountantLabels {
  title?: string;

  

  sections?: {
    profitLoss?: string;
    deductions?: string;
    taxableIncome?: string;
    tax?: string;
    vat?: string;
    net?: string;
  };

  howItWorks?: {
  title?: string;
  items?: {
    profit?: string;
    taxableIncome?: string;
    incomeTax?: string;
    zvw?: string;
    vat?: string;
  };
};

  fields?: {
    grossIncome?: string;
    expenses?: string;
    profitBeforeDeductions?: string;

    zzpEligibility?: string;
    eligible?: string;
    notEligible?: string;
    zzpDeduction?: string;
    mkbDeduction?: string;
    totalDeductions?: string;
    deductionCap?: string;
    applied?: string;
    notApplied?: string;

    taxableIncome?: string;

    incomeTax?: string;
    zvw?: string;
    taxCredits?: string;
    totalTax?: string;

    vatSales?: string;
    outputVat?: string;
    inputVat?: string;
    vatPayable?: string;

    netIncome?: string;

    kor?: string;
    clickToExplain?: string;
  };
}

interface Props {
  result: TaxResult;
  explanations: Explanation[];
  onExplain?: (e: ExplainableAmount) => void;

  /** i18n dictionary */
  labels?: AccountantLabels;
  explainLabels?: TaxExplanationsPanelLabels;
}

export function AccountantResultTable({
  result,
  explanations,
  onExplain,
  labels,
  explainLabels,
}: Props) {
  /* ======================
     Hooks (ALWAYS FIRST)
  ====================== */

  const formatCurrency = useCallback(
    (value: number) =>
      value.toLocaleString("en", {
        style: "currency",
        currency: "EUR",
      }),
    []
  );

  /* ======================
     Guard
  ====================== */

  if (!result.success) return null;

  const {
    income,
    deductions,
    eligibility,
    taxableIncome,
    taxes,
    vat,
    netIncome,
    inputSnapshot,
  } = result;

  const s = labels?.sections;
  const f = labels?.fields;

  /* ======================
     Helpers
  ====================== */

  const renderValue = (
    value: number,
    explainable?: ExplainableAmount,
    opts?: { negative?: boolean }
  ) => {
    const isClickable = Boolean(explainable && onExplain);

    const displayValue = opts?.negative
      ? `− ${formatCurrency(Math.abs(value))}`
      : formatCurrency(value);

    return (
      <span
        className={[
          "accountant-value",
          isClickable && "accountant-value--clickable",
          opts?.negative && "accountant-value--negative",
        ]
          .filter(Boolean)
          .join(" ")}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
       

        onClick={() => {
          if (explainable && onExplain) {
            onExplain(explainable);
          }
        }}
        onKeyDown={(e) => {
          if (!isClickable) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (explainable && onExplain) {
              onExplain(explainable);
            }
          }
        }}
        title={
          isClickable
            ? f?.clickToExplain ?? "Click to explain"
            : undefined
        }
      >
        {displayValue}
      </span>
    );
  };

  /* ======================
     Render
  ====================== */

  return (
    <>
      <section className="accountant-view">
        <h2>{labels?.title ?? "Accountant view"}</h2>

        {/* 1. PROFIT & LOSS */}
        <h3>{s?.profitLoss ?? "Profit & Loss"}</h3>
        <table className="accountant-table">
          <tbody>
            <tr>
              <th>{f?.grossIncome ?? "Gross income"}</th>
              <td>{renderValue(income.gross)}</td>
            </tr>
            <tr>
              <th>{f?.expenses ?? "Expenses"}</th>
              <td>
                {renderValue(income.expenses, undefined, {
                  negative: true,
                })}
              </td>
            </tr>
            <tr className="accountant-divider">
              <th>
                {f?.profitBeforeDeductions ??
                  "Profit before deductions"}
              </th>
              <td>{renderValue(income.profit)}</td>
            </tr>
          </tbody>
        </table>

        {/* 2. DEDUCTIONS */}
        <h3>{s?.deductions ?? "Deductions"}</h3>
        <table className="accountant-table">
          <tbody>
            <tr>
              <th>{f?.zzpEligibility ?? "ZZP eligibility"}</th>
              <td>
                {eligibility.zzp
                  ? f?.eligible ?? "Eligible"
                  : f?.notEligible ?? "Not eligible"}
              </td>
            </tr>
            <tr>
              <th>{f?.zzpDeduction ?? "ZZP deduction"}</th>
              <td>
                {renderValue(deductions.zzp, undefined, {
                  negative: true,
                })}
              </td>
            </tr>
            <tr>
              <th>{f?.mkbDeduction ?? "MKB deduction"}</th>
              <td>
                {renderValue(deductions.mkb, undefined, {
                  negative: true,
                })}
              </td>
            </tr>
            <tr className="accountant-divider">
              <th>{f?.totalDeductions ?? "Total deductions"}</th>
              <td>
                {renderValue(deductions.appliedTotal, undefined, {
                  negative: true,
                })}
              </td>
            </tr>
            <tr>
              <th>{f?.deductionCap ?? "Deduction cap"}</th>
              <td>
                {eligibility.capApplied
                  ? f?.applied ?? "Applied"
                  : f?.notApplied ?? "Not applied"}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 3. TAXABLE INCOME */}
        <h3>{s?.taxableIncome ?? "Taxable income"}</h3>
        <table className="accountant-table">
          <tbody>
            <tr>
              <th>{f?.taxableIncome ?? "Taxable income"}</th>
              <td>
                {renderValue(
                  taxableIncome,
                  taxes.explainables.taxableIncome
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 4. TAX */}
        <h3>{s?.tax ?? "Tax"}</h3>
        <table className="accountant-table">
          <tbody>
            <tr>
              <th>{f?.incomeTax ?? "Income tax"}</th>
              <td>
                {renderValue(
                  taxes.incomeTax,
                  taxes.explainables.incomeTax
                )}
              </td>
            </tr>
            <tr>
              <th>{f?.zvw ?? "ZVW contribution"}</th>
              <td>
                {renderValue(
                  taxes.zvw,
                  taxes.explainables.zvw
                )}
              </td>
            </tr>
            <tr>
              <th>{f?.taxCredits ?? "Tax credits"}</th>
              <td>
                {renderValue(
                  taxes.kortingen.total,
                  taxes.explainables.taxCredits,
                  { negative: true }
                )}
              </td>
            </tr>
            <tr className="accountant-total">
              <th>{f?.totalTax ?? "Total tax"}</th>
              <td>
                {renderValue(
                  taxes.total,
                  taxes.explainables.totalTax
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 5. VAT */}
        <h3>{s?.vat ?? "VAT"}</h3>
        <table className="accountant-table">
          <tbody>
            <tr>
              <th>{f?.vatSales ?? "Turnover (excl. VAT)"}</th>
              <td>{renderValue(vat.salesExVat.total)}</td>
            </tr>
            <tr>
              <th>{f?.outputVat ?? "Output VAT"}</th>
              <td>{renderValue(vat.outputVat)}</td>
            </tr>
            <tr>
              <th>{f?.inputVat ?? "Input VAT"}</th>
              <td>
                {renderValue(vat.inputVat, undefined, {
                  negative: true,
                })}
              </td>
            </tr>
            <tr className="accountant-total">
              <th>
                {f?.vatPayable ?? "VAT payable"}
                {inputSnapshot.korApplied &&
                  ` (${f?.kor ?? "KOR"})`}
              </th>
              <td>
                {renderValue(
                  vat.payableVat,
                  taxes.explainables.vatPayable
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 6. NET */}
        <h3>{s?.net ?? "Net result"}</h3>
        <table className="accountant-table">
          <tbody>
            <tr className="accountant-total">
              <th>{f?.netIncome ?? "Net income"}</th>
              <td>
                {renderValue(
                  netIncome,
                  taxes.explainables.netIncome
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

     <TaxExplanationsPanel
  explanations={explanations}
  labels={explainLabels}
/>
    </>
  );
}

