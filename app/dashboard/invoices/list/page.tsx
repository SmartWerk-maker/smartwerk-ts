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
  type Timestamp,
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
  businessDate?: string | null;
  clientDate?: string | null;
}

type InvoiceStatus = "draft" | "sent" | "paid";

interface InvoiceData {
  uid?: string;

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

  invoiceDate?: string;
  dueDate?: string;
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

  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
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
    deleteFailed?: string;
    pdfFailed?: string;
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

const label = (value: string | undefined, fallback: string) => value ?? fallback;

type JsPdfWithAutoTable = InstanceType<typeof JsPdfCtor> & {
  lastAutoTable?: { finalY?: number };
};

async function imageUrlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert image to data URL"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read image blob"));
    reader.readAsDataURL(blob);
  });
}

function isLikelyRemoteUrl(value?: string): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

export default function InvoiceListPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<InvoiceWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);

  const { language } = useLanguage();
  const tRoot = (useTranslation(language) as { invoicesList?: InvoicesListI18n } | null) ?? null;
  const tInvList: InvoicesListI18n = tRoot?.invoicesList ?? {};

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("invoiceNumber_desc");

  useEffect(() => {
    let unsubInvoices: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setInvoices([]);
        setLoading(false);
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoading(true);

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

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const result = [...invoices].filter((inv) => {
      if (statusFilter !== "all" && (inv.status || "draft") !== statusFilter) {
        return false;

      }
      const invoiceDate = inv.invoiceDate || "";
      if (fromDate && invoiceDate < fromDate) return false;
      if (toDate && invoiceDate > toDate) return false;

      if (normalizedSearch) {
        const totalStr = String(inv.grandTotal ?? inv.grandTotalFormatted ?? "")
          .toLowerCase()
          .replace(/[^\d.,-]/g, "");

        const match =
          (inv.clientName || "").toLowerCase().includes(normalizedSearch) ||
          (inv.invoiceNumber || "").toLowerCase().includes(normalizedSearch) ||
          totalStr.includes(normalizedSearch);

        if (!match) return false;
      }

      return true;
    });

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

  const getStatusClass = (status?: string) => {
    switch (status) {
      case "sent":
        return "status-sent";
      case "paid":
        return "status-paid";
      case "draft":
      default:
        return "status-draft";
    }
  };

  const handleBackDashboard = () => router.push("/dashboard");

  const handleCreateInvoice = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("editInvoiceId");
      localStorage.removeItem("invoiceClientId");
    }
    router.push("/dashboard/invoices/create");
  };

  const handleEdit = (id: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("editInvoiceId", id);
    }
    router.push("/dashboard/invoices/create");
  };

  const handleDelete = async (id: string) => {
    const msg = tInvList.messages?.confirmDelete ?? "Delete this invoice?";
    if (!window.confirm(msg)) return;
    if (!user || deletingId) return;

    try {
      setDeletingId(id);
      await deleteDoc(doc(db, "users", user.uid, "invoices", id));
    } catch (e) {
      console.error("Delete failed:", e);
      alert(tInvList.messages?.deleteFailed ?? "❌ Failed to delete invoice");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = async (id: string, withBranding: boolean) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv || pdfLoadingId) return;

    try {
      setPdfLoadingId(id);

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
        body: [[inv.invoiceNumber || "—", inv.invoiceDate || "—", inv.dueDate || "—", inv.status || "draft"]],
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
        docPDF.text("Note:", 14, yCursor);
        docPDF.text(String(inv.note), 14, yCursor + 6, { maxWidth: 180 });
        yCursor += 18;
      }

      if (inv.signatures?.business) {
        const businessImage = isLikelyRemoteUrl(inv.signatures.business)
          ? await imageUrlToDataUrl(inv.signatures.business)
          : inv.signatures.business;

        docPDF.addImage(businessImage, "PNG", 14, yCursor, 60, 20);
        docPDF.text("Business Signature", 14, yCursor + 32);
        docPDF.text("_________________________", 14, yCursor + 25);
        if (inv.signatures.businessDate) {
          docPDF.text(`Date: ${inv.signatures.businessDate}`, 14, yCursor + 38);
        }
      }

      if (inv.signatures?.client) {
        const clientImage = isLikelyRemoteUrl(inv.signatures.client)
          ? await imageUrlToDataUrl(inv.signatures.client)
          : inv.signatures.client;

        docPDF.addImage(clientImage, "PNG", 120, yCursor, 60, 20);
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
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert(tInvList.messages?.pdfFailed ?? "❌ Failed to generate PDF");
    } finally {
      setPdfLoadingId(null);
    }
  };

  if (loading) {
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
        <h1 className="invoice-title">{label(tInvList.title, "Saved Invoices")}</h1>

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

  <label htmlFor="fromDate">
    <span>{label(tInvList.filters?.from, "From")}</span>
    <input
      id="fromDate"
      name="fromDate"
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
    />
  </label>

  <label htmlFor="toDate">
    <span>{label(tInvList.filters?.to, "To")}</span>
    <input
      id="toDate"
      name="toDate"
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
    />
  </label>

  <label htmlFor="statusFilter">
    <span>{label(tInvList.filters?.status, "Status")}</span>
    <select
      id="statusFilter"
      name="statusFilter"
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
    >
      <option value="all">{tInvList.statusOptions?.all ?? "all"}</option>
      <option value="draft">{tInvList.statusOptions?.draft ?? "draft"}</option>
      <option value="sent">{tInvList.statusOptions?.sent ?? "sent"}</option>
      <option value="paid">{tInvList.statusOptions?.paid ?? "paid"}</option>
    </select>
  </label>

  <label className="filters-grow" htmlFor="search">
    <span>{label(tInvList.filters?.search, "Search")}</span>
    <input
      id="search"
      name="search"
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder={
        tInvList.filters?.searchPlaceholder ??
        "Search client / Invoice # / amount"
      }
    />
  </label>

  <label htmlFor="sortBy">
    <span>{label(tInvList.filters?.sortBy, "Sort by")}</span>
    <select
      id="sortBy"
      name="sortBy"
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
    >
      <option value="invoiceNumber_desc">
        {tInvList.sortOptions?.invoiceNumberDesc ?? "Invoice # (new)"}
      </option>
      <option value="invoiceNumber_asc">
        {tInvList.sortOptions?.invoiceNumberAsc ?? "Invoice # (old)"}
      </option>
      <option value="date_desc">
        {tInvList.sortOptions?.dateDesc ?? "Date (new)"}
      </option>
      <option value="date_asc">
        {tInvList.sortOptions?.dateAsc ?? "Date (old)"}
      </option>
      <option value="amount_desc">
        {tInvList.sortOptions?.amountDesc ?? "Amount ↓"}
      </option>
      <option value="amount_asc">
        {tInvList.sortOptions?.amountAsc ?? "Amount ↑"}
      </option>
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
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="invoices-table-empty">
                      {tInvList.messages?.noInvoices ?? "No invoices found."}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td data-label={label(tInvList.table?.invoiceNumber, "Invoice #")}>
                        {inv.invoiceNumber || "—"}
                      </td>
                      <td data-label={label(tInvList.table?.client, "Client")}>
                        {inv.clientName || "—"}
                      </td>
                      <td data-label={label(tInvList.table?.status, "Status")}>
                        <span className={`status-badge ${getStatusClass(inv.status)}`}>
                          {prettyStatus(inv.status)}
                        </span>
                      </td>
                      <td data-label={label(tInvList.table?.date, "Date")}>{inv.invoiceDate || "—"}</td>
                      <td data-label={label(tInvList.table?.total, "Total")}>
                        €{(Number(inv.grandTotal ?? 0) || 0).toFixed(2)}
                      </td>
                      <td
                        data-label={label(tInvList.table?.actions, "Actions")}
                        className="invoices-actions"
                      >
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleEdit(inv.id)}
                        >
                          {tInvList.actions?.edit ?? "Edit"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(inv.id)}
                          disabled={deletingId === inv.id}
                        >
                          {deletingId === inv.id
                            ? "Deleting..."
                            : (tInvList.actions?.delete ?? "Delete")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDownloadPdf(inv.id, true)}
                          disabled={pdfLoadingId === inv.id}
                        >
                          {pdfLoadingId === inv.id
                            ? "Preparing..."
                            : (tInvList.actions?.pdf ?? "PDF")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDownloadPdf(inv.id, false)}
                          disabled={pdfLoadingId === inv.id}
                        >
                          {pdfLoadingId === inv.id
                            ? "Preparing..."
                            : (tInvList.actions?.pdfPro ?? "PRO PDF without branding")}
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
