"use client";

/**
 * Supported tax reporting periods
 */
export type TaxPeriod = "Q1" | "Q2" | "Q3" | "Q4";

/* ======================
   i18n types
====================== */

export interface PeriodFormLabels {
  title?: string;
  label?: string;
  hint?: string;
  options?: {
    Q1?: string;
    Q2?: string;
    Q3?: string;
    Q4?: string;
  };
}

interface Props {
  value?: TaxPeriod;
  onChange: (period: TaxPeriod) => void;
  labels?: PeriodFormLabels;
}

export function PeriodForm({
  value = "Q1",
  onChange,
  labels,
}: Props) {

  return (
    <div className="tax-card tax-period">

      <h3 className="tax-card__title">
        {labels?.title ?? "Reporting period"}
      </h3>

      <label className="tax-period__label">

        <span className="tax-period__label-text">
          {labels?.label ?? "Tax period"}
        </span>

        <select
          className="tax-period__select"
          value={value}
          aria-label={labels?.label ?? "Tax period"}
          onChange={(e) =>
            onChange(e.target.value as TaxPeriod)
          }
        >
          <option value="Q1">
            {labels?.options?.Q1 ?? "Q1 — January to March"}
          </option>

          <option value="Q2">
            {labels?.options?.Q2 ?? "Q2 — April to June"}
          </option>

          <option value="Q3">
            {labels?.options?.Q3 ?? "Q3 — July to September"}
          </option>

          <option value="Q4">
            {labels?.options?.Q4 ?? "Q4 — October to December"}
          </option>
        </select>

      </label>

      <p className="tax-period__hint">
        {labels?.hint ?? "Select the quarter you want to calculate taxes for."}
      </p>

    </div>
  );
}