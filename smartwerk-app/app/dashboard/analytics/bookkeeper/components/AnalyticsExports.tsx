"use client";

type Props = {
  onCSV: () => void;
  onPDF: () => void;
  t?: {
    csv?: string;
    pdf?: string;
  };
};

export default function AnalyticsExports({
  onCSV,
  onPDF,
  t,
}: Props) {
  return (
   <div className="analytics-actions">
  <button className="btn btn-outline btn-icon" onClick={onCSV}>
    📁 <span>{t?.csv ?? "Export CSV"}</span>
  </button>

  <button className="btn btn-outline btn-icon" onClick={onPDF}>
    📄 <span>{t?.pdf ?? "Export PDF"}</span>
  </button>
</div>
  );
}