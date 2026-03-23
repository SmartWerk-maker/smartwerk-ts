"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import { useCV } from "./hooks/useCV";
import CVBlock from "./components/CVBlock";
import CVPersonalInfo from "./components/CVPersonalInfo";

import type { CVI18n, CVBlockType } from "./types";

import "./cv.css";

/** ===============================
 *  AUTO SPLIT (static)
 *  =============================== */
const LEFT_BLOCKS: CVBlockType[] = [
  "summary",
  "skills",
  "achievements",
  "testimonials",
  "proposal",
];

const RIGHT_BLOCKS: CVBlockType[] = ["experience", "projects", "education"];

export default function CVClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const dict = useTranslation(language);
  const t = dict?.cv as CVI18n | undefined;

  const {
    personal,
    updatePersonal,

    blocks,
    updateBlock,
    toggleBlock,

    
  
    clearCV,
    exportPDF,
  } = useCV();

  /* ===== THEME SYNC ===== */
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "theme-dark";
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(theme);
  }, []);

  /* ===============================
     AUTO SPLIT BLOCKS (hooks MUST be before returns)
  ================================ */
  const leftBlocks = useMemo(
    () => blocks.filter((b) => LEFT_BLOCKS.includes(b.titleKey)),
    [blocks]
  );

  const rightBlocks = useMemo(() => {
    const mainRight = blocks.filter((b) => RIGHT_BLOCKS.includes(b.titleKey));
    const rest = blocks.filter(
      (b) =>
        !LEFT_BLOCKS.includes(b.titleKey) && !RIGHT_BLOCKS.includes(b.titleKey)
    );
    return [...mainRight, ...rest];
  }, [blocks]);

  /* ===== DEBUG (after hooks) ===== */
  if (!t) {
    return (
      <main style={{ padding: 40 }}>
        <h1>CV dictionary not loaded</h1>
        <pre>{JSON.stringify(dict, null, 2)}</pre>
      </main>
    );
  }

  return (
    <main className="cv-container">
      {/* ===== HEADER ===== */}
      <header className="cv-header">
        <div className="cv-header-left">
          <h1>📄 {t.title}</h1>
          {t.subtitle && <p className="cv-subtitle">{t.subtitle}</p>}
        </div>

        <button
          className="btn btn-outline btn-icon"
          onClick={() => router.push("/dashboard")}
        >
          🏠 <span>{t.actions.dashboard}</span>
        </button>
      </header>

      {/* ===== MAIN LAYOUT (2 columns) ===== */}
      <div className="cv-layout">
        {/* LEFT */}
        <aside className="cv-left">
          <CVPersonalInfo t={t} personal={personal} onChange={updatePersonal} />

          {/* LEFT BLOCKS */}
          <section className="cv-blocks">
            {leftBlocks.map((block) => {
              const blockI18n = t.blocks[block.titleKey];
              return (
                <CVBlock
                  key={block.id}
                  block={block}
                  title={blockI18n.title}
                  onUpdate={updateBlock}
                  onToggle={toggleBlock}
                />
              );
            })}
          </section>
        </aside>

        {/* RIGHT */}
        <section className="cv-right">
          <section className="cv-blocks">
            {rightBlocks.map((block) => {
              const blockI18n = t.blocks[block.titleKey];
              return (
                <CVBlock
                  key={block.id}
                  block={block}
                  title={blockI18n.title}
                  onUpdate={updateBlock}
                  onToggle={toggleBlock}
                />
              );
            })}
          </section>
        </section>
      </div>

      {/* ===== ACTIONS ===== */}
      <footer className="cv-actions">
       

       

        <button className="btn btn-outline danger" onClick={clearCV}>
          🗑️ {t.actions.clear}
        </button>

        <button className="btn btn-primary" onClick={exportPDF}>
          📄 {t.actions.exportPdf}
        </button>
      </footer>
    </main>
  );
}