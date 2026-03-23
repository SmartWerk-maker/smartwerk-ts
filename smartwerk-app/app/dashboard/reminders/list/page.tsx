import type { Metadata } from "next";
import RemindersListClient from "./RemindersListClient";

export const metadata: Metadata = {
  title: "📋 SmartWerk — Saved Reminders",
  description: "View, filter and manage payment reminders in SmartWerk.",
};

export default function RemindersListPage() {
  return <RemindersListClient />;
}