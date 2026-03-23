import "./dashboard.css";
import { dashboardMetadata } from "./metadata";
import Script from "next/script";


export const metadata = dashboardMetadata;

// 🟦 Імпортуємо wrapper, який буде клієнтським
import ClientWrapper from "./wrapper";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientWrapper>
      {/* SEO JSON-LD */}
      <Script
  id="dashboard-jsonld"
  type="application/ld+json"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "SmartWerk Dashboard",
      url: "https://smartwerk.app/dashboard",
      applicationCategory: "BusinessApplication",
      operatingSystem: "All",
    }),
  }}
/>
      {children}
    </ClientWrapper>
  );
}