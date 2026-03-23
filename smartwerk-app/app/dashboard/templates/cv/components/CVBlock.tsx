"use client";

import { useState, useMemo } from "react";

import type { CVBlockData, CVBlockType, CVI18n } from "../types";
import type { CVAIContext } from "../ai/cvAITypes";

import CVBlockEditor from "./CVBlockEditor";
import CVAIButton from "./CVAIButton";
import CVAISuggestions from "./CVAISuggestions";

import { useCVAI } from "../hooks/useCVAI";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

/* ===============================
   HELPERS
================================ */

function mapBlockTypeToAI(type: CVBlockType): CVAIContext["blockType"] {
  switch (type) {
    case "summary":
    case "skills":
    case "experience":
    case "education":
    case "projects":
      return type;
    default:
      return "custom";
  }
}

/* ===============================
   COMPONENT
================================ */

type Props = {
  block: CVBlockData;
  title: string;
  onUpdate: (id: string, content: string | string[]) => void;
  onToggle: (id: string) => void;
};

export default function CVBlock({
  block,
  title,
  onUpdate,
  onToggle,
}: Props) {
  const [aiOpen, setAiOpen] = useState(false);

  /* ===== i18n ===== */
  const { language } = useLanguage();
  const dict = useTranslation(language) as unknown as { cv?: CVI18n };
  const warningText = dict?.cv?.ui?.sectionWarning;

  /* ===== Normalize content to string (for AI) ===== */
  const normalizedContent = useMemo(() => {
    return typeof block.content === "string"
      ? block.content
      : block.content.join(", ");
  }, [block.content]);

  /* ===== AI CONTEXT ===== */
  const aiContext: CVAIContext | null = useMemo(() => {
    if (!aiOpen || !block.enabled) return null;
    if (!normalizedContent.trim()) return null;

    return {
      title,
      content: normalizedContent,
      blockType: mapBlockTypeToAI(block.titleKey),
    };
  }, [aiOpen, block.enabled, normalizedContent, block.titleKey, title]);

  /* ===== AI HOOK ===== */
  const { suggestions, hasWarnings } = useCVAI(aiContext);

  /* ===============================
     RENDER
  ================================ */

  return (
    <section
      className={`cv-block ${block.enabled ? "" : "cv-block--disabled"}`}
    >
      {/* ===== HEADER ===== */}
      <header className="cv-block-header">
        <h2 className="cv-block-title">{title}</h2>

        <div className="cv-block-actions">
          <CVAIButton onClick={() => setAiOpen((v) => !v)} />

          <button
            type="button"
            className="cv-block-toggle"
            onClick={() => onToggle(block.id)}
            aria-label={block.enabled ? "Hide section" : "Show section"}
            title={block.enabled ? "Hide section" : "Show section"}
          >
            {block.enabled ? "👁️" : "🙈"}
          </button>
        </div>
      </header>

      {/* ===== BODY ===== */}
      {block.enabled && (
        <div className="cv-block-body">
          <CVBlockEditor
            block={block}
            onChange={(content) => onUpdate(block.id, content)}
          />

          {/* ===== AI PANEL ===== */}
          {aiOpen && (
            <CVAISuggestions
              suggestions={suggestions}
              currentContent={normalizedContent}
              onApply={(newContent) =>
                onUpdate(
                  block.id,
                  block.type === "list"
                    ? newContent.split(",").map((s) => s.trim())
                    : newContent
                )
              }
            />
          )}

          {/* ===== AI WARNING ===== */}
          {aiOpen && hasWarnings && warningText && (
            <div className="cv-ai-warning">⚠️ {warningText}</div>
          )}
        </div>
      )}
    </section>
  );
}