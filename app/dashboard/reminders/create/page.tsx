"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

// ✅ reuse invoice styles
import "../../invoices/create/invoice.css";

// ✅ signature component
import ContractSign from "@/app/dashboard/contracts/create/components/ContractSign";

import {
  ReminderFormState,
  ReminderStatus,
  ReminderType,
  createInitialReminderForm,
  todayISODate,
} from "./types";

// ==============================
// Types
// ==============================

type InvoiceLite = {
  id: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  grandTotalFormatted?: string;
  grandTotal?: number;

  clientName?: string;
  clientEmail?: string;
  clientAddress?: string;
};

type UserProfileDoc = {
  companyName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
};

export type RemindersI18nSection = {
  title?: string;

  actions?: {
    backToDashboard?: string;
    list?: string;
    save?: string;
    update?: string;
    saving?: string;

    aiFill?: string;
    aiDraft?: string;
    aiStrict?: string;
    aiFriendly?: string;

    clear?: string;
  };

  sections?: {
    business?: string;
    client?: string;
    linkedInvoice?: string;
    details?: string;
    message?: string;
    signatures?: string;
  };

  fields?: {
    businessName?: string;
    businessEmail?: string;
    businessAddress?: string;
    businessPhone?: string;

    clientName?: string;
    clientEmail?: string;
    clientAddress?: string;

    linkedInvoice?: string;
    selectInvoice?: string;

    invoiceDate?: string;
    dueDate?: string;
    invoiceAmount?: string;

    reminderId?: string;
    reminderDate?: string;
    status?: string;
    type?: string;
    amount?: string;

    messagePlaceholder?: string;

    signature?: string;
    business?: string;
    date?: string;
  };

  statusOptions?: {
    draft?: string;
    sent?: string;
    paid?: string;
  };

  typeOptions?: {
    first?: string;
    second?: string;
    final?: string;
  };

  messages?: {
    loading?: string;
    loadError?: string;
    authError?: string;
    saveFailed?: string;
    updated?: string;
    saved?: string;
  };

  // опціонально (якщо захочеш винести шаблони в i18n)
  aiTemplates?: {
    fill?: string;
    draft?: string;
    strict?: string;
    friendly?: string;
  };
};

// ==============================
// Helpers
// ==============================

const label = (value: string | undefined, fallback: string) => value ?? fallback;

function parseAmount(input: string): number {
  const cleaned = (input ?? "").replace(/[^\d,.\-]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatEUR(n: number): string {
  return "€" + (Number.isFinite(n) ? n : 0).toFixed(2);
}

// маленький “адаптер”, щоб не ламати вже існуючі ключі типу t.back / t.statusDraft
function pick<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((v) => v !== undefined);
}

export default function ReminderCreatePage() {
  const router = useRouter();

  // i18n
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  // ✅ типізований reminders (але також підтримуємо старі плоскі ключі)
  const t = (tRoot?.reminders ?? {}) as RemindersI18nSection & Record<string, unknown>;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState<ReminderFormState>(() => createInitialReminderForm());
  const [invoices, setInvoices] = useState<InvoiceLite[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.localStorage.getItem("editReminderId"));
  }, []);

  const [openBusiness, setOpenBusiness] = useState(true);
  const [openClient, setOpenClient] = useState(true);

  // AI templates: беремо з i18n якщо є, інакше дефолт
  const aiTemplates = useMemo(() => {
    const fallback = {
      fill:
        "Dear client,\n\nThis is a polite reminder that your invoice is overdue. Please arrange payment at your earliest convenience.\n\nBest regards,\nSmartWerk",
      draft:
        "We kindly remind you of your pending invoice. Please complete the payment before the due date.\n\nKind regards,\nSmartWerk",
      strict:
        "FINAL NOTICE: Your invoice is overdue. Please transfer the outstanding amount immediately.\n\nRegards,\nSmartWerk",
      friendly:
        "Hey! Just a friendly reminder 🙂 Don’t forget to complete your payment.\n\nThanks!",
    };

    return {
      fill: t.aiTemplates?.fill ?? fallback.fill,
      draft: t.aiTemplates?.draft ?? fallback.draft,
      strict: t.aiTemplates?.strict ?? fallback.strict,
      friendly: t.aiTemplates?.friendly ?? fallback.friendly,
    };
  }, [t.aiTemplates?.draft, t.aiTemplates?.fill, t.aiTemplates?.friendly, t.aiTemplates?.strict]);

  const generateReminderId = useCallback(async (uid: string) => {
    const ref = doc(db, "users", uid);
    const year = new Date().getFullYear();
    let result = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.exists() ? ((snap.data().lastReminderNumber as number) || 0) : 0;
      const next = last + 1;
      tx.set(ref, { lastReminderNumber: next }, { merge: true });
      result = `REM-${year}-${String(next).padStart(3, "0")}`;
    });

    return result;
  }, []);

  const loadProfile = useCallback(
    async (uid: string, userEmail?: string | null) => {
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) return;

      const p = snap.data() as UserProfileDoc;
      const address = [p.city, p.country].filter(Boolean).join(", ");

      setForm((prev) => ({
        ...prev,
        businessName: p.companyName ?? prev.businessName,
        email: (userEmail ?? p.email ?? prev.email) || "",
        businessPhone: p.phone ?? prev.businessPhone,
        businessAddress: address || prev.businessAddress,
      }));
    },
    []
  );

  const loadInvoices = useCallback(async (uid: string) => {
    const qRef = query(
      collection(db, "users", uid, "invoices"),
      orderBy("invoiceDate", "desc"),
      limit(300)
    );
    const snap = await getDocs(qRef);

    const list: InvoiceLite[] = snap.docs.map((d) => {
      const data = d.data() as Omit<InvoiceLite, "id">;
      return { ...data, id: d.id };
    });

    setInvoices(list);
  }, []);

  const autofillClientFromLocalStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("selectedClient");
    if (!raw) return;

    try {
      const c = JSON.parse(raw) as { clientName?: string; email?: string; address?: string };

      setForm((prev) => ({
        ...prev,
        clientName: c.clientName ?? prev.clientName,
        clientEmail: c.email ?? prev.clientEmail,
        clientAddress: c.address ?? prev.clientAddress,
      }));
    } catch {
      // ignore
    } finally {
      window.localStorage.removeItem("selectedClient");
    }
  }, []);

  const loadForEdit = useCallback(async (uid: string) => {
    if (typeof window === "undefined") return;
    const editId = window.localStorage.getItem("editReminderId");
    if (!editId) return;

    const snap = await getDoc(doc(db, "users", uid, "reminders", editId));
    if (!snap.exists()) {
      window.localStorage.removeItem("editReminderId");
      return;
    }

    const d = snap.data() as Partial<ReminderFormState>;

    setForm((prev) => ({
      ...prev,
      ...d,
      reminderId: d.reminderId ?? prev.reminderId,
      reminderDate: d.reminderDate ?? prev.reminderDate ?? todayISODate(),
      status: (d.status as ReminderStatus) ?? prev.status,
      type: (d.type as ReminderType) ?? prev.type,
      signature: {
        business: d.signature?.business ?? prev.signature.business,
        businessDate: d.signature?.businessDate ?? prev.signature.businessDate,
      },
    }));
  }, []);

  const logEvent = useCallback(async (uid: string, message: string) => {
    try {
      await addDoc(collection(db, "users", uid, "events"), {
        type: "Reminder",
        message,
        createdAt: serverTimestamp(),
      });
    } catch {
      // optional
    }
  }, []);

  // =============================
  // AUTH + INIT
  // =============================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      setUser(firebaseUser);
      setLoading(true);
      setError(null);

      try {
        setForm(createInitialReminderForm());

        await loadProfile(firebaseUser.uid, firebaseUser.email);
        await loadInvoices(firebaseUser.uid);

        // edit?
        await loadForEdit(firebaseUser.uid);

        // new → генеруємо id
        if (typeof window !== "undefined") {
          const editId = window.localStorage.getItem("editReminderId");
          if (!editId) {
            const id = await generateReminderId(firebaseUser.uid);
            setForm((p) => ({ ...p, reminderId: id }));
          }
        }

        autofillClientFromLocalStorage();
      } catch (e) {
        console.error(e);
        setError(label(t.messages?.loadError, "Failed to load reminder data"));
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, loadProfile, loadInvoices, loadForEdit, generateReminderId, autofillClientFromLocalStorage, t.messages?.loadError]);

  // =============================
  // Select invoice
  // =============================
  const onSelectInvoice = useCallback(
    (invoiceDocId: string) => {
      const inv = invoices.find((x) => x.id === invoiceDocId);
      setForm((prev) => {
        if (!inv) {
          return {
            ...prev,
            linkedInvoiceId: "",
            invoiceNumber: "",
            invoiceDate: "",
            dueDate: "",
            invoiceAmount: "",
          };
        }

        const amount =
          inv.grandTotalFormatted ??
          (typeof inv.grandTotal === "number" ? formatEUR(inv.grandTotal) : "");

        return {
          ...prev,
          linkedInvoiceId: invoiceDocId,
          invoiceNumber: inv.invoiceNumber ?? "",
          invoiceDate: inv.invoiceDate ?? "",
          dueDate: inv.dueDate ?? "",
          invoiceAmount: amount,

          clientName: inv.clientName ?? prev.clientName,
          clientEmail: inv.clientEmail ?? prev.clientEmail,
          clientAddress: inv.clientAddress ?? prev.clientAddress,

          amount: prev.amount || amount,
        };
      });
    },
    [invoices]
  );

  // =============================
  // Save
  // =============================
  const saveReminder = useCallback(async () => {
    if (!user) {
      setError(label(t.messages?.authError, "Not authenticated"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const uid = user.uid;
      const amountNum = parseAmount(form.amount || form.invoiceAmount);

      const payload: ReminderFormState = {
        ...form,
        amount: String(form.amount ?? ""),
        userId: uid,
            invoiceNumber: form.invoiceNumber || "",


       updatedAt: serverTimestamp(),
      };

      payload.invoiceAmount =
        payload.invoiceAmount || (Number.isFinite(amountNum) ? formatEUR(amountNum) : "");

      if (typeof window !== "undefined") {
        const editId = window.localStorage.getItem("editReminderId");

        const firestorePayload = {
          ...payload,
          amountNumber: amountNum,
          updatedAt: serverTimestamp(),
        };

        if (editId) {
  await setDoc(
    doc(db, "users", uid, "reminders", editId),
    firestorePayload,
    { merge: true }
  );
  await logEvent(uid, `Reminder ${payload.reminderId} updated`);
  alert(label(t.messages?.updated, "✅ Reminder updated"));
} else {
  await addDoc(
    collection(db, "users", uid, "reminders"),
    {
      ...firestorePayload,
      createdAt: serverTimestamp(),
    }
  );
  await logEvent(uid, `Reminder ${payload.reminderId} created`);
  alert(
    (t.messages?.saved ?? "✅ Reminder saved as") +
      ` ${payload.reminderId}`
  );
}


        window.localStorage.removeItem("editReminderId");
      }

      router.push("/dashboard/reminders/list");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : label(t.messages?.saveFailed, "Failed to save reminder"));
      alert("❌ " + label(t.messages?.saveFailed, "Save failed"));
    } finally {
      setSaving(false);
    }
  }, [user, form, router, logEvent, t.messages?.authError, t.messages?.saveFailed, t.messages?.saved, t.messages?.updated]);

  // =============================
  // UI handlers
  // =============================
  const setField = <K extends keyof ReminderFormState>(key: K, value: ReminderFormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleBackDashboard = () => router.push("/dashboard");
  const handleGoToList = () => router.push("/dashboard/reminders/list");

  if (loading) {
    return (
      <div className="clients-loading">
        <div className="clients-loading-card">
          {label(t.messages?.loading, "Loading reminder…")}
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <h1 className="invoice-title">
          {label(t.title, "Payment Reminder")}
        </h1>

        <div className="actions-right">
          <button className="btn" onClick={handleBackDashboard}>
            {label(
              pick(t.actions?.backToDashboard, t.back as string | undefined),
              "Back to Dashboard"
            )}
          </button>

          <button className="btn" onClick={handleGoToList}>
            {label(
              pick(t.actions?.list, t.list as string | undefined),
              "Saved Reminders"
            )}
          </button>
        </div>
      </header>

      <main className="dash-main invoice-page">
        <div className="dash-content invoice-content">
          {error && (
            <div style={{ padding: 12, border: "1px solid #fca5a5", borderRadius: 12 }}>
              ❌ {error}
            </div>
          )}

          <form>
            {/* Business Info */}
            <section className="collapsible">
              <button
                type="button"
                className="section-toggle"
                onClick={() => setOpenBusiness((v) => !v)}
              >
                <span>
                  {label(
                    pick(t.sections?.business, t.businessSection as string | undefined),
                    "🏢 Business Info"
                  )}
                </span>
                <span className="toggle-icon">{openBusiness ? "🔽" : "▶️"}</span>
              </button>

              <div className={`section-content ${openBusiness ? "open" : ""}`}>
                <label htmlFor="businessName">
                  {label(pick(t.fields?.businessName, t.businessName as string | undefined), "Business Name")}
                </label>
                <input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  placeholder={label(pick(t.fields?.businessName, t.businessName as string | undefined), "Full Name / Business Name")}
                  autoComplete="organization"
                />

                <label htmlFor="email">
                  {label(pick(t.fields?.businessEmail, t.email as string | undefined), "Business Email")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder={label(pick(t.fields?.businessEmail, t.email as string | undefined), "Business Email")}
                  autoComplete="email"
                />

                <label htmlFor="businessAddress">
                  {label(pick(t.fields?.businessAddress, t.address as string | undefined), "Business Address")}
                </label>
                <input
                  id="businessAddress"
                  value={form.businessAddress}
                  onChange={(e) => setField("businessAddress", e.target.value)}
                  placeholder={label(pick(t.fields?.businessAddress, t.address as string | undefined), "Business Address")}
                  autoComplete="street-address"
                />

                <label htmlFor="businessPhone">
                  {label(pick(t.fields?.businessPhone, t.phone as string | undefined), "Business Phone")}
                </label>
                <input
                  id="businessPhone"
                  value={form.businessPhone}
                  onChange={(e) => setField("businessPhone", e.target.value)}
                  placeholder={label(pick(t.fields?.businessPhone, t.phone as string | undefined), "Business Phone")}
                  autoComplete="tel"
                />
              </div>
            </section>

            {/* Client Info */}
            <section className="collapsible">
              <button
                type="button"
                className="section-toggle"
                onClick={() => setOpenClient((v) => !v)}
              >
                <span>
                  {label(
                    pick(t.sections?.client, t.clientSection as string | undefined),
                    "👤 Client Info"
                  )}
                </span>
                <span className="toggle-icon">{openClient ? "🔽" : "▶️"}</span>
              </button>

              <div className={`section-content ${openClient ? "open" : ""}`}>
                <label htmlFor="clientName">
                  {label(pick(t.fields?.clientName, t.clientName as string | undefined), "Client Name")}
                </label>
                <input
                  id="clientName"
                  value={form.clientName}
                  onChange={(e) => setField("clientName", e.target.value)}
                  placeholder={label(pick(t.fields?.clientName, t.clientName as string | undefined), "Client Name")}
                  autoComplete="organization"
                />

                <label htmlFor="clientEmail">
                  {label(pick(t.fields?.clientEmail, t.clientEmail as string | undefined), "Client Email")}
                </label>
                <input
                  id="clientEmail"
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => setField("clientEmail", e.target.value)}
                  placeholder={label(pick(t.fields?.clientEmail, t.clientEmail as string | undefined), "Client Email")}
                  autoComplete="email"
                />

                <label htmlFor="clientAddress">
                  {label(pick(t.fields?.clientAddress, t.clientAddress as string | undefined), "Client Address")}
                </label>
                <input
                  id="clientAddress"
                  value={form.clientAddress}
                  onChange={(e) => setField("clientAddress", e.target.value)}
                  placeholder={label(pick(t.fields?.clientAddress, t.clientAddress as string | undefined), "Client Address")}
                  autoComplete="street-address"
                />
              </div>
            </section>

            {/* Linked Invoice */}
            <section>
              <h2>
                {label(
                  pick(t.sections?.linkedInvoice, t.linkedInvoiceTitle as string | undefined),
                  "📑 Linked Invoice"
                )}
              </h2>

              <label htmlFor="linkedInvoiceId">
                {label(pick(t.fields?.linkedInvoice, t.linkedInvoice as string | undefined), "Select Invoice")}
              </label>

              <select
                id="linkedInvoiceId"
                value={form.linkedInvoiceId}
                onChange={(e) => onSelectInvoice(e.target.value)}
              >
                <option value="">
                  {label(pick(t.fields?.selectInvoice, t.selectInvoice as string | undefined), "— Select Invoice —")}
                </option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber || inv.id}
                  </option>
                ))}
              </select>

              <p>
                {label(pick(t.fields?.invoiceDate, t.invoiceDate as string | undefined), "Invoice Date")}:{" "}
                <strong>{form.invoiceDate || "—"}</strong>
              </p>
              <p>
                {label(pick(t.fields?.dueDate, t.dueDate as string | undefined), "Due Date")}:{" "}
                <strong>{form.dueDate || "—"}</strong>
              </p>
              <p>
                {label(pick(t.fields?.invoiceAmount, t.invoiceAmount as string | undefined), "Invoice Amount")}:{" "}
                <strong>{form.invoiceAmount || "—"}</strong>
              </p>
            </section>

            {/* Reminder Details */}
            <section>
              <h2>
                {label(pick(t.sections?.details, t.detailsTitle as string | undefined), "⏰ Reminder Details")}
              </h2>

              <label htmlFor="reminderId">
                {label(pick(t.fields?.reminderId, t.reminderId as string | undefined), "Reminder ID")}
              </label>
              <input id="reminderId" value={form.reminderId} readOnly />

              <label htmlFor="reminderDate">
                {label(pick(t.fields?.reminderDate, t.reminderDate as string | undefined), "Reminder Date")}
              </label>
              <input
                id="reminderDate"
                type="date"
                value={form.reminderDate}
                onChange={(e) => setField("reminderDate", e.target.value)}
              />

              <label htmlFor="status">
                {label(pick(t.fields?.status, t.status as string | undefined), "Status")}
              </label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setField("status", e.target.value as ReminderStatus)}
              >
                <option value="draft">
                  {label(pick(t.statusOptions?.draft, t.statusdraft as string | undefined), "draft")}
                </option>
                <option value="sent">
                  {label(pick(t.statusOptions?.sent, t.statussent as string | undefined), "sent")}
                </option>
                <option value="paid">
                  {label(pick(t.statusOptions?.paid, t.statuspaid as string | undefined), "paid")}
                </option>
              </select>

              <label htmlFor="type">
                {label(pick(t.fields?.type, t.type as string | undefined), "Type")}
              </label>
              <select
                id="type"
                value={form.type}
                onChange={(e) => setField("type", e.target.value as ReminderType)}
              >
                <option value="First Reminder">
                  {label(pick(t.typeOptions?.first, t.type1 as string | undefined), "First Reminder")}
                </option>
                <option value="Second Reminder">
                  {label(pick(t.typeOptions?.second, t.type2 as string | undefined), "Second Reminder")}
                </option>
                <option value="Final Reminder">
                  {label(pick(t.typeOptions?.final, t.typeFinal as string | undefined), "Final Reminder")}
                </option>
              </select>

              <label htmlFor="amount">
                {label(pick(t.fields?.amount, t.amount as string | undefined), "Amount")}
              </label>
              <input
                id="amount"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
                placeholder={form.invoiceAmount || "€0.00"}
              />
            </section>

            {/* Message */}
            <section>
              <h2>
                {label(pick(t.sections?.message, t.messageTitle as string | undefined), "💬 Message")}
              </h2>

              <textarea
                value={form.message}
                onChange={(e) => setField("message", e.target.value)}
                placeholder={label(pick(t.fields?.messagePlaceholder, t.messagePlaceholder as string | undefined), "Message body…")}
              />

              <div className="actions">
                <button type="button" className="btn" onClick={() => setField("message", aiTemplates.fill)}>
                  🤖 {label(pick(t.actions?.aiFill, t.aiFill as string | undefined), "AI Fill")}
                </button>
                <button type="button" className="btn" onClick={() => setField("message", aiTemplates.draft)}>
                  ✍️ {label(pick(t.actions?.aiDraft, t.aiDraft as string | undefined), "AI Draft")}
                </button>
                <button type="button" className="btn" onClick={() => setField("message", aiTemplates.strict)}>
                  💬 {label(pick(t.actions?.aiStrict, t.aiStrict as string | undefined), "Strict")}
                </button>
                <button type="button" className="btn" onClick={() => setField("message", aiTemplates.friendly)}>
                  👍 {label(pick(t.actions?.aiFriendly, t.aiFriendly as string | undefined), "Friendly")}
                </button>
              </div>
            </section>

            {/* Signature (Business only) */}
            <section className="signatures-wrap">
              <h2>
                {label(pick(t.sections?.signatures, t.signSection as string | undefined), "✍️ Signature")}
              </h2>

              <ContractSign
                label={label(pick(t.fields?.business, t.businessSign as string | undefined), "Business")}
                value={form.signature.business}
                date={form.signature.businessDate}
                onChange={(dataUrl) =>
                  setForm((p) => ({
                    ...p,
                    signature: { ...p.signature, business: dataUrl },
                  }))
                }
                onDateChange={(date) =>
                  setForm((p) => ({
                    ...p,
                    signature: { ...p.signature, businessDate: date },
                  }))
                }
                t={{
                  date: label(pick(t.fields?.date, t.date as string | undefined), "Date"),
                  clear: label(pick(t.actions?.clear, t.clear as string | undefined), "Clear"),
                }}
              />
            </section>

            {/* Actions */}
            <section className="step actions">
              <button className="btn" type="button" disabled={saving} onClick={() => void saveReminder()}>
                {saving
                  ? label(pick(t.actions?.saving, t.saving as string | undefined), "Saving…")
                  : label(
                      pick(
                        isEdit ? t.actions?.update : t.actions?.save,
                        isEdit ? (t.btnUpdate as string | undefined) : (t.btnSave as string | undefined)
                      ),
                      isEdit ? "Update Reminder" : "Save Reminder"
                    )}
              </button>

              <button type="button" className="btn" onClick={handleGoToList}>
                {label(pick(t.actions?.list, t.btnSaved as string | undefined), "Saved Reminders")}
              </button>
            </section>
          </form>
        </div>
      </main>

      <footer>
        <p>© 2025 SmartWerk</p>
      </footer>
    </>
  );
}