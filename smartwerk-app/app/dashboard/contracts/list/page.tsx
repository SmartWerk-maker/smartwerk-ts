"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import Chart from "chart.js/auto";

import { auth, db } from "@/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";
import { generateContractPdf } from "@/lib/utils/contracts/generateContractPdf";
import type { ContractPdfData } from "@/lib/utils/contracts/types";
import type { ContractStatus } from "../create/types";

import "./contract-list.css";

/* ================= TYPES ================= */

interface ContractRow {
  id: string;
  contractId: string;
  status: ContractStatus;
  date: string;
  clientName: string;
  projectTitle: string;

  businessSnapshot?: ContractPdfData["business"];
  client?: ContractPdfData["client"];
  project?: ContractPdfData["project"];
  signatures?: ContractPdfData["signatures"];
}

/* ================= HELPERS ================= */

function normalizeRow(
  id: string,
  d: DocumentData
): ContractRow {
  return {
    id,
    contractId: d.contractId ?? "-",
    status:
      d.status === "draft" || d.status === "signed" || d.status === "completed"
        ? d.status
        : "draft",
    date: d.date ?? "-",
    clientName: d.clientName ?? "-",
    projectTitle: d.projectTitle ?? "-",
    businessSnapshot: d.businessSnapshot,
    client: d.client,
    project: d.project,
    signatures: d.signatures,
  };
}

/* ================= PAGE ================= */

export default function ContractListPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  const t = (tRoot?.contractsList ?? {}) as {
    title?: string;
    actions?: {
      new?: string;
      back?: string;
      edit?: string;
      delete?: string;
      pdf?: string;
    };
    fields?: {
      search?: string;
      allStatuses?: string;
      contractId?: string;
      client?: string;
      project?: string;
      status?: string;
      date?: string;
      actions?: string;
    };
    statuses?: Partial<Record<ContractStatus, string>>;
    empty?: string;
    confirmDelete?: string;
  };

  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ContractStatus>("");

  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  /* ========== AUTH + LOAD ========== */
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const ref = collection(db, "users", user.uid, "contracts");

      unsubscribeSnapshot = onSnapshot(
        ref,
        (snap: QuerySnapshot<DocumentData>) => {
          const list = snap.docs.map((d) =>
            normalizeRow(d.id, d.data())
          );
          setContracts(list);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSnapshot?.();
    };
  }, [router]);

  /* ========== FILTER ========== */
  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return contracts.filter((c) => {
      const matchText =
        c.contractId.toLowerCase().includes(term) ||
        c.clientName.toLowerCase().includes(term) ||
        c.projectTitle.toLowerCase().includes(term);

      const matchStatus = !status || c.status === status;
      return matchText && matchStatus;
    });
  }, [contracts, search, status]);

  /* ========== CHART ========== */
  useEffect(() => {
    if (!chartRef.current) return;

    if (contracts.length === 0) {
      chartInstance.current?.destroy();
      return;
    }

    const counts: Record<ContractStatus, number> = {
      draft: 0,
      signed: 0,
      completed: 0,
    };

    contracts.forEach((c) => {
  if (c.status in counts) {
    counts[c.status]++;
  }
});

    chartInstance.current?.destroy();

    chartInstance.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(counts),
        datasets: [
          {
            data: Object.values(counts),
            backgroundColor: ["#64748b", "#22c55e", "#ef4444"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
      },
    });
  }, [contracts]);

  /* ========== ACTIONS ========== */

  function editContract(id: string) {
    localStorage.setItem("editContractId", id);
    router.push("/dashboard/contracts/create");
  }

  async function deleteContract(id: string) {
    if (!confirm(t.confirmDelete ?? "Delete this contract?")) return;
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "contracts", id));
  }

  /* ========== RENDER ========== */

  return (
    <main className="dash-main contracts-page">
      <div className="dash-content">
        {/* HEADER */}
        <div className="dash-topbar">
          <h1 className="dash-title">
            📋 {t.title ?? "Saved Contracts"}
          </h1>

          <div className="dash-topbar-right">
            <button
              className="top-tab"
              onClick={() =>
                router.push("/dashboard/contracts/create")
              }
            >
              ➕ {t.actions?.new ?? "New Contract"}
            </button>
            <button
              className="top-tab"
              onClick={() => router.push("/dashboard")}
            >
              🏠 {t.actions?.back ?? "Back to Dashboard"}
            </button>
          </div>
        </div>

        {/* CHART */}
        <div className="dash-card">
          <canvas ref={chartRef} />
        </div>

        {/* FILTERS */}
        <div className="dash-card search-bar">
          <input
            placeholder={t.fields?.search ?? "Search contracts..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ContractStatus | "")
            }
          >
            <option value="">
              {t.fields?.allStatuses ?? "All Statuses"}
            </option>
            {(["draft", "signed", "completed"] as ContractStatus[]).map((s) => (
              <option key={s} value={s}>
                {t.statuses?.[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        {/* TABLE */}
        <div className="dash-card">
          <table>
            <thead>
              <tr>
                <th>{t.fields?.contractId ?? "Contract ID"}</th>
                <th>{t.fields?.client ?? "Client"}</th>
                <th>{t.fields?.project ?? "Project"}</th>
                <th>{t.fields?.status ?? "Status"}</th>
                <th>{t.fields?.date ?? "Date"}</th>
                <th>{t.fields?.actions ?? "Actions"}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center" }}>
                    {t.empty ?? "No contracts found"}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>{c.contractId}</td>
                    <td>{c.clientName}</td>
                    <td>{c.projectTitle}</td>
                    <td>
                      <span className={`status ${c.status}`}>
                        {t.statuses?.[c.status] ?? c.status}
                      </span>
                    </td>
                    <td>{c.date}</td>
                    <td>
                      <button onClick={() => editContract(c.id)}>
                        ✏️ {t.actions?.edit ?? "Edit"}
                      </button>
                      <button
                        className="danger"
                        onClick={() => deleteContract(c.id)}
                      >
                        🗑 {t.actions?.delete ?? "Delete"}
                      </button>
                      <button
                        onClick={() =>
                          generateContractPdf({
                            contractId: c.contractId,
                            date: c.date,
                            status: c.status,
                            business: c.businessSnapshot ?? {
                              name: "",
                              kvk: "",
                              btw: "",
                              iban: "",
                              email: "",
                              phone: "",
                              address: "",
                            },
                            client: c.client ?? {
                              name: "",
                              email: "",
                              phone: "",
                              address: "",
                            },
                            project: c.project ?? {
                              title: "",
                              scope: "",
                              timeline: "",
                              paymentTerms: "",
                              legalTerms: "",
                            },
                            signatures: c.signatures ?? {
                               freelancer: "",
                               freelancerDate: "",
                            },
                          })
                        }
                      >
                        📄 {t.actions?.pdf ?? "PDF"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}