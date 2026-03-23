// hooks/useAiContext.ts
import { TaxWarning } from "../modules/domain/warnings";
import {
  TaxResult,
  TaxResultSuccess,
} from "../types/TaxResult";
import { aiWarningProfiles } from "../modules/domain/aiWarningProfiles";

/* ======================
   Hook
====================== */

export function useAiContext(result: TaxResult | null) {
  function buildWarningPrompt(
    warning: TaxWarning
  ): string | null {
    if (!isSuccessResult(result)) return null;

    const profile = aiWarningProfiles[warning.code];
    if (!profile) return null;

    const yearLabel = result.meta?.year
      ? `Tax year ${result.meta.year}`
      : "Full tax year";

    const goals = [
      profile.goals.explainMeaning
        ? "Explain clearly what this warning means"
        : null,
      profile.goals.explainWhy
        ? "Explain why this warning occurred"
        : null,
      profile.goals.suggestNextSteps
        ? "Suggest practical next steps for the user"
        : null,
    ]
      .filter(Boolean)
      .map((g) => `- ${g}`)
      .join("\n");

    const forbiddenTopics =
      profile.forbiddenTopics?.length
        ? `Forbidden topics:\n${profile.forbiddenTopics
            .map((t) => `- ${t}`)
            .join("\n")}`
        : "";

    return `
You are a Dutch tax assistant for self-employed people (ZZP).

Context:
- Period: ${yearLabel}
- Country: Netherlands

Communication profile:
- Tone: ${profile.tone}
- Target audience: ${profile.explainTo}
- Severity: ${profile.severity}

Warning:
- Code: ${warning.code}

Financial snapshot:
- Taxable income: €${result.taxableIncome.toFixed(2)}
- Income tax: €${result.taxes.incomeTax.toFixed(2)}
- ZVW contribution: €${result.taxes.zvw.toFixed(2)}
- VAT payable: €${result.vat.payableVat.toFixed(2)}
- Net income: €${result.netIncome.toFixed(2)}

Work & registration:
- Hours worked: ${result.inputSnapshot.hoursWorked}
- KvK registered: ${result.inputSnapshot.kvkRegistered ? "yes" : "no"}
- Starter: ${result.inputSnapshot.isStarter ? "yes" : "no"}
- KOR applied: ${result.inputSnapshot.korApplied ? "yes" : "no"}

AI goals:
${goals || "- Provide a short, neutral explanation"}

AI rules:
- Do NOT calculate tax again
- Do NOT give legal advice
- Do NOT mention penalties, audits, inspections, or fines
- Use clear, neutral, supportive language
${forbiddenTopics}

Structure your answer in short sections.
`.trim();
  }

  return {
    buildWarningPrompt,
  };
}

/* ======================
   Type guard
====================== */

function isSuccessResult(
  result: TaxResult | null
): result is TaxResultSuccess {
  return Boolean(result && result.success);
}