import { eur } from "@/app/dashboard/analytics/bookkeeper/utils/currency";
import type { ROII18n } from "../types";

type Props = {
  t: ROII18n;
  totalProfit: number;
  roi: number;
  payback: number | null;
};

export default function ROIResults({
  t,
  totalProfit,
  roi,
  payback,
}: Props) {
  if (totalProfit === null || totalProfit === undefined) {
    return null;
  }

  return (
    <section className="roi-results">
      <h2>📊 {t.results.title}</h2>

      <p>
        <strong>{t.results.totalProfit}:</strong>{" "}
        {eur(totalProfit)}
      </p>

      <p>
        <strong>{t.results.roi}:</strong> {roi}%
      </p>

      <p>
        <strong>{t.results.payback}:</strong>{" "}
        {payback !== null
          ? `${payback} ${t.results.months}`
          : t.results.noPayback}
      </p>
    </section>
  );
}