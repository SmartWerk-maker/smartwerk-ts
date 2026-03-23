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
  setDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";

import { auth, db } from "@/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import "./list.css";

type ReminderStatus = "draft" | "sent" | "paid";
type ReminderType = "First Reminder" | "Second Reminder" | "Final Reminder";
type StatusFilter = ReminderStatus | "all";
type TypeFilter = ReminderType | "all";

type SignaturePack = {
  business?: string;
  businessDate?: string;
  client?: string;
  clientDate?: string;
};

type ReminderDoc = {
  id: string;

  reminderId?: string;
  invoiceNumber?: string;

  businessName?: string;
  email?: string;
  businessAddress?: string;
  businessPhone?: string;

  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;

  reminderDate?: string;
  status?: ReminderStatus;
  type?: ReminderType;

  amount?: string | number; // legacy
  amountNumber?: number; // new (recommended)
  invoiceAmount?: string;

  message?: string;
  signatures?: SignaturePack;

  updatedAt?: unknown;
  createdAt?: unknown;
};

export type RemindersListI18n = {
  title?: string;
  actions?: {
    new?: string;
    back?: string;
    reset?: string;
    edit?: string;
    delete?: string;
    pdf?: string;
    pdfPro?: string;
    send?: string;
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
  statusOptions?: { draft?: string; sent?: string; paid?: string };
  typeOptions?: { first?: string; second?: string; final?: string };
  sort?: {
    dateDesc?: string;
    dateAsc?: string;
    numberDesc?: string;
    numberAsc?: string;
    amountDesc?: string;
    amountAsc?: string;
  };
  table?: {
    reminderId?: string;
    invoice?: string;
    client?: string;
    status?: string;
    type?: string;
    date?: string;
    amount?: string;
    actions?: string;
  };
  messages?: {
    loading?: string;
    empty?: string;
    deleteConfirm?: string;
    statusFailed?: string;
    pdfFailed?: string;
    sendInfo?: string;
  };
};

const label = (v: string | undefined, fallback: string) => v ?? fallback;

function asNumber(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "")
    .replace(/[^\d,.\-]/g, "")
    .replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function fmtEUR(v: unknown): string {
  return "€" + asNumber(v).toFixed(2);
}

export default function RemindersListClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  // ✅ important: useMemo to avoid new {} every render (fixes hooks deps warning + TS noise)
  const t = useMemo(
    () => ((tRoot?.remindersList ?? {}) as RemindersListI18n),
    [tRoot]
  );

  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [reminders, setReminders] = useState<ReminderDoc[]>([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    | "date_desc"
    | "date_asc"
    | "reminderNumber_desc"
    | "reminderNumber_asc"
    | "amount_desc"
    | "amount_asc"
  >("date_desc");

  // ✅ theme apply (як у твоєму html)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = window.localStorage.getItem("theme") || "theme-dark";
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(savedTheme);
  }, []);

  // ✅ auth + realtime
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoadingUser(false);

      const colRef = collection(db, "users", firebaseUser.uid, "reminders");
      const qRef = query(colRef, orderBy("reminderDate", "desc"));

      const unsubSnap = onSnapshot(qRef, (snap) => {
        const list: ReminderDoc[] = snap.docs.map((d) => {
          const data = d.data() as DocumentData;
          return { id: d.id, ...(data as Omit<ReminderDoc, "id">) };
        });
        setReminders(list);
      });

      return () => unsubSnap();
    });

    return () => unsubAuth();
  }, [router]);

  const filteredReminders = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = reminders.filter((r) => {
      let ok = true;

      if (statusFilter !== "all") ok = ok && (r.status ?? "draft") === statusFilter;
      if (typeFilter !== "all") ok = ok && (r.type ?? "First Reminder") === typeFilter;

      const date = r.reminderDate ?? "";
      if (fromDate) ok = ok && date >= fromDate;
      if (toDate) ok = ok && date <= toDate;

      if (q) {
        const amountStr = String(
          typeof r.amountNumber === "number" ? r.amountNumber : asNumber(r.amount)
        ).toLowerCase();

        ok =
          ok &&
          ((r.clientName ?? "").toLowerCase().includes(q) ||
            (r.reminderId ?? "").toLowerCase().includes(q) ||
            amountStr.includes(q));
      }

      return ok;
    });

    list = list.slice().sort((a, b) => {
      const aAmt = typeof a.amountNumber === "number" ? a.amountNumber : asNumber(a.amount);
      const bAmt = typeof b.amountNumber === "number" ? b.amountNumber : asNumber(b.amount);

      switch (sortBy) {
        case "reminderNumber_desc":
          return (b.reminderId ?? "").localeCompare(a.reminderId ?? "");
        case "reminderNumber_asc":
          return (a.reminderId ?? "").localeCompare(b.reminderId ?? "");
        case "date_desc":
          return (b.reminderDate ?? "").localeCompare(a.reminderDate ?? "");
        case "date_asc":
          return (a.reminderDate ?? "").localeCompare(b.reminderDate ?? "");
        case "amount_desc":
          return bAmt - aAmt;
        case "amount_asc":
          return aAmt - bAmt;
        default:
          return 0;
      }
    });

    return list;
  }, [reminders, search, statusFilter, typeFilter, fromDate, toDate, sortBy]);

  const handleNew = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("editReminderId");
    }
    router.push("/dashboard/reminders/create");
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
        window.localStorage.setItem("editReminderId", id);
      }
      router.push("/dashboard/reminders/create");
    },
    [router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;

      const confirmText =
        t.messages?.deleteConfirm ?? "Delete this reminder? This cannot be undone.";
      if (!window.confirm(confirmText)) return;

      await deleteDoc(doc(db, "users", user.uid, "reminders", id));
    },
    [user, t.messages?.deleteConfirm]
  );

  const handleStatusChange = useCallback(
    async (id: string, newStatus: ReminderStatus) => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, "users", user.uid, "reminders", id),
          { status: newStatus, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch (e) {
        console.error(e);
        alert(t.messages?.statusFailed ?? "❌ Status update failed");
      }
    },
    [user, t.messages?.statusFailed]
  );

  const handleDownloadPdf = useCallback(
    async (id: string, withBranding: boolean) => {
      const r = reminders.find((x) => x.id === id);
      if (!r) return;

      try {
        const jsPDFMod = await import("jspdf");
        const autoTable = (await import("jspdf-autotable")).default;

        const DocCtor = jsPDFMod.jsPDF;
        const pdf = new DocCtor("p", "mm", "a4");

        pdf.setFontSize(18);
        pdf.text("PAYMENT REMINDER", 105, 15, { align: "center" });

        pdf.setFontSize(12);
        pdf.text("From:", 14, 28);
        pdf.text(
          [
            r.businessName || "",
            r.email || "",
            r.businessAddress || "",
            r.businessPhone || "",
          ],
          14,
          34
        );

        pdf.text("To:", 120, 28);
        pdf.text(
          [r.clientName || "", r.clientEmail || "", r.clientAddress || ""],
          120,
          34
        );

        const amountValue =
          typeof r.amountNumber === "number" ? r.amountNumber : asNumber(r.amount);

        autoTable(pdf, {
          startY: 70,
          head: [["Reminder ID", "Linked Invoice", "Type", "Status", "Date", "Amount"]],
          body: [
            [
              r.reminderId || "—",
              r.invoiceNumber || "—",
              r.type || "—",
              r.status || "draft",
              r.reminderDate || "—",
              "€" + amountValue.toFixed(2),
            ],
          ],
          theme: "grid",
          styles: { fontSize: 11, cellPadding: 4, halign: "center" },
          headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        });

        const lastY =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pdf as any).lastAutoTable?.finalY ?? 80;

        const y = lastY + 10;
        if (r.message) {
          pdf.text("Message:", 14, y);
          pdf.text(String(r.message), 14, y + 6, { maxWidth: 180 });
        }

        const y2 = y + 30;

        if (r.signatures?.business) {
          pdf.setDrawColor(0);
          pdf.line(14, y2 + 22, 74, y2 + 22);
          pdf.addImage(r.signatures.business, "PNG", 14, y2, 60, 20);
          pdf.text("Business Signature", 14, y2 + 30);
        }

        if (r.signatures?.client) {
          pdf.setDrawColor(0);
          pdf.line(120, y2 + 22, 180, y2 + 22);
          pdf.addImage(r.signatures.client, "PNG", 120, y2, 60, 20);
          pdf.text("Client Signature", 120, y2 + 30);
        }

        if (withBranding) {
          pdf.setFontSize(10);
          pdf.text("Generated with SmartWerk", 105, 290, { align: "center" });
        }

        pdf.save(`${r.reminderId || "Reminder"}.pdf`);
      } catch (e) {
        console.error(e);
        alert(t.messages?.pdfFailed ?? "❌ PDF export failed");
      }
    },
    [reminders, t.messages?.pdfFailed]
  );

  const handleSend = useCallback(() => {
    alert(t.messages?.sendInfo ?? "📧 Sending reminders via email will be part of SmartWerk PRO.");
  }, [t.messages?.sendInfo]);

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
        <h1 className="invoice-title">
          {label(t.title, "Saved Reminders")}
        </h1>

        <div className="actions-right">
          <button className="btn" onClick={handleNew}>
            {label(t.actions?.new, "➕ New Reminder")}
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
                <option value="all">{label(t.filters?.all, "all")}</option>
                <option value="draft">{label(t.statusOptions?.draft, "draft")}</option>
                <option value="sent">{label(t.statusOptions?.sent, "sent")}</option>
                <option value="paid">{label(t.statusOptions?.paid, "paid")}</option>
              </select>
            </label>

            <label>
              {label(t.filters?.type, "Type")}:
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                <option value="all">{label(t.filters?.all, "all")}</option>
                <option value="First Reminder">
                  {label(t.typeOptions?.first, "First Reminder")}
                </option>
                <option value="Second Reminder">
                  {label(t.typeOptions?.second, "Second Reminder")}
                </option>
                <option value="Final Reminder">
                  {label(t.typeOptions?.final, "Final Reminder")}
                </option>
              </select>
            </label>

            <label>
              {label(t.filters?.search, "Search")}:
              <input
                type="text"
                value={search}
                placeholder={label(
                  t.filters?.searchPlaceholder,
                  "Search client / Reminder # / Amount"
                )}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label>
              {label(t.filters?.sortBy, "Sort by")}:
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "date_desc"
                      | "date_asc"
                      | "reminderNumber_desc"
                      | "reminderNumber_asc"
                      | "amount_desc"
                      | "amount_asc"
                  )
                }
              >
                <option value="date_desc">{label(t.sort?.dateDesc, "Date (new)")}</option>
                <option value="date_asc">{label(t.sort?.dateAsc, "Date (old)")}</option>
                <option value="reminderNumber_desc">
                  {label(t.sort?.numberDesc, "Reminder # (new)")}
                </option>
                <option value="reminderNumber_asc">
                  {label(t.sort?.numberAsc, "Reminder # (old)")}
                </option>
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
                  <th>{label(t.table?.reminderId, "Reminder ID")}</th>
                  <th>{label(t.table?.invoice, "Invoice")}</th>
                  <th>{label(t.table?.client, "Client")}</th>
                  <th>{label(t.table?.status, "Status")}</th>
                  <th>{label(t.table?.type, "Type")}</th>
                  <th>{label(t.table?.date, "Date")}</th>
                  <th>{label(t.table?.amount, "Amount")}</th>
                  <th>{label(t.table?.actions, "Actions")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredReminders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                      {label(t.messages?.empty, "No reminders found")}
                    </td>
                  </tr>
                ) : (
                  filteredReminders.map((r) => {
                    const amountValue =
                      typeof r.amountNumber === "number"
                        ? r.amountNumber
                        : asNumber(r.amount);

                    return (
                      <tr key={r.id}>
                        <td>{r.reminderId ?? "—"}</td>
                        <td>{r.invoiceNumber ?? "—"}</td>
                        <td>{r.clientName ?? "—"}</td>
                        <td>
                          <select
                            value={r.status ?? "draft"}
                            onChange={(e) =>
                              void handleStatusChange(
                                r.id,
                                e.target.value as ReminderStatus
                              )
                            }
                          >
                            <option value="draft">
                              {label(t.statusOptions?.draft, "draft")}
                            </option>
                            <option value="sent">
                              {label(t.statusOptions?.sent, "sent")}
                            </option>
                            <option value="paid">
                              {label(t.statusOptions?.paid, "paid")}
                            </option>
                          </select>
                        </td>
                        <td>{r.type ?? "—"}</td>
                        <td>{r.reminderDate ?? "—"}</td>
                        <td>{fmtEUR(amountValue)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleEdit(r.id)}
                            >
                              {label(t.actions?.edit, "✏️ Edit")}
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => void handleDelete(r.id)}
                            >
                              {label(t.actions?.delete, "🗑 Delete")}
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => void handleDownloadPdf(r.id, true)}
                            >
                              {label(t.actions?.pdf, "📄 PDF")}
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => void handleDownloadPdf(r.id, false)}
                            >
                              {label(t.actions?.pdfPro, "💎 PRO PDF")}
                            </button>
                            <button
                              type="button"
                              className="btn"
                              onClick={() => handleSend()}
                            >
                              {label(t.actions?.send, "📧 Send")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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