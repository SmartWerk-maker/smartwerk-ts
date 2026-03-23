import type { Metadata } from "next";

export const dashboardMetadata: Metadata = {
  title: "SmartWerk Dashboard — Freelance Automation",
  description:
    "Manage clients, invoices, quotes, contracts, expenses and analytics all in one unified dashboard. Powered by SmartWerk automation.",
  keywords: [
    "freelance dashboard",
    "invoice generator",
    "quote maker",
    "freelance tools",
    "contract builder",
    "SmartWerk",
    "self-employed",
    "small business invoicing",
  ],
  metadataBase: new URL("https://smartwerk.app"),

  // Додаємо базові SEO-поля
  robots: {
   index: false,
  },
  category: "Business",

  openGraph: {
    title: "SmartWerk Dashboard — Freelance Automation",
    description:
      "All your freelance tools in one modern dashboard. Automate invoices, quotes, clients, contracts and more.",
    url: "https://smartwerk.app/dashboard",
    siteName: "SmartWerk",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://smartwerk.app/og/dashboard.jpg",
        width: 1200,
        height: 630,
        alt: "SmartWerk Dashboard Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "SmartWerk Dashboard — Freelance Automation",
    description:
      "A powerful freelance automation dashboard for invoices, quotes, expenses and clients.",
    images: ["https://smartwerk.app/og/dashboard.jpg"],
  },

  alternates: {
    canonical: "https://smartwerk.app/dashboard",
  },
};