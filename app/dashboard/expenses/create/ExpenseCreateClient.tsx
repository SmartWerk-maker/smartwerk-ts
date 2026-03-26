"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import "./expense.css";

/* ================= TYPES ================= */

export type ExpenseStatus = "paid" | "pending" | "overdue" | "scheduled";
export type ExpenseType = "One-time" | "Monthly" | "Annual";

type ExpenseFormState = {
  expenseId: string;

  businessName: string;
  email: string;
  businessAddress: string;

  date: string;
  description: string;
  type: ExpenseType;
  category: string;
  country: string;

  amount: string; // net
  vat: number;
  vatAmount: number;
  total: number;

  invoiceAttached: "Yes" | "No";
  paymentMethod: "Bank" | "Credit Card" | "Cash" | "PayPal" | "Other";
  status: ExpenseStatus;

  notes: string;
};

export type ExpensesI18n = {
  title?: string;

  actions?: {
    back?: string;
    list?: string;
    save?: string;
    saving?: string;
  };

  sections?: {
    business?: string;
    details?: string;
    totals?: string;
  };

  fields?: {
    businessName?: string;
    email?: string;
    businessAddress?: string;

    expenseId?: string;
    date?: string;
    description?: string;
    category?: string;
    amount?: string;
    vat?: string;
    status?: string;
    notes?: string;
  };

  totals?: {
    subtotal?: string;
    vat?: string;
    total?: string;
  };

  statusOptions?: {
    paid?: string;
    pending?: string;
    overdue?: string;
    scheduled?: string;
  };

  messages?: {
    loading?: string;
  };
};

/* ================= HELPERS ================= */

const label = (v: string | undefined, fallback: string) => v ?? fallback;
const today = () => new Date().toISOString().slice(0, 10);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const initialForm = (): ExpenseFormState => ({
  expenseId: "",

  businessName: "",
  email: "",
  businessAddress: "",

  date: today(),
  description: "",
  type: "One-time",
  category: "",
  country: "Netherlands",

  amount: "",
  vat: 21,
  vatAmount: 0,
  total: 0,

  invoiceAttached: "No",
  paymentMethod: "Bank",
  status: "paid",

  notes: "",
});

/* ================= COMPONENT ================= */

export default function ExpenseCreateClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  const t = useMemo(
    () => (tRoot?.expenses ?? {}) as ExpensesI18n,
    [tRoot]
  );

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ExpenseFormState>(() => initialForm());

  /* ============ THEME ============ */
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "theme-dark";
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(theme);
  }, []);

  /* ============ TOTALS ============ */
  const totals = useMemo(() => {
    const subtotal = num(form.amount);
    const vatAmount = (subtotal * num(form.vat)) / 100;
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  }, [form.amount, form.vat]);

  useEffect(() => {
    setForm((p) => ({
      ...p,
      vatAmount: totals.vatAmount,
      total: totals.total,
    }));
  }, [totals]);

  /* ============ ID GENERATOR ============ */
  const generateExpenseId = useCallback(async (uid: string) => {
    const ref = doc(db, "users", uid);
    const year = new Date().getFullYear();
    let out = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.exists() ? snap.data().lastExpenseNumber || 0 : 0;
      const next = last + 1;
      tx.set(ref, { lastExpenseNumber: next }, { merge: true });
      out = `EXP-${year}-${String(next).padStart(3, "0")}`;
    });

    return out;
  }, []);

  /* ============ AUTH + INIT ============ */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);

      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        const p = snap.data();
        setForm((f) => ({
          ...f,
          businessName: p.companyName || "",
          email: p.email || "",
          businessAddress: p.businessAddress || "",
        }));
      }

      const editId = localStorage.getItem("editExpenseId");
      if (editId) {
        const eSnap = await getDoc(doc(db, "users", u.uid, "expenses", editId));
        if (eSnap.exists()) {
          setForm({
  ...initialForm(),
  ...(eSnap.data() as Partial<ExpenseFormState>)
});
        }
      } else {
        const id = await generateExpenseId(u.uid);
        setForm((f) => ({ ...f, expenseId: id }));
      }

      setLoading(false);
    });

    return () => unsub();
  }, [router, generateExpenseId]);

  /* ============ SAVE ============ */
  const saveExpense = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const editId = localStorage.getItem("editExpenseId");

      const payload = {
        ...form,
          status: form.status ?? "paid",
        amount: totals.subtotal,
        vatPercent: form.vat,
        vatAmount: totals.vatAmount,
        total: totals.total,
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await setDoc(
          doc(db, "users", user.uid, "expenses", editId),
          payload,
          { merge: true }
        );
        localStorage.removeItem("editExpenseId");
      } else {
        await addDoc(collection(db, "users", user.uid, "expenses"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/dashboard/expenses/list");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="clients-loading">
        {label(t.messages?.loading, "Loading…")}
      </div>
    );
  }

  /* ============ UI ============ */
  return (
    <>
      <header className="topbar">
        <h1>💰 {label(t.title, "Expense Tracker")}</h1>

        <div className="actions-right">
          <button className="btn" onClick={() => router.push("/dashboard")}>
            {label(t.actions?.back, "Back to Dashboard")}
          </button>
          <button
            className="btn"
            onClick={() => router.push("/dashboard/expenses/list")}
          >
            {label(t.actions?.list, "Saved Expenses")}
          </button>
        </div>
      </header>

      <main className="dash-main invoice-page">
        <div className="dash-content invoice-content">
          {/* BUSINESS */}
          <section>
            <h2>🏢 {label(t.sections?.business, "Business Info")}</h2>
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} />
          </section>

          {/* DETAILS */}
          <section>
            <h2>💸 {label(t.sections?.details, "Expense Details")}</h2>

            <input value={form.expenseId} readOnly />
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} 
             placeholder={label(t.fields?.description, "Description")}/>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} 
            placeholder={label(t.fields?.category, "Category")}/>

            <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} 
            placeholder={label(t.fields?.amount, "Amount")}/>
            <select value={form.vat} onChange={(e) => setForm({ ...form, vat: Number(e.target.value) })}>
              <option value={0}>0%</option>
              <option value={9}>9%</option>
              <option value={21}>21%</option>
            </select>

            {/* STATUS */}
            <select
              value={form.status}
              onChange={(e) =>
              setForm({ ...form, status: e.target.value as ExpenseStatus })
                 }
                >
             <option value="paid">
              {label(t.statusOptions?.paid, "paid")}
        </option>

          <option value="pending">
         {label(t.statusOptions?.pending, "pending")}
           </option>

             <option value="overdue">
          {label(t.statusOptions?.overdue, "overdue")}
           </option>

           <option value="scheduled">
           {label(t.statusOptions?.scheduled, "scheduled")}
            </option>
        </select>

            {/* NOTES */}
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={label(t.fields?.notes, "Notes")}
            />
          </section>

          {/* TOTALS */}
          <section>
            <h3>{label(t.sections?.totals, "Totals")}</h3>
            <p>{label(t.totals?.subtotal, "Subtotal")}: €{totals.subtotal.toFixed(2)}</p>
            <p>{label(t.totals?.vat, "VAT")}: €{totals.vatAmount.toFixed(2)}</p>
            <p><strong>{label(t.totals?.total, "Total")}: €{totals.total.toFixed(2)}</strong></p>
          </section>

          {/* ACTIONS */}
          <section className="actions">
            <button className="btn" disabled={saving} onClick={saveExpense}>
              {saving ? label(t.actions?.saving, "Saving…") : label(t.actions?.save, "Save Expense")}
            </button>
          </section>
        </div>
      </main>

      <footer>© 2025 SmartWerk</footer>
    </>
  );
}