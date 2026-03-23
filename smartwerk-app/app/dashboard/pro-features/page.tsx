"use client";
import { usePlan } from "@/app/hooks/usePlan";

export default function ProFeature() {
  const plan = usePlan();

  if (plan === null) return <p>Loading…</p>;
  if (plan !== "PRO") return <p>You need PRO to access this feature.</p>;

  return <div>🔥 This is PRO content!</div>;
}