import type { Metadata } from "next";
import AnalyticsClient from "./AnalyticsClient";

export const metadata: Metadata = {
  title: "📊 SmartWerk — Analytics",
  description: "Financial analytics and insights",
};

export default function Page() {
  return <AnalyticsClient />;
}