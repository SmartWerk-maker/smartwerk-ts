"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  type DocumentData,
} from "firebase/firestore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./list.css";

// ---- TYPES ----
type ClientStatus = "Active" | "Prospect" | "Inactive";
type ClientStatusFilter = ClientStatus | "all";

interface ClientDoc {
  id: string;
  clientId?: string;
  clientName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  status?: ClientStatus;
  kvk?: string;
  vatNumber?: string;
  paymentTerm?: string;
  currency?: string;
  tags?: string[];
  notes?: string;
}

interface ClientsListI18n {
  listTitle?: string;
  listSubtitle?: string;
  kpi?: {
    active?: string;
    prospect?: string;
    inactive?: string;
    total?: string;
  };
  filters?: {
    searchPlaceholder?: string;
    allStatuses?: string;
    statusActive?: string;
    statusProspect?: string;
    statusInactive?: string;
  };
  table?: {
    clientId?: string;
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    country?: string;
    actions?: string;
  };
  actions?: {
    newClient?: string;
    backToDashboard?: string;
    refresh?: string;
    invoice?: string;
    quote?: string;
    reminder?: string;
    edit?: string;
    delete?: string;
    pdf?: string;
    pdfPro?: string;
  };
  messages?: {
    loading?: string;
    loadError?: string;
    noClients?: string;
    synced?: string;
    deleteConfirm?: string;
    deleteSuccess?: string;
    clientNotFound?: string;
  };
  pdf?: {
    titleBrand?: string;
    titleBasic?: string;
    footer?: string;
  };
}

// ---- COMPONENT ----

export default function ClientsListClient() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  const t: ClientsListI18n = (tRoot?.clientsList ?? {}) as ClientsListI18n;

  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ClientStatusFilter>("all");
  const [toast, setToast] = useState<{
    
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const countryMap: Record<string, string> = {
  nl: "🇳🇱 Netherlands",
  be: "🇧🇪 Belgium",
  de: "🇩🇪 Germany",
  fr: "🇫🇷 France",
  es: "🇪🇸 Spain",
  pl: "🇵🇱 Poland",
  uk: "🇬🇧 United Kingdom",
};

  const label = (fallback: string | undefined, def: string) =>
    fallback ?? def;

  // ---- TOAST HELPERS ----
  const showToast = useCallback(
    (type: "ok" | "error", text: string) => {
      setToast({ type, text });
      setTimeout(() => setToast(null), 2500);
    },
    []
  );

  // ---- AUTH ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }
      setUser(firebaseUser);
    });
    return () => unsub();
  }, [router]);

  // ---- LOAD CLIENTS ----
  const loadClients = useCallback(
    async (uid: string, showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError(null);

      try {
        const snap = await getDocs(collection(db, "users", uid, "clients"));
        const arr: ClientDoc[] = [];
        snap.forEach((d) => {
          const data = d.data() as DocumentData;
          arr.push({
            id: d.id,
            ...data,
          });
        });
        setClients(arr);
        if (!showSpinner) {
          showToast("ok", t.messages?.synced ?? "Synced with cloud");
          }
      } catch (e) {
        console.error("Load clients error:", e);
        const msg = t.messages?.loadError ?? "Error loading clients.";
        setError(msg);
        showToast("error", msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast, t.messages]
  );

  useEffect(() => {
    if (!user) return;
    void loadClients(user.uid, true);
  }, [user, loadClients]);

  // ---- FILTERED + KPI ----
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter((c) => {
      const matchesQuery =
        (c.clientName ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.country ?? "").toLowerCase().includes(q) ||
        (c.clientId ?? "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" || c.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const kpis = useMemo(() => {
    const total = filteredClients.length;
    const active = filteredClients.filter(
      (c) => c.status === "Active"
    ).length;
    const prospect = filteredClients.filter(
      (c) => c.status === "Prospect"
    ).length;
    const inactive = filteredClients.filter(
      (c) => c.status === "Inactive"
    ).length;
    return { total, active, prospect, inactive };
  }, [filteredClients]);

  const chartData = useMemo(
    () => [
      { status: t.kpi?.active ?? "Active", value: kpis.active },
      { status: t.kpi?.prospect ?? "Prospect", value: kpis.prospect },
      { status: t.kpi?.inactive ?? "Inactive", value: kpis.inactive },
    ],
    [kpis.active, kpis.prospect, kpis.inactive, t.kpi]
  );

  // ---- ACTIONS ----

  function handleNewClient() {
    router.push("/dashboard/clients/create");
  }

  function handleBackDashboard() {
    router.push("/dashboard");
  }

  function handleRefresh() {
    if (!user) return;
    setRefreshing(true);
    void loadClients(user.uid, false);
  }

  function withClient(id: string, cb: (c: ClientDoc) => void) {
    const c = clients.find((x) => x.id === id);
    if (!c) {
      alert(t.messages?.clientNotFound ?? "Client not found.");
      return;
    }
    cb(c);
  }

  function storeSelectedClient(c: ClientDoc) {
    if (typeof window === "undefined") return;
    const payload = {
      clientId: c.clientId,
      clientName: c.clientName,
      contactPerson: c.contactPerson ?? "",
      email: c.email,
      phone: c.phone,
      address: c.address,
      country: c.country,
      kvk: c.kvk,
      vatNumber: c.vatNumber,
      paymentTerm: c.paymentTerm,
      currency: c.currency,
    };
    window.localStorage.setItem("selectedClient", JSON.stringify(payload));
  }

  function handleCreateInvoice(id: string) {
    withClient(id, (c) => {
      storeSelectedClient(c);
      router.push("/dashboard/invoices/create");
    });
  }

  function handleCreateQuote(id: string) {
    withClient(id, (c) => {
      storeSelectedClient(c);
      router.push("/dashboard/quotes/create");
    });
  }

  function handleCreateReminder(id: string) {
    withClient(id, (c) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "selectedClient",
          JSON.stringify({
            clientId: c.clientId,
            clientName: c.clientName,
            email: c.email,
            address: c.address,
          })
        );
      }
      router.push("/dashboard/reminders/create");
    });
  }

  function handleEditClient(id: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("editClientId", id);
    }
    router.push("/dashboard/clients/create");
  }

  async function handleDeleteClient(id: string) {
    if (!user) return;
    const confirmText =
      t.messages?.deleteConfirm ??
      "Delete this client? This cannot be undone.";
    if (!window.confirm(confirmText)) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "clients", id));
      setClients((prev) => prev.filter((c) => c.id !== id));
      showToast("ok", t.messages?.deleteSuccess ?? "Client deleted.");
    } catch (e) {
      console.error("Delete client error:", e);
      showToast("error", t.messages?.loadError ?? "Error deleting client.");
    }
  }

  async function handleExportPdf(id: string, withBranding: boolean) {
  withClient(id, async (c) => {
    try {
      const jsPDF = (await import("jspdf")).jsPDF;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");
      const blue: [number, number, number] = [59, 130, 246];

      if (withBranding) {
  doc.setFillColor(...blue);
  doc.rect(0, 0, 210, 25, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18).text("SmartWerk — Client Summary", 15, 17);
} else {
  doc.setFontSize(18).text("Client Summary", 15, 17);
}

      const rows = [
        ["Client ID", c.clientId ?? ""],
        ["Name / Company", c.clientName ?? ""],
        ["Email", c.email ?? ""],
        ["Phone", c.phone ?? ""],
        ["Status", c.status ?? ""],
        ["Country", c.country ?? ""],
        ["KvK", c.kvk ?? ""],
        ["VAT", c.vatNumber ?? ""],
        ["Tags", (c.tags ?? []).join(", ")],
        ["Notes", c.notes ?? ""],
      ];

      autoTable(doc, {
        startY: 35,
        head: [["Field", "Value"]],
        body: rows,
        theme: "grid",
        headStyles: {
          fillColor: withBranding ? blue : [180, 180, 180],
          textColor: 255,
        },
        styles: { fontSize: 10, cellPadding: 4, overflow: "linebreak" },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      if (withBranding) {
        doc
          .setFontSize(9)
          .setTextColor(100)
          .text("Generated by SmartWerk © 2025", 14, 290);
      }

      const filename = withBranding
        ? `SmartWerk_Client_${c.clientId ?? "info"}.pdf`
        : `Client_${c.clientId ?? "info"}_PRO.pdf`;

      doc.save(filename);
      showToast("ok", withBranding ? "PDF exported" : "PRO PDF exported");
    } catch (e) {
      console.error("PDF export error:", e);
      showToast("error", "Error exporting PDF.");
    }
  });
}

  if (!user && loading) {
    return (
      <div className="clients-loading">
        <div className="clients-loading-card">Loading clients…</div>
      </div>
    );
  }

  return (
    <main className="clients-page">
      <div className="clients-page-inner">
        {/* ===== HEADER ===== */}
        <header className="clients-header">
          <div className="clients-header-main">
            <h1 className="clients-title">
              {label(t.listTitle, "Saved Clients")}
            </h1>
            <p className="clients-subtitle">
              {label(
                t.listSubtitle,
                "Work with your clients, invoices and reminders from a single clean view."
              )}
            </p>

            <div className="clients-header-badge">
              <span className="clients-header-badge-dot" />
              <span className="clients-header-badge-label">
                {label(t.listTitle, "Saved Clients")}
              </span>
              <span className="clients-header-badge-meta">
                · {kpis.total} {kpis.total === 1 ? "client" : "clients"}
              </span>
            </div>
          </div>

          <div className="clients-header-actions">
            <Button
              type="button"
              onClick={handleNewClient}
              className="clients-btn-primary"
            >
              <span>➕</span>
              <span>{label(t.actions?.newClient, "New Client")}</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleBackDashboard}
              className="clients-btn-secondary"
            >
              <span>🏠</span>
              <span>{label(t.actions?.backToDashboard, "Dashboard")}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="clients-btn-outline"
            >
              <span>🔄</span>
              <span>{label(t.actions?.refresh, "Refresh")}</span>
            </Button>
            
          </div>
        </header>

        {/* ===== OVERVIEW: KPI + MINI-CHART ===== */}
        <Card className="clients-overview-card">
          <CardContent className="clients-overview-content">
            <div className="clients-kpi-grid">
              {[
                { label: label(t.kpi?.active, "Active"), value: kpis.active },
                {
                  label: label(t.kpi?.prospect, "Prospect"),
                  value: kpis.prospect,
                },
                {
                  label: label(t.kpi?.inactive, "Inactive"),
                  value: kpis.inactive,
                },
                { label: label(t.kpi?.total, "Total"), value: kpis.total },
              ].map((item) => (
                <div key={item.label} className="clients-kpi">
                  <div className="clients-kpi-label">{item.label}</div>
                  <div
                 className={`clients-kpi-value ${
                 item.label === "Active"
                   ? "clients-kpi-active"
                  : item.label === "Prospect"
                   ? "clients-kpi-prospect"
                  : item.label === "Inactive"
                  ? "clients-kpi-inactive"
                   : ""
                    }`}
                      >
                        {item.value}
                    </div>
                  
                </div>
              ))}
            </div>

            <div className="clients-chart">
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={chartData}>
      <XAxis dataKey="status" tickLine={false} axisLine={false} />
      <YAxis
        allowDecimals={false}
        tickLine={false}
        axisLine={false}
        width={24}
      />
      <Tooltip />
      <Bar dataKey="value" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
</div>
          </CardContent>
        </Card>

        {/* ===== FILTERS ===== */}
        <section className="clients-filters-row">
          <div className="clients-filters-left">
            <div className="clients-search-wrap">
              <Input
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                placeholder={
                  t.filters?.searchPlaceholder ??
                  "Search by name, email, ID or country…"
                }
                className="clients-search-input"
              />
              <span className="clients-search-icon">🔍</span>
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) =>
                setStatusFilter(val as ClientStatusFilter)
              }
            >
              <SelectTrigger className="clients-status-trigger">
                <SelectValue
                  placeholder={label(
                    t.filters?.allStatuses,
                    "All Statuses"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {label(t.filters?.allStatuses, "All Statuses")}
                </SelectItem>
                <SelectItem value="Active">
                  {label(t.filters?.statusActive, "Active")}
                </SelectItem>
                <SelectItem value="Prospect">
                  {label(t.filters?.statusProspect, "Prospect")}
                </SelectItem>
                <SelectItem value="Inactive">
                  {label(t.filters?.statusInactive, "Inactive")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="clients-filters-right">
            <span className="clients-result-meta">
              Showing{" "}
              <span className="clients-result-number">
                {filteredClients.length}
              </span>{" "}
              of{" "}
              <span className="clients-result-number">
                {clients.length}
              </span>{" "}
              clients
            </span>

            {statusFilter !== "all" && (
              <span className="clients-filter-pill">
                <span className="clients-filter-pill-dot" />
                Filter:{" "}
                <span className="clients-filter-pill-label">
                  {statusFilter}
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="clients-filter-pill-clear"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </section>

        {/* ===== TABLE ===== */}
       
          <div className="clients-mobile-list">
  {filteredClients.map((c) => (
    <div
      key={c.id}
      className="client-card"
      onClick={() => handleEditClient(c.id)}
    >
      <div className="client-card-title">{c.clientName}</div>
      <div className="client-card-meta">{c.email}</div>

      <div className="client-card-footer">
  <div className="client-card-left"></div>
  <div className="client-card-actions">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        className="client-card-menu-btn"
        onClick={(e) => e.stopPropagation()}
      >
        ⋯
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleCreateInvoice(c.id);
        }}
      >
        📄 Invoice
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleCreateQuote(c.id);
        }}
      >
        💼 Quote
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleCreateReminder(c.id);
        }}
      >
        📬 Reminder
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleExportPdf(c.id, true);
        }}
      >
        📄 PDF
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleExportPdf(c.id, false);
        }}
      >
        💎 PRO PDF
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleEditClient(c.id);
        }}
      >
        ✏️ Edit
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteClient(c.id);
        }}
      >
        🗑 Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
        <span
  className={[
    "clients-status-badge",
    c.status === "Active" && "clients-status-badge--active",
    c.status === "Prospect" && "clients-status-badge--prospect",
    c.status === "Inactive" && "clients-status-badge--inactive",
  ]
    .filter(Boolean)
    .join(" ")}
>
  {c.status}
</span>
        <span>{countryMap[c.country ?? ""] ?? c.country}</span>
      </div>
    </div>
  ))}
</div>
 <section className="clients-table-section">
          <Card className="clients-table-card">
            <CardHeader className="clients-table-header">
              <div>
                <CardTitle className="clients-table-title">
              {label(t.listTitle, "Clients")}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="clients-table-content">
              {loading ? (
                <div className="clients-table-empty">
                  {label(t.messages?.loading, "Loading clients…")}
                </div>
              ) : error ? (
                <div className="clients-table-error">
                  {error}
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="clients-empty">
                 <div>🚀 No clients yet</div>
                   <div>Create your first client to start invoicing</div>
                </div>
              ) : (
                <div className="clients-table-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="clients-col-id">
                          {label(t.table?.clientId, "Client ID")}
                        </TableHead>
                        <TableHead>
                          {label(t.table?.name, "Name / Company")}
                        </TableHead>
                        <TableHead>
                          {label(t.table?.email, "Email")}
                        </TableHead>
                        <TableHead>
                          {label(t.table?.phone, "Phone")}
                        </TableHead>
                        <TableHead className="clients-col-status">
                          {label(t.table?.status, "Status")}
                        </TableHead>
                        <TableHead className="clients-col-country">
                          {label(t.table?.country, "Country")}
                        </TableHead>
                        <TableHead className="clients-col-actions">
                          {label(t.table?.actions, "Actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredClients.map((c) => (
                        <TableRow
                          key={c.id}
                          className="clients-row"
                          onClick={() => handleEditClient(c.id)}
                        >
                          <TableCell className="clients-cell-id">
                            {c.clientId ?? "—"}
                          </TableCell>
                          <TableCell className="clients-cell-text">
                            {c.clientName ?? ""}
                          </TableCell>
                          <TableCell className="clients-cell-text">
                            {c.email ?? ""}
                          </TableCell>
                          <TableCell className="clients-cell-text">
                            {c.phone ?? ""}
                          </TableCell>

                          <TableCell>
                            <span
                              className={[
                                "clients-status-badge",
                                c.status === "Active" &&
                                  "clients-status-badge--active",
                                c.status === "Prospect" &&
                                  "clients-status-badge--prospect",
                                c.status === "Inactive" &&
                                  "clients-status-badge--inactive",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <span className="clients-status-dot" />
                              {c.status}
                            </span>
                          </TableCell>

                          <TableCell className="clients-cell-text">
                            {countryMap[c.country ?? ""] ?? c.country}
                          </TableCell>

                          <TableCell className="clients-cell-actions">
                           <div className="clients-actions">
  {/* PRIMARY ACTIONS */}
  <Button
    size="sm"
    variant="secondary"
    className="clients-action-btn"
    onClick={(e) => {
      e.stopPropagation();
      handleCreateInvoice(c.id);
    }}
  >
    📄 <span>Invoice</span>
  </Button>

  <Button
    size="sm"
    variant="outline"
    className="clients-action-btn"
    onClick={(e) => {
      e.stopPropagation();
      handleEditClient(c.id);
    }}
  >
    ✏️ <span>Edit</span>
  </Button>

  <Button
    size="sm"
    variant="destructive"
    className="clients-action-btn"
    onClick={(e) => {
      e.stopPropagation();
      void handleDeleteClient(c.id);
    }}
  >
    🗑 <span>Delete</span>
  </Button>

  {/* DROPDOWN */}
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        size="sm"
        variant="ghost"
        className="clients-action-btn"
        onClick={(e) => e.stopPropagation()}
      >
        ⋯
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end">
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleCreateQuote(c.id);
        }}
      >
        💼 Quote
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleCreateReminder(c.id);
        }}
      >
        📬 Reminder
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleExportPdf(c.id, true);
        }}
      >
        📄 PDF
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handleExportPdf(c.id, false);
        }}
      >
        💎 PRO PDF
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
                            
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ===== TOAST ===== */}
        {toast && (
          <div
            className={
              toast.type === "error"
                ? "clients-toast clients-toast--error"
                : "clients-toast clients-toast--ok"
            }
          >
            {toast.text}
          </div>
        )}
      </div>
    </main>
  );
}