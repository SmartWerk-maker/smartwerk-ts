"use client";

import { TaxInput } from "../../../types/TaxInput";

/* ======================
   i18n types
====================== */

type ExpenseKey = keyof TaxInput["expenses"];

export interface ExpenseFieldLabels {
  label?: string;
  hint?: string;
}

export interface ExpensesFormLabels {
  title?: string;
  note?: string;
  fields?: Partial<Record<ExpenseKey, ExpenseFieldLabels>>;
}

interface Props {
  expenses: TaxInput["expenses"];
  onChange: (
    key: ExpenseKey,
    value: number
  ) => void;

  labels?: ExpensesFormLabels;
}

/**
 * Expense field configuration
 */
const EXPENSE_FIELDS: ExpenseKey[] = [
  "vehicle",
  "office",
  "internet",
  "marketing",
  "other",
  "extraBenefits",
];

export function ExpensesForm({
  expenses,
  onChange,
  labels,
}: Props) {

  return (
    <div className="tax-card expenses-form">

      <h3 className="tax-card__title">
        {labels?.title ?? "Business expenses"}
      </h3>

      <div className="expenses-form__grid">

        {EXPENSE_FIELDS.map((key) => {

          const field = labels?.fields?.[key];

          return (
            <label
              key={key}
              className="expenses-form__field"
            >

              <span className="expenses-form__label">
                {field?.label ?? key}
              </span>

              <input
                type="number"
                min={0}
                step={0.01}
                inputMode="decimal"
                placeholder="0.00"
                value={expenses[key] || ""}
                aria-label={field?.label ?? key}
                onChange={(e) =>
                  onChange(
                    key,
                    Number(e.target.value) || 0
                  )
                }
              />

              {field?.hint && (
                <span className="expenses-form__hint">
                  ℹ️ {field.hint}
                </span>
              )}

            </label>
          );
        })}

      </div>

      {labels?.note && (
        <p className="expenses-form__note">
          {labels.note}
        </p>
      )}

    </div>
  );
}