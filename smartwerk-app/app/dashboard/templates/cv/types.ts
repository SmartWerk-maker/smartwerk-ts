// cv/types.ts

/* ======================================================
   AI I18N (must be defined BEFORE CVI18n)
====================================================== */

export type CVAIText = {
  title: string;
  message: string;
};

export type CVAII18n = {
  summary: {
    tooShort: CVAIText;
    noExperience: CVAIText;
  };
  skills: {
    few: CVAIText;
  };
  experience: {
    noResults: CVAIText;
  };
  universal: {
    tooThin: CVAIText;
  };
};

/* ======================================================
   I18N
====================================================== */

export type CVBlockI18n = {
  title: string;
  placeholder: string;
};

export type CVBlockType =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "achievements"
  | "testimonials"
  | "proposal";

export type CVI18n = {
  title: string;
  subtitle?: string;

  personal: {
    title: string;
    fullName: string;
    email: string;
    phone: string;
    website: string;
  };

  blocks: Record<CVBlockType, CVBlockI18n>;

  actions: {
    exportPdf: string;
    save: string;
    load: string;
    clear: string;
    dashboard: string;
      addItem: string;

  };
   ui: {
    sectionWarning: string;
    improveWithAI: string;
    suggestionsTitle: string;
     apply: string;
  };

  /** AI suggestions translations */
  ai: CVAII18n;
};

export type CVDictionary = CVI18n;

/* ======================================================
   CORE DOMAIN
====================================================== */

export type CVPersonalInfo = {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  photo?: string;
};

export type CVBlockData = {
  id: string;
  type: "text" | "list";
  titleKey: CVBlockType;
  content: string | string[];
  enabled: boolean;
};

export type CVData = {
  personal: CVPersonalInfo;
  blocks: CVBlockData[];
  updatedAt?: string;
};

/* ======================================================
   EXPORT
====================================================== */

export type CVExportOptions = {
  format: "pdf";
  withoutBranding: boolean;
};