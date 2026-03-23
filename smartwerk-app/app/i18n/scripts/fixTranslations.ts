import fs from "fs";
import path from "path";

type Dict = Record<string, unknown>;

const enPath = path.resolve("app/i18n/languages/en.json");
const ruPath = path.resolve("app/i18n/languages/ru.json");

const en: Dict = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ru: Dict = JSON.parse(fs.readFileSync(ruPath, "utf8"));

function flatten(obj: Dict, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const full = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Dict, full));
    } else {
      result[full] = value;
    }
  }

  return result;
}

function setNested(obj: Dict, path: string, value: unknown) {
  const keys = path.split(".");
  let current: Dict = obj;

  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      current[k] = value;
    } else {
      if (!current[k] || typeof current[k] !== "object") {
        current[k] = {};
      }
      current = current[k] as Dict;
    }
  });
}

const enFlat = flatten(en);
const ruFlat = flatten(ru);

const enKeys = Object.keys(enFlat);
const ruKeys = Object.keys(ruFlat);

const missingInRu = enKeys.filter((k) => !ruKeys.includes(k));

console.log("\n🌍 i18n Auto Fix\n");

if (missingInRu.length === 0) {
  console.log("✅ RU already complete");
} else {
  console.log(`⚠️ Missing ${missingInRu.length} keys in RU\n`);

  missingInRu.forEach((key) => {
    const enValue = enFlat[key];

    if (typeof enValue === "string") {
      setNested(ru, key, `TODO_TRANSLATE: ${enValue}`);
    } else {
      setNested(ru, key, enValue);
    }

    console.log("➕ Added:", key);
  });

  fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2), "utf8");

  console.log("\n✅ ru.json updated");
}

console.log("\nDone.\n");