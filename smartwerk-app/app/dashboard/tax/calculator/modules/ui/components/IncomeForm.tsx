"use client";

import { TaxInput } from "../../../types/TaxInput";
import { useLanguage } from "@/app/providers/LanguageProvider";

export interface IncomeFormLabels {
  title?: string;
  hours?: string;
  rate?: string;
  estimatedGross?: string;
  hint?: string;
  hoursPlaceholder?: string;
  ratePlaceholder?: string;
}

interface Props {
  hoursWorked: number;
  hourlyRate: number;
  onChange: <K extends keyof TaxInput>(
    key: K,
    value: TaxInput[K]
  ) => void;
  labels?: IncomeFormLabels;
}

export function IncomeForm({
  hoursWorked,
  hourlyRate,
  onChange,
  labels,
}: Props) {

  const { language } = useLanguage();

  const safeHours =
    Number.isFinite(hoursWorked) && hoursWorked > 0
      ? hoursWorked
      : 0;

  const safeRate =
    Number.isFinite(hourlyRate) && hourlyRate > 0
      ? hourlyRate
      : 0;

  const grossIncome = safeHours * safeRate;

  return (
    <div className="tax-card income-form">

      <h3 className="tax-card__title">
        {labels?.title ?? "Work & Income"}
      </h3>

      <div className="income-form__grid">

        <label className="income-form__field">
          <span className="income-form__label">
            {labels?.hours ?? "Hours worked"}
          </span>

          <input
            type="number"
            min={0}
            step={1}
            placeholder={labels?.hoursPlaceholder ?? "50"}
            inputMode="numeric"
            value={hoursWorked || ""}
            aria-label={labels?.hours ?? "Hours worked"}
            onChange={(e) => {
              const value = Number(e.target.value);
              onChange("hoursWorked", isNaN(value) ? 0 : value);
            }}
          />
        </label>

        <label className="income-form__field">
          <span className="income-form__label">
            {labels?.rate ?? "Hourly rate"}
          </span>

          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={labels?.ratePlaceholder ?? "50"}
            inputMode="decimal"
            value={hourlyRate || ""}
            aria-label={labels?.rate ?? "Hourly rate"}
            onChange={(e) =>
              onChange("hourlyRate", Number(e.target.value) || 0)
            }
          />
        </label>

      </div>

      <div
        className="income-form__summary"
        aria-live="polite"
      >
        <span className="income-form__summary-label">
          {labels?.estimatedGross ?? "Estimated gross income:"}
        </span>

        <strong className="income-form__summary-value">
          {grossIncome.toLocaleString(language, {
            style: "currency",
            currency: "EUR",
          })}
        </strong>
      </div>

      <p className="income-form__hint">
        {labels?.hint ??
          "Include all billable and non-billable hours worked in the selected year."}
      </p>

    </div>
  );
}