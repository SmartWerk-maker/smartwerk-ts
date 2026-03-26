import type { Metadata } from "next";
import dynamic from "next/dynamic";

const AnalyticsClient = dynamic(() => import("./AnalyticsClient"), {
  ssr: false, // 🔥 ВАЖЛИВО — вимикає SSR
});

export const metadata: Metadata = {
  title: "📊 SmartWerk — Analytics",
  description: "Financial analytics and insights",
};

export default function Page() {
  return <AnalyticsClient />;
}