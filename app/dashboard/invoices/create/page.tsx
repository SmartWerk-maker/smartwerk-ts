"use client";

import React, { useCallback, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";




import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";
import type { FieldValue, Timestamp } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

import "./invoice.css";



/**
 * NOTE:
 * This page uses imperative DOM manipulation.
 * Do not refactor partially.
 * Either keep as-is or rewrite fully with React state.
 */

// ===== TYPES =====

interface InvoiceItem {
  id: string;
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

  invoiceDate?: string;
  dueDate?: string;
  invoiceNumber?: string;
  status?: InvoiceStatus;
  note?: string;
  subtotalFormatted?: string;
  totalVatFormatted?: string;
  grandTotalFormatted?: string;
  clientId?: string | null;

  items?: InvoiceItem[];

  subtotal?: number;
  totalVat?: number;
  grandTotal?: number;

  signatures?: InvoiceSignatures;

  
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

/**
 * IMPORTANT:
 * - InvoiceFormData is used ONLY for UI & form state
 * - Firestore invoice documents MUST also include:
 *   uid, number, status, total, createdAt, updatedAt
 *   to be compatible with dashboard & analytics
 */
interface InvoiceFirestoreMeta {
  uid: string;
  number: string;
  status: "draft" | "sent" | "paid";
  total: number;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  clientId?: string | null;
  
}
// невеликий хелпер для i18n
const label = (value: string | undefined, fallback: string) =>
  value ?? fallback;



export default function InvoiceCreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const generateId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2);

  const [itemsState, setItemsState] = useState<InvoiceItem[]>([
  { id: generateId(), desc: "", qty: 1, price: 0, vat: 21 }
]);
  const [saving, setSaving] = useState(false);

  const { language } = useLanguage();

  // tRoot може бути null → одразу даємо дефолт {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tRoot: any = useTranslation(language) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tInv: any = tRoot.invoices || {};

  const [openSections, setOpenSections] = useState({
  business: false,
  client: false
});

const toggleSection = (key: "business" | "client") => {
  setOpenSections((prev) => ({
    ...prev,
    [key]: !prev[key]
  }));
};
 

  const totals = React.useMemo(() => {
  let subtotal = 0;
  let totalVat = 0;

  itemsState.forEach((i) => {
    const line = i.qty * i.price;
    const vat = (line * i.vat) / 100;

    subtotal += line;
    totalVat += vat;
  });

  return {
    subtotal,
    totalVat,
    grandTotal: subtotal + totalVat,
  };
}, [itemsState]);

 const [form, setForm] = useState({
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
  status: "draft" as InvoiceStatus,
  note: ""
});

const businessCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
const clientCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

const [signatures, setSignatures] = useState({
  business: "",
  client: "",
  businessDate: "",
  clientDate: ""
});

  /* ========== ITEMS & TOTALS ========== */

  

const addItem = () => {
  setItemsState((prev) => [
    ...prev,
    { id: generateId(), desc: "", qty: 1, price: 0, vat: 21 }
  ]);
};

const removeItem = (index: number) => {
  setItemsState((prev) => prev.filter((_, i) => i !== index));
};

const updateItem = (
  index: number,
  field: keyof InvoiceItem,
  value: number | string
) => {
  setItemsState((prev) => {
    const copy = [...prev];
    copy[index] = {
  ...copy[index],
  [field]:
  field === "desc"
    ? value
    : value === ""
      ? 0
      : Number(value)
};
    return copy;
  });
};
  /* ========== SIGNATURES ========== */

  

 

  /* ========== DATES (без flatpickr) ========== */

  

  /* ========== FIRESTORE: номер інвойсу ========== */

  async function previewNextInvoiceNumber(uid: string) {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const last = snap.exists()
        ? ((snap.data().lastInvoiceNumber as number) || 0)
        : 0;
      const next = last + 1;
      const preview = `INV-${new Date().getFullYear()}-${String(next).padStart(
        3,
        "0"
      )}`;
      

      setForm((prev) => {
  if (!prev.invoiceNumber) {
    return { ...prev, invoiceNumber: preview };
  }
  return prev;
});
    } catch {
      // ігноруємо
    }
  }

  async function generateInvoiceNumber(uid: string) {
    const ref = doc(db, "users", uid);
    const year = new Date().getFullYear();
    let final = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.exists()
        ? ((snap.data().lastInvoiceNumber as number) || 0)
        : 0;
      const next = last + 1;
      final = `INV-${year}-${String(next).padStart(3, "0")}`;
      tx.set(ref, { lastInvoiceNumber: next }, { merge: true });
    });

    return final;
  }

  /* ========== PROFILE → авто-заповнення ========== */

  async function loadProfileData(uid: string, userEmail?: string | null) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const p = snap.data() as UserProfileDoc;
    const addressParts = [p.city, p.country].filter(Boolean).join(", ");

    setForm((prev) => ({
      ...prev,
      businessName: p.companyName ?? prev.businessName,
      kvk: p.kvk ?? prev.kvk,
      iban: p.iban ?? prev.iban,
      btw: p.vatNumber ?? prev.btw,
      email: userEmail ?? prev.email,
      businessPhone: p.phone ?? prev.businessPhone,
      businessAddress: addressParts || prev.businessAddress,
    }));
  } catch (e) {
    console.error("Profile load error:", e);
  }
}

  /* ========== CLIENT → localStorage.selectedClient ========== */

  function autofillClientFromLocalStorage() {
  const savedClient = localStorage.getItem("selectedClient");
  if (!savedClient) return;

  try {
    const c = JSON.parse(savedClient);

    // UI
   setForm((prev) => ({
  ...prev,
  clientName: c.clientName ?? "",
  clientEmail: c.email ?? "",
  clientPhone: c.phone ?? "",
  clientAddress: c.address ?? ""
}));

    // 🔑 ЗБЕРІГАЄМО clientId ДЛЯ FIRESTORE
    localStorage.setItem("invoiceClientId", c.clientId);

  } catch (e) {
    console.error("Client parse error:", e);
  } finally {
    localStorage.removeItem("selectedClient");
  }
}

  

  

  /* ========== LOAD FOR EDIT ========== */

  async function loadForEdit(uid: string) {
    const id = localStorage.getItem("editInvoiceId");
    if (!id) return;

    const ref = doc(db, "users", uid, "invoices", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      
      localStorage.removeItem("invoiceClientId");
      localStorage.removeItem("editInvoiceId");
      return;
    }
    const inv = snap.data() as InvoiceData & {
      signatures?: InvoiceSignatures;
      
    };
    if (inv.clientId) {
  localStorage.setItem("invoiceClientId", inv.clientId);
}
    
  setForm({
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
  note: inv.note ?? ""
});
   
    if (inv.items && inv.items.length > 0) {
  setItemsState(
  inv.items.map((item) => ({
    ...item,
    id: item.id || generateId()
  }))
);
} else {
  setItemsState([{ id: generateId(), desc: "", qty: 1, price: 0, vat: 21 }]);
}

   if (inv.signatures) {
  setSignatures({
    business: inv.signatures.business || "",
    client: inv.signatures.client || "",
    businessDate: inv.signatures.businessDate || "",
    clientDate: inv.signatures.clientDate || ""
  });
}

    
  }


  const updateForm = (field: string, value: string) => {
  setForm((prev) => {
    const next = { ...prev, [field]: value };

    if (field === "invoiceDate" && value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        d.setDate(d.getDate() + 14);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        next.dueDate = `${y}-${m}-${dd}`;
      }
    }

    return next;
  });
};

  /* ========== SAVE (create/update) ========== */
  /**
 * saveInvoice()
 *
 * IMPORTANT:
 * - This function stores BOTH:
 *   1) UI/Form data (human readable)
 *   2) Dashboard contract fields:
 *      uid, number, status, total, createdAt, updatedAt
 *
 * Do NOT remove these fields – dashboard depends on them.
 */

  async function saveInvoice() {
  if (saving) return;
  setSaving(true);

  try {
    

    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.push("/login");
      return;
    }

    const uid = currentUser.uid;

    const clientId = localStorage.getItem("invoiceClientId") ?? null;

    const items = itemsState;

   

    

    // ✅ VALIDATION
    if (!items.length) {
  alert("Add at least one item");
  setSaving(false);
  return;
}

    if (!items.some((i) => i.qty > 0 && i.price > 0)) {
      alert("Items must have quantity and price");
      setSaving(false);
      return;
    }

    const clientName = form.clientName.trim();

if (!clientName) {
  alert("Client name is required");
  setSaving(false);
  return;
}

const invoiceDate = form.invoiceDate;

if (!invoiceDate) {
  alert("Invoice date is required");
  setSaving(false);
  return;
}

    // 👇 ДАЛІ ТВОЙ КОД БЕЗ ЗМІН
   
    

    let subtotal = 0;
let totalVat = 0;

items.forEach((i) => {
  const line = i.qty * i.price;
  const vat = (line * i.vat) / 100;

  subtotal += line;
  totalVat += vat;
});

const grandTotal = subtotal + totalVat;

    

    const businessSig = signatures.business;
  const clientSig = signatures.client;
    

    const editingId = localStorage.getItem("editInvoiceId") || null;

    let invoiceNumber = form.invoiceNumber.trim();

    if (!editingId && !invoiceNumber) {
  invoiceNumber = await generateInvoiceNumber(uid);
  setForm((prev) => ({ ...prev, invoiceNumber }));
}

   const statusRaw = form.status;

const normalizedStatus = (statusRaw || "draft").toLowerCase() as
  | "draft"
  | "sent"
  | "paid";


let createdAtValue: Timestamp | FieldValue = serverTimestamp();

if (editingId) {
  const existing = await getDoc(doc(db, "users", uid, "invoices", editingId));
  if (existing.exists()) {
    createdAtValue = existing.data().createdAt || serverTimestamp();
  }
}
const data: InvoiceFirestoreMeta & InvoiceData = {

  /* ================= DASHBOARD CONTRACT ================= */
  uid,                             // 🔑 для useInvoices
  number: invoiceNumber,          // 🔑
  status: normalizedStatus,        // 🔑 lowercase
  total: grandTotal,               // 🔑
  createdAt: createdAtValue, // 🔑
  updatedAt: serverTimestamp(),
  clientId,               // 🔑

  /* ================= FORM / UI DATA ================= */
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

  items,
  subtotal,
  totalVat,
  grandTotal,
  subtotalFormatted: "€" + subtotal.toFixed(2),
  totalVatFormatted: "€" + totalVat.toFixed(2),
  grandTotalFormatted: "€" + grandTotal.toFixed(2),

  signatures: {
  business: businessSig,
  client: clientSig,
  businessDate: signatures.businessDate,
  clientDate: signatures.clientDate,
},
};

    if (editingId) {
      await setDoc(doc(db, "users", uid, "invoices", editingId), data, {
        merge: true,
      });
      alert("✅ Invoice updated");
    } else {
      await addDoc(collection(db, "users", uid, "invoices"), data);
      alert(
        `✅ Invoice saved${invoiceNumber ? " as " + invoiceNumber : ""}`
      );
    }
localStorage.removeItem("invoiceClientId");
localStorage.removeItem("editInvoiceId");
    

    try {
      await addDoc(collection(db, "users", uid, "events"), {
        
        type: "Invoice",
        message: editingId
          ? `Invoice ${invoiceNumber} updated`
          : `Invoice ${invoiceNumber} created`,
       createdAt: serverTimestamp(),
      });
      
    } catch (e) {
      console.warn("Event log failed:", e);
    }
    router.push("/dashboard/invoices/list");

    } catch (e) {
  console.error("Save invoice failed:", e);
  alert("❌ Failed to save invoice");

    } finally {
  setSaving(false);
}
    
  }
  
  

  /* ========== HOOKS ========== */
const useSignaturePad = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onSave: (dataUrl: string) => void
) => {
  useLayoutEffect(() => {
    let raf: number;

    const init = () => {
      const canvas = canvasRef.current;

      if (!canvas) {
        raf = requestAnimationFrame(init);
        return;
      }

      console.log("✅ canvas READY");

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // ✅ розмір
      canvas.width = 320;
      canvas.height = 150;

      canvas.style.width = "320px";
      canvas.style.height = "150px";

      // ✅ стиль
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";

      canvas.style.touchAction = "none";

      let drawing = false;

      // ✅ ВАЖЛИВО
      let lastX = 0;
      let lastY = 0;

      const getPos = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();

        return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
      };

      const down = (e: PointerEvent) => {
        drawing = true;

        const { x, y } = getPos(e);

        lastX = x;
        lastY = y;

        ctx.beginPath();
        ctx.moveTo(x, y);
      };

      const move = (e: PointerEvent) => {
        if (!drawing) return;

        const { x, y } = getPos(e);

        // ✨ SMOOTHING (Bezier)
        const midX = (lastX + x) / 2;
        const midY = (lastY + y) / 2;

        ctx.quadraticCurveTo(lastX, lastY, midX, midY);
        ctx.stroke();

        lastX = x;
        lastY = y;
      };

      const up = () => {
        if (!drawing) return;

        drawing = false;
        ctx.beginPath();

        onSave(canvas.toDataURL());
      };

      // ✅ events
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      canvas.addEventListener("pointerleave", up);

      return () => {
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        canvas.removeEventListener("pointerleave", up);
      };
    };

    raf = requestAnimationFrame(init);

    return () => cancelAnimationFrame(raf);
  }, []);
};
  

  // інит даних / форми
  /* eslint-disable react-hooks/exhaustive-deps */
useLayoutEffect(() => {
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      setLoading(false);
      router.push("/login");
      return;
    }

    setUser(firebaseUser);

   
    
      
      const editInvoiceId = localStorage.getItem("editInvoiceId");

      if (editInvoiceId) {
       await loadForEdit(firebaseUser.uid);
        }        else {
         await previewNextInvoiceNumber(firebaseUser.uid);
       autofillClientFromLocalStorage();
        }

await loadProfileData(firebaseUser.uid, firebaseUser.email);
   

    setLoading(false);
  });

  return () => unsub();
}, []);
/* eslint-enable react-hooks/exhaustive-deps */

  // ініціалізація підписів після того, як DOM готовий

  const handleBusinessSignatureSave = useCallback((dataUrl: string) => {
  setSignatures((prev) => ({
    ...prev,
    business: dataUrl,
    businessDate: new Date().toLocaleDateString("nl-NL"),
  }));
}, []);

  useSignaturePad(businessCanvasRef, handleBusinessSignatureSave);

const handleClientSignatureSave = useCallback((dataUrl: string) => {
  setSignatures((prev) => ({
    ...prev,
    client: dataUrl,
    clientDate: new Date().toLocaleDateString("nl-NL"),
  }));
}, []);

useSignaturePad(clientCanvasRef, handleClientSignatureSave);
  






  /* ========== HANDLЕРИ ДЛЯ JSX ========== */

  const handleAddItemClick = () => addItem();

  const handleSaveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void saveInvoice();
  };

  


  const clearBusinessSignature = () => {
  const canvas = businessCanvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  setSignatures((prev) => ({
    ...prev,
    business: "",
    businessDate: ""
  }));
};
  const clearClientSignature = () => {
  const canvas = clientCanvasRef.current;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  setSignatures((prev) => ({
    ...prev,
    client: "",
    clientDate: ""
  }));
};

  const handleBackDashboard = () => router.push("/dashboard");
  const handleGoToList = () =>
    router.push("/dashboard/invoices/list");

  if (loading) {
    return (
      <div className="clients-loading">
        <div className="clients-loading-card">Loading invoice…</div>
      </div>
    );
  }

  

  /* ========== RENDER ========== */

  return (
    <>
      <header className="topbar">
        <h1 className="invoice-title">{tInv.title ?? "Invoice"}</h1>

        <div className="actions-right">
          <button 
          type="button"
          className="btn" 
          onClick={handleBackDashboard}
          > 
           {tInv.back ?? "Back to Dashboard"}
    
          </button>

          <button 
          type="button"
          className="btn" 
          onClick={handleGoToList}>
            {tInv.list ?? "Saved Invoices"}
          </button>
        </div>
      </header>

      <main className="dash-main invoice-page">
        <div className="dash-content invoice-content">
          <form id="invoiceForm" onSubmit={(e) => e.preventDefault()}>
            {/* Business Info */}
            <section className="collapsible">
              <button
            type="button"
             className="section-toggle"
             onClick={() => toggleSection("business")}
                >
                <span>
                  {label(tInv.businessSection, "Business Info")}
                </span>
               <span className="toggle-icon">
                 {openSections.business ? "🔽" : "▶️"}
                </span>
              </button>
              <div className={`section-content ${openSections.business ? "open" : ""}`}>
                <label htmlFor="businessName">
                  {label(tInv.businessName, "Business Name")}
                </label>
                <input
                 value={form.businessName}
                   onChange={(e) => updateForm("businessName", e.target.value)}
                  
                  autoComplete="organization"
                />

                <label htmlFor="kvk">
                  {label(tInv.kvk, "KvK Number")}
                </label>
                <input
                  value={form.kvk}
                 onChange={(e) => updateForm("kvk", e.target.value)}
                  placeholder={label(tInv.kvk, "KvK Number")}
                  autoComplete="off"
                    />

                <label htmlFor="iban">
                  {label(tInv.iban, "IBAN")}
                </label>
                <input
                  value={form.iban}
                  onChange={(e) => updateForm("iban", e.target.value)}
                   placeholder={label(tInv.iban, "IBAN")}
                  autoComplete="iban"
                      />

                <label htmlFor="btw">
                  {label(tInv.btw, "VAT Number")}
                </label>
               <input
                    value={form.btw}
                    onChange={(e) => updateForm("btw", e.target.value)}
                      placeholder={label(tInv.btw, "VAT Number")}
                    autoComplete="off"
                      />

                <label htmlFor="email">
                  {label(tInv.email, "Email")}
                </label>
                <input
                    type="email"
                 value={form.email}
                 onChange={(e) => updateForm("email", e.target.value)}
                  placeholder={label(tInv.email, "Business Email")}
                   autoComplete="email"
                  />

                <label htmlFor="businessAddress">
                  {label(tInv.address, "Business Address")}
                </label>
                <input
                     value={form.businessAddress}
                    onChange={(e) => updateForm("businessAddress", e.target.value)}
                      placeholder={label(tInv.address, "Business Address")}
                 autoComplete="street-address"
                  />

                <label htmlFor="businessPhone">
                  {label(tInv.phone, "Business Phone")}
                </label>
                <input
                   type="tel"
                     value={form.businessPhone}
               onChange={(e) => updateForm("businessPhone", e.target.value)}
                  placeholder={label(tInv.phone, "Business Phone")}
               autoComplete="tel"
                    />
              </div>
            </section>

            {/* Client Info */}
            <section className="collapsible">
             <button
                type="button"
              className="section-toggle"
               onClick={() => toggleSection("client")}
                  >
                <span>
                  {label(tInv.clientSection, "Client Info")}
                </span>
                <span className="toggle-icon">
                        {openSections.client ? "🔽" : "▶️"}
                            </span>
              </button>
              <div className={`section-content ${openSections.client ? "open" : ""}`}>
                <label htmlFor="clientName">
                  {label(tInv.clientName, "Client Name")}
                </label>
                <input
                  value={form.clientName}
                  onChange={(e) => updateForm("clientName", e.target.value)}        
                  autoComplete="organization"
                />

                <label htmlFor="clientEmail">
                  {label(tInv.clientEmail, "Client Email")}
                </label>
                <input
                    value={form.clientEmail}
                onChange={(e) => updateForm("clientEmail", e.target.value)}
                  
                  autoComplete="email"
                />

                <label htmlFor="clientPhone">
                  {label(tInv.clientPhone, "Client Phone")}
                </label>
               <input
              value={form.clientPhone}
                onChange={(e) => updateForm("clientPhone", e.target.value)}

                  autoComplete="tel"
                />

                <label htmlFor="clientAddress">
                  {label(tInv.clientAddress, "Client Address")}
                </label>
               <input
                      value={form.clientAddress}
                  onChange={(e) => updateForm("clientAddress", e.target.value)}
                  autoComplete="street-address"
                />

                <label htmlFor="invoiceDate">
                  {label(tInv.invoiceDate, "Invoice Date")}
                </label>
                <input type="date"
                    value={form.invoiceDate}
                  onChange={(e) => updateForm("invoiceDate", e.target.value)}
                        />

                <label htmlFor="dueDate">
                  {label(tInv.dueDate, "Due Date")}
                </label>
                <input
                type="date"
                   value={form.dueDate}
                     onChange={(e) => updateForm("dueDate", e.target.value)}
                    />

                <label htmlFor="invoiceNumber">
                  {label(
                    tInv.invoiceNumber,
                    "Invoice Number"
                  )}
                </label>
                <input
                  value={form.invoiceNumber}
  readOnly
                    />

                <label htmlFor="status">
                  {label(tInv.status, "status")}
                </label>
                <select
                value={form.status}
                  onChange={(e) =>
  updateForm("status", e.target.value as InvoiceStatus)
}

                  autoComplete="off"
                >
                  <option value="draft">
                    {tInv.statusdraft ?? "draft"}
                  </option>
                  <option value="sent">
                    {tInv.statussent ?? "sent"}
                  </option>
                  <option value="paid">
                    {tInv.statuspaid ?? "paid"}
                  </option>
                </select>
              </div>
            </section>

            {/* Items */}
            <section>
              <h2>{label(tInv.itemsSection, "Items")}</h2>
              <table>
                <thead>
                  <tr>
                    <th>
                      {label(
                        tInv.desc,
                        "Description"
                      )}
                    </th>
                    <th>{label(tInv.qty, "Qty")}</th>
                    <th>{label(tInv.price, "Price")}</th>
                    <th>{label(tInv.vat, "VAT %")}</th>
                    <th>{label(tInv.total, "Total")}</th>
                    <th>{label(tInv.action, "Action")}</th>
                  </tr>
                </thead>
                <tbody>
  {itemsState.map((item, i) => {
    const line = item.qty * item.price;
    const vat = (line * item.vat) / 100;

    return (
      <tr key={item.id}>
        <td>
          <input
            value={item.desc}
            onChange={(e) =>
              updateItem(i, "desc", e.target.value)
            }
          />
        </td>

        <td>
          <input
            type="number"
            value={item.qty}
            onChange={(e) =>
              updateItem(i, "qty", e.target.value === "" ? 0 : Number(e.target.value))
            }
          />
        </td>

        <td>
          <input
            type="number"
            value={item.price}
            onChange={(e) =>
              updateItem(i, "price", e.target.value === "" ? 0 : Number(e.target.value)
              )
            }
          />
        </td>

        <td>
          <select
            value={item.vat}
            onChange={(e) =>
              updateItem(i, "vat", Number(e.target.value))
            }
          >
            <option value={0}>0</option>
            <option value={9}>9</option>
            <option value={21}>21</option>
          </select>
        </td>

        <td>€{(line + vat).toFixed(2)}</td>

        <td>
          <button type="button" onClick={() => removeItem(i)}>
            ❌
          </button>
        </td>
      </tr>
    );
  })}
</tbody>
              </table>
              <button
                type="button"
                className="btn"
                onClick={handleAddItemClick}
              >
                {label(tInv.addItem, "Add Item")}
              </button>
            </section>

            {/* Summary */}
            <section>
              <h2>{label(tInv.summarySection, "Summary")}</h2>
              <p>
                {label(tInv.subtotal, "Subtotal")}:{" "}
               <span>€{totals.subtotal.toFixed(2)}</span>
              </p>
              <p>
                {label(tInv.totalVat, "Total VAT")}:{" "}
                <span>€{totals.totalVat.toFixed(2)}</span>
              </p>
              <p>
                {label(tInv.grandTotal, "Total")}:{" "}
                <span>€{totals.grandTotal.toFixed(2)}</span>
              </p>
              <textarea
            value={form.note}
            onChange={(e) => updateForm("note", e.target.value)}
             placeholder={label(tInv.note, "Note...")}
              />
            </section>

           

            {/* Signatures */}
             <h2>{label(tInv.signSection, "Signatures")}</h2>
            <section className="signatures-wrap">
              
              <div className="signature-box">
                <h3>{label(tInv.business, "Business")}</h3>
                <canvas
                  ref={businessCanvasRef}
                  width={320}
                  height={150}
                  className="signature"
                />
                <button
                  type="button"
                  onClick={clearBusinessSignature}
                >
                  {label(tInv.clear, "Clear")}
                </button>
                <p>
                  {label(tInv.date, "Date")}:{" "}
                 <span>{signatures.businessDate}</span>
                </p>
              </div>

              <div className="signature-box">
                <h3>{label(tInv.client, "Client")}</h3>
                <canvas
                  ref={clientCanvasRef}
                    width={320}

                  height={150}
                 className="signature"
                    />
                <button
                  type="button"
                  onClick={clearClientSignature}
                >
                  {label(tInv.clear, "Clear")}
                </button>
                <p>
                  {label(tInv.date, "Date")}:{" "}
                 <span>{signatures.clientDate}</span>
                </p>
              </div>
            </section>

            {/* Actions */}
            <section className="step actions">
              <button
                type="button"
                id="saveBtn"
                className="btn"
                onClick={handleSaveClick}
                disabled={saving}
              >
                {label(tInv.btnSave, "Save Invoice")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleGoToList}
              >
                {label(tInv.btnSaved, "Saved Invoices")}
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



