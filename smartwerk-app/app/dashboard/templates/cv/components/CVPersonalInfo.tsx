"use client";

import type { CVI18n, CVPersonalInfo as CVPersonalInfoType } from "../types";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

type Props = {
  t: CVI18n;
  personal: CVPersonalInfoType;
  onChange: (key: keyof CVPersonalInfoType, value: string) => void;
};

function readImageAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CVPersonalInfo({ t, personal, onChange }: Props) {
  const { language } = useLanguage();
  const dict = useTranslation(language) as unknown as {
  cv?: {
    ui?: {
      removePhoto?: string;
    };
  };
};

  const removePhotoLabel =
    dict?.cv?.ui?.removePhoto ?? "Remove photo";
  return (
    <section className="cv-personal">
      {/* ===== TITLE ===== */}
      <header className="cv-personal-header">
        <h2>{t.personal.title}</h2>
      </header>

      <div className="cv-photo-upload">
  <label className="cv-photo">
    {personal.photo ? (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={personal.photo} alt="Profile photo" />
    ) : (
      <span>📷 Add photo</span>
    )}

    <input
      type="file"
      accept="image/*"
      hidden
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2_000_000) {
          alert("Photo must be under 2MB");
          return;
        }

        const base64 = await readImageAsBase64(file);
        onChange("photo", base64);
      }}
    />
  </label>

 {personal.photo && (
  <button
    className="btn btn-sm btn-outline"
    onClick={() => onChange("photo", "")}
  >
    {removePhotoLabel}
  </button>
)}
</div>

      {/* ===== FORM ===== */}
      <div className="cv-personal-grid">
        {/* Full name */}
        <div className="cv-field">
          <label>{t.personal.fullName}</label>
          <input
            type="text"
            value={personal.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            placeholder={t.personal.fullName}
          />
        </div>

        {/* Professional title */}
        <div className="cv-field">
          <label>{t.subtitle ?? "Professional title"}</label>
          <input
            type="text"
            value={personal.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Frontend Developer"
          />
        </div>

        {/* Email */}
        <div className="cv-field">
          <label>{t.personal.email}</label>
          <input
            type="email"
            value={personal.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="email@example.com"
          />
        </div>

        {/* Phone */}
        <div className="cv-field">
          <label>{t.personal.phone}</label>
          <input
            type="tel"
            value={personal.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="+00 000 0000"
          />
        </div>

        {/* Website */}
        <div className="cv-field cv-field--full">
          <label>{t.personal.website}</label>
          <input
            type="url"
            value={personal.website}
            onChange={(e) => onChange("website", e.target.value)}
            placeholder="yourwebsite.com"
          />
        </div>
      </div>

      {/* ===== LIVE PREVIEW ===== */}
      <div className="cv-personal-preview">
        <strong>{personal.fullName || "—"}</strong>
        {personal.title && <span> · {personal.title}</span>}

        <div className="cv-personal-contacts">
          {[personal.email, personal.phone, personal.website]
            .filter(Boolean)
            .join(" · ") || "—"}
        </div>
      </div>
    </section>
  );
}