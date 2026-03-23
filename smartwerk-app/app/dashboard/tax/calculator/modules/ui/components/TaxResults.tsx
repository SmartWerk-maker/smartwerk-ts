"use client";

import { TaxResult } from "../../../types/TaxResult";
import { useExplainModal } from "../../../hooks/useExplainModal";
import { ResultRow } from "./ResultRow";
import { ExplainModal } from "./ExplainModal";
import { generateTaxReport } from "../../../services/export/exportPdf";
import { generateTaxExcel } from "../../../services/export/exportXlsx";
import { useLanguage } from "@/app/providers/LanguageProvider";

/* ======================
   i18n Types
====================== */

export interface TaxResultsI18n {
  title?: string;

  rows?: {
    revenue?: string;
    expenses?: string;
    profit?: string;

    taxableIncome?: string;
    incomeTax?: string;
    taxCredits?: string;
    zvw?: string;
    totalTax?: string;

    vatPayable?: string;

    netIncome?: string;
    netCashPosition?: string;
  };

  exportPdf?: string;
  exportExcel?: string;

  explain?: {
    title?: string;
    close?: string;
    formula?: string;
    inputs?: string;
    explanation?: string;
  };
}


interface Props {
  result: TaxResult;
  period?: string;
  labels?: TaxResultsI18n;
}
/* ======================
   Component
====================== */

export function TaxResults({ result, period, labels }: Props) {
  const { language } = useLanguage();

  const {
    explainData,
    isOpen,
    openExplainModal,
    closeExplainModal,
  } = useExplainModal();

  if (!result.success) return null;

  const handleExplain = openExplainModal;

  const {
    income,
    taxableIncome,
    taxes,
    vat,
    netIncome,
    netCashPosition,
  } = result;

  const r = labels?.rows;

  const title = labels?.title ?? "Result";

  const exportPdfLabel =
    labels?.exportPdf ?? "Export PDF";

  const exportExcelLabel =
    labels?.exportExcel ?? "Export Excel";

  return (
    <>
      <section
        className="tax-card tax-section tax-results"
        aria-labelledby="tax-results-title"
      >
        <h2 id="tax-results-title" className="tax-results__title">
          {title}
        </h2>

        <ResultRow label={r?.revenue ?? "Revenue"} value={income.gross} />
        <ResultRow label={r?.expenses ?? "Business expenses"} value={income.expenses} />
        <ResultRow label={r?.profit ?? "Profit"} value={income.profit} strong />

        <hr className="tax-results__divider" />

        <ResultRow
          label={r?.taxableIncome ?? "Taxable income"}
          value={taxableIncome}
          explainable={taxes.explainables.taxableIncome}
          onExplain={handleExplain}
        />

        <ResultRow
          label={r?.incomeTax ?? "Income tax"}
          value={taxes.incomeTax}
          explainable={taxes.explainables.incomeTax}
          onExplain={handleExplain}
        />

        <ResultRow
          label={r?.taxCredits ?? "Tax credits"}
          value={taxes.kortingen.total}
          explainable={taxes.explainables.taxCredits}
          onExplain={handleExplain}
          muted={taxes.kortingen.total === 0}
        />

        <ResultRow
          label={r?.zvw ?? "ZVW contribution"}
          value={taxes.zvw}
          explainable={taxes.explainables.zvw}
          onExplain={handleExplain}
        />

        <ResultRow
          label={r?.totalTax ?? "Total tax"}
          value={taxes.total}
          explainable={taxes.explainables.totalTax}
          onExplain={handleExplain}
          strong
        />

        <hr className="tax-results__divider" />

        <ResultRow
          label={r?.vatPayable ?? "VAT payable / receivable"}
          value={vat.payableVat}
          explainable={taxes.explainables.vatPayable}
          onExplain={handleExplain}
          muted={vat.payableVat === 0}
        />

        <hr className="tax-results__divider" />

        <ResultRow
          label={r?.netIncome ?? "Net income"}
          value={netIncome}
          explainable={taxes.explainables.netIncome}
          onExplain={handleExplain}
          highlight
        />

        <ResultRow
          label={r?.netCashPosition ?? "Net cash position"}
          value={netCashPosition}
          explainable={taxes.explainables.netCashPosition}
          onExplain={handleExplain}
          highlight
        />

        {/* Export */}

        <button
          className="tax-export"
          onClick={() =>
            generateTaxReport({
              quarter: period ?? "Q1",
              date: new Date().toLocaleDateString(language),

              revenue: income.gross,
              expenses: income.expenses,
              profit: income.profit,

              taxableIncome: taxableIncome,
              incomeTax: taxes.incomeTax,
              zvw: taxes.zvw,

              totalTax: taxes.total,
              netIncome: netIncome,
            })
          }
        >
          {exportPdfLabel}
        </button>

        <button
          className="tax-export"
          onClick={() =>
            generateTaxExcel({
              quarter: period ?? "Q1",
              date: new Date().toLocaleDateString(language),

              revenue: income.gross,
              expenses: income.expenses,
              profit: income.profit,

              taxableIncome: taxableIncome,
              incomeTax: taxes.incomeTax,
              zvw: taxes.zvw,

              totalTax: taxes.total,
              netIncome: netIncome,
            })
          }
        >
          {exportExcelLabel}
        </button>
      </section>

      {isOpen && explainData && (
        <ExplainModal
          data={explainData}
          onClose={closeExplainModal}
          labels={labels?.explain}
        />
      )}
    </>
  );
}