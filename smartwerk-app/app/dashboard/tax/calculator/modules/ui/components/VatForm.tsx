"use client";

import { TaxInput } from "../../../types/TaxInput";

/* ======================
   Types
====================== */

type VatData = NonNullable<TaxInput["vat"]>;
type SalesExVat = NonNullable<VatData["salesExVat"]>;
type SalesRate = keyof SalesExVat;

export interface VatFormLabels {
  title?: string;
  korInfo?: string;

  salesTitle?: string;
  standard?: string;
  reduced?: string;
  zero?: string;

  inputVatTitle?: string;
  inputVatLabel?: string;

  note?: string;
}

interface Props {
  vat?: VatData;
  korApplied: boolean;
  onChange: (vat: VatData) => void;
  labels?: VatFormLabels;
}

/* ======================
   Defaults
====================== */

const DEFAULT_SALES_EX_VAT: SalesExVat = {
  standard: 0,
  reduced: 0,
  zero: 0,
} as SalesExVat;

/* ======================
   Component
====================== */

export function VatForm({
  vat,
  korApplied,
  onChange,
  labels,
}: Props) {
  const salesExVat: SalesExVat =
    (vat?.salesExVat as SalesExVat | undefined) ??
    DEFAULT_SALES_EX_VAT;

  const inputVatDeductible = vat?.inputVatDeductible ?? 0;

  function updateSalesRate(
    rate: SalesRate,
    value: number
  ) {
    onChange({
      ...(vat ?? {}),
      salesExVat: {
        ...salesExVat,
        [rate]: value,
      },
      inputVatDeductible,
    } as VatData);
  }

  function updateInputVat(value: number) {
    onChange({
      ...(vat ?? {}),
      salesExVat,
      inputVatDeductible: value,
    } as VatData);
  }

  return (
    <fieldset className="vat-form">
      <legend>
        {labels?.title ?? "VAT / BTW"}
      </legend>

      {korApplied && (
        <p className="vat-form__info">
          {labels?.korInfo ??
            "KOR is applied. VAT payable is usually €0."}
        </p>
      )}

      <h4>
        {labels?.salesTitle ?? "Sales (excl. VAT)"}
      </h4>

      <div className="vat-form__grid">
        <label>
          {labels?.standard ?? "21% (standard)"}
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={salesExVat.standard ?? 0}
            disabled={korApplied}
            onChange={(e) =>
              updateSalesRate(
                "standard",
                Number(e.target.value) || 0
              )
            }
          />
        </label>

        <label>
          {labels?.reduced ?? "9% (reduced)"}
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={salesExVat.reduced ?? 0}
            disabled={korApplied}
            onChange={(e) =>
              updateSalesRate(
                "reduced",
                Number(e.target.value) || 0
              )
            }
          />
        </label>

        <label>
          {labels?.zero ?? "0% (zero)"}
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={salesExVat.zero ?? 0}
            disabled={korApplied}
            onChange={(e) =>
              updateSalesRate(
                "zero",
                Number(e.target.value) || 0
              )
            }
          />
        </label>
      </div>

      <h4>
        {labels?.inputVatTitle ??
          "Input VAT (deductible)"}
      </h4>

      <label>
        {labels?.inputVatLabel ??
          "VAT on expenses deductible"}
        <input
          type="number"
          min={0}
          step={0.01}
          inputMode="decimal"
          value={inputVatDeductible}
          disabled={korApplied}
          onChange={(e) =>
            updateInputVat(
              Number(e.target.value) || 0
            )
          }
        />
      </label>

      <p className="vat-form__note">
        {labels?.note ??
          "VAT is calculated separately and does not affect income tax."}
      </p>
    </fieldset>
  );
}