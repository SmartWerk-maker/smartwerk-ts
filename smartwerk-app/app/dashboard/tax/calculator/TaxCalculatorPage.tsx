"use client";

import { User } from "firebase/auth";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import { useTaxCalculator } from "./hooks/useTaxCalculator";

import {
  TaxHeader,
  TaxForm,
  TaxResults,
  ValidationPanel,
  TaxWarnings,
  TaxHistory,
} from "./modules/ui/components";

import { TaxDisclaimer } from "./modules/ui/components/TaxDisclaimer";
import { TaxHowItWorks } from "./modules/ui/components/TaxHowItWorks";
import { AccountantResultTable } from "./modules/ui/components/AccountantResultTable";



/* ======================
   Types
====================== */

interface Props {
  user: User;
}

/**
 * Strongly typed tax dictionary
 * (only what calculator реально використовує)
 */
import type { TaxFormLabels } from "./modules/ui/components/TaxForm"
import type { TaxResultsI18n } from "./modules/ui/components/TaxResults"
import type { ValidationLabels } from "./modules/ui/components/ValidationPanel"
import type { TaxWarningsLabels } from "./modules/ui/components/TaxWarnings"
import type { TaxHistoryLabels } from "./modules/ui/components/TaxHistory"
import type { AccountantLabels } from "./modules/ui/components/AccountantResultTable"
import type { TaxExplanationsPanelLabels } from "./modules/ui/components/TaxExplanationsPanel";


interface TaxDictionary {

  header?: {
    title?: string
    subtitle?: string
    back?: string
  }

  form?: TaxFormLabels

  results?: TaxResultsI18n

  validation?: ValidationLabels

  warnings?: TaxWarningsLabels

  history?: TaxHistoryLabels

  accountant?: AccountantLabels

  explain?: TaxExplanationsPanelLabels

  disclaimer?: {
    title?: string
    text?: string
  }
}


/* ======================
   Page
====================== */

export default function TaxCalculatorPage({ user }: Props) {
  const { language } = useLanguage();
  const dict = useTranslation(language);

  const {
    input,
    setInput,
    result,
    calculate,
    loading,
    errors,
    warnings,
    restoreFromHistory,
  } = useTaxCalculator();

  const explanations =
  result?.success ? result.explanations ?? [] : [];
  
  // i18n loading state
  if (!dict) {
    return (
      <main className="tax-page">
        <TaxHeader />
        <p>Loading…</p>
      </main>
    );
  }

  // SAFE extraction
  const tTax: TaxDictionary = (dict?.tax ?? {}) as TaxDictionary;
    

  return (
    <main className="tax-page">
      <TaxHeader labels={tTax.header} />

      <ValidationPanel
        errors={errors}
        warnings={warnings}
       labels={{
  ...tTax.validation,
  warnings: tTax.warnings?.warnings}}
      />

      <TaxForm
        input={input}
        onChange={setInput}
        onCalculate={() => calculate(user.uid)}
        loading={loading}
        labels={tTax.form}
      />

      {result?.success && (
        <>
          <TaxResults
  result={result}
  period={input.meta?.period}
  labels={tTax.results}
/>
       <AccountantResultTable
  result={result}
  explanations={explanations}
  labels={tTax.accountant}
  explainLabels={tTax.explain}   // 👈 НОВЕ
/>

         
          <TaxWarnings
            warnings={result.warnings}
            result={result}
            labels={tTax.warnings}
          />
        </>
      )}

      <TaxHistory
        userId={user.uid}
        onRestore={restoreFromHistory}
        labels={tTax.history}
      />

      

      <TaxDisclaimer labels={tTax.disclaimer} />
      <TaxHowItWorks labels={tTax.accountant?.howItWorks} />
      
    </main>
  );
}