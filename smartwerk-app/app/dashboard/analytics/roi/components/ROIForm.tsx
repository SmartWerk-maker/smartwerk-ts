"use client";

import type { ROII18n } from "../types";

type Props = {
  t: ROII18n;
  investment: number;
  monthlyProfit: number;
  months: number;
  extraCosts: number;
  setInvestment: (n: number) => void;
  setMonthlyProfit: (n: number) => void;
  setMonths: (n: number) => void;
  setExtraCosts: (n: number) => void;
};

export default function ROIForm({
  t,
  investment,
  monthlyProfit,
  months,
  extraCosts,
  setInvestment,
  setMonthlyProfit,
  setMonths,
  setExtraCosts,
}: Props) {
  return (
    <section className="roi-form">
      <label>
        {t.form.investment}
        <input
          type="number"
          placeholder={t.form.placeholders.investment}
          value={investment}
          onChange={(e) => setInvestment(Number(e.target.value))}
        />
      </label>

      <label>
        {t.form.monthlyProfit}
        <input
          type="number"
          placeholder={t.form.placeholders.monthlyProfit}
          value={monthlyProfit}
          onChange={(e) => setMonthlyProfit(Number(e.target.value))}
        />
      </label>

      <label>
        {t.form.months}
        <input
          type="number"
          placeholder={t.form.placeholders.months}
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
        />
      </label>

      <label>
        {t.form.extraCosts}
        <input
          type="number"
          placeholder={t.form.placeholders.extraCosts}
          value={extraCosts}
          onChange={(e) => setExtraCosts(Number(e.target.value))}
        />
      </label>
    </section>
  );
}