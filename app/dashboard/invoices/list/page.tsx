"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import type { jsPDF as JsPdfCtor } from "jspdf";
import type { UserOptions } from "jspdf-autotable";

import "./list.css";

/* ================= TYPES (compatible with create/page.tsx) ================= */

interface InvoiceItem {
  desc: string;
  qty: number;
  price: number;
  vat: number;
}

interface InvoiceSignatures {
  business?: string;
  client?: string;
  businessDate?: string;
  clientDate?: string;
}
type InvoiceStatus = "draft" | "sent" | "paid";

interface InvoiceData {
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

  invoiceDate?: string; // yyyy-mm-dd
  dueDate?: string; // yyyy-mm-dd
  invoiceNumber?: string;
  status?: InvoiceStatus;
  note?: string;

  items?: InvoiceItem[];

  subtotal?: number;
  totalVat?: number;
  grandTotal?: number;

  subtotalFormatted?: string;
  totalVatFormatted?: string;
  grandTotalFormatted?: string;

  signatures?: InvoiceSignatures;

  userId?: string;
  updatedAt?: string;
}

type InvoiceWithId = InvoiceData & { id: string };

type InvoicesListI18n = {
  title?: string;
  back?: string;
  create?: string;

  filters?: {
    from?: string;
    to?: string;
    status?: string;
    search?: string;
    searchPlaceholder?: string;
    sortBy?: string;
    reset?: string;
  };

  table?: {
    invoiceNumber?: string;
    client?: string;
    status?: string;
    date?: string;
    total?: string;
    actions?: string;
  };

  actions?: {
    edit?: string;
    delete?: string;
    pdf?: string;
    pdfPro?: string;
  };

  messages?: {
    loading?: string;
    noInvoices?: string;
    confirmDelete?: string;
  };

  statusOptions?: {
    all?: string;
    draft?: string;
    sent?: string;
    paid?: string;
    
  };

  sortOptions?: {
    invoiceNumberDesc?: string;
    invoiceNumberAsc?: string;
    dateDesc?: string;
    dateAsc?: string;
    amountDesc?: string;
    amountAsc?: string;
  };
};

// helper for i18n
const label = (value: string | undefined, fallback: string) => value ?? fallback;

// jsPDF typings: safely read lastAutoTable.finalY without any
type JsPdfWithAutoTable = InstanceType<typeof JsPdfCtor> & {
  lastAutoTable?: { finalY?: number };
};



export default function InvoiceListPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= i18n ================= */
  const { language } = useLanguage();
  const tRoot = useTranslation(language) as { invoicesList?: InvoicesListI18n } | null;
  const tInvList: InvoicesListI18n = tRoot?.invoicesList ?? {};

  /* ================= Filters ================= */
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("invoiceNumber_desc");

  /* ================= AUTH + REALTIME INVOICES ================= */
  useEffect(() => {
    let unsubInvoices: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);

      const colRef = collection(db, "users", firebaseUser.uid, "invoices");
      const q = query(colRef, orderBy("createdAt", "desc"));

      unsubInvoices = onSnapshot(
        q,
        (snap) => {
       const data: InvoiceWithId[] = snap.docs.map((d) => {
      const docData = d.data() as InvoiceData;
      return { id: d.id, ...docData };
      });

      setInvoices(data);
      setLoading(false);
      },
         (error) => {
     console.error("Invoices listener error:", error);
    setLoading(false);
      }
);
    });

    return () => {
      unsubAuth();
      unsubInvoices?.();
    };
  }, [router]);

  /* ================= FILTER + SORT ================= */
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    result = result.filter((inv) => {
      // status
      if (statusFilter !== "all") {
      if ((inv.status || "draft") !== statusFilter) return false;
      }

      // date range (yyyy-mm-dd string compare ok)
      if (fromDate && (inv.invoiceDate || "") < fromDate) return false;
      if (toDate && (inv.invoiceDate || "") > toDate) return false;

      // search (IMPORTANT: parentheses around OR)
      if (search.trim()) {
        const q = search.toLowerCase();

        const totalStr = String(inv.grandTotal ?? inv.grandTotalFormatted ?? "")
          .toLowerCase()
          .replace(/[^\d.,-]/g, "");

        const match =
          (inv.clientName || "").toLowerCase().includes(q) ||
          (inv.invoiceNumber || "").toLowerCase().includes(q) ||
          totalStr.includes(q);

        if (!match) return false;
      }

      return true;
    });

    // sort
    result.sort((a, b) => {
      const numA = parseInt((a.invoiceNumber || "").split("-").pop() || "0", 10) || 0;
      const numB = parseInt((b.invoiceNumber || "").split("-").pop() || "0", 10) || 0;

      const dateA = new Date(a.invoiceDate || "").getTime() || 0;
      const dateB = new Date(b.invoiceDate || "").getTime() || 0;

      const totalA = Number(a.grandTotal ?? 0);
      const totalB = Number(b.grandTotal ?? 0);

      switch (sortBy) {
        case "invoiceNumber_desc":
          return numB - numA;
        case "invoiceNumber_asc":
          return numA - numB;
        case "date_desc":
          return dateB - dateA;
        case "date_asc":
          return dateA - dateB;
        case "amount_desc":
          return totalB - totalA;
        case "amount_asc":
          return totalA - totalB;
        default:
          return 0;
      }
    });

    return result;
  }, [invoices, fromDate, toDate, statusFilter, search, sortBy]);

  /* ================= HELPERS ================= */
  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setSearch("");
    setSortBy("invoiceNumber_desc");
  };

  const prettyStatus = (status?: string) => {
  switch (status) {
    case "draft":
      return tInvList.statusOptions?.draft ?? "draft";
    case "sent":
      return tInvList.statusOptions?.sent ?? "sent";
    case "paid":
      return tInvList.statusOptions?.paid ?? "paid";
    default:
      return status ?? "draft";
  }
};

  /* ================= ACTIONS ================= */
  const handleBackDashboard = () => router.push("/dashboard");

  const handleCreateInvoice = () => {
    if (typeof window !== "undefined") localStorage.removeItem("editInvoiceId");
    router.push("/dashboard/invoices/create");
  };

  const handleEdit = (id: string) => {
    if (typeof window !== "undefined") localStorage.setItem("editInvoiceId", id);
    router.push("/dashboard/invoices/create");
  };

  const handleDelete = async (id: string) => {
    const msg = tInvList.messages?.confirmDelete ?? "Delete this invoice?";
    if (!window.confirm(msg)) return;
    if (!user) return;
    try {
    await deleteDoc(doc(db, "users", user.uid, "invoices", id));
    } catch (e) {
  console.error("Delete failed:", e);
  alert("❌ Failed to delete invoice");
}
  };

  const handleDownloadPdf = async (id: string, withBranding: boolean) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;

    const jsPDFModule = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const docPDF = new jsPDFModule.jsPDF() as unknown as JsPdfWithAutoTable;

    docPDF.setFontSize(18);
    docPDF.text("INVOICE", 105, 15, { align: "center" });

    docPDF.setFontSize(12);
    docPDF.text("From:", 14, 30);
    docPDF.text(
      [
        inv.businessName || "",
        inv.kvk ? `KvK: ${inv.kvk}` : "",
        inv.iban ? `IBAN: ${inv.iban}` : "",
        inv.email ? `Email: ${inv.email}` : "",
        inv.btw ? `BTW: ${inv.btw}` : "",
        inv.businessAddress ? `Address: ${inv.businessAddress}` : "",
        inv.businessPhone ? `Phone: ${inv.businessPhone}` : "",
      ].filter(Boolean),
      14,
      36
    );

    docPDF.text("To:", 120, 30);
    docPDF.text(
      [
        inv.clientName || "",
        inv.clientEmail || "",
        inv.clientAddress ? `Address: ${inv.clientAddress}` : "",
        inv.clientPhone ? `Phone: ${inv.clientPhone}` : "",
      ].filter(Boolean),
      120,
      36
    );

    docPDF.setDrawColor(200);
    docPDF.line(14, 70, 195, 70);

    autoTable(docPDF, {
      startY: 80,
      head: [["Invoice #", "Date Issued", "Due Date", "Status"]],
      body: [
        [
          inv.invoiceNumber || "—",
          inv.invoiceDate || "—",
          inv.dueDate || "—",
          inv.status || "draft",
        ],
      ],
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 4, halign: "center", valign: "middle" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: 50 },
    } satisfies UserOptions);

    const items =
      inv.items?.map((it) => [
        it.desc,
        String(it.qty),
        `€${Number(it.price || 0).toFixed(2)}`,
        `${it.vat}%`,
        `€${(it.qty * it.price * (1 + it.vat / 100)).toFixed(2)}`,
      ]) ?? [];

    const startItemsY = (docPDF.lastAutoTable?.finalY ?? 80) + 10;

    autoTable(docPDF, {
      startY: startItemsY,
      head: [["Description", "Qty", "Unit Price", "VAT", "Total"]],
      body: items,
      theme: "grid",
      styles: { fontSize: 11, cellPadding: 4, halign: "center", valign: "middle" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      bodyStyles: { textColor: 50 },
    } satisfies UserOptions);

    const yTotals = (docPDF.lastAutoTable?.finalY ?? startItemsY) + 10;

    docPDF.text(`Subtotal: ${inv.subtotalFormatted ?? "€0.00"}`, 150, yTotals);
    docPDF.text(`VAT: ${inv.totalVatFormatted ?? "€0.00"}`, 150, yTotals + 6);
    docPDF.text(`Total Due: ${inv.grandTotalFormatted ?? "€0.00"}`, 150, yTotals + 12);

    let yCursor = yTotals + 20;

    if (inv.note) {
      docPDF.text("Note:", 14, yTotals);
      docPDF.text(String(inv.note), 14, yTotals + 6, { maxWidth: 180 });
      yCursor += 10;
    }

    if (inv.signatures?.business) {
      docPDF.addImage(inv.signatures.business, "PNG", 14, yCursor, 60, 20);
      docPDF.text("Business Signature", 14, yCursor + 32);
      docPDF.text("_________________________", 14, yCursor + 25);
      if (inv.signatures.businessDate) {
        docPDF.text(`Date: ${inv.signatures.businessDate}`, 14, yCursor + 38);
      }
    }

    if (inv.signatures?.client) {
      docPDF.addImage(inv.signatures.client, "PNG", 120, yCursor, 60, 20);
      docPDF.text("Client Signature", 120, yCursor + 32);
      docPDF.text("_________________________", 120, yCursor + 25);
      if (inv.signatures.clientDate) {
        docPDF.text(`Date: ${inv.signatures.clientDate}`, 120, yCursor + 38);
      }
    }

    if (withBranding) {
      docPDF.setFontSize(10);
      docPDF.text("Generated with SmartWerk", 105, 290, { align: "center" });
    }

    docPDF.save(`${inv.invoiceNumber || "invoice"}.pdf`);
  };

  /* ================= RENDER ================= */
  if (!user && loading) {
    return (
      <div className="invoices-loading">
        <div className="invoices-loading-card">
          {tInvList.messages?.loading ?? "Loading invoices…"}
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <h1 className="invoice-title">
          {label(tInvList.title, "Saved Invoices")}
        </h1>

        <div className="actions-right">
          <button className="btn" onClick={handleBackDashboard}>
            {label(tInvList.back, "Back to Dashboard")}
          </button>

          <button className="btn" onClick={handleCreateInvoice}>
            {label(tInvList.create, "New Invoice")}
          </button>
        </div>
      </header>

      <main className="dash-main invoice-list-page">
        <div className="dash-content invoice-list-content">
          <section className="filters">
            <label>
              <span>{label(tInvList.filters?.from, "From")}</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>

            <label>
              <span>{label(tInvList.filters?.to, "To")}</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>

            <label>
              <span>{label(tInvList.filters?.status, "Status")}</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">{tInvList.statusOptions?.all ?? "all"}</option>
                <option value="draft">{tInvList.statusOptions?.draft ?? "draft"}</option>
                <option value="sent">{tInvList.statusOptions?.sent ?? "sent"}</option>
                <option value="paid">{tInvList.statusOptions?.paid ?? "paid"}</option>
               
              </select>
            </label>

            <label className="filters-grow">
              <span>{label(tInvList.filters?.search, "Search")}</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tInvList.filters?.searchPlaceholder ?? "Search client / Invoice # / amount"
                }
              />
            </label>

            <label>
              <span>{label(tInvList.filters?.sortBy, "Sort by")}</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="invoiceNumber_desc">{tInvList.sortOptions?.invoiceNumberDesc ?? "Invoice # (new)"}</option>
                <option value="invoiceNumber_asc">{tInvList.sortOptions?.invoiceNumberAsc ?? "Invoice # (old)"}</option>
                <option value="date_desc">{tInvList.sortOptions?.dateDesc ?? "Date (new)"}</option>
                <option value="date_asc">{tInvList.sortOptions?.dateAsc ?? "Date (old)"}</option>
                <option value="amount_desc">{tInvList.sortOptions?.amountDesc ?? "Amount ↓"}</option>
                <option value="amount_asc">{tInvList.sortOptions?.amountAsc ?? "Amount ↑"}</option>
              </select>
            </label>

            <button type="button" className="btn filters-reset" onClick={resetFilters}>
              {label(tInvList.filters?.reset, "Reset filters")}
            </button>
          </section>

          <section>
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>{label(tInvList.table?.invoiceNumber, "Invoice #")}</th>
                  <th>{label(tInvList.table?.client, "Client")}</th>
                  <th>{label(tInvList.table?.status, "Status")}</th>
                  <th>{label(tInvList.table?.date, "Date")}</th>
                  <th>{label(tInvList.table?.total, "Total")}</th>
                  <th>{label(tInvList.table?.actions, "Actions")}</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="invoices-table-empty">
                      {tInvList.messages?.loading ?? "Loading invoices…"}
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="invoices-table-empty">
                      {tInvList.messages?.noInvoices ?? "No invoices found."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                     <td data-label="Invoice">{inv.invoiceNumber || "—"}</td>
                      <td data-label="Client">{inv.clientName || "—"}</td>
                      <td data-label="Status">
                        <span className={`status-badge status-${inv.status}`}>
                           {prettyStatus(inv.status)}
                            </span>
                          </td>
                       <td data-label="Date">{inv.invoiceDate || "—"}</td>
                     <td data-label="Total">
                        €{(Number(inv.grandTotal ?? 0) || 0).toFixed(2)}
                          </td>
                      <td data-label="Actions" className="invoices-actions">
                        <button type="button" className="btn btn-sm" onClick={() => handleEdit(inv.id)}>
                          {tInvList.actions?.edit ?? "Edit"}
                        </button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDelete(inv.id)}>
                          {tInvList.actions?.delete ?? "Delete"}
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => handleDownloadPdf(inv.id, true)}>
                          {tInvList.actions?.pdf ?? "PDF"}
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => handleDownloadPdf(inv.id, false)}>
                          {tInvList.actions?.pdfPro ?? "PRO PDF without branding"}
                        </button>
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