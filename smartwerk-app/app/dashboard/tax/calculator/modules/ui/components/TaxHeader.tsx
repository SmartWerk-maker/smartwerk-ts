"use client";

import Link from "next/link";

interface TaxHeaderLabels {
  title?: string;
  subtitle?: string;
  back?: string;
}

interface Props {
  labels?: TaxHeaderLabels;
}

export function TaxHeader({ labels }: Props) {
  const title = labels?.title ?? "📊 SmartWerk Tax Calculator";
  const subtitle =
    labels?.subtitle ??
    "Estimate your Dutch taxes (ZZP, MKB, BTW, ZVW)";
  const backLabel = labels?.back ?? "Back to dashboard";

  return (
    <header className="tax-header">
      <div className="tax-header__layout">

        <div className="tax-header__content">
          <h1 className="tax-header__title">
            {title}
          </h1>

          <p className="tax-header__subtitle">
            {subtitle}
          </p>
        </div>

        <div className="tax-header__nav">
          <Link
            href="/dashboard"
            className="tax-header__back"
            aria-label={backLabel}
          >
            <span aria-hidden>←</span> {backLabel}
          </Link>
        </div>

      </div>
    </header>
  );
}
  