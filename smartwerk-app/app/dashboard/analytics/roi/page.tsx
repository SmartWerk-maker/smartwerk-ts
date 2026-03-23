  import type { Metadata } from "next";
  import ROIClient from "./ROIClient";

  export const metadata: Metadata = {
    title: "📈 SmartWerk — ROI Estimator",
  };

  export default function Page() {
    return <ROIClient />;
  }