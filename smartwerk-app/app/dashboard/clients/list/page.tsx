import type { Metadata } from "next";
import ClientsListClient from "./ClientsListClient";

export const metadata: Metadata = {
  title: "📋 SmartWerk — Saved Clients",
  description:
    "View, filter and manage your saved clients in SmartWerk with KPIs, charts and quick actions.",
};

export default function ClientsListPage() {
  return <ClientsListClient />;
}