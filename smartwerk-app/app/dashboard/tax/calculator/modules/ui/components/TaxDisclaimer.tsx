"use client";

interface TaxDisclaimerLabels {
  title?: string;
  text?: string;
}

interface Props {
  labels?: TaxDisclaimerLabels;
}

export function TaxDisclaimer({ labels }: Props) {

  return (
    <div className="tax-disclaimer">

      <h3 className="tax-disclaimer__title">
        ⚠️ {labels?.title ?? "Important notice"}
      </h3>

      <p className="tax-disclaimer__text">
        {labels?.text ??
          "This calculator provides an estimate of Dutch taxes based on the information you provide. It is not official tax advice and does not replace professional accounting services."}
      </p>

    </div>
  );
}