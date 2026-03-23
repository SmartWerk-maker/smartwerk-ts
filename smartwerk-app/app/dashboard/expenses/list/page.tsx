import type { Metadata } from "next";
import ExpensesListClient from "./ExpensesListClient";

export const metadata: Metadata = {
  title: "SmartWerk — Expenses",
  description: "Manage and track your business expenses",
};

export default function Page() {
  return <ExpensesListClient />;
}