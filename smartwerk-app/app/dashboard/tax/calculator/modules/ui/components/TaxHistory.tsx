"use client";

import { useState } from "react";
import { format } from "date-fns";
import { enUS, ru, nl } from "date-fns/locale";

import { TaxInput } from "../../../types/TaxInput";
import { useTaxHistory } from "../../../hooks/useTaxHistory";
import { useLanguage } from "@/app/providers/LanguageProvider";

import type { Locale } from "date-fns";


export interface TaxHistoryLabels {
  title?: string;
  loading?: string;
  error?: string;
  empty?: string;

  taxableIncome?: string;
  totalTax?: string;
  netIncome?: string;

  restore?: string;
  delete?: string;
  cancel?: string;
  confirmDelete?: string;
}

interface Props {
  userId: string;
  onRestore: (input: TaxInput) => void;
  labels?: TaxHistoryLabels;
}

export function TaxHistory({
  userId,
  onRestore,
  labels,
}: Props) {
  const { history, loading, error, deleteEntry } =
    useTaxHistory(userId);

  const [confirmId, setConfirmId] =
    useState<string | null>(null);

  const { language } = useLanguage();

  /* ======================
     i18n helpers
  ====================== */

  const formatCurrency = (value: number) =>
    value.toLocaleString(language, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });

  const locales: Partial<Record<string, Locale>> = {
    en: enUS,
    ru: ru,
    nl: nl,
  } as const;

  const formatDate = (date: Date) =>
    format(date, "dd MMM yyyy", {
      locale: locales[language] ?? enUS,
    });

  /* ======================
     Labels (deduplicated)
  ====================== */

  const title = labels?.title ?? "Calculation history";
  const loadingLabel = labels?.loading ?? "Loading…";
  const errorLabel = labels?.error ?? "Failed to load history";
  const emptyLabel =
    labels?.empty ?? "No saved calculations yet.";

  const taxableIncomeLabel =
    labels?.taxableIncome ?? "Taxable income";
  const totalTaxLabel =
    labels?.totalTax ?? "Total tax";
  const netIncomeLabel =
    labels?.netIncome ?? "Net income";

  const restoreLabel = labels?.restore ?? "Restore";
  const deleteLabel = labels?.delete ?? "Delete";
  const cancelLabel = labels?.cancel ?? "Cancel";
  const confirmDeleteLabel =
    labels?.confirmDelete ?? "Delete this entry?";

  /* ======================
     Render
  ====================== */

  return (
    <section
      className="tax-history"
      aria-labelledby="tax-history-title"
    >
      <h3 id="tax-history-title">{title}</h3>

      {/* Loading */}
      {loading && <p>{loadingLabel}</p>}

      {/* Error */}
      {!loading && error && (
        <p role="alert">{errorLabel}</p>
      )}

      {/* Empty */}
      {!loading && !error && !history?.length && (
        <p>{emptyLabel}</p>
      )}

      {/* List */}
      {!loading && !error && history?.length > 0 && (
        <ul className="tax-history__list">
          {history.map((h) => {
            if (!h.id) return null;

            const isConfirming =
              confirmId === h.id;

            const date =
              h.createdAt?.toDate?.();

            return (
              <li
                key={h.id}
                className="tax-history__item"
              >
                {/* Meta */}
                <div className="tax-history__meta">
                  <strong>
                    {date ? formatDate(date) : "—"}
                  </strong>

                  {h.snapshot.meta?.period && (
                    <span>
                      {" "}
                      • {h.snapshot.meta.period}
                    </span>
                  )}
                </div>

                {/* Values */}
                <div className="tax-history__values">
                  <div>
                    {taxableIncomeLabel}:{" "}
                    {formatCurrency(
                      h.result.taxableIncome
                    )}
                  </div>

                  <div>
                    {totalTaxLabel}:{" "}
                    {formatCurrency(
                      h.result.totalTax
                    )}
                  </div>

                  <div className="highlight">
                    {netIncomeLabel}:{" "}
                    {formatCurrency(
                      h.result.netIncome
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="tax-history__actions">
                  {!isConfirming ? (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onRestore(h.snapshot)
                        }
                      >
                        {restoreLabel}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() =>
                          setConfirmId(h.id)
                        }
                      >
                        {deleteLabel}
                      </button>
                    </>
                  ) : (
                    <div
                      className="tax-history__confirm"
                      role="alertdialog"
                      aria-modal="true"
                      aria-label={confirmDeleteLabel}
                    >
                      <span>
                        {confirmDeleteLabel}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setConfirmId(null)
                        }
                      >
                        {cancelLabel}
                      </button>

                      <button
                        type="button"
                        className="danger"
                        onClick={() => {
                          deleteEntry(h.id);
                          setConfirmId(null);
                        }}
                      >
                        {deleteLabel}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}