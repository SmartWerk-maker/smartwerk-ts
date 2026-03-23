import fs from "fs";
import path from "path";

type Dict = Record<string, unknown>;

const enPath = path.resolve("app/i18n/languages/en.json");
const ruPath = path.resolve("app/i18n/languages/ru.json");

const en: Dict = JSON.parse(fs.readFileSync(enPath, "utf8"));
const ru: Dict = JSON.parse(fs.readFileSync(ruPath, "utf8"));

function flattenKeys(
  obj: Dict,
  prefix = ""
): Record<string, unknown> {
  return Object.entries(obj).reduce(
    (acc: Record<string, unknown>, [key, value]) => {
      const full = prefix ? `${prefix}.${key}` : key;

      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        Object.assign(
          acc,
          flattenKeys(value as Dict, full)
        );
      } else {
        acc[full] = value;
      }

      return acc;
    },
    {}
  );
}

const enFlat = flattenKeys(en);
const ruFlat = flattenKeys(ru);

const enKeys = Object.keys(enFlat);
const ruKeys = Object.keys(ruFlat);

const missingInRu = enKeys.filter((k) => !ruKeys.includes(k));
const missingInEn = ruKeys.filter((k) => !enKeys.includes(k));

console.log("\n🌍 i18n Translation Check\n");

if (missingInRu.length) {
  console.log("❌ Missing in RU:");
  missingInRu.forEach((k) => {
    console.log("  " + k);
  });
} else {
  console.log("✅ RU complete");
}

console.log("");

if (missingInEn.length) {
  console.log("❌ Missing in EN:");
  missingInEn.forEach((k) => {
    console.log("  " + k);
  });
} else {
  console.log("✅ EN complete");
}

console.log("\n✔ Check finished\n");