"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  type DocumentData,
} from "firebase/firestore";

import jsPDF from "jspdf";
import "jspdf-autotable";

import { auth, db } from "@/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import type { FieldValue, Timestamp } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

import "./quotes-list.css";

// ==============================
// Types
// ==============================

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

interface QuoteItem {
  desc: string;
  qty: number;
  price: number;
  vat: number;
}

interface QuoteSignatures {
  business?: string;
  client?: string;
  businessDate?: string;
  clientDate?: string;
}

interface QuoteData {
  businessName?: string;
  kvk?: string;
  iban?: string;
  btw?: string;
  email?: string;
  businessAddress?: string;
  businessPhone?: string;

  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  quoteDate?: string;
  validUntil?: string;
  quoteNumber?: string;
  status?: QuoteStatus;
  note?: string;

  items?: QuoteItem[];

  subtotal?: number;
  totalVat?: number;
  grandTotal?: number;

  subtotalFormatted?: string;
  totalVatFormatted?: string;
  grandTotalFormatted?: string;

  signatures?: QuoteSignatures;

  uid?: string;
  number?: string;
  total?: number;
  createdAt?: Timestamp | FieldValue;


 clientId?: string | null;
  userId?: string;
  updatedAt?: Timestamp | FieldValue;
}

interface QuoteDoc extends QuoteData {
  id: string;
}

/**
 * Розширення інстансу jsPDF з autoTable (без any)
 */
type JsPDFWithAutoTable = jsPDF & {
  autoTable?: (options: unknown) => void;
  lastAutoTable?: {
    finalY: number;
  };
};

// невеликий хелпер для i18n
const label = (value: string | undefined, fallback: string) =>
  value ?? fallback;

// формат грошей
const fmt = (value: number | string | undefined | null) => {
  const num = typeof value === "string" ? parseFloat(value) : value ?? 0;
  const safe = Number.isFinite(num) ? (num as number) : 0;
  return "€" + safe.toFixed(2);
};

export default function QuotesListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [quotes, setQuotes] = useState<QuoteDoc[]>([]);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    | "date_desc"
    | "date_asc"
    | "quoteNumber_desc"
    | "quoteNumber_asc"
    | "amount_desc"
    | "amount_asc"
  >("date_desc");

  const { language } = useLanguage();
  const tRoot = useTranslation(language);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tQuotes: any = tRoot?.quotesList;
  const i18nReady = !!tQuotes;

  // ==============================
  // Auth + realtime
  // ==============================
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoadingUser(false);

      const colRef = collection(db, "users", firebaseUser.uid, "quotes");
      const q = query(colRef, orderBy("createdAt", "desc"));

      const unsubSnap = onSnapshot(q, (snap) => {
        const docs: QuoteDoc[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as DocumentData),
        })) as QuoteDoc[];

        setQuotes(docs);
      });

      return () => {
        unsubSnap();
      };
    });

    return () => unsubAuth();
  }, [router]);
const formatFirestoreDate = (
  value?: Timestamp | FieldValue
): string | null => {
  if (!value) return null;
  if ("toDate" in value) {
    return value.toDate().toISOString().slice(0, 10);
  }
  return null;
};
  // ==============================
  // Filtered + sorted list
  // ==============================
  const filteredQuotes = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    let list = quotes.filter((q) => {
      let ok = true;

      if (statusFilter !== "all") {
       ok = ok && (q.status ?? "draft") === statusFilter;
      }

      if (fromDate) {
        ok = ok && (q.quoteDate ?? "") >= fromDate;
      }
      if (toDate) {
        ok = ok && (q.quoteDate ?? "") <= toDate;
      }

      if (searchLower) {
        const totalStr = String(q.grandTotal ?? "").toLowerCase();
        ok =
          ok &&
          ((q.clientName ?? "").toLowerCase().includes(searchLower) ||
            (q.quoteNumber ?? "").toLowerCase().includes(searchLower) ||
            totalStr.includes(searchLower));
      }

      return ok;
    });

    list = list.slice().sort((a, b) => {
      switch (sortBy) {
        case "quoteNumber_desc":
          return (b.quoteNumber ?? "").localeCompare(a.quoteNumber ?? "");
        case "quoteNumber_asc":
          return (a.quoteNumber ?? "").localeCompare(b.quoteNumber ?? "");
        case "date_desc":
          return (b.quoteDate ?? "").localeCompare(a.quoteDate ?? "");
        case "date_asc":
          return (a.quoteDate ?? "").localeCompare(b.quoteDate ?? "");
        case "amount_desc": {
          const aa = parseFloat(String(a.grandTotal ?? 0)) || 0;
          const bb = parseFloat(String(b.grandTotal ?? 0)) || 0;
          return bb - aa;
        }
        case "amount_asc": {
          const aa = parseFloat(String(a.grandTotal ?? 0)) || 0;
          const bb = parseFloat(String(b.grandTotal ?? 0)) || 0;
          return aa - bb;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [quotes, fromDate, toDate, statusFilter, search, sortBy]);

  // ==============================
  // Actions
  // ==============================

  const handleNewQuote = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("editQuoteId");
    }
    router.push("/dashboard/quotes/create");
  };

  const handleBackDashboard = () => {
    router.push("/dashboard");
  };

  const handleEditQuote = (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("editQuoteId", id);
    }
    router.push("/dashboard/quotes/create");
  };

  const handleDeleteQuote = async (id: string) => {
    if (!user) return;
    if (!window.confirm("Delete this quote?")) return;

    await deleteDoc(doc(db, "users", user.uid, "quotes", id));
  };

  // резервуємо новий номер інвойсу (INV-YYYY-XXX)
  const reserveInvoiceNumber = async (uid: string): Promise<string> => {
    const ref = doc(db, "users", uid);
    const year = new Date().getFullYear();
    let result = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.exists()
        ? ((snap.data().lastInvoiceNumber as number) || 0)
        : 0;
      const next = last + 1;
      result = `INV-${year}-${String(next).padStart(3, "0")}`;
      tx.set(ref, { lastInvoiceNumber: next }, { merge: true });
    });

    return result;
  };

  const handleConvertToInvoice = async (id: string) => {
    if (!user) return;
    const q = quotes.find((x) => x.id === id);
    if (!q) return;

    try {
      const invNumber = await reserveInvoiceNumber(user.uid);

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const invoiceDate = `${y}-${m}-${d}`;

      const dueDateObj = new Date(now);
      dueDateObj.setDate(dueDateObj.getDate() + 14);
      const due = `${dueDateObj.getFullYear()}-${String(
        dueDateObj.getMonth() + 1
      ).padStart(2, "0")}-${String(dueDateObj.getDate()).padStart(2, "0")}`;

      const data = {
  /* ================= DASHBOARD CONTRACT ================= */
  uid: user.uid,                 // 🔑 ОБОВʼЯЗКОВО
  number: invNumber,             // 🔑
  status: "draft" as const,      // 🔑
  total: q.grandTotal ?? 0,      // 🔑
  clientId: q.clientId ?? null,  // 🔑 (дуже важливо)
  createdAt: serverTimestamp(),   // 🔑
  updatedAt: serverTimestamp(),   // 🔑

  /* ================= FORM / UI DATA ================= */
  businessName: q.businessName ?? "",
  kvk: q.kvk ?? "",
  iban: q.iban ?? "",
  btw: q.btw ?? "",
  email: q.email ?? "",
  businessAddress: q.businessAddress ?? "",
  businessPhone: q.businessPhone ?? "",

  clientName: q.clientName ?? "",
  clientEmail: q.clientEmail ?? "",
  clientPhone: q.clientPhone ?? "",
  clientAddress: q.clientAddress ?? "",

  invoiceDate,
  dueDate: due,
  invoiceNumber: invNumber,

  items: q.items ?? [],
  subtotal: q.subtotal ?? 0,
  totalVat: q.totalVat ?? 0,
  grandTotal: q.grandTotal ?? 0,

  subtotalFormatted: fmt(q.subtotal),
  totalVatFormatted: fmt(q.totalVat),
  grandTotalFormatted: fmt(q.grandTotal),

  signatures: q.signatures ?? {},
  convertedFrom: q.quoteNumber ?? "",
};

      const ref = await addDoc(
        collection(db, "users", user.uid, "invoices"),
        data
      );

      if (typeof window !== "undefined") {
        localStorage.setItem("editInvoiceId", ref.id);
      }

      alert("✅ Converted to Invoice");
      router.push("/dashboard/invoices/create");
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : String(error);
      alert("❌ Convert failed: " + message);
    }
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setSearch("");
    setSortBy("date_desc");
  };

  const handleStatusChange = async (id: string, newStatus: QuoteStatus) => {
    if (!user) {
      alert("Please sign in again.");
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.uid, "quotes", id),
        {
          status: newStatus,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error: unknown) {
      console.error("Status update failed:", error);
      const message =
        error instanceof Error ? error.message : String(error);
      alert("Status update failed: " + message);
    }
  };

  const handleDownloadPdf = async (id: string, withBranding: boolean) => {
    const q = quotes.find((x) => x.id === id);
    if (!q) return;

    const pdf = new jsPDF() as JsPDFWithAutoTable;

    pdf.setFontSize(18);
    pdf.text("QUOTE / OFFER", 105, 15, { align: "center" });

    pdf.setFontSize(12);
    pdf.text("From:", 14, 28);
    pdf.text(
      [
        q.businessName || "",
        `KvK: ${q.kvk || ""}`,
        `IBAN: ${q.iban || ""}`,
        `BTW: ${q.btw || ""}`,
        `Email: ${q.email || ""}`,
        `Address: ${q.businessAddress || ""}`,
        `Phone: ${q.businessPhone || ""}`,
      ],
      14,
      34
    );

    pdf.text("To:", 120, 28);
    pdf.text(
      [
        q.clientName || "",
        q.clientEmail || "",
        `Address: ${q.clientAddress || ""}`,
        `Phone: ${q.clientPhone || ""}`,
      ],
      120,
      34
    );

    // Summary table
    pdf.autoTable?.({
      startY: 70,
      head: [["Quote #", "Date", "Status", "Total"]],
      body: [
        [
          q.quoteNumber || "—",
          q.quoteDate || "—",
          q.status || "draft",
          fmt(q.grandTotal),
        ],
      ],
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 4, halign: "center" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    });

    // Items
    const items =
      q.items?.map((it) => [
        it.desc || "",
        it.qty || 0,
        fmt(it.price),
        `${it.vat ?? 0}%`,
        fmt(
          (it.qty || 0) *
            (it.price || 0) *
            (1 + (typeof it.vat === "number" ? it.vat : 0) / 100)
        ),
      ]) ?? [];

    const last = pdf.lastAutoTable ?? { finalY: 70 };

    pdf.autoTable?.({
      startY: last.finalY + 8,
      head: [["Description", "Qty", "Unit Price", "VAT", "Total"]],
      body: items,
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 4, halign: "center" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    });

    const last2 = pdf.lastAutoTable ?? { finalY: 70 };
    const y = last2.finalY + 8;

    pdf.text(`Subtotal: ${fmt(q.subtotal)}`, 150, y);
    pdf.text(`VAT: ${fmt(q.totalVat)}`, 150, y + 6);
    pdf.text(`Total Due: ${fmt(q.grandTotal)}`, 150, y + 12);

    if (q.note) {
      pdf.text("Note:", 14, y);
      pdf.text(String(q.note), 14, y + 6, { maxWidth: 120 });
    }

    const y2 = y + 28;

    if (q.signatures?.business) {
      pdf.setDrawColor(0);
      pdf.line(14, y2 + 22, 74, y2 + 22);
      pdf.addImage(q.signatures.business, "PNG", 14, y2, 60, 20);
      pdf.text("Business Signature", 14, y2 + 30);
      if (q.signatures.businessDate) {
        pdf.text(`Signed: ${q.signatures.businessDate}`, 14, y2 + 37);
      }
    }

    if (q.signatures?.client) {
      pdf.setDrawColor(0);
      pdf.line(120, y2 + 22, 180, y2 + 22);
      pdf.addImage(q.signatures.client, "PNG", 120, y2, 60, 20);
      pdf.text("Client Signature", 120, y2 + 30);
      if (q.signatures.clientDate) {
        pdf.text(`Signed: ${q.signatures.clientDate}`, 120, y2 + 37);
      }
    }

    if (withBranding) {
      pdf.setFontSize(10);
      pdf.text("Generated with SmartWerk", 105, 290, { align: "center" });
    }

    pdf.save(`${q.quoteNumber || "Quote"}.pdf`);
  };

  // ==============================
  // Render
  // ==============================

  if (loadingUser || !i18nReady) {
  return (
    <div className="clients-loading">
      <div className="clients-loading-card">
        Loading…
      </div>
    </div>
  );
}

  if (!user) {
    return null;
  }

  return (
    <>
      <header className="topbar">
        <h1 className="invoice-title">
          {label(tQuotes.listTitle, "Saved Quotes")}
        </h1>

        <div className="actions-right">
          <button className="btn" onClick={handleNewQuote}>
            {tQuotes.newQuote ?? "New Quote"}
          </button>
          <button className="btn" onClick={handleBackDashboard}>
            {tQuotes.backToDashboard ?? "Back to Dashboard"}
          </button>
        </div>
      </header>

      <main className="dash-main invoice-page">
        <div className="dash-content invoice-content">
          {/* Filters */}
          <section className="filters">
            <label>
              {tQuotes.from ?? "From"}:
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>

            <label>
              {tQuotes.to ?? "To"}:
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>

            <label>
              {tQuotes.status ?? "Status"}:
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as QuoteStatus | "all")
                }
              >
                <option value="all">
                  {tQuotes.statusall ?? "All"}
                </option>
                <option value="draft">
                  {tQuotes.statusdraft ?? "Draft"}
                </option>
                <option value="sent">
                  {tQuotes.statussent ?? "Sent"}
                </option>
                <option value="accepted">
                  {tQuotes.statusaccepted ?? "Accepted"}
                </option>
                <option value="rejected">
                  {tQuotes.statusrejected ?? "Rejected"}
                </option>
              </select>
            </label>

            <label>
              {tQuotes.searchLabel ?? "Search"}:
              <input
                type="text"
                value={search}
                placeholder={
                  tQuotes.searchPlaceholder ??
                  "Search client / Quote # / amount"
                }
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label>
              {tQuotes.sortBy ?? "Sort by"}:
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | "date_desc"
                      | "date_asc"
                      | "quoteNumber_desc"
                      | "quoteNumber_asc"
                      | "amount_desc"
                      | "amount_asc"
                  )
                }
              >
                <option value="date_desc">
                  {tQuotes.sortDateDesc ?? "Date (new)"}
                </option>
                <option value="date_asc">
                  {tQuotes.sortDateAsc ?? "Date (old)"}
                </option>
                <option value="quoteNumber_desc">
                  {tQuotes.sortNumberDesc ?? "Quote # (new)"}
                </option>
                <option value="quoteNumber_asc">
                  {tQuotes.sortNumberAsc ?? "Quote # (old)"}
                </option>
                <option value="amount_desc">
                  {tQuotes.sortAmountDesc ?? "Amount ↓"}
                </option>
                <option value="amount_asc">
                  {tQuotes.sortAmountAsc ?? "Amount ↑"}
                </option>
              </select>
            </label>

            <button type="button" className="btn" onClick={handleResetFilters}>
              {tQuotes.reset ?? "Reset"}
            </button>
          </section>

          {/* Table */}
          <section>
            <table>
              <thead>
                <tr>
                  <th>{tQuotes.colNumber ?? "Quote #"}</th>
                  <th>{tQuotes.colClient ?? "Client"}</th>
                  <th>{tQuotes.colStatus ?? "Status"}</th>
                  <th>{tQuotes.colDate ?? "Date"}</th>
                  <th>{tQuotes.colTotal ?? "Total"}</th>
                  <th>{tQuotes.colActions ?? "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 16 }}>
                      {tQuotes.messagesEmpty ?? "No quotes found."}
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => (
                    <tr key={q.id}>
                      <td>{q.quoteNumber ?? q.number ?? "—"}</td>
                      <td>{q.clientName ?? "—"}</td>
                      <td>
                        <select
                          value={q.status ?? "draft"}
                          onChange={(e) =>
                            handleStatusChange(
                              q.id,
                              e.target.value as QuoteStatus
                            )
                          }
                        >
                          <option value="draft">
                            {tQuotes.statusdraft ?? "Draft"}
                          </option>
                          <option value="sent">
                            {tQuotes.statussent ?? "Sent"}
                          </option>
                          <option value="accepted">
                            {tQuotes.statusaccepted ?? "Accepted"}
                          </option>
                          <option value="rejected">
                            {tQuotes.statusrejected ?? "Rejected"}
                          </option>
                        </select>
                      </td>
                     <td>
  {q.quoteDate ??
    formatFirestoreDate(q.createdAt) ??
    "—"}
</td>
                      <td>{fmt(q.grandTotal)}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleEditQuote(q.id)}
                          >
                            {tQuotes.actionEdit ?? "Edit"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleDeleteQuote(q.id)}
                          >
                            {tQuotes.actionDelete ?? "Delete"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleDownloadPdf(q.id, true)}
                          >
                            {tQuotes.actionPdf ?? "PDF"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleDownloadPdf(q.id, false)}
                          >
                            {tQuotes.actionPdfPro ?? "PRO PDF"}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => handleConvertToInvoice(q.id)}
                          >
                            {tQuotes.actionConvert ?? "Convert to Invoice"}
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