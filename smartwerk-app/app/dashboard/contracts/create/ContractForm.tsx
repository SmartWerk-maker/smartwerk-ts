"use client";

import React, { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ContractFormState, ContractStatus } from "./types";
import type { ClientDoc } from "../hooks/useContractsCreate";
import ContractSign from "./components/ContractSign";

/* ================= TYPES ================= */

export interface ContractsI18nSection {
  createTitle?: string;

  sections?: {
    business?: string;
    client?: string;
    overview?: string;
    project?: string;
    terms?: string;
    signatures?: string;
    stamp?: string; // лишаємо в типі, але НЕ використовуємо
  };

  fields?: {
    contractId?: string;
    status?: string;
    date?: string;
    selectClient?: string;

    projectTitle?: string;
    scope?: string;
    timeline?: string;
    paymentTerms?: string;
    legalTerms?: string;

    name?: string;
    kvk?: string;
    btw?: string;
    iban?: string;
    phone?: string;
    email?: string;
    address?: string;

    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
  };

  placeholders?: {
    selectClient?: string;
    projectTitle?: string;
    unnamedClient?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
  };

  sign?: {
    freelancer?: string;
    date?: string;
    clear?: string;
  };

  actions?: {
    save?: string;
    saving?: string;
      backToDashboard?: string;
    list?: string;
  };

  validation?: {
    signaturesRequired?: string;
    mustBesigned?: string;
  };

  statuses?: Partial<Record<ContractStatus, string>>;
}

type Props = {
  form: ContractFormState;
  setForm: Dispatch<SetStateAction<ContractFormState>>;
  clients: ClientDoc[];
  loading: boolean;
  saving: boolean;
  error: string | null;

  onSelectClient: (clientId: string) => void;
  onSave: () => Promise<void>;

  t?: ContractsI18nSection;
};

/* ================= UI HELPERS ================= */

function cx(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={cx(
        "inline-block transition-transform duration-200",
        open ? "rotate-180" : "rotate-0"
      )}
      aria-hidden
    >
      ▾
    </span>
  );
}

function Section({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {icon ? <span className="text-lg">{icon}</span> : null}
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          <Chevron open={open} />
        </div>
      </button>

      {open ? <div className="px-5 pb-5">{children}</div> : null}
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none",
        "focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
        "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900",
        props.className
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none",
        "focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
        "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900",
        props.className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none",
        "focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
        "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-900",
        props.className
      )}
    />
  );
}

/* ================= COMPONENT ================= */

export default function ContractForm({
  form,
  setForm,
  clients,
  loading,
  saving,
  error,
  onSelectClient,
  onSave,
  t,
}: Props) {
  const isEditable = form.status === "draft";

  /* ================= i18n ================= */

  const tr = useMemo(() => {
    const fallback: Record<string, string> = {
      "title.business": "Business Info",
      "title.client": "Client Info",
      "title.overview": "Contract Overview",
      "title.project": "Project Details",
      "title.terms": "Legal Terms",
      "title.signatures": "Signatures",

      "label.contractId": "Contract ID",
      "label.status": "Status",
      "label.date": "Date",
      "label.selectClient": "Select Client",

      "placeholder.selectClient": "Select a client…",
      "placeholder.projectTitle": "e.g. Website redesign project",
      "placeholder.unnamedClient": "Unnamed client",
      "placeholder.clientName": "Client name",
      "placeholder.clientEmail": "Client email",
      "placeholder.clientPhone": "Client phone",
      "placeholder.clientAddress": "Client address",

      "label.projectTitle": "Project Title",
      "label.scope": "Scope of Work",
      "label.timeline": "Timeline",
      "label.paymentTerms": "Payment Terms",
      "label.legalTerms": "Legal Terms",

      "label.name": "Name",
      "label.kvk": "KVK",
      "label.btw": "BTW",
      "label.iban": "IBAN",
      "label.phone": "Phone",
      "label.email": "Email",
      "label.address": "Address",

      "label.clientName": "Client Name",
      "label.clientEmail": "Email",
      "label.clientPhone": "Phone",
      "label.clientAddress": "Address",

      "btn.save": "Save Contract",
      "btn.saving": "Saving…",

      "text.loading": "Loading contract data…",
      "text.noBusiness": "No business data found in profile.",

      "sign.freelancer": "Freelancer",
      "sign.date": "Date",
      "sign.clear": "Clear",

      "validation.signaturesRequired":
        "Freelancer signature is required before signing the contract.",
      "validation.mustBeSigned":
        "Contract must be Signed before it can be Completed.",
    };

    const dict = t;

    const get = (key: string): string | undefined => {
      switch (key) {
        case "title.business":
          return dict?.sections?.business;
        case "title.client":
          return dict?.sections?.client;
        case "title.overview":
          return dict?.sections?.overview;
        case "title.project":
          return dict?.sections?.project;
        case "title.terms":
          return dict?.sections?.terms;
        case "title.signatures":
          return dict?.sections?.signatures;

        case "label.contractId":
          return dict?.fields?.contractId;
        case "label.status":
          return dict?.fields?.status;
        case "label.date":
          return dict?.fields?.date;
        case "label.selectClient":
          return dict?.fields?.selectClient;

        case "label.projectTitle":
          return dict?.fields?.projectTitle;
        case "label.scope":
          return dict?.fields?.scope;
        case "label.timeline":
          return dict?.fields?.timeline;
        case "label.paymentTerms":
          return dict?.fields?.paymentTerms;
        case "label.legalTerms":
          return dict?.fields?.legalTerms;

        case "label.name":
          return dict?.fields?.name;
        case "label.kvk":
          return dict?.fields?.kvk;
        case "label.btw":
          return dict?.fields?.btw;
        case "label.iban":
          return dict?.fields?.iban;
        case "label.phone":
          return dict?.fields?.phone;
        case "label.email":
          return dict?.fields?.email;
        case "label.address":
          return dict?.fields?.address;

        case "label.clientName":
          return dict?.fields?.clientName;
        case "label.clientEmail":
          return dict?.fields?.clientEmail;
        case "label.clientPhone":
          return dict?.fields?.clientPhone;
        case "label.clientAddress":
          return dict?.fields?.clientAddress;

        case "placeholder.selectClient":
          return dict?.placeholders?.selectClient;
        case "placeholder.projectTitle":
          return dict?.placeholders?.projectTitle;
        case "placeholder.unnamedClient":
          return dict?.placeholders?.unnamedClient;
        case "placeholder.clientName":
          return dict?.placeholders?.clientName;
        case "placeholder.clientEmail":
          return dict?.placeholders?.clientEmail;
        case "placeholder.clientPhone":
          return dict?.placeholders?.clientPhone;
        case "placeholder.clientAddress":
          return dict?.placeholders?.clientAddress;

        case "sign.freelancer":
          return dict?.sign?.freelancer;
        case "sign.date":
          return dict?.sign?.date;
        case "sign.clear":
          return dict?.sign?.clear;

        case "btn.save":
          return dict?.actions?.save;
        case "btn.saving":
          return dict?.actions?.saving;

        case "validation.signaturesRequired":
          return dict?.validation?.signaturesRequired;
        case "validation.mustBeSigned":
          return dict?.validation?.mustBesigned;

        default:
          return undefined;
      }
    };

    return (key: string) => get(key) ?? fallback[key] ?? key;
  }, [t]);

  /* ================= STATUS LOGIC ================= */

  function hasFreelancerSignature() {
    const s = form.signatures;
    return Boolean(s.freelancer && s.freelancerDate);
  }

  function canChangeStatus(next: ContractStatus) {
    if (next === "signed") {
      return hasFreelancerSignature();
    }
    if (next === "completed") {
      return form.status === "signed";
    }
    return true;
  }

  /* ================= ACCORDIONS ================= */

  const [openBusiness, setOpenBusiness] = useState(true);
  const [openClient, setOpenClient] = useState(true);

  /* ================= RENDER ================= */

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        {tr("text.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* BUSINESS */}
      <Section
        title={tr("title.business")}
        icon="🏢"
        open={openBusiness}
        onToggle={() => setOpenBusiness((v) => !v)}
      >
        {!form.businessSnapshot ? (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {tr("text.noBusiness")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>{tr("label.name")}</Label>
              <Input value={form.businessSnapshot.name} disabled />
            </div>
            <div>
              <Label>{tr("label.kvk")}</Label>
              <Input value={form.businessSnapshot.kvk} disabled />
            </div>
            <div>
              <Label>{tr("label.btw")}</Label>
              <Input value={form.businessSnapshot.btw} disabled />
            </div>
            <div>
              <Label>{tr("label.iban")}</Label>
              <Input value={form.businessSnapshot.iban} disabled />
            </div>
            <div>
              <Label>{tr("label.phone")}</Label>
              <Input value={form.businessSnapshot.phone} disabled />
            </div>
            <div>
              <Label>{tr("label.email")}</Label>
              <Input value={form.businessSnapshot.email} disabled />
            </div>
            <div className="md:col-span-2">
              <Label>{tr("label.address")}</Label>
              <Input value={form.businessSnapshot.address} disabled />
            </div>
          </div>
        )}
      </Section>

      {/* CLIENT */}
      <Section
        title={tr("title.client")}
        icon="👤"
        open={openClient}
        onToggle={() => setOpenClient((v) => !v)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>{tr("label.selectClient")}</Label>
            <Select
              value={form.client.id}
              onChange={(e) => onSelectClient(e.target.value)}
              disabled={!isEditable}
            >
              <option value="">{tr("placeholder.selectClient")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName ?? tr("placeholder.unnamedClient")}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>{tr("label.clientName")}</Label>
            <Input
              value={form.client.name}
              disabled
              placeholder={tr("placeholder.clientName")}
            />
          </div>

          <div className="md:col-span-2">
            <Label>{tr("label.clientEmail")}</Label>
            <Input
              value={form.client.email}
              disabled
              placeholder={tr("placeholder.clientEmail")}
            />
          </div>

          <div>
            <Label>{tr("label.clientPhone")}</Label>
            <Input
              value={form.client.phone}
              disabled
              placeholder={tr("placeholder.clientPhone")}
            />
          </div>

          <div>
            <Label>{tr("label.clientAddress")}</Label>
            <Input
              value={form.client.address}
              disabled
              placeholder={tr("placeholder.clientAddress")}
            />
          </div>
        </div>
      </Section>

      {/* OVERVIEW */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          📄 {tr("title.overview")}
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label>{tr("label.contractId")}</Label>
            <Input value={form.contractId} disabled />
          </div>

          <div>
            <Label>{tr("label.status")}</Label>
            <Select
              value={form.status}
              disabled={!isEditable}
              onChange={(e) => {
                const next = e.target.value as ContractStatus;

                if (!canChangeStatus(next)) {
                  alert(
                    next === "signed"
                      ? tr("validation.signaturesRequired")
                      : tr("validation.mustBeSigned")
                  );
                  return;
                }

                setForm((p) => ({ ...p, status: next }));
              }}
            >
              {(["draft", "signed", "completed"] as ContractStatus[]).map((s) => (
                <option key={s} value={s}>
                  {t?.statuses?.[s] ?? s}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>{tr("label.date")}</Label>
            <Input
              type="date"
              value={form.date}
              disabled={!isEditable}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>

          <div className="md:col-span-3">
            <Label>{tr("label.projectTitle")}</Label>
            <Input
              placeholder={tr("placeholder.projectTitle")}
              value={form.project.title}
              disabled={!isEditable}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  project: { ...p.project, title: e.target.value },
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* PROJECT */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          🧩 {tr("title.project")}
        </h3>

        <div className="space-y-4">
          <div>
            <Label>{tr("label.scope")}</Label>
            <Textarea
              rows={4}
              value={form.project.scope}
              disabled={!isEditable}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  project: { ...p.project, scope: e.target.value },
                }))
              }
            />
          </div>

          <div>
            <Label>{tr("label.timeline")}</Label>
            <Textarea
              rows={3}
              value={form.project.timeline}
              disabled={!isEditable}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  project: { ...p.project, timeline: e.target.value },
                }))
              }
            />
          </div>

          <div>
            <Label>{tr("label.paymentTerms")}</Label>
            <Textarea
              rows={3}
              value={form.project.paymentTerms}
              disabled={!isEditable}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  project: { ...p.project, paymentTerms: e.target.value },
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* TERMS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          ⚖️ {tr("title.terms")}
        </h3>

        <Label>{tr("label.legalTerms")}</Label>
        <Textarea
          rows={5}
          value={form.project.legalTerms}
          disabled={!isEditable}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              project: { ...p.project, legalTerms: e.target.value },
            }))
          }
        />
      </section>

      {/* ERROR */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {/* SIGNATURES (тільки FREELANCER) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">
          ✍️ {tr("title.signatures")}
        </h3>

        <ContractSign
          label={tr("sign.freelancer")}
          t={{ date: tr("sign.date"), clear: tr("sign.clear") }}
          value={form.signatures.freelancer}
          date={form.signatures.freelancerDate}
          disabled={!isEditable}
          onChange={(data) =>
            setForm((p) => ({
              ...p,
              signatures: { ...p.signatures, freelancer: data },
            }))
          }
          onDateChange={(date) =>
            setForm((p) => ({
              ...p,
              signatures: { ...p.signatures, freelancerDate: date },
            }))
          }
        />
      </section>

      {/* ACTIONS */}
      <div className="contracts-actions">
        <button
          type="button"
          className="top-tab"
          onClick={onSave}
          disabled={saving || form.status === "completed"}
        >
          💾 {saving ? tr("btn.saving") : tr("btn.save")}
        </button>
      </div>
    </div>
  );
}