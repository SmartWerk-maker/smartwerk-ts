"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  collection,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";


import "./client.css";  


// ---------- TYPES ----------
type ClientStatus = "Active" | "Prospect" | "Inactive";
type PaymentTerm = "14 days" | "30 days" | "60 days" | "On Receipt";
type CurrencyCode = "EUR" | "USD" | "GBP" | "PLN";

interface ClientFormState {
  clientId: string;
  clientName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  paymentTerm: PaymentTerm;
  status: ClientStatus;
  kvk: string;
  vatNumber: string;
  tagsInput: string;
  currency: CurrencyCode;
  notes: string;
}

interface ClientsI18nSection {
  addTitle?: string;
  sections?: {
    info?: string;
    company?: string;
  };
  fields?: {
    clientId?: string;
    status?: string;
    companyName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    paymentTerm?: string;
    kvk?: string;
    vat?: string;
    tags?: string;
    currency?: string;
    notes?: string;
  };
  statusOptions?: {
    active?: string;
    prospect?: string;
    inactive?: string;
  };
  paymentTerms?: {
    term14?: string;
    term30?: string;
    term60?: string;
    receipt?: string;
  };
  actions?: {
    save?: string;
    update?: string;
    list?: string;
    smartSuggest?: string;
    backToDashboard?: string;
  };
  hints?: {
    freemailDetected?: string;
    enterEmailSuggestion?: string;
  };
  validation?: {
    nameRequired?: string;
    invalidEmail?: string;
    invalidPhone?: string;
  };
}

// ---------- HELPERS ----------

const emptyForm: ClientFormState = {
  clientId: "",
  clientName: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  country: "",
  paymentTerm: "30 days",
  status: "Active",
  kvk: "",
  vatNumber: "",
  tagsInput: "",
  currency: "EUR",
  notes: "",
};

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function validateForm(
  form: ClientFormState,
  dict?: ClientsI18nSection["validation"]
): string | null {
  if (!form.clientName) {
    return dict?.nameRequired ?? "Client name is required.";
  }

  if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
    return dict?.invalidEmail ?? "Invalid email address.";
  }

  if (form.phone && !/^[0-9+\s\-()]{6,20}$/.test(form.phone)) {
    return dict?.invalidPhone ?? "Invalid phone number.";
  }

  return null;
}

async function generateClientId(uid: string): Promise<string> {
  const ref = doc(db, "users", uid);
  const year = new Date().getFullYear();
  let result = "";

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const last = snap.exists()
      ? ((snap.data().lastClientNumber as number | undefined) ?? 0)
      : 0;
    const next = last + 1;

    tx.set(
      ref,
      {
        lastClientNumber: next,
      },
      { merge: true }
    );

    result = `CL-${year}-${String(next).padStart(3, "0")}`;
  });

  return result;
}

// ---------- PAGE COMPONENT ----------

export default function AddClientPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<ClientFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // словник клієнтів (може бути порожнім, але без раннього return)
  const tClients: ClientsI18nSection = (tRoot?.clients ?? {}) as ClientsI18nSection;

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

  // ---- LOAD (new / edit) ----
  // ---- LOAD (new / edit) ----
useEffect(() => {
  if (!user) return; // рано виходимо, юзера ще нема

  const uid = user.uid;
  let cancelled = false;

  async function init() {
    setLoading(true);

    try {
      const editId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("editClientId")
          : null;

      if (editId) {
        // --- edit mode ---
        const snap = await getDoc(doc(db, "users", uid, "clients", editId));

        if (snap.exists()) {
          const c = snap.data();

          if (!cancelled) {
            setForm({
              clientId: (c.clientId as string) ?? "",
              clientName: (c.clientName as string) ?? "",
              contactPerson: (c.contactPerson as string) ?? "",
              email: (c.email as string) ?? "",
              phone: (c.phone as string) ?? "",
              address: (c.address as string) ?? "",
              country: (c.country as string) ?? "",
              paymentTerm: ((c.paymentTerm as PaymentTerm) ?? "30 days") as PaymentTerm,
              status: ((c.status as ClientStatus) ?? "Active") as ClientStatus,
              kvk: (c.kvk as string) ?? "",
              vatNumber: (c.vatNumber as string) ?? "",
              tagsInput: Array.isArray(c.tags) ? c.tags.join(", ") : "",
              currency: ((c.currency as CurrencyCode) ?? "EUR") as CurrencyCode,
              notes: (c.notes as string) ?? "",
            });
            setIsEditing(true);
          }
        } else {
          // якщо не знайдено — генеруємо новий ID
          if (!cancelled) {
            const newId = await generateClientId(uid);
            setForm(prev => ({ ...prev, clientId: newId }));
          }
        }
      } else {
        // --- new client ---
        const newId = await generateClientId(uid);

        if (!cancelled) {
          setForm(prev => ({ ...prev, clientId: newId }));
        }
      }
    } catch (err) {
      console.error("Init client form error:", err);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  void init();

  return () => {
    cancelled = true;
  };
}, [user]);

  // ---- HANDLERS ----

  function updateField<K extends keyof ClientFormState>(
    field: K,
    value: ClientFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSmartSuggest() {
    const email = form.email.trim().toLowerCase();
    const messages: string[] = [];

    if (email.includes("@")) {
      const domain = email.split("@")[1] ?? "";
      const endsWith = (suffix: string) => domain.endsWith(suffix);

      // Country from domain
      const countryMap: Record<string, string> = {
        ".nl": "nl",
        ".be": "be",
        ".de": "de",
        ".fr": "fr",
        ".es": "es",
        ".pl": "pl",
        ".uk": "uk",
        ".co.uk": "uk",
      };

      let newCountry = form.country;
      for (const [suffix, code] of Object.entries(countryMap)) {
        if (endsWith(suffix)) {
          newCountry = code;
          messages.push(
            `🌍 Country auto-filled from domain: ${code.toUpperCase()}`
          );
          break;
        }
      }

      const isFree = /(gmail|yahoo|outlook|hotmail|icloud)\./.test(domain);
      let newStatus: ClientStatus = form.status;
      let newTags = form.tagsInput;

      if (isFree) {
        newStatus = "Prospect";
        if (!newTags) newTags = "Prospect";
        messages.push(
          tClients.hints?.freemailDetected ??
            "Freemail detected → Status: Prospect"
        );
      } else {
        if (!newTags) newTags = domain.split(".")[0] ?? "";
        messages.push("Tags suggested from domain");
      }

      // phone prefix
      let newPhone = form.phone;
      if (!newPhone) {
        const prefixMap: Record<string, string> = {
          ".nl": "+31",
          ".be": "+32",
          ".de": "+49",
          ".fr": "+33",
          ".es": "+34",
          ".pl": "+48",
          ".uk": "+44",
          ".co.uk": "+44",
        };
        for (const [suffix, code] of Object.entries(prefixMap)) {
          if (endsWith(suffix)) {
            newPhone = `${code} `;
            break;
          }
        }
      }

      setForm((prev) => ({
        ...prev,
        country: newCountry,
        status: newStatus,
        tagsInput: newTags,
        phone: newPhone,
      }));
    } else {
      messages.push(
        tClients.hints?.enterEmailSuggestion ??
          "Enter an email for better suggestions"
      );
    }

    setHint("✅ " + messages.join(" · "));
    setTimeout(() => setHint(null), 2500);
  }

  async function handleSave() {
    const currentUser = user;
if (!currentUser) {
  alert("Please log in to save a client.");
  return;
}



    const error = validateForm(form, tClients.validation);
    if (error) {
      alert(error);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clientId: form.clientId,
        clientName: form.clientName,
        contactPerson: form.contactPerson,
        email: form.email,
        phone: form.phone,
        address: form.address,
        country: form.country,
        kvk: form.kvk,
        vatNumber: form.vatNumber,
        paymentTerm: form.paymentTerm,
        status: form.status,
        currency: form.currency,
        tags: parseTags(form.tagsInput),
        notes: form.notes,
        updatedAt: serverTimestamp(),
      };

      const editId =
        typeof window !== "undefined"
          ? window.localStorage.getItem("editClientId")
          : null;

    const uid = user.uid;
    

      if (editId) {
        await updateDoc(doc(db, "users", uid, "clients", editId), payload);
        alert("✅ Client updated successfully!");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("editClientId");
        }
      } else {
        await addDoc(collection(db, "users", uid, "clients"), {
          uid,
          ...payload,
          createdAt: serverTimestamp(),
        });
        alert("✅ Client saved successfully!");
      }

      router.push("/dashboard/clients/list");

    } catch (err) {
      console.error("Save client error:", err);
      alert("❌ Error while saving client. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function goToList() {
    router.push("/dashboard/clients/list");
  }

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-loading-card">Loading client form…</div>
      </div>
    );
  }

  // ---------- RENDER ----------

  const label = (fallback: string | undefined, def: string) =>
    fallback ?? def;

  return (
  <main className="dash-main clients-page">
    <div className="dash-content clients-page-content">
      {/* HEADER */}
      <div
        className="dash-topbar clients-page-topbar"
        style={{ paddingBottom: 0 }}
      >
        <div className="dash-topbar-left">
          <div className="dash-topbar-title-row">
            <h1 className="dash-title">
              {label(tClients.addTitle, "Add Client")}
            </h1>
          </div>
        </div>

        <div className="dash-topbar-right">
          <button
            type="button"
            className="top-tab"
            onClick={() => router.push("/dashboard")}
          >
            🏠 {tClients.actions?.backToDashboard ?? "Back to Dashboard"}
          </button>
          <button type="button" className="top-tab" onClick={goToList}>
            📂 {tClients.actions?.list ?? "Saved Clients"}
          </button>
        </div>
      </div>

        {/* FORM CARD */}
        <div className="dash-card clients-card">
          {/* Client Info */}
          <section className="form-section">
            <h2 className="form-section-title">
              {label(tClients.sections?.info, "🏢 Client Information")}
            </h2>

            <div className="form-grid-2">
              <div>
                <label htmlFor="clientId">
                  {label(tClients.fields?.clientId, "Client ID")}
                </label>
                <input
                  id="clientId"
                  value={form.clientId}
                  readOnly
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="status">
                  {label(tClients.fields?.status, "Status")}
                </label>
                <select
                  id="status"
                  className="form-input"
                  value={form.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as ClientStatus)
                  }
                >
                  <option value="Active">
                    {tClients.statusOptions?.active ?? "Active"}
                  </option>
                  <option value="Prospect">
                    {tClients.statusOptions?.prospect ?? "Prospect"}
                  </option>
                  <option value="Inactive">
                    {tClients.statusOptions?.inactive ?? "Inactive"}
                  </option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="clientName">
                  {label(
                    tClients.fields?.companyName,
                    "Company / Full Name"
                  )}
                </label>
                <input
                  id="clientName"
                  className="form-input"
                  value={form.clientName}
                  onChange={(e) => updateField("clientName", e.target.value)}
                  placeholder="Company or Full Name"
                  autoComplete="organization"
                />
              </div>
              <div>
                <label htmlFor="contactPerson">
                  {label(
                    tClients.fields?.contactPerson,
                    "Contact Person"
                  )}
                </label>
                <input
                  id="contactPerson"
                  className="form-input"
                  value={form.contactPerson}
                  onChange={(e) =>
                    updateField("contactPerson", e.target.value)
                  }
                  placeholder="e.g. John de Vries"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="email">
                  {label(tClients.fields?.email, "Email")}
                </label>
                <input
                  id="email"
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  onBlur={handleSmartSuggest}
                  placeholder="client@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="phone">
                  {label(tClients.fields?.phone, "Phone")}
                </label>
                <input
                  id="phone"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+31 6 12345678"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address">
                {label(tClients.fields?.address, "Address")}
              </label>
              <input
                id="address"
                className="form-input"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Street, City, ZIP"
                autoComplete="street-address"
              />
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="country">
                  {label(tClients.fields?.country, "Country")}
                </label>
                <select
                  id="country"
                  className="form-input"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                >
                  <option value="">{/* empty */}Select Country</option>
                  <option value="nl">Netherlands</option>
                  <option value="be">Belgium</option>
                  <option value="de">Germany</option>
                  <option value="fr">France</option>
                  <option value="es">Spain</option>
                  <option value="pl">Poland</option>
                  <option value="uk">United Kingdom</option>
                </select>
              </div>
              <div>
                <label htmlFor="paymentTerm">
                  {label(
                    tClients.fields?.paymentTerm,
                    "Payment Term"
                  )}
                </label>
                <select
                  id="paymentTerm"
                  className="form-input"
                  value={form.paymentTerm}
                  onChange={(e) =>
                    updateField(
                      "paymentTerm",
                      e.target.value as PaymentTerm
                    )
                  }
                >
                  <option value="14 days">
                    {tClients.paymentTerms?.term14 ?? "14 days"}
                  </option>
                  <option value="30 days">
                    {tClients.paymentTerms?.term30 ?? "30 days"}
                  </option>
                  <option value="60 days">
                    {tClients.paymentTerms?.term60 ?? "60 days"}
                  </option>
                  <option value="On Receipt">
                    {tClients.paymentTerms?.receipt ?? "On Receipt"}
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* Company data */}
          <section className="form-section">
            <h2 className="form-section-title">
              {label(tClients.sections?.company, "💼 Company Data")}
            </h2>

            <div className="form-grid-2">
              <div>
                <label htmlFor="kvk">
                  {label(tClients.fields?.kvk, "KvK Number")}
                </label>
                <input
                  id="kvk"
                  className="form-input"
                  value={form.kvk}
                  onChange={(e) => updateField("kvk", e.target.value)}
                  placeholder="e.g. 12345678"
                />
              </div>
              <div>
                <label htmlFor="vatNumber">
                  {label(tClients.fields?.vat, "VAT Number")}
                </label>
                <input
                  id="vatNumber"
                  className="form-input"
                  value={form.vatNumber}
                  onChange={(e) => updateField("vatNumber", e.target.value)}
                  placeholder="e.g. NL001234567B01"
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div>
                <label htmlFor="tags">
                  {label(tClients.fields?.tags, "Tags")}
                </label>
                <input
                  id="tags"
                  className="form-input"
                  value={form.tagsInput}
                  onChange={(e) => updateField("tagsInput", e.target.value)}
                  placeholder="VIP, Long-term, etc."
                />
              </div>
              <div>
                <label htmlFor="currency">
                  {label(tClients.fields?.currency, "Default Currency")}
                </label>
                <select
                  id="currency"
                  className="form-input"
                  value={form.currency}
                  onChange={(e) =>
                    updateField(
                      "currency",
                      e.target.value as CurrencyCode
                    )
                  }
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="PLN">PLN</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="notes">
                {label(tClients.fields?.notes, "Notes")}
              </label>
              <textarea
                id="notes"
                className="form-input"
                rows={3}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional comments or notes"
              />
            </div>
          </section>

          {/* ACTIONS */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {isEditing  
              ? `💾 ${tClients.actions?.update ?? "Update Client"}`
              : `💾 ${tClients.actions?.save ?? "Save Client"}`}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={goToList}
            >
              📂 {tClients.actions?.list ?? "Saved Clients"}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSmartSuggest}
            >
              🤖 {tClients.actions?.smartSuggest ?? "Smart Suggest"}
            </button>
          </div>

          {hint && <div className="smart-hint">{hint}</div>}
        </div>
      </div>
    </main>
  );
  };