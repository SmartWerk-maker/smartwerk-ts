// app/dashboard/reminders/create/types.ts

export type ReminderStatus = "draft" | "sent" | "paid";
export type ReminderType = "First Reminder" | "Second Reminder" | "Final Reminder";

export type ReminderSignature = {
  business: string; // dataURL
  businessDate: string; // YYYY-MM-DD
};

export type ReminderFormState = {
  reminderId: string;

  businessName: string;
  email: string;
  businessAddress: string;
  businessPhone: string;

  clientName: string;
  clientEmail: string;
  clientAddress: string;

  linkedInvoiceId: string; // firestore doc id OR "" (важливо: стабільно)
  invoiceNumber: string;   // INV-....
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: string;   // "€123.45" або "123.45"

  reminderDate: string;     // YYYY-MM-DD
  status: ReminderStatus;
  type: ReminderType;

  amount: string;           // input string, парсимо при save
  message: string;

  signature: ReminderSignature;

  updatedAt?: unknown;
  createdAt?: unknown;
  userId?: string;
};

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createInitialReminderForm(): ReminderFormState {
  return {
    reminderId: "",

    businessName: "",
    email: "",
    businessAddress: "",
    businessPhone: "",

    clientName: "",
    clientEmail: "",
    clientAddress: "",

    linkedInvoiceId: "",
    invoiceNumber: "",
    invoiceDate: "",
    dueDate: "",
    invoiceAmount: "",

    reminderDate: todayISODate(),
    status: "draft",
    type: "First Reminder",

    amount: "",
    message: "",

    signature: {
      business: "",
      businessDate: "",
    },
  };
}