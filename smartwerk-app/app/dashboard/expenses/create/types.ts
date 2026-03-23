// app/dashboard/expenses/create/types.ts
import type { Timestamp } from "firebase/firestore";
export type ExpenseStatus = "paid" | "pending" | "overdue" | "scheduled";

export type ExpenseFormState = {
  expenseId: string;

  businessName: string;
  email: string;
  businessAddress: string;

  date: string;
  description: string;
  type: "One-time" | "Monthly" | "Annual";
  category: string;
  country: string;

  amount: string;
  vat: number;
  vatAmount: number;
  total: number;

  invoiceAttached: "Yes" | "No";
  paymentMethod: "Bank" | "Credit Card" | "Cash" | "PayPal" | "Other";
  status: ExpenseStatus;

  notes: string;

  createdAt?: Timestamp | string;
updatedAt?: Timestamp | string;
};