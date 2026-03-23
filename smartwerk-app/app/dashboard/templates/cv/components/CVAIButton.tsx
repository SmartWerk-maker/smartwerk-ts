"use client";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

type Props = {
  onClick: () => void;
};

export default function CVAIButton({ onClick }: Props) {
  const { language } = useLanguage();

  // If your useTranslation return type is not typed, this is still safe:
  const dict = useTranslation(language) as unknown as {
    cv?: { ui?: { improveWithAI?: string } };
  };

  const label = dict?.cv?.ui?.improveWithAI ?? "Improve with AI";

  return (
    <button
      type="button"
      className="btn btn-outline btn-icon"
      onClick={onClick}
      title={label}
    >
      🧠 {label}
    </button>
  );
}