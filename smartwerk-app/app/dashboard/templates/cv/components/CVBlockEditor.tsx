"use client";

import type { CVBlockData, CVI18n } from "../types";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

type Props = {
  block: CVBlockData;
  onChange: (value: string | string[]) => void;
};

export default function CVBlockEditor({ block, onChange }: Props) {
  /* ===== i18n (HOOKS MUST BE HERE) ===== */
  const { language } = useLanguage();
  const dict = useTranslation(language) as unknown as { cv?: CVI18n };

  const addItemLabel =
    dict?.cv?.actions?.addItem ?? "Add item";

  /* ===== LIST TYPE ===== */
  if (block.type === "list") {
    const items = Array.isArray(block.content) ? block.content : [];

    const updateItem = (index: number, value: string) => {
      const next = [...items];
      next[index] = value;
      onChange(next);
    };

    const removeItem = (index: number) => {
      const next = items.filter((_, i) => i !== index);
      onChange(next);
    };

    return (
      <ul className="cv-editor-list">
        {items.map((item, index) => (
          <li
            key={`${block.id}-${index}`}
            className="cv-editor-list-item"
          >
            <input
              type="text"
              value={item}
              onChange={(e) =>
                updateItem(index, e.target.value)
              }
              placeholder="List item"
            />

            <button
              type="button"
              className="cv-editor-remove"
              onClick={() => removeItem(index)}
              aria-label="Remove item"
              title="Remove item"
            >
              ✕
            </button>
          </li>
        ))}

        <button
          type="button"
          className="cv-editor-add"
          onClick={() => onChange([...items, ""])}
        >
          ➕ {addItemLabel}
        </button>
      </ul>
    );
  }

  /* ===== TEXT TYPE ===== */
  return (
    <textarea
      className="cv-editor-text"
      value={typeof block.content === "string" ? block.content : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Write here…"
      rows={5}
    />
  );
}