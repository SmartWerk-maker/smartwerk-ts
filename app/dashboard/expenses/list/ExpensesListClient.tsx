"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";
import { generateExpensePdf } from "@/lib/utils/expenses/generateExpensePdf";

import "./list.css";

/* ================= TYPES ================= */

export type ExpenseStatus = "paid" | "pending" | "overdue" | "scheduled";
export type ExpenseType = "One-time" | "Monthly" | "Annual";

type StatusFilter = ExpenseStatus | "all";
type TypeFilter = ExpenseType | "all";

type SortBy =
  | "date_desc"
  | "date_asc"
  | "number_desc"
  | "number_asc"
  | "amount_desc"
  | "amount_asc";

type ExpenseDoc = {
  id: string;

  expenseId?: string;
  date?: string; // YYYY-MM-DD
  description?: string;
  type?: ExpenseType;
  category?: string;

  amount?: number | string; // legacy safe
  vatAmount?: number;
  vatPercent?: number;
  total?: number;

  status?: ExpenseStatus;
  notes?: string;
};

export type ExpensesListI18n = {
  title?: string;
  actions?: {
    new?: string;
    back?: string;
    reset?: string;
    edit?: string;
    delete?: string;
  };
  filters?: {
    from?: string;
    to?: string;
    status?: string;
    type?: string;
    search?: string;
    searchPlaceholder?: string;
    sortBy?: string;
    all?: string;
  };
  statusOptions?: {
    paid?: string;
    pending?: string;
    overdue?: string;
    scheduled?: string;
  };
  typeOptions?: {
    oneTime?: string;
    monthly?: string;
    annual?: string;
  };
  sort?: {
    dateDesc?: string;
    dateAsc?: string;
    numberDesc?: string;
    numberAsc?: string;
    amountDesc?: string;
    amountAsc?: string;
  };
  table?: {
    expenseId?: string;
    date?: string;
    description?: string;
    category?: string;
    status?: string;
    amountNet?: string;
    vat?: string;
    total?: string;
    actions?: string;
  };
  messages?: {
    loading?: string;
    empty?: string;
    deleteConfirm?: string;
    statusFailed?: string;
  };
};

/* ================= HELPERS ================= */

const label = (v: string | undefined, fallback: string) => v ?? fallback;

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  const s = String(v ?? "")
    .replace(/[^\d,.\-]/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(s);

  return Number.isFinite(n) ? n : 0;
}

function eur(v: unknown): string {
  return `€${num(v).toFixed(2)}`;
}

function applyThemeFromLocalStorage() {
  if (typeof window === "undefined") return;
  const theme = window.localStorage.getItem("theme") || "theme-dark";
  document.body.classList.remove("theme-light", "theme-dark");
  document.body.classList.add(theme);
}

function mapExpenseSnap(d: QueryDocumentSnapshot<DocumentData>): ExpenseDoc {
  const data = d.data();
  return { id: d.id, ...(data as Omit<ExpenseDoc, "id">) };
}

function isSortBy(v: string): v is SortBy {
  return (
    v === "date_desc" ||
    v === "date_asc" ||
    v === "number_desc" ||
    v === "number_asc" ||
    v === "amount_desc" ||
    v === "amount_asc"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ================= COMPONENT ================= */

export default function ExpensesListClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  const t = useMemo(
    () => (tRoot?.expensesList ?? {}) as ExpensesListI18n,
    [tRoot]
  );

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("date_desc");

  /* theme */
  useEffect(() => {
    applyThemeFromLocalStorage();
  }, []);

  /* auth + realtime (правильний cleanup) */
  useEffect(() => {
    let unsubSnap: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // прибираємо попередній listener якщо юзер зміниться
      if (unsubSnap) {
        unsubSnap();
        unsubSnap = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setExpenses([]);
        setLoadingUser(false);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoadingUser(false);

      const colRef = collection(db, "users", firebaseUser.uid, "expenses");
      const qRef = query(colRef, orderBy("createdAt", "desc"));

      unsubSnap = onSnapshot(qRef, (snap) => {
        setExpenses(snap.docs.map(mapExpenseSnap));
      });
    });

    return () => {
      if (unsubSnap) unsubSnap();
      unsubAuth();
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = expenses
      .filter((e) => {
        const st = (e.status ?? "paid") as ExpenseStatus;
        const tp = (e.type ?? "One-time") as ExpenseType;
        const dt = e.date ?? "";

        if (statusFilter !== "all" && st !== statusFilter) return false;
        if (typeFilter !== "all" && tp !== typeFilter) return false;
        if (fromDate && dt < fromDate) return false;
        if (toDate && dt > toDate) return false;

        if (!q) return true;

        return (
          (e.expenseId ?? "").toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          (e.category ?? "").toLowerCase().includes(q) ||
          String(num(e.amount)).includes(q)
        );
      })
      .slice()
      .sort((a, b) => {
        const aAmt = num(a.amount);
        const bAmt = num(b.amount);

        switch (sortBy) {
          case "number_desc":
            return (b.expenseId ?? "").localeCompare(a.expenseId ?? "");
          case "number_asc":
            return (a.expenseId ?? "").localeCompare(b.expenseId ?? "");
          case "date_desc":
            return (b.date ?? "").localeCompare(a.date ?? "");
          case "date_asc":
            return (a.date ?? "").localeCompare(b.date ?? "");
          case "amount_desc":
            return bAmt - aAmt;
          case "amount_asc":
            return aAmt - bAmt;
          default:
            return 0;
        }
      });

      

    return list;
  }, [expenses, search, statusFilter, typeFilter, fromDate, toDate, sortBy]);

  const handleNew = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("editExpenseId");
    }
    router.push("/dashboard/expenses/create");
  }, [router]);

  const handleBack = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleReset = useCallback(() => {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSearch("");
    setSortBy("date_desc");
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("editExpenseId", id);
      }
      router.push("/dashboard/expenses/create");
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;

      const confirmText = label(
        t.messages?.deleteConfirm,
        "Delete this expense? This cannot be undone."
      );

      if (!window.confirm(confirmText)) return;

      await deleteDoc(doc(db, "users", user.uid, "expenses", id));
    },
    [user, t.messages?.deleteConfirm]
  );

  const handleStatusChange = useCallback(
    async (id: string, newStatus: ExpenseStatus) => {
      if (!user) return;

      try {
        await setDoc(
          doc(db, "users", user.uid, "expenses", id),
          { status: newStatus, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (err) {
        console.error(err);
        alert(label(t.messages?.statusFailed, "❌ Status update failed"));
      }
    },
    [user, t.messages?.statusFailed]
  );

  const handlePdf = useCallback(
  async (e: ExpenseDoc) => {
    if (!user) return;

    const blob = await generateExpensePdf({
     
      business: {
        name: user.displayName || "SmartWerk",
        email: user.email || undefined,
      },
      expense: {
        expenseId: e.expenseId ?? "—",
        date: e.date ?? "",
        description: e.description ?? "",
        category: e.category ?? "",
        status: e.status ?? "paid",
        notes: e.notes,

        subtotal: num(e.amount),
        vatPercent: typeof e.vatPercent === "number" ? e.vatPercent : 21,
        vatAmount: num(e.vatAmount),
        total: num(e.total),
      },
    });

    downloadBlob(blob, `${e.expenseId || "expense"}.pdf`);
  },
  [user]
);

  if (loadingUser) {
    return (
      <div className="clients-loading">
        <div className="clients-loading-card">
          {label(t.messages?.loading, "Loading…")}
        </div>
      </div>
    );
  }

  if (!user) return null;
  

  return (
    <>
      <header className="topbar">
        <h1 className="invoice-title">{label(t.title, "Saved Expenses")}</h1>

        <div className="actions-right">
          <button className="btn" onClick={handleNew}>
            {label(t.actions?.new, "➕ New Expense")}
          </button>
          <button className="btn" onClick={handleBack}>
            {label(t.actions?.back, "🏠 Back to Dashboard")}
          </button>
        </div>
      </header>

      <main className="dash-main invoice-page">
        <div className="dash-content invoice-content">
          {/* Filters */}
          <section className="filters">
            <label>
              {label(t.filters?.from, "From")}:
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label>
              {label(t.filters?.to, "To")}:
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <label>
              {label(t.filters?.status, "Status")}:
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">{label(t.filters?.all, "All")}</option>
                <option value="paid">{label(t.statusOptions?.paid, "paid")}</option>
                <option value="pending">{label(t.statusOptions?.pending, "pending")}</option>
                <option value="overdue">{label(t.statusOptions?.overdue, "overdue")}</option>
                <option value="scheduled">{label(t.statusOptions?.scheduled, "scheduled")}</option>
              </select>
            </label>

            <label>
              {label(t.filters?.type, "Type")}:
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                <option value="all">{label(t.filters?.all, "All")}</option>
                <option value="One-time">{label(t.typeOptions?.oneTime, "One-time")}</option>
                <option value="Monthly">{label(t.typeOptions?.monthly, "Monthly")}</option>
                <option value="Annual">{label(t.typeOptions?.annual, "Annual")}</option>
              </select>
            </label>

            <label>
              {label(t.filters?.search, "Search")}:
              <input
                type="text"
                value={search}
                placeholder={label(
                  t.filters?.searchPlaceholder,
                  "Search ID / description / category / amount"
                )}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label>
              {label(t.filters?.sortBy, "Sort by")}:
              <select
                value={sortBy}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isSortBy(v)) setSortBy(v);
                }}
              >
                <option value="date_desc">{label(t.sort?.dateDesc, "Date (new)")}</option>
                <option value="date_asc">{label(t.sort?.dateAsc, "Date (old)")}</option>
                <option value="number_desc">{label(t.sort?.numberDesc, "Expense # (new)")}</option>
                <option value="number_asc">{label(t.sort?.numberAsc, "Expense # (old)")}</option>
                <option value="amount_desc">{label(t.sort?.amountDesc, "Amount ↓")}</option>
                <option value="amount_asc">{label(t.sort?.amountAsc, "Amount ↑")}</option>
              </select>
            </label>

            <button type="button" className="btn" onClick={handleReset}>
              {label(t.actions?.reset, "Reset")}
            </button>
          </section>

          {/* Table */}
          <section>
            <table role="table">
              <thead>
                <tr>
                  <th>{label(t.table?.expenseId, "Expense ID")}</th>
                  <th>{label(t.table?.date, "Date")}</th>
                  <th>{label(t.table?.description, "Description")}</th>
                  <th>{label(t.table?.category, "Category")}</th>
                  <th>{label(t.table?.status, "Status")}</th>
                  <th>{label(t.table?.amountNet, "Net")}</th>
                  <th>{label(t.table?.vat, "VAT")}</th>
                  <th>{label(t.table?.total, "Total")}</th>
                  <th>{label(t.table?.actions, "Actions")}</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: 16 }}>
                      {label(t.messages?.empty, "No expenses found")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id}>
                      <td>{e.expenseId ?? "—"}</td>
                      <td>{e.date ?? "—"}</td>
                      <td>{e.description ?? "—"}</td>
                      <td>{e.category ?? "—"}</td>

                      <td>
                        <select
                          value={(e.status ?? "paid") as ExpenseStatus}
                          onChange={(ev) =>
                            void handleStatusChange(
                              e.id,
                              ev.target.value as ExpenseStatus
                            )
                          }
                        >
                          <option value="paid">{label(t.statusOptions?.paid, "paid")}</option>
                          <option value="pending">{label(t.statusOptions?.pending, "pending")}</option>
                          <option value="overdue">{label(t.statusOptions?.overdue, "overdue")}</option>
                          <option value="scheduled">{label(t.statusOptions?.scheduled, "scheduled")}</option>
                        </select>
                      </td>

                      <td>{eur(e.amount)}</td>
                      <td>{eur(
  typeof e.vatAmount === "number"
    ? e.vatAmount
    : num(e.total) - num(e.amount)
)}</td>
                      <td>{eur(e.total)}</td>

                      <td>
                        <div className="row-actions">
  <button
    type="button"
    className="btn"
    onClick={() => handleEdit(e.id)}
  >
    {label(t.actions?.edit, "✏️ Edit")}
  </button>

  <button
    type="button"
    className="btn"
    onClick={() => void handleDelete(e.id)}
  >
    {label(t.actions?.delete, "🗑 Delete")}
  </button>

  <button
    type="button"
    className="btn btn-secondary"
    onClick={() => void handlePdf(e)}
  >
    📄 PDF
  </button>
                          </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>
      </main>

      <footer>
        <p>© 2025 SmartWerk</p>
      </footer>
    </>
  );
}