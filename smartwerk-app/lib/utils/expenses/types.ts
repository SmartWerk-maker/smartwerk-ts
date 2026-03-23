export type ExpensePdfData = {
  expenseId: string;
  date: string;

  description: string;
  category: string;

  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  total: number;

  status: "paid" | "pending" | "overdue" | "scheduled";
  notes?: string;
};

export type BusinessPdfData = {
  name: string;
  email?: string;
  address?: string;
};