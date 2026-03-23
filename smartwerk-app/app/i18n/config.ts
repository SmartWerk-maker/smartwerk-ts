export const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr", "pl", "es", "ru"] as const;

export type Lang = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANG: Lang = "en";