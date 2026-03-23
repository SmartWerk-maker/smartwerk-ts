"use client";

import React, { useEffect, useState } from "react";
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

import { auth, db } from "@/firebase";


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

  const { language } = useLanguage();

  // tRoot може бути null → одразу даємо дефолт {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tRoot: any = useTranslation(language) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tInv: any = tRoot.invoices || {};

  // дрібний хелпер
  const $ = (id: string) => document.getElementById(id);

  /* ========== ITEMS & TOTALS ========== */

  function updateTotals() {
    let subtotal = 0;
    let totalVat = 0;

    document.querySelectorAll<HTMLTableRowElement>("#itemsBody tr").forEach(
      (tr) => {
        const qty =
          parseFloat(
            (tr.querySelector<HTMLInputElement>(".qty")?.value ?? "0")
          ) || 0;
        const price =
          parseFloat(
            (tr.querySelector<HTMLInputElement>(".price")?.value ?? "0")
          ) || 0;
        const vat =
          parseFloat(
            (tr.querySelector<HTMLSelectElement>(".vat")?.value ?? "0")
          ) || 0;

        const line = qty * price;
        const v = (line * vat) / 100;
        subtotal += line;
        totalVat += v;

        const totalCell = tr.querySelector<HTMLTableCellElement>(".item-total");
        if (totalCell) {
          totalCell.innerText = "€" + (line + v).toFixed(2);
        }
      }
    );

    const subtotalEl = $("subtotal");
    const totalVatEl = $("totalVat");
    const grandTotalEl = $("grandTotal");

    if (subtotalEl) subtotalEl.innerText = "€" + subtotal.toFixed(2);
    if (totalVatEl) totalVatEl.innerText = "€" + totalVat.toFixed(2);
    if (grandTotalEl) {
      grandTotalEl.innerText = "€" + (subtotal + totalVat).toFixed(2);
    }
  }

  function addItem(desc = "", qty = 1, price = 0, vat = 21) {
    const itemId = Date.now();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="desc" name="itemDesc[]" id="desc-${itemId}" value="${desc}" /></td>
      <td><input class="qty" name="itemQty[]" id="qty-${itemId}" type="number" value="${qty}" min="1" /></td>
      <td><input class="price" name="itemPrice[]" id="price-${itemId}" type="number" value="${price}" step="0.01" /></td>
      <td>
        <select class="vat" name="itemVat[]" id="vat-${itemId}">
          <option value="0"${vat === 0 ? " selected" : ""}>0</option>
          <option value="9"${vat === 9 ? " selected" : ""}>9</option>
          <option value="21"${vat === 21 ? " selected" : ""}>21</option>
        </select>
      </td>
      <td class="item-total">€0.00</td>
      <td><button type="button" class="btn-del">❌</button></td>
    `;

    tr.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "input,select"
    ).forEach((el) => {
      el.addEventListener("input", updateTotals);
    });

    tr.querySelector<HTMLButtonElement>(".btn-del")?.addEventListener(
      "click",
      () => {
        tr.remove();
        updateTotals();
      }
    );

    document.getElementById("itemsBody")?.appendChild(tr);
    updateTotals();
  }

  /* ========== SIGNATURES ========== */

  function setupSignature(canvasId: string, dateId: string) {
    const canvas = document.getElementById(
      canvasId
    ) as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drawing = false;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX =
        "touches" in e
          ? e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
          : (e as MouseEvent).clientX;
      const clientY =
        "touches" in e
          ? e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0
          : (e as MouseEvent).clientY;

      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000";
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const end = () => {
      if (!drawing) return;
      drawing = false;
      const dateSpan = document.getElementById(dateId);
      if (dateSpan) {
        dateSpan.textContent = new Date().toLocaleDateString("nl-NL");
      }
    };

    // MOUSE
    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);

    // TOUCH
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: false });
  }

  function clearSignature(id: string) {
    const canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (id === "signatureBusiness") {
      const span = document.getElementById("signatureBusinessDate");
      if (span) span.textContent = "";
    }

    if (id === "signatureClient") {
      const span = document.getElementById("signatureClientDate");
      if (span) span.textContent = "";
    }
  }

  /* ========== DATES (без flatpickr) ========== */

  function initDates() {
    const inv = $("invoiceDate") as HTMLInputElement | null;
    const due = $("dueDate") as HTMLInputElement | null;
    if (!inv || !due) return;

    inv.type = "date";
    due.type = "date";

    inv.addEventListener("change", () => {
      if (!inv.value) return;
      const d = new Date(inv.value);
      if (Number.isNaN(d.getTime())) return;
      d.setDate(d.getDate() + 14);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      due.value = `${y}-${m}-${dd}`;
    });
  }

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
      const invoiceNumberInput = $("invoiceNumber") as HTMLInputElement | null;
      if (invoiceNumberInput && !invoiceNumberInput.value) {
        invoiceNumberInput.placeholder = preview;
      }
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

      if (userEmail && $("email")) {
        ($("email") as HTMLInputElement).value = userEmail;
      }

      if (p.companyName && $("businessName")) {
        ($("businessName") as HTMLInputElement).value = p.companyName;
      }

      if (p.kvk && $("kvk")) {
        ($("kvk") as HTMLInputElement).value = p.kvk;
      }

      if (p.iban && $("iban")) {
        ($("iban") as HTMLInputElement).value = p.iban;
      }

      if (p.vatNumber && $("btw")) {
        ($("btw") as HTMLInputElement).value = p.vatNumber;
      }

      if (p.phone && $("businessPhone")) {
        ($("businessPhone") as HTMLInputElement).value = p.phone;
      }

      const addressParts = [p.city, p.country].filter(Boolean).join(", ");
      if (addressParts && $("businessAddress")) {
        ($("businessAddress") as HTMLInputElement).value = addressParts;
      }
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
    ($("clientName") as HTMLInputElement | null)!.value = c.clientName ?? "";
    ($("clientEmail") as HTMLInputElement | null)!.value = c.email ?? "";
    ($("clientPhone") as HTMLInputElement | null)!.value = c.phone ?? "";
    ($("clientAddress") as HTMLInputElement | null)!.value = c.address ?? "";

    // 🔑 ЗБЕРІГАЄМО clientId ДЛЯ FIRESTORE
    localStorage.setItem("invoiceClientId", c.clientId);

  } catch (e) {
    console.error("Client parse error:", e);
  } finally {
    localStorage.removeItem("selectedClient");
  }
}

  /* ========== COLLAPSIBLES ========== */

  function initCollapsibles() {
    document
      .querySelectorAll<HTMLButtonElement>(".section-toggle")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const content = button.nextElementSibling as HTMLElement | null;
          const icon = button.querySelector<HTMLElement>(".toggle-icon");
          if (!content) return;
          const isOpen = content.classList.toggle("open");
          if (icon) icon.textContent = isOpen ? "🔽" : "▶️";
        });
      });
  }

 

  /* ========== LOAD FOR EDIT ========== */

  async function loadForEdit(uid: string) {
    const id = localStorage.getItem("editInvoiceId");
    if (!id) return;

    const ref = doc(db, "users", uid, "invoices", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      localStorage.removeItem("editInvoiceId");
      return;
    }
    const inv = snap.data() as InvoiceData & {
      signatures?: InvoiceSignatures;
      
    };
    if (inv.clientId) {
  localStorage.setItem("invoiceClientId", inv.clientId);
}
    

    (($("businessName") as HTMLInputElement | null)!).value =
      inv.businessName ?? "";
    (($("kvk") as HTMLInputElement | null)!).value = inv.kvk ?? "";
    (($("iban") as HTMLInputElement | null)!).value = inv.iban ?? "";
    (($("btw") as HTMLInputElement | null)!).value = inv.btw ?? "";
    (($("email") as HTMLInputElement | null)!).value = inv.email ?? "";
    (($("businessAddress") as HTMLInputElement | null)!).value =
      inv.businessAddress ?? "";
    (($("businessPhone") as HTMLInputElement | null)!).value =
      inv.businessPhone ?? "";

    (($("clientName") as HTMLInputElement | null)!).value =
      inv.clientName ?? "";
    (($("clientEmail") as HTMLInputElement | null)!).value =
      inv.clientEmail ?? "";
    (($("clientPhone") as HTMLInputElement | null)!).value =
      inv.clientPhone ?? "";
    (($("clientAddress") as HTMLInputElement | null)!).value =
      inv.clientAddress ?? "";

    (($("invoiceDate") as HTMLInputElement | null)!).value =
      inv.invoiceDate ?? "";
    (($("dueDate") as HTMLInputElement | null)!).value = inv.dueDate ?? "";
    (($("invoiceNumber") as HTMLInputElement | null)!).value =
      inv.invoiceNumber ?? "";
    (($("status") as HTMLSelectElement | null)!).value =
      inv.status ?? "draft";
    (($("note") as HTMLTextAreaElement | null)!).value = inv.note ?? "";

    const itemsBody = $("itemsBody");
    if (itemsBody) {
      itemsBody.innerHTML = "";
      (inv.items ?? []).forEach((it: InvoiceItem) =>
        addItem(it.desc, it.qty, it.price, it.vat)
      );
      if ((inv.items ?? []).length === 0) addItem();
    }

    if (inv.signatures?.business) {
      const img = new Image();
      img.onload = () => {
        const c = $("signatureBusiness") as HTMLCanvasElement | null;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        c.width = c.offsetWidth;
        c.height = c.offsetHeight;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
      };
      img.src = inv.signatures.business;
      const span = $("signatureBusinessDate");
      if (span) span.textContent = inv.signatures.businessDate ?? "";
    }

    if (inv.signatures?.client) {
      const img = new Image();
      img.onload = () => {
        const c = $("signatureClient") as HTMLCanvasElement | null;
        if (!c) return;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        c.width = c.offsetWidth;
        c.height = c.offsetHeight;
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
      };
      img.src = inv.signatures.client;
      const span = $("signatureClientDate");
      if (span) span.textContent = inv.signatures.clientDate ?? "";
    }

    updateTotals();
  }

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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    const uid = currentUser.uid;

    const items: InvoiceItem[] = [];
    document.querySelectorAll<HTMLTableRowElement>("#itemsBody tr").forEach(
      (tr) => {
        items.push({
          desc:
            tr.querySelector<HTMLInputElement>(".desc")?.value.trim() ?? "",
          qty:
            parseFloat(
              tr.querySelector<HTMLInputElement>(".qty")?.value ?? "0"
            ) || 0,
          price:
            parseFloat(
              tr.querySelector<HTMLInputElement>(".price")?.value ?? "0"
            ) || 0,
          vat:
            parseFloat(
              tr.querySelector<HTMLSelectElement>(".vat")?.value ?? "0"
            ) || 0,
        });
      }
    );

    const subtotal =
      parseFloat(($("subtotal")?.textContent ?? "").replace(/[^\d.-]/g, "")) ||
      0;
    const totalVat =
      parseFloat(
        ($("totalVat")?.textContent ?? "").replace(/[^\d.-]/g, "")
      ) || 0;
    const grandTotal = subtotal + totalVat;

    const businessCanvas = $(
      "signatureBusiness"
    ) as HTMLCanvasElement | null;
    const clientCanvas = $("signatureClient") as HTMLCanvasElement | null;

    const businessSig = businessCanvas?.toDataURL() ?? "";
    const clientSig = clientCanvas?.toDataURL() ?? "";

    const editingId = localStorage.getItem("editInvoiceId") || null;

    let invoiceNumber = (
      (($("invoiceNumber") as HTMLInputElement | null) ?? { value: "" })
        .value || ""
    ).trim();

    if (!editingId && !invoiceNumber) {
      invoiceNumber = await generateInvoiceNumber(uid);
      const invoiceInput = $("invoiceNumber") as HTMLInputElement | null;
      if (invoiceInput) invoiceInput.value = invoiceNumber;
    }

    const statusRaw =
  (($("status") as HTMLSelectElement | null)?.value ?? "draft");

const normalizedStatus = statusRaw.toLowerCase() as
  | "draft"
  | "sent"
  | "paid";



const data: InvoiceFirestoreMeta & InvoiceData = {

  /* ================= DASHBOARD CONTRACT ================= */
  uid,                             // 🔑 для useInvoices
  number: invoiceNumber,           // 🔑
  status: normalizedStatus,        // 🔑 lowercase
  total: grandTotal,               // 🔑
  createdAt: serverTimestamp(), // 🔑
  updatedAt: serverTimestamp(),
  clientId: localStorage.getItem("invoiceClientId") ?? null,                // 🔑

  /* ================= FORM / UI DATA ================= */
  businessName:
    (($("businessName") as HTMLInputElement | null)?.value ?? ""),
  kvk: (($("kvk") as HTMLInputElement | null)?.value ?? ""),
  iban: (($("iban") as HTMLInputElement | null)?.value ?? ""),
  btw: (($("btw") as HTMLInputElement | null)?.value ?? ""),
  email: (($("email") as HTMLInputElement | null)?.value ?? ""),
  businessAddress:
    (($("businessAddress") as HTMLInputElement | null)?.value ?? ""),
  businessPhone:
    (($("businessPhone") as HTMLInputElement | null)?.value ?? ""),

  clientName:
    (($("clientName") as HTMLInputElement | null)?.value ?? ""),
  clientEmail:
    (($("clientEmail") as HTMLInputElement | null)?.value ?? ""),
  clientPhone:
    (($("clientPhone") as HTMLInputElement | null)?.value ?? ""),
  clientAddress:
    (($("clientAddress") as HTMLInputElement | null)?.value ?? ""),

  invoiceDate:
    (($("invoiceDate") as HTMLInputElement | null)?.value ?? ""),
  dueDate:
    (($("dueDate") as HTMLInputElement | null)?.value ?? ""),
  invoiceNumber,
  note:
    (($("note") as HTMLTextAreaElement | null)?.value ?? ""),

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
    businessDate:
      $("signatureBusinessDate")?.textContent ?? "",
    clientDate:
      $("signatureClientDate")?.textContent ?? "",
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
  }
  

  /* ========== HOOKS ========== */

  // інит даних / форми
  /* eslint-disable react-hooks/exhaustive-deps */
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      router.push("/login");
      return;
    }

    setUser(firebaseUser);

    initDates();
    if (!document.querySelector("#itemsBody tr")) addItem();
    updateTotals();

    await previewNextInvoiceNumber(firebaseUser.uid);
    await loadProfileData(firebaseUser.uid, firebaseUser.email);
    await loadForEdit(firebaseUser.uid);

    autofillClientFromLocalStorage();
    initCollapsibles();

    setLoading(false);
  });

  return () => unsub();
}, []);
/* eslint-enable react-hooks/exhaustive-deps */

  // ініціалізація підписів після того, як DOM готовий
  useEffect(() => {
    if (!user || loading) return;
    setupSignature("signatureBusiness", "signatureBusinessDate");
    setupSignature("signatureClient", "signatureClientDate");
  }, [user, loading]);

  /* ========== HANDLЕРИ ДЛЯ JSX ========== */

  const handleAddItemClick = () => addItem();

  const handleSaveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void saveInvoice();
  };

  const handleClearBusinessSignature = () =>
    clearSignature("signatureBusiness");
  const handleClearClientSignature = () =>
    clearSignature("signatureClient");

  const handleBackDashboard = () => router.push("/dashboard");
  const handleGoToList = () =>
    router.push("/dashboard/invoices/list");

  if (!user && loading) {
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
          <form id="invoiceForm">
            {/* Business Info */}
            <section className="collapsible">
              <button type="button" className="section-toggle">
                <span>
                  {label(tInv.businessSection, "Business Info")}
                </span>
                <span className="toggle-icon">▶️</span>
              </button>
              <div className="section-content">
                <label htmlFor="businessName">
                  {label(tInv.businessName, "Business Name")}
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  placeholder={label(
                    tInv.businessName,
                    "Full Name / Business Name"
                  )}
                  autoComplete="organization"
                />

                <label htmlFor="kvk">
                  {label(tInv.kvk, "KvK Number")}
                </label>
                <input
                  id="kvk"
                  name="kvk"
                  placeholder={label(tInv.kvk, "KvK Number")}
                  autoComplete="off"
                />

                <label htmlFor="iban">
                  {label(tInv.iban, "IBAN")}
                </label>
                <input
                  id="iban"
                  name="iban"
                  placeholder={label(tInv.iban, "IBAN")}
                  autoComplete="iban"
                />

                <label htmlFor="btw">
                  {label(tInv.btw, "VAT Number")}
                </label>
                <input
                  id="btw"
                  name="btw"
                  placeholder={label(tInv.btw, "VAT Number")}
                  autoComplete="off"
                />

                <label htmlFor="email">
                  {label(tInv.email, "Email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={label(
                    tInv.email,
                    "Business Email"
                  )}
                  autoComplete="email"
                />

                <label htmlFor="businessAddress">
                  {label(tInv.address, "Business Address")}
                </label>
                <input
                  id="businessAddress"
                  name="businessAddress"
                  placeholder={label(
                    tInv.address,
                    "Business Address"
                  )}
                  autoComplete="street-address"
                />

                <label htmlFor="businessPhone">
                  {label(tInv.phone, "Business Phone")}
                </label>
                <input
                  id="businessPhone"
                  name="businessPhone"
                  placeholder={label(
                    tInv.phone,
                    "Business Phone"
                  )}
                  type="tel"
                  autoComplete="tel"
                />
              </div>
            </section>

            {/* Client Info */}
            <section className="collapsible">
              <button type="button" className="section-toggle">
                <span>
                  {label(tInv.clientSection, "Client Info")}
                </span>
                <span className="toggle-icon">▶️</span>
              </button>
              <div className="section-content">
                <label htmlFor="clientName">
                  {label(tInv.clientName, "Client Name")}
                </label>
                <input
                  id="clientName"
                  name="clientName"
                  placeholder={label(
                    tInv.clientName,
                    "Client Name"
                  )}
                  autoComplete="organization"
                />

                <label htmlFor="clientEmail">
                  {label(tInv.clientEmail, "Client Email")}
                </label>
                <input
                  id="clientEmail"
                  name="clientEmail"
                  type="email"
                  placeholder={label(
                    tInv.clientEmail,
                    "Client Email"
                  )}
                  autoComplete="email"
                />

                <label htmlFor="clientPhone">
                  {label(tInv.clientPhone, "Client Phone")}
                </label>
                <input
                  id="clientPhone"
                  name="clientPhone"
                  type="tel"
                  placeholder="+31 6 12345678"
                  autoComplete="tel"
                />

                <label htmlFor="clientAddress">
                  {label(tInv.clientAddress, "Client Address")}
                </label>
                <input
                  id="clientAddress"
                  name="clientAddress"
                  placeholder={label(
                    tInv.clientAddress,
                    "Client Address"
                  )}
                  autoComplete="street-address"
                />

                <label htmlFor="invoiceDate">
                  {label(tInv.invoiceDate, "Invoice Date")}
                </label>
                <input id="invoiceDate" type="date" />

                <label htmlFor="dueDate">
                  {label(tInv.dueDate, "Due Date")}
                </label>
                <input id="dueDate" type="date" />

                <label htmlFor="invoiceNumber">
                  {label(
                    tInv.invoiceNumber,
                    "Invoice Number"
                  )}
                </label>
                <input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  readOnly
                  placeholder={label(
                    tInv.invoiceNumber,
                    "Invoice Number"
                  )}
                />

                <label htmlFor="status">
                  {label(tInv.status, "status")}
                </label>
                <select
                  id="status"
                  name="status"
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
                <tbody id="itemsBody" data-managed="imperative" />
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
                <span id="subtotal">€0.00</span>
              </p>
              <p>
                {label(tInv.totalVat, "Total VAT")}:{" "}
                <span id="totalVat">€0.00</span>
              </p>
              <p>
                {label(tInv.grandTotal, "Total")}:{" "}
                <span id="grandTotal">€0.00</span>
              </p>
              <textarea
                id="note"
                name="note"
                placeholder={label(tInv.note, "Note...")}
                autoComplete="off"
              />
            </section>

           

            {/* Signatures */}
            <section className="signatures-wrap">
              <h2>{label(tInv.signSection, "Signatures")}</h2>

              <div className="signature-box">
                <h3>{label(tInv.business, "Business")}</h3>
                <canvas
                  id="signatureBusiness"
                  width={300}
                  height={150}
                  className="signature"
                />
                <button
                  type="button"
                  onClick={handleClearBusinessSignature}
                >
                  {label(tInv.clear, "Clear")}
                </button>
                <p>
                  {label(tInv.date, "Date")}:{" "}
                  <span id="signatureBusinessDate" />
                </p>
              </div>

              <div className="signature-box">
                <h3>{label(tInv.client, "Client")}</h3>
                <canvas
                  id="signatureClient"
                  width={300}
                  height={150}
                  className="signature"
                />
                <button
                  type="button"
                  onClick={handleClearClientSignature}
                >
                  {label(tInv.clear, "Clear")}
                </button>
                <p>
                  {label(tInv.date, "Date")}:{" "}
                  <span id="signatureClientDate" />
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


