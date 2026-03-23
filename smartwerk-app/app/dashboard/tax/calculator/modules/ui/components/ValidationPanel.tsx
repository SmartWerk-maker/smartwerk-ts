"use client";

import { TaxWarning, WarningCode } from "../../domain/warnings";
import { warningLabels } from "../../domain/labels";

/* ======================
   i18n Types
====================== */

export interface ValidationLabels {
  title?: string;
  errorsTitle?: string;
  warningsTitle?: string;

  warnings?: Partial<
    Record<
      WarningCode,
      {
        title?: string;
        description?: string;
      }
    >
  >;
}

/* ======================
   Props
====================== */

interface Props {
  errors: string[];
  warnings: TaxWarning[];
  labels?: ValidationLabels;
}

/* ======================
   Helpers
====================== */

const WARNING_ORDER = {
  error: 0,
  warning: 1,
  info: 2,
} as const;

/* ======================
   Component
====================== */

export function ValidationPanel({
  errors,
  warnings,
  labels,
}: Props) {
  const hasErrors = Boolean(errors?.length);
  const hasWarnings = Boolean(warnings?.length);

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  const sortedWarnings = [...warnings].sort(
    (a, b) =>
      WARNING_ORDER[a.level] - WARNING_ORDER[b.level]
  );

  return (
    <section
      className="validation-panel"
      aria-labelledby="validation-panel-title"
    >
      <h2 id="validation-panel-title" className="sr-only">
        {labels?.title ?? "Validation"}
      </h2>

      {/* ================= ERRORS ================= */}

      {hasErrors && (
        <div
          className="validation-block validation-block--error"
          role="alert"
          aria-live="assertive"
        >
          <h3 className="validation-block__title">
            {labels?.errorsTitle ?? "Errors"}
          </h3>

          <ul className="validation-list">
            {errors.map((message, index) => (
              <li
                key={`error-${index}`}
                className="validation-item validation-item--error"
              >
                {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ================= WARNINGS ================= */}

      {hasWarnings && (
        <div
          className="validation-block validation-block--warning"
          role="status"
          aria-live="polite"
        >
          <h3 className="validation-block__title">
            {labels?.warningsTitle ?? "Warnings"}
          </h3>

          <ul className="validation-list">
            {sortedWarnings.map((warning, index) => {
              const fallback = warningLabels[warning.code];
              if (!fallback) return null;

              const custom =
                labels?.warnings?.[warning.code];

              const title =
                custom?.title ?? fallback.title;

              const description =
                custom?.description ??
                fallback.description;

              return (
                <li
                  key={`${warning.code}-${index}`}
                  className={`validation-item validation-item--${warning.level}`}
                  role={
                    warning.level === "info"
                      ? "note"
                      : undefined
                  }
                >
                  <strong className="validation-item__title">
                    {title}
                  </strong>

                  <p className="validation-item__description">
                    {description}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}