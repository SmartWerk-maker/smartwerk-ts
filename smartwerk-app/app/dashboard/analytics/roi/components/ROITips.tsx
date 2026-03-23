"use client";

import type { ROII18n, ROITip } from "../types";

type Props = {
  t: ROII18n;
  tips: ROITip[];
};

export default function ROITips({ t, tips }: Props) {
  if (tips.length === 0) return null;

  return (
    <section className="roi-tips">
      <h3>🧠 {t.tips.title}</h3>

      <ul className="tips-list">
        {tips.map((tip, i) => (
          <li key={i} className={`tip ${tip.type}`}>
            {t.tips[tip.key]}
          </li>
        ))}
      </ul>
    </section>
  );
}