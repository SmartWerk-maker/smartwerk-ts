"use client";

import { ExplainableAmount } from "../../../types/explanationTypes";
import { useLanguage } from "@/app/providers/LanguageProvider";

interface Props {
  label: string;
  value: number;

  explainable?: ExplainableAmount;
  onExplain?: (e: ExplainableAmount) => void;

  strong?: boolean;
  highlight?: boolean;
  muted?: boolean;
}

export function ResultRow({
  label,
  value,
  explainable,
  onExplain,
  strong = false,
  highlight = false,
  muted = false,
}: Props) {

  const { language } = useLanguage();

  const isClickable = Boolean(explainable && onExplain);

  const formattedValue = value.toLocaleString(language, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

  const handleExplain = () => {
    if (isClickable && explainable) {
      onExplain?.(explainable);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLSpanElement>
  ) => {
    if (!isClickable) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleExplain();
    }
  };

  return (
    <div
      className={[
        "tax-row",
        strong && "tax-row--strong",
        highlight && "tax-row--highlight",
        muted && "tax-row--muted",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="tax-row__label">
        {label}
      </span>

      <span
        className={[
          "tax-row__value",
          isClickable && "tax-row__value--clickable",
        ]
          .filter(Boolean)
          .join(" ")}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={`${label}: ${formattedValue}`}
        onClick={isClickable ? handleExplain : undefined}
        onKeyDown={handleKeyDown}
      >
        {formattedValue}
      </span>
    </div>
  );
}