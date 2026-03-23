"use client";

import { useCallback } from "react";
import { TaxInput } from "../../../types/TaxInput";

import { IncomeForm } from "./IncomeForm";
import { ExpensesForm } from "./ExpensesForm";
import { TaxOptionsForm } from "./TaxOptionsForm";
import { PeriodForm, TaxPeriod } from "./PeriodForm";

import type { IncomeFormLabels } from "./IncomeForm";
import type { ExpensesFormLabels } from "./ExpensesForm";
import type { TaxOptionsLabels } from "./TaxOptionsForm";
import type { PeriodFormLabels } from "./PeriodForm";

/* ======================
   i18n types
====================== */

export interface TaxFormLabels {
  title?: string;
  submit?: string;
  calculating?: string;

  income?: IncomeFormLabels;
  expenses?: ExpensesFormLabels;
  options?: TaxOptionsLabels;
  period?: PeriodFormLabels;
}

/* ======================
   Props
====================== */

interface Props {
  input: TaxInput;
  onChange: (input: TaxInput) => void;
  onCalculate: () => void;
  loading?: boolean;
  labels?: TaxFormLabels;
}

/* ======================
   Component
====================== */

export function TaxForm({
  input,
  onChange,
  onCalculate,
  loading = false,
  labels,
}: Props) {

  /* ======================
     State update helpers
  ====================== */

  const update = useCallback(
    <K extends keyof TaxInput>(key: K, value: TaxInput[K]) => {
      onChange({
        ...input,
        [key]: value,
      });
    },
    [input, onChange]
  );

  const updateExpense = useCallback(
    (key: keyof TaxInput["expenses"], value: number) => {
      onChange({
        ...input,
        expenses: {
          ...input.expenses,
          [key]: value,
        },
      });
    },
    [input, onChange]
  );

  const updatePeriod = useCallback(
    (period: TaxPeriod) => {
      onChange({
        ...input,
        meta: {
          ...(input.meta ?? {}),
          period,
        },
      });
    },
    [input, onChange]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!loading) {
        onCalculate();
      }
    },
    [loading, onCalculate]
  );

  /* ======================
     Render
  ====================== */

  return (
    <form className="tax-form" onSubmit={handleSubmit}>

<div className="tax-grid">

<div>
<IncomeForm
hoursWorked={input.hoursWorked}
hourlyRate={input.hourlyRate}
onChange={update}
labels={labels?.income}
/>
</div>

<div>
<PeriodForm
value={input.meta?.period}
onChange={updatePeriod}
labels={labels?.period}
/>
</div>

<div>
<ExpensesForm
expenses={input.expenses}
onChange={updateExpense}
labels={labels?.expenses}
/>
</div>

<div>
<TaxOptionsForm
input={input}
onChange={update}
labels={labels?.options}
/>
</div>



</div>

<div className="tax-actions">
<button
type="submit"
className="tax-btn"
disabled={loading}
aria-busy={loading}
>
{loading
 ? labels?.calculating ?? "Calculating…"
 : labels?.submit ?? "Calculate"}
</button>
</div>

</form>
  );
}