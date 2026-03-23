import type { Metadata } from "next";
import ExpenseCreateClient from "./ExpenseCreateClient";

export const metadata: Metadata = {
  title: "💰 SmartWerk — Expense Tracker",
  description: "Create and manage expenses in SmartWerk",
};

export default function ExpenseCreatePage() {
  return <ExpenseCreateClient />;
}
