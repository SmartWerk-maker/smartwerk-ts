"use client";

import { TaxInput } from "../../../types/TaxInput";

export interface TaxOptionsLabels {
  title?: string;

  hours?: {
    label?: string;
    hint?: string;
    options?: {
      meets1225?: string;
      notMeets1225?: string;
    };
  };

  kvk?: {
    label?: string;
    hint?: string;
    notice?: string;
  };

  starter?: {
    label?: string;
    hint?: string;
  };

  kor?: {
    label?: string;
    hint?: string;
  };

  vat?: {
    label?: string;
    hint?: string;
    options?: {
      vat21?: string;
      vat9?: string;
      vat0?: string;
    };
  };

  common?: {
    yes?: string;
    no?: string;
  };
}

interface Props {
  input: TaxInput;

  onChange: <K extends keyof TaxInput>(
    key: K,
    value: TaxInput[K]
  ) => void;

  labels?: TaxOptionsLabels;
}

export function TaxOptionsForm({
  input,
  onChange,
  labels,
}: Props) {
  /* ======================
     Common labels
  ====================== */

  const yesLabel = labels?.common?.yes ?? "Yes";
  const noLabel = labels?.common?.no ?? "No";

  const hoursYes =
    labels?.hours?.options?.meets1225 ?? yesLabel;

  const hoursNo =
    labels?.hours?.options?.notMeets1225 ?? noLabel;

  const hoursEligible = input.hoursWorked >= 1225;

  /* ======================
     Labels (deduplicated)
  ====================== */

  const title = labels?.title ?? "Tax options";

  const kvkLabel =
    labels?.kvk?.label ?? "KvK registration";

  const starterLabel =
    labels?.starter?.label ?? "Starter (first 5 years)";

  const hoursLabel =
    labels?.hours?.label ?? "1225-hour criterion";

  const korLabel =
    labels?.kor?.label ?? "KOR (Small Business Scheme)";

  const vatLabel =
    labels?.vat?.label ?? "VAT rate";

  const hoursHint =
    labels?.hours?.hint ??
    "Automatically determined from hours worked.";

  const kvkNotice =
    labels?.kvk?.notice ??
    "Without KvK registration, deductions cannot be applied.";

  /* ======================
     Render
  ====================== */

  return (
    <div className="tax-card tax-options">
      <h3 className="tax-card__title">{title}</h3>

      {/* KvK */}
      <label className="tax-options__field">
        <span className="tax-options__label">
          {kvkLabel}
        </span>

        <select
          value={input.kvkRegistered ? "yes" : "no"}
          onChange={(e) =>
            onChange("kvkRegistered", e.target.value === "yes")
          }
        >
          <option value="yes">{yesLabel}</option>
          <option value="no">{noLabel}</option>
        </select>

        {labels?.kvk?.hint && (
          <span className="tax-options__hint">
            {labels.kvk.hint}
          </span>
        )}
      </label>

      {/* Starter */}
      <label className="tax-options__field">
        <span className="tax-options__label">
          {starterLabel}
        </span>

        <select
          value={input.isStarter ? "yes" : "no"}
          onChange={(e) =>
            onChange("isStarter", e.target.value === "yes")
          }
        >
          <option value="yes">{yesLabel}</option>
          <option value="no">{noLabel}</option>
        </select>

        {labels?.starter?.hint && (
          <span className="tax-options__hint">
            {labels.starter.hint}
          </span>
        )}
      </label>

      {/* 1225 hour rule */}
      <label className="tax-options__field">
        <span className="tax-options__label">
          {hoursLabel}
        </span>

        <select
          value={hoursEligible ? "yes" : "no"}
          disabled
          aria-disabled="true"
        >
          <option value="yes">{hoursYes}</option>
          <option value="no">{hoursNo}</option>
        </select>

        <span className="tax-options__hint">
          {hoursHint}
        </span>
      </label>

      {/* KOR */}
      <label className="tax-options__field">
        <span className="tax-options__label">
          {korLabel}
        </span>

        <select
          value={input.korApplied ? "yes" : "no"}
          onChange={(e) =>
            onChange("korApplied", e.target.value === "yes")
          }
        >
          <option value="yes">{yesLabel}</option>
          <option value="no">{noLabel}</option>
        </select>

        {labels?.kor?.hint && (
          <span className="tax-options__hint">
            {labels.kor.hint}
          </span>
        )}
      </label>

      {/* VAT */}
      <label className="tax-options__field">
        <span className="tax-options__label">
          {vatLabel}
        </span>

        <select
          value={input.btwRate}
          disabled={input.korApplied}
          aria-disabled={input.korApplied}
          onChange={(e) =>
            onChange(
              "btwRate",
              Number(e.target.value) as TaxInput["btwRate"]
            )
          }
        >
          <option value={0.21}>
            {labels?.vat?.options?.vat21 ?? "21%"}
          </option>

          <option value={0.09}>
            {labels?.vat?.options?.vat9 ?? "9%"}
          </option>

          <option value={0}>
            {labels?.vat?.options?.vat0 ?? "0%"}
          </option>
        </select>

        {labels?.vat?.hint && (
          <span className="tax-options__hint">
            {labels.vat.hint}
          </span>
        )}
      </label>

      {/* Notice */}
      {!input.kvkRegistered && (
        <p className="tax-options__notice" role="note">
          ℹ️ {kvkNotice}
        </p>
      )}
    </div>
  );
}