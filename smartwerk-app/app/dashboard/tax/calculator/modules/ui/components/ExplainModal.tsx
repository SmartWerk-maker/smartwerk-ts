"use client";

import { useEffect, useRef } from "react";
import { ExplainableAmount } from "../../../types/explanationTypes";

/* ======================
   i18n types
====================== */

interface ExplainModalLabels {
  title?: string;
  close?: string;
  formula?: string;
  inputs?: string;
  explanation?: string;
}

interface Props {
  data: ExplainableAmount;
  onClose: () => void;
  labels?: ExplainModalLabels;
}

export function ExplainModal({
  data,
  onClose,
  labels,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  /* ======================
     Effects
  ====================== */

  useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  window.addEventListener("keydown", onKeyDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
  };
}, [onClose]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const formatCurrency = (value: number) =>
    value.toLocaleString(undefined, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });

  /* ======================
     Render
  ====================== */

  return (
    <div

      className="explain-modal__overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="explain-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explain-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <header className="explain-modal__header">
          <h3 id="explain-modal-title">
            {labels?.title ?? "Explanation"}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="explain-modal__close"
            aria-label={labels?.close ?? "Close"}
          >
            ✕
          </button>
        </header>

        {/* ===== Formula ===== */}
        {data.formula && (
          <section className="explain-modal__section">
            <strong>
              {labels?.formula ?? "Formula"}
            </strong>
            <div className="explain-modal__formula">
              {data.formula}
            </div>
          </section>
        )}

        {/* ===== Inputs ===== */}
        {data.inputs &&
          Object.keys(data.inputs).length > 0 && (
            <section className="explain-modal__section">
              <strong>
                {labels?.inputs ?? "Inputs"}
              </strong>

              <ul className="explain-modal__list">
                {Object.entries(data.inputs).map(
                  ([key, value]) => (
                    <li key={key}>
                      <span className="explain-modal__input-key">
                        {key}
                      </span>
                      :{" "}
                      <span className="explain-modal__input-value">
                        {formatCurrency(value)}
                      </span>
                    </li>
                  )
                )}
              </ul>
            </section>
          )}

        {/* ===== Explanation ===== */}
        {data.explanation &&
          data.explanation.length > 0 && (
            <section className="explain-modal__section">
              <strong>
                {labels?.explanation ?? "Explanation"}
              </strong>

              <ul className="explain-modal__list">
                {data.explanation.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </section>
          )}
      </div>
    </div>
  );
}