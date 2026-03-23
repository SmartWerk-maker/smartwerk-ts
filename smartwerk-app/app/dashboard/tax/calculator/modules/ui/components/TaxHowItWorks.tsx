"use client";

export interface TaxHowItWorksLabels {
  title?: string;
  items?: {
    profit?: string;
    taxableIncome?: string;
    incomeTax?: string;
    zvw?: string;
    vat?: string;
  };
}

interface Props {
  labels?: TaxHowItWorksLabels;
}

export function TaxHowItWorks({ labels }: Props) {

  const title =
    labels?.title ?? "How the calculation works";

  const i = labels?.items;

  return (
    <div className="tax-how">

      <h3 className="tax-how__title">
        {title}
      </h3>

      <ul className="tax-how__list">

        <li>
          {i?.profit ??
            "Profit = revenue − business expenses"}
        </li>

        <li>
          {i?.taxableIncome ??
            "Taxable income is profit minus eligible deductions"}
        </li>

        <li>
          {i?.incomeTax ??
            "Income tax is calculated using Dutch tax brackets"}
        </li>

        <li>
          {i?.zvw ??
            "ZVW is the mandatory health contribution for entrepreneurs"}
        </li>

        <li>
          {i?.vat ??
            "VAT is calculated separately and does not affect income tax"}
        </li>

      </ul>

    </div>
  );
}