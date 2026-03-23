// engine/calcTotalKortingen.ts
import { TaxRules } from "../types/TaxRules";
import { calcArbeidskorting } from "./calcArbeidskorting";
import { calcAlgemeneHeffingskorting } from "./calcAlgemeneHeffingskorting";

export interface TotalKortingenResult {
  algemene: number;
  arbeids: number;
  total: number;
}

interface CalcTotalKortingenArgs {
  taxableIncome: number;
  grossIncome: number;
  incomeTaxRaw: number;
  rules: TaxRules;
}

export function calcTotalKortingen({
  taxableIncome,
  grossIncome,
  incomeTaxRaw,
  rules,
}: CalcTotalKortingenArgs): TotalKortingenResult {
  if (!rules.heffingskortingen.enabled) {
    return { algemene: 0, arbeids: 0, total: 0 };
  }

  if (!Number.isFinite(incomeTaxRaw) || incomeTaxRaw <= 0) {
    return { algemene: 0, arbeids: 0, total: 0 };
  }

  const round2 = (v: number) =>
    Math.round(v * 100) / 100;

  const algemeneBase =
    rules.heffingskortingen.algemene.base === "grossIncome"
      ? grossIncome
      : taxableIncome;

  const arbeidsBase =
    rules.heffingskortingen.arbeids.base === "grossIncome"
      ? grossIncome
      : taxableIncome;

  const rawAlgemene = calcAlgemeneHeffingskorting({
    baseIncome: algemeneBase,
    rules,
  });

  const rawArbeids = calcArbeidskorting({
    baseIncome: arbeidsBase,
    rules,
  });

  const algemene = round2(rawAlgemene);
  const arbeids = round2(rawArbeids);

  const sum = algemene + arbeids;

  if (!Number.isFinite(sum) || sum <= 0) {
    return { algemene: 0, arbeids: 0, total: 0 };
  }

  if (sum > incomeTaxRaw) {
    const ratio = incomeTaxRaw / sum;

    const cappedAlgemene = round2(algemene * ratio);
    const cappedArbeids = round2(arbeids * ratio);

    return {
      algemene: cappedAlgemene,
      arbeids: cappedArbeids,
      total: round2(cappedAlgemene + cappedArbeids),
    };
  }

  return {
    algemene,
    arbeids,
    total: round2(sum),
  };
}

export default calcTotalKortingen;