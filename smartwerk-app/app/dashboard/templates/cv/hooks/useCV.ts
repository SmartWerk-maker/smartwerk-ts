// cv/hooks/useCV.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import type { CVBlockData, CVPersonalInfo } from "../types";
import { exportCVToPDFPro } from "../utils/cvPdfExport.pro";
/* ======================================================
   CONSTANTS
====================================================== */

const STORAGE_KEY = "smartwerk.cv.v1";

/* ======================================================
   DEFAULTS
====================================================== */

const DEFAULT_PERSONAL: CVPersonalInfo = {
  fullName: "",
  title: "",
  email: "",
  phone: "",
  website: "",
   photo: undefined,
};

const DEFAULT_BLOCKS: CVBlockData[] = [
  { id: "summary", type: "text", titleKey: "summary", content: "", enabled: true },
  { id: "skills", type: "list", titleKey: "skills", content: [], enabled: true },
  { id: "experience", type: "text", titleKey: "experience", content: "", enabled: true },
  { id: "education", type: "text", titleKey: "education", content: "", enabled: true },
  { id: "projects", type: "text", titleKey: "projects", content: "", enabled: true },
  { id: "achievements", type: "list", titleKey: "achievements", content: [], enabled: true },
  { id: "testimonials", type: "text", titleKey: "testimonials", content: "", enabled: false },
  { id: "proposal", type: "text", titleKey: "proposal", content: "", enabled: false },
];

/* ======================================================
   STORAGE
====================================================== */

function readStorage():
  | { personal: CVPersonalInfo; blocks: CVBlockData[] }
  | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ======================================================
   HOOK
====================================================== */

export function useCV() {
  const stored = readStorage();

  const [personal, setPersonal] = useState<CVPersonalInfo>(
    stored?.personal ?? DEFAULT_PERSONAL
  );

  const [blocks, setBlocks] = useState<CVBlockData[]>(
    stored?.blocks ?? DEFAULT_BLOCKS
  );

  /* ===============================
     PERSONAL
  ================================ */

  const updatePersonal = useCallback(
    (key: keyof CVPersonalInfo, value: string) => {
      setPersonal((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /* ===============================
     BLOCKS
  ================================ */

  const updateBlock = useCallback(
    (id: string, content: string | string[]) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content } : b))
      );
    },
    []
  );

  const toggleBlock = useCallback((id: string) => {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, enabled: !b.enabled } : b
      )
    );
  }, []);

  /* ===============================
     STORAGE ACTIONS
  ================================ */

  const saveCV = useCallback(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        personal,
        blocks,
        updatedAt: new Date().toISOString(),
      })
    );
  }, [personal, blocks]);

  const loadCV = useCallback(() => {
    const data = readStorage();
    if (!data) return;
    setPersonal(data.personal);
    setBlocks(data.blocks);
  }, []);

  const clearCV = useCallback(() => {
    if (!confirm("Clear CV? This action cannot be undone.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setPersonal(DEFAULT_PERSONAL);
    setBlocks(DEFAULT_BLOCKS);
  }, []);

  /* ===============================
     DERIVED
  ================================ */

  const enabledBlocks = useMemo(
    () => blocks.filter((b) => b.enabled),
    [blocks]
  );

  /* ===============================
     API
  ================================ */

  return {
    personal,
    updatePersonal,

    blocks: enabledBlocks,
    updateBlock,
    toggleBlock,

    saveCV,
    loadCV,
    clearCV,

    exportPDF: () =>
  exportCVToPDFPro({
    personal,
    blocks,
    updatedAt: new Date().toISOString(),
  }),
  };
}