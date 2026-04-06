"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  type FieldValue,
  type Timestamp,
  serverTimestamp,
} from "firebase/firestore";

import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import "./invoice.css";

type InvoiceStatus = "draft" | "sent" | "paid";

interface InvoiceItem {
  id: string;
  desc: string;
  qty: number;
  price: number;
  vat: number;
}

interface SignatureState {
  business?: string;
  client?: string;
  businessDate?: string;
  clientDate?: string;
}

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

  invoiceDate?: string;
  dueDate?: string;
  invoiceNumber?: string;
  status?: InvoiceStatus;
  note?: string;

  subtotalFormatted?: string;
  totalVatFormatted?: string;
  grandTotalFormatted?: string;

  subtotal?: number;
  totalVat?: number;
  grandTotal?: number;

  clientId?: string | null;
  items?: Omit<InvoiceItem, "id">[];
  signatures?: SignatureState;
}

interface UserProfileDoc {
  fullName?: string;
  companyName?: string;
  phone?: string;
  city?: string;
  country?: string;
  kvk?: string;
  iban?: string;
  vatNumber?: string;
}

interface InvoiceFirestoreMeta {
  uid: string;
  number: string;
  status: InvoiceStatus;
  total: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  clientId?: string | null;
}

interface FormState {
  businessName: string;
  kvk: string;
  iban: string;
  btw: string;
  email: string;
  businessAddress: string;
  businessPhone: string;

  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;

  invoiceDate: string;
  dueDate: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  note: string;
  clientId: string | null;
}


interface InvoiceTranslations {
  title?: string;
  back?: string;
  list?: string;
  btnSave?: string;
  btnSaved?: string;
  businessSection?: string;
  businessName?: string;
  kvk?: string;
  iban?: string;
  btw?: string;
  email?: string;
  phone?: string;
  address?: string;
  clientSection?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  invoiceDate?: string;
  dueDate?: string;
  invoiceNumber?: string;
  status?: string;
  statusdraft?: string;
  statussent?: string;
  statuspaid?: string;
  itemsSection?: string;
  addItem?: string;
  desc?: string;
  qty?: string;
  price?: string;
  vat?: string;
  total?: string;
  action?: string;
  summarySection?: string;
  subtotal?: string;
  totalVat?: string;
  grandTotal?: string;
  note?: string;
  signSection?: string;
  business?: string;
  client?: string;
  date?: string;
  clear?: string;
}

interface TranslationRoot {
  invoices?: InvoiceTranslations;
}

const initialForm: FormState = {
  businessName: "",
  kvk: "",
  iban: "",
  btw: "",
  email: "",
  businessAddress: "",
  businessPhone: "",

  clientName: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",

  invoiceDate: "",
  dueDate: "",
  invoiceNumber: "",
  status: "draft",
  note: "",
  clientId: null,
};



const makeItem = (
  partial?: Partial<Omit<InvoiceItem, "id">>
): InvoiceItem => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  desc: partial?.desc ?? "",
  qty: partial?.qty ?? 1,
  price: partial?.price ?? 0,
  vat: partial?.vat ?? 21,
});

const formatEuro = (value: number) => `€${value.toFixed(2)}`;

const label = (value: string | undefined, fallback: string) => value ?? fallback;

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type SignaturePadProps = {
  title: string;
  value?: string;
  date?: string;
  dateLabel: string;
  clearLabel: string;
  onChange: (dataUrl: string, date: string) => void;
  onClear: () => void;
};

function SignaturePad({
  title,
  value,
  date,
  dateLabel,
  clearLabel,
  onChange,
  onClear,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#050816";
  }, []);

  useEffect(() => {
    syncCanvasSize();
    const onResize = () => {
      const prev = value;
      syncCanvasSize();
      if (prev) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const rect = canvas.getBoundingClientRect();
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = prev;
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [syncCanvasSize, value]);

  useEffect(() => {
    if (!value) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
      hasDrawnRef.current = true;
    };
    img.src = value;
  }, [value]);

  const getPoint = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    hasDrawnRef.current = true;
    const { x, y } = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnRef.current) return;
    onChange(canvas.toDataURL("image/png"), new Date().toLocaleDateString("nl-NL"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    onClear();
  };

  return (
    <div className="sw-signature-card">
      <div className="sw-signature-head">
        <h3>{title}</h3>
        <button type="button" className="sw-btn sw-btn-ghost" onClick={clear}>
          {clearLabel}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="sw-signature"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <p className="sw-signature-date">
        {dateLabel}: <span>{date ?? "—"}</span>
      </p>
    </div>
  );
}

export default function InvoiceCreatePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = (useTranslation(language) || {}) as TranslationRoot;
  const tInv: InvoiceTranslations = tRoot.invoices ?? {};

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(initialForm);
  const [items, setItems] = useState<InvoiceItem[]>([makeItem()]);
  const [signatures, setSignatures] = useState<SignatureState>({});

  const [businessOpen, setBusinessOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [createdAtFallback, setCreatedAtFallback] = useState<Timestamp | null>(null);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.qty * item.price, 0),
    [items]
  );

  const totalVat = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.qty * item.price * item.vat) / 100,
        0
      ),
    [items]
  );

  const grandTotal = useMemo(() => subtotal + totalVat, [subtotal, totalVat]);

  const updateField = useCallback(
    (field: keyof FormState, value: string | InvoiceStatus | null) => {
      setForm((prev) => ({ ...prev, [field]: value as never }));
    },
    []
  );

  const updateItem = useCallback(
    (id: string, field: keyof Omit<InvoiceItem, "id">, value: string | number) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]:
                  field === "desc"
                    ? String(value)
                    : Number.isFinite(Number(value))
                    ? Number(value)
                    : 0,
              }
            : item
        )
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, makeItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }, []);

  const previewNextInvoiceNumber = useCallback(async (uid: string) => {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const last = snap.exists() ? Number((snap.data() as { lastInvoiceNumber?: number }).lastInvoiceNumber ?? 0) : 0;
      const next = last + 1;
      return `INV-${new Date().getFullYear()}-${String(next).padStart(3, "0")}`;
    } catch {
      return `INV-${new Date().getFullYear()}-001`;
    }
  }, []);

  const generateInvoiceNumber = useCallback(async (uid: string) => {
    const ref = doc(db, "users", uid);
    const year = new Date().getFullYear();
    let finalNumber = "";
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.exists() ? Number((snap.data() as { lastInvoiceNumber?: number }).lastInvoiceNumber ?? 0) : 0;
      const next = last + 1;
      finalNumber = `INV-${year}-${String(next).padStart(3, "0")}`;
      tx.set(ref, { lastInvoiceNumber: next }, { merge: true });
    });
    return finalNumber;
  }, []);

  const loadProfileData = useCallback(async (uid: string, userEmail?: string | null) => {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const p = snap.data() as UserProfileDoc;
      const addressParts = [p.city, p.country].filter(Boolean).join(", ");

      setForm((prev) => ({
        ...prev,
        email: userEmail ?? prev.email,
        businessName: p.companyName ?? prev.businessName,
        kvk: p.kvk ?? prev.kvk,
        iban: p.iban ?? prev.iban,
        btw: p.vatNumber ?? prev.btw,
        businessPhone: p.phone ?? prev.businessPhone,
        businessAddress: addressParts || prev.businessAddress,
      }));
    } catch (error) {
      console.error("Profile load error:", error);
    }
  }, []);

  const loadSelectedClient = useCallback(() => {
    if (typeof window === "undefined") return;
    const savedClient = localStorage.getItem("selectedClient");
    if (!savedClient) return;

    try {
      const c = JSON.parse(savedClient);
      if (c.clientId) {
        localStorage.setItem("invoiceClientId", c.clientId);
      }

      setForm((prev) => ({
        ...prev,
        clientName: c.clientName ?? "",
        clientEmail: c.email ?? "",
        clientPhone: c.phone ?? "",
        clientAddress: c.address ?? "",
        clientId: c.clientId ?? null,
      }));
    } catch (error) {
      console.error("Client parse error:", error);
    } finally {
      localStorage.removeItem("selectedClient");
    }
  }, []);

  const loadForEdit = useCallback(async (uid: string) => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem("editInvoiceId");
    if (!id) return;

    const ref = doc(db, "users", uid, "invoices", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      localStorage.removeItem("editInvoiceId");
      localStorage.removeItem("invoiceClientId");
      return;
    }

    const inv = snap.data() as InvoiceData & {
      signatures?: SignatureState;
      createdAt?: Timestamp;
    };

    setEditingId(id);
    if (inv.clientId) {
      localStorage.setItem("invoiceClientId", inv.clientId);
    }
    if (inv.createdAt) setCreatedAtFallback(inv.createdAt);

    setForm((prev) => ({
      ...prev,
      businessName: inv.businessName ?? "",
      kvk: inv.kvk ?? "",
      iban: inv.iban ?? "",
      btw: inv.btw ?? "",
      email: inv.email ?? "",
      businessAddress: inv.businessAddress ?? "",
      businessPhone: inv.businessPhone ?? "",
      clientName: inv.clientName ?? "",
      clientEmail: inv.clientEmail ?? "",
      clientPhone: inv.clientPhone ?? "",
      clientAddress: inv.clientAddress ?? "",
      invoiceDate: inv.invoiceDate ?? "",
      dueDate: inv.dueDate ?? "",
      invoiceNumber: inv.invoiceNumber ?? "",
      status: inv.status ?? "draft",
      note: inv.note ?? "",
      clientId: inv.clientId ?? null,
    }));

    setItems(
      inv.items?.length ? inv.items.map((item) => makeItem(item)) : [makeItem()]
    );
    setSignatures(inv.signatures ?? {});
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
        return;
      }

      const today = new Date();
      const due = new Date();
      due.setDate(due.getDate() + 14);

      setForm((prev) => ({
        ...prev,
        email: firebaseUser.email ?? prev.email,
        invoiceDate: prev.invoiceDate || toDateInputValue(today),
        dueDate: prev.dueDate || toDateInputValue(due),
      }));

      const preview = await previewNextInvoiceNumber(firebaseUser.uid);
      setForm((prev) => ({
        ...prev,
        invoiceNumber: prev.invoiceNumber || preview,
      }));

      await loadProfileData(firebaseUser.uid, firebaseUser.email);
      await loadForEdit(firebaseUser.uid);
      loadSelectedClient();
      setLoading(false);
    });

    return () => unsub();
  }, [loadForEdit, loadProfileData, loadSelectedClient, previewNextInvoiceNumber, router]);

  useEffect(() => {
    if (!form.invoiceDate) return;
    setForm((prev) => {
      if (editingId && prev.dueDate) return prev;
      const nextDue = new Date(prev.invoiceDate);
      if (Number.isNaN(nextDue.getTime())) return prev;
      nextDue.setDate(nextDue.getDate() + 14);
      return { ...prev, dueDate: toDateInputValue(nextDue) };
    });
  }, [form.invoiceDate, editingId]);

  const uploadSignature = async (
  dataUrl: string,
  path: string
): Promise<string> => {
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataUrl, "data_url");
  return await getDownloadURL(storageRef);
};

  const saveInvoice = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.push("/login");
      return;
    }

    try {
      setSaving(true);

      const effectiveClientId =
        form.clientId ?? (typeof window !== "undefined" ? localStorage.getItem("invoiceClientId") : null);

      if (!items.length) {
        alert("Add at least one item");
        return;
      }

      if (!items.some((item) => item.qty > 0 && item.price > 0)) {
        alert("Items must have quantity and price");
        return;
      }

      if (!form.clientName.trim()) {
        alert("Client name is required");
        return;
      }

      if (!form.invoiceDate) {
        alert("Invoice date is required");
        return;
      }

      let invoiceNumber = form.invoiceNumber.trim();
      if (!editingId && !invoiceNumber) {
        invoiceNumber = await generateInvoiceNumber(currentUser.uid);
      }

      let businessSignatureUrl = signatures.business || "";
let clientSignatureUrl = signatures.client || "";

try {
  if (signatures.business?.startsWith("data:image")) {
    businessSignatureUrl = await uploadSignature(
      signatures.business,
      `signatures/${currentUser.uid}/business-${Date.now()}`
    );
  }

  if (signatures.client?.startsWith("data:image")) {
    clientSignatureUrl = await uploadSignature(
      signatures.client,
      `signatures/${currentUser.uid}/client-${Date.now()}`
    );
  }
} catch (err) {
  console.error("Signature upload failed:", err);
}

      const payload: InvoiceFirestoreMeta & InvoiceData = {
        uid: currentUser.uid,
        number: invoiceNumber,
        status: form.status,
        total: grandTotal,
        createdAt: editingId ? createdAtFallback ?? serverTimestamp() : serverTimestamp(),
        updatedAt: serverTimestamp(),
        clientId: effectiveClientId,

        businessName: form.businessName,
        kvk: form.kvk,
        iban: form.iban,
        btw: form.btw,
        email: form.email,
        businessAddress: form.businessAddress,
        businessPhone: form.businessPhone,

        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone,
        clientAddress: form.clientAddress,

        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        invoiceNumber,
        note: form.note,

        items: items.map((item) => ({
          desc: item.desc,
          qty: item.qty,
          price: item.price,
          vat: item.vat,
        })),
        subtotal,
        totalVat,
        grandTotal,
        subtotalFormatted: formatEuro(subtotal),
        totalVatFormatted: formatEuro(totalVat),
        grandTotalFormatted: formatEuro(grandTotal),

        signatures: {
  business: businessSignatureUrl,
  client: clientSignatureUrl,
  businessDate: signatures.businessDate,
  clientDate: signatures.clientDate,
},
      };

      if (editingId) {
        await setDoc(doc(db, "users", currentUser.uid, "invoices", editingId), payload, {
          merge: true,
        });
        alert("✅ Invoice updated");
      } else {
        await addDoc(collection(db, "users", currentUser.uid, "invoices"), payload);
        alert(`✅ Invoice saved as ${invoiceNumber}`);
      }

      try {
        await addDoc(collection(db, "users", currentUser.uid, "events"), {
          type: "Invoice",
          message: editingId
            ? `Invoice ${invoiceNumber} updated`
            : `Invoice ${invoiceNumber} created`,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.warn("Event log failed:", error);
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("editInvoiceId");
        localStorage.removeItem("invoiceClientId");
      }

      router.push("/dashboard/invoices/list");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="sw-loading-shell">
        <div className="sw-loading-card">Loading invoice workspace…</div>
      </div>
    );
  }

  

  return (
    <div className="sw-page">
      <div className="sw-bg-grid" />
      <div className="sw-bg-glow sw-bg-glow-a" />
      <div className="sw-bg-glow sw-bg-glow-b" />

      <header className="sw-topbar">
        <div>
          <p className="sw-kicker">SmartWerk • Invoice Studio</p>
          <h1 className="sw-title">{tInv.title ?? "Invoice"}</h1>
        </div>

        <div className="sw-actions">
          <button
            type="button"
            className="sw-btn sw-btn-ghost"
            onClick={() => router.push("/dashboard")}
          >
            {tInv.back ?? "Back to Dashboard"}
          </button>
          <button
            type="button"
            className="sw-btn sw-btn-secondary"
            onClick={() => router.push("/dashboard/invoices/list")}
          >
            {tInv.list ?? "Saved Invoices"}
          </button>
          <button
            type="button"
            className="sw-btn sw-btn-primary"
            onClick={saveInvoice}
            disabled={saving}
          >
            {saving ? "Saving…" : label(tInv.btnSave, "Save Invoice")}
          </button>
        </div>
      </header>

      <main className="sw-main">
        <section className="sw-panel sw-hero">
          <div>
            <p className="sw-hero-kicker">2030-ready finance interface</p>
            <h2>{form.invoiceNumber || "New Invoice"}</h2>
            <p className="sw-hero-text">
              Fully React-based invoice flow with state-driven forms, signatures,
              Firestore save logic, auto dates, and edit-mode support.
            </p>
          </div>

          <div className="sw-stat-group">
            <div className="sw-stat-card">
              <span>Subtotal</span>
              <strong>{formatEuro(subtotal)}</strong>
            </div>
            <div className="sw-stat-card">
              <span>VAT</span>
              <strong>{formatEuro(totalVat)}</strong>
            </div>
            <div className="sw-stat-card">
              <span>Total</span>
              <strong>{formatEuro(grandTotal)}</strong>
            </div>
          </div>
        </section>

        <form className="sw-form" onSubmit={(e) => e.preventDefault()}>
          <section className={`sw-panel sw-panel-collapse ${businessOpen ? "active" : ""}`}>
            <button
              type="button"
              className="sw-section-toggle"
              onClick={() => setBusinessOpen((prev) => !prev)}
            >
              <span>{label(tInv.businessSection, "Business Info")}</span>
              <span>{businessOpen ? "−" : "+"}</span>
            </button>

            {businessOpen && (
              <div className="sw-grid sw-grid-2">
                <div className="sw-field">
                  <label htmlFor="businessName">{label(tInv.businessName, "Business Name")}</label>
                  <input
                    id="businessName"
                    value={form.businessName}
                    onChange={(e) => updateField("businessName", e.target.value)}
                    placeholder={label(tInv.businessName, "Full Name / Business Name")}
                    autoComplete="organization"
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="kvk">{label(tInv.kvk, "KvK Number")}</label>
                  <input
                    id="kvk"
                    value={form.kvk}
                    onChange={(e) => updateField("kvk", e.target.value)}
                    placeholder={label(tInv.kvk, "KvK Number")}
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="iban">{label(tInv.iban, "IBAN")}</label>
                  <input
                    id="iban"
                    value={form.iban}
                    onChange={(e) => updateField("iban", e.target.value)}
                    placeholder={label(tInv.iban, "IBAN")}
                    autoComplete="off"
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="btw">{label(tInv.btw, "VAT Number")}</label>
                  <input
                    id="btw"
                    value={form.btw}
                    onChange={(e) => updateField("btw", e.target.value)}
                    placeholder={label(tInv.btw, "VAT Number")}
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="email">{label(tInv.email, "Email")}</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder={label(tInv.email, "Business Email")}
                    autoComplete="email"
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="businessPhone">{label(tInv.phone, "Business Phone")}</label>
                  <input
                    id="businessPhone"
                    type="tel"
                    value={form.businessPhone}
                    onChange={(e) => updateField("businessPhone", e.target.value)}
                    placeholder={label(tInv.phone, "Business Phone")}
                    autoComplete="tel"
                  />
                </div>

                <div className="sw-field sw-span-2">
                  <label htmlFor="businessAddress">{label(tInv.address, "Business Address")}</label>
                  <input
                    id="businessAddress"
                    value={form.businessAddress}
                    onChange={(e) => updateField("businessAddress", e.target.value)}
                    placeholder={label(tInv.address, "Business Address")}
                    autoComplete="street-address"
                  />
                </div>
              </div>
            )}
          </section>

         <section className={`sw-panel sw-panel-collapse ${clientOpen ? "active" : ""}`}>
            <button
              type="button"
              className="sw-section-toggle"
              onClick={() => setClientOpen((prev) => !prev)}
            >
              <span>{label(tInv.clientSection, "Client Info")}</span>
              <span>{clientOpen ? "−" : "+"}</span>
            </button>

            {clientOpen && (
              <div className="sw-grid sw-grid-2">
                <div className="sw-field">
                  <label htmlFor="clientName">{label(tInv.clientName, "Client Name")}</label>
                  <input
                    id="clientName"
                    value={form.clientName}
                    onChange={(e) => updateField("clientName", e.target.value)}
                    placeholder={label(tInv.clientName, "Client Name")}
                    autoComplete="organization"
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="clientEmail">{label(tInv.clientEmail, "Client Email")}</label>
                  <input
                    id="clientEmail"
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => updateField("clientEmail", e.target.value)}
                    placeholder={label(tInv.clientEmail, "Client Email")}
                    autoComplete="email"
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="clientPhone">{label(tInv.clientPhone, "Client Phone")}</label>
                  <input
                    id="clientPhone"
                    type="tel"
                    value={form.clientPhone}
                    onChange={(e) => updateField("clientPhone", e.target.value)}
                    placeholder="+31 6 12345678"
                    autoComplete="tel"
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="clientAddress">{label(tInv.clientAddress, "Client Address")}</label>
                  <input
                    id="clientAddress"
                    value={form.clientAddress}
                    onChange={(e) => updateField("clientAddress", e.target.value)}
                    placeholder={label(tInv.clientAddress, "Client Address")}
                    autoComplete="street-address"
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="invoiceDate">{label(tInv.invoiceDate, "Invoice Date")}</label>
                  <input
                    id="invoiceDate"
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => updateField("invoiceDate", e.target.value)}
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="dueDate">{label(tInv.dueDate, "Due Date")}</label>
                  <input
                    id="dueDate"
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => updateField("dueDate", e.target.value)}
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="invoiceNumber">{label(tInv.invoiceNumber, "Invoice Number")}</label>
                  <input
                    id="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={(e) => updateField("invoiceNumber", e.target.value)}
                    placeholder={label(tInv.invoiceNumber, "Invoice Number")}
                    readOnly
                  />
                </div>

                <div className="sw-field">
                  <label htmlFor="status">{label(tInv.status, "Status")}</label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => updateField("status", e.target.value as InvoiceStatus)}
                  >
                    <option value="draft">{tInv.statusdraft ?? "draft"}</option>
                    <option value="sent">{tInv.statussent ?? "sent"}</option>
                    <option value="paid">{tInv.statuspaid ?? "paid"}</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          <section className="sw-panel">
            <div className="sw-section-head">
              <div>
                <p className="sw-eyebrow">Services</p>
                <h2>{label(tInv.itemsSection, "Items")}</h2>
              </div>
              <button type="button" className="sw-btn sw-btn-secondary" onClick={addItem}>
                {label(tInv.addItem, "Add Item")}
              </button>
            </div>

            <div className="sw-table-wrap">
              <table className="sw-table">
                <thead>
                  <tr>
                    <th>{label(tInv.desc, "Description")}</th>
                    <th>{label(tInv.qty, "Qty")}</th>
                    <th>{label(tInv.price, "Price")}</th>
                    <th>{label(tInv.vat, "VAT %")}</th>
                    <th>{label(tInv.total, "Total")}</th>
                    <th>{label(tInv.action, "Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const line = item.qty * item.price;
                    const total = line + (line * item.vat) / 100;

                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            value={item.desc}
                            onChange={(e) => updateItem(item.id, "desc", e.target.value)}
                            placeholder="Service / product"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, "price", e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            value={item.vat}
                            onChange={(e) => updateItem(item.id, "vat", e.target.value)}
                          >
                            <option value={0}>0</option>
                            <option value={9}>9</option>
                            <option value={21}>21</option>
                          </select>
                        </td>
                        <td>
                          <span className="sw-total-chip">{formatEuro(total)}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="sw-btn sw-btn-danger"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sw-grid sw-grid-summary">
            <div className="sw-panel">
              <div className="sw-section-head">
                <div>
                  <p className="sw-eyebrow">Summary</p>
                  <h2>{label(tInv.summarySection, "Summary")}</h2>
                </div>
              </div>

              <div className="sw-summary-list">
                <div className="sw-summary-row">
                  <span>{label(tInv.subtotal, "Subtotal")}</span>
                  <strong>{formatEuro(subtotal)}</strong>
                </div>
                <div className="sw-summary-row">
                  <span>{label(tInv.totalVat, "Total VAT")}</span>
                  <strong>{formatEuro(totalVat)}</strong>
                </div>
                <div className="sw-summary-row sw-summary-total">
                  <span>{label(tInv.grandTotal, "Total")}</span>
                  <strong>{formatEuro(grandTotal)}</strong>
                </div>
              </div>

              <div className="sw-field">
                <label htmlFor="note">{label(tInv.note, "Note")}</label>
                <textarea
                  id="note"
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  placeholder={label(tInv.note, "Note...")}
                  rows={5}
                />
              </div>
            </div>

            <section className="sw-panel">
              <div className="sw-section-head">
                <div>
                  <p className="sw-eyebrow">Signatures</p>
                  <h2>{label(tInv.signSection, "Signatures")}</h2>
                </div>
              </div>

              <div className="sw-signatures-grid">
                <SignaturePad
                  title={label(tInv.business, "Business")}
                  value={signatures.business}
                  date={signatures.businessDate}
                  dateLabel={label(tInv.date, "Date")}
                  clearLabel={label(tInv.clear, "Clear")}
                  onChange={(dataUrl, date) =>
                    setSignatures((prev) => ({
                      ...prev,
                      business: dataUrl,
                      businessDate: date,
                    }))
                  }
                  onClear={() =>
                    setSignatures((prev) => ({
                      ...prev,
                      business: "",
                      businessDate: "",
                    }))
                  }
                />

                <SignaturePad
                  title={label(tInv.client, "Client")}
                  value={signatures.client}
                  date={signatures.clientDate}
                  dateLabel={label(tInv.date, "Date")}
                  clearLabel={label(tInv.clear, "Clear")}
                  onChange={(dataUrl, date) =>
                    setSignatures((prev) => ({
                      ...prev,
                      client: dataUrl,
                      clientDate: date,
                    }))
                  }
                  onClear={() =>
                    setSignatures((prev) => ({
                      ...prev,
                      client: "",
                      clientDate: "",
                    }))
                  }
                />
              </div>
            </section>
          </section>

          <section className="sw-bottom-actions">
            <button
              type="button"
              className="sw-btn sw-btn-primary"
              onClick={saveInvoice}
              disabled={saving}
            >
              {saving ? "Saving…" : label(tInv.btnSave, "Save Invoice")}
            </button>
            <button
              type="button"
              className="sw-btn sw-btn-secondary"
              onClick={() => router.push("/dashboard/invoices/list")}
            >
              {label(tInv.btnSaved, "Saved Invoices")}
            </button>
          </section>
        </form>
      </main>

      <footer className="sw-footer">© 2025 SmartWerk</footer>
    </div>
  );
}
