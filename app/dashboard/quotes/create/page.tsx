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

import { auth, db } from "@/lib/firebase";
import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import { serverTimestamp } from "firebase/firestore";
import type { FieldValue, Timestamp } from "firebase/firestore";


// ✅ Використовуємо ті ж стилі, що й для інвойсів
import "../../invoices/create/invoice.css";

// ===== TYPES =====

interface QuoteItem {
  desc: string;
  qty: number;
  price: number;
  vat: number;
}

interface QuoteSignatures {
  business?: string;
  businessDate?: string;

  // для сумісності з старими quote-ами можна залишити:
  client?: string;
  clientDate?: string;
}

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";

interface QuoteData {
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

  quoteDate?: string;
  validUntil?: string;
  quoteNumber?: string;
  status?: QuoteStatus;
  note?: string;
  subtotalFormatted?: string;
  totalVatFormatted?: string;
  grandTotalFormatted?: string;

  items?: QuoteItem[];

  subtotal?: number;
  totalVat?: number;
  grandTotal?: number;

  signatures?: QuoteSignatures;

  /* 🔑 для дашборду / хуків */
  uid?: string;
  number?: string;
  total?: number;
  clientId?: string | null;

  /* 🔑 ДАТИ */
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
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

// невеликий хелпер для i18n
const label = (value: string | undefined, fallback: string) =>
  value ?? fallback;

export default function QuoteCreatePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { language } = useLanguage();
  const tRoot = useTranslation(language);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const tQuote: any = tRoot?.quotes || {};

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

  /* ========== SIGNATURES (ONLY BUSINESS) ========== */

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
  }

  /* ========== DATES (quoteDate + validUntil) ========== */

  function initDates() {
    const qd = $("quoteDate") as HTMLInputElement | null;
    const vu = $("validUntil") as HTMLInputElement | null;
    if (!qd || !vu) return;

    qd.type = "date";
    vu.type = "date";

    qd.addEventListener("change", () => {
      if (!qd.value) return;
      const d = new Date(qd.value);
      if (Number.isNaN(d.getTime())) return;
      d.setDate(d.getDate() + 14);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      vu.value = `${y}-${m}-${dd}`;
    });
  }

  /* ========== FIRESTORE: QUOTE NUMBER ========== */

  async function previewNextQuoteNumber(uid: string) {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      const last = snap.exists()
        ? ((snap.data().lastQuoteNumber as number) || 0)
        : 0;
      const next = last + 1;
      const preview = `QUO-${new Date().getFullYear()}-${String(next).padStart(
        3,
        "0"
      )}`;
      const quoteNumberInput = $("quoteNumber") as HTMLInputElement | null;
      if (quoteNumberInput && !quoteNumberInput.value) {
        quoteNumberInput.placeholder = preview;
      }
    } catch {
      // ignore
    }
  }

  async function generateQuoteNumber(uid: string) {
    const ref = doc(db, "users", uid);
    const year = new Date().getFullYear();
    let final = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const last = snap.exists()
        ? ((snap.data().lastQuoteNumber as number) || 0)
        : 0;
      const next = last + 1;
      final = `QUO-${year}-${String(next).padStart(3, "0")}`;
      tx.set(ref, { lastQuoteNumber: next }, { merge: true });
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
      if ($("clientName")) {
        ($("clientName") as HTMLInputElement).value = c.clientName ?? "";
      }
      if ($("clientEmail")) {
        ($("clientEmail") as HTMLInputElement).value = c.email ?? "";
      }
      if ($("clientPhone")) {
        ($("clientPhone") as HTMLInputElement).value = c.phone ?? "";
      }
      if ($("clientAddress")) {
        ($("clientAddress") as HTMLInputElement).value = c.address ?? "";
      }
      // 🔑 зберігаємо clientId для saveQuote
      if (c.clientId) {
         localStorage.setItem("quoteClientId", c.clientId);
      }
      console.log("✅ Client data autofilled into Quote");
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

  /* ========== LOG EVENT ========== */

  async function logEvent(uid: string, type: string, message: string) {
    try {
      await addDoc(collection(db, "users", uid, "events"), {
        type,
        message,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn("Event log error:", e);
    }
  }

  /* ========== LOAD FOR EDIT ========== */

  async function loadForEdit(uid: string) {
    const id = localStorage.getItem("editQuoteId");
    if (!id) return;

    const ref = doc(db, "users", uid, "quotes", id);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      localStorage.removeItem("editQuoteId");
      return;
    }
    const q = snap.data() as QuoteData & {
      signatures?: QuoteSignatures;
    };
    if (q.clientId) {
  localStorage.setItem("quoteClientId", q.clientId);
}

    (($("businessName") as HTMLInputElement | null)!).value =
      q.businessName ?? "";
    (($("kvk") as HTMLInputElement | null)!).value = q.kvk ?? "";
    (($("iban") as HTMLInputElement | null)!).value = q.iban ?? "";
    (($("btw") as HTMLInputElement | null)!).value = q.btw ?? "";
    (($("email") as HTMLInputElement | null)!).value = q.email ?? "";
    (($("businessAddress") as HTMLInputElement | null)!).value =
      q.businessAddress ?? "";
    (($("businessPhone") as HTMLInputElement | null)!).value =
      q.businessPhone ?? "";

    (($("clientName") as HTMLInputElement | null)!).value =
      q.clientName ?? "";
    (($("clientEmail") as HTMLInputElement | null)!).value =
      q.clientEmail ?? "";
    (($("clientPhone") as HTMLInputElement | null)!).value =
      q.clientPhone ?? "";
    (($("clientAddress") as HTMLInputElement | null)!).value =
      q.clientAddress ?? "";

    (($("quoteDate") as HTMLInputElement | null)!).value =
      q.quoteDate ?? "";
    (($("validUntil") as HTMLInputElement | null)!).value =
      q.validUntil ?? "";
    (($("quoteNumber") as HTMLInputElement | null)!).value =
      q.quoteNumber ?? "";
    (($("status") as HTMLSelectElement | null)!).value =
      q.status ?? "draft";
    (($("note") as HTMLTextAreaElement | null)!).value = q.note ?? "";

    const itemsBody = $("itemsBody");
    if (itemsBody) {
      itemsBody.innerHTML = "";
      (q.items ?? []).forEach((it: QuoteItem) =>
        addItem(it.desc, it.qty, it.price, it.vat)
      );
      if ((q.items ?? []).length === 0) addItem();
    }

    if (q.signatures?.business) {
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
      img.src = q.signatures.business;
      const span = $("signatureBusinessDate");
      if (span) span.textContent = q.signatures.businessDate ?? "";
    }

    updateTotals();
  }

  /* ========== SAVE (create/update) ========== */

  async function saveQuote() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.push("/login");
      return;
    }
    const uid = currentUser.uid;

    const items: QuoteItem[] = [];
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
    const businessSig = businessCanvas?.toDataURL() ?? "";

    const editingId = localStorage.getItem("editQuoteId") || null;

    let quoteNumber =
  (($("quoteNumber") as HTMLInputElement | null)?.value ?? "").trim();

    if (!editingId && !quoteNumber) {
      quoteNumber = await generateQuoteNumber(uid);
      const quoteInput = $("quoteNumber") as HTMLInputElement | null;
      if (quoteInput) quoteInput.value = quoteNumber;
    }

    const statusRaw =
  (($("status") as HTMLSelectElement | null)?.value ?? "draft");

const normalizedStatus = statusRaw.toLowerCase() as
  | "draft"
  | "sent"
  | "accepted"
  | "rejected";



   const data = {

      /* ================= DASHBOARD CONTRACT ================= */
      uid,                       // 🔑 для useQuotes
      number: quoteNumber ?? "", // 🔑
      status: normalizedStatus,  // 🔑 lowercase
      total: grandTotal,         // 🔑          
      clientId: localStorage.getItem("quoteClientId") ?? null,                     
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      

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

      quoteDate:
        (($("quoteDate") as HTMLInputElement | null)?.value ?? ""),
      validUntil:
        (($("validUntil") as HTMLInputElement | null)?.value ?? ""),
      quoteNumber: quoteNumber ?? "",
     
      note: (($("note") as HTMLTextAreaElement | null)?.value ?? ""),

      items,
      subtotal,
      totalVat,
      grandTotal,
      subtotalFormatted: "€" + subtotal.toFixed(2),
      totalVatFormatted: "€" + totalVat.toFixed(2),
      grandTotalFormatted: "€" + grandTotal.toFixed(2),

      signatures: {
        business: businessSig,
        businessDate: $("signatureBusinessDate")?.textContent ?? "",
      },

     
      
    };

    if (editingId) {
      await setDoc(doc(db, "users", uid, "quotes", editingId), data, {
        merge: true,
      });
      alert("✅ Quote updated");
      await logEvent(uid, "Quote", `Quote ${quoteNumber} updated`);
    } else {
      await addDoc(collection(db, "users", uid, "quotes"), data);
      alert(`✅ Quote saved${quoteNumber ? " as " + quoteNumber : ""}`);
      await logEvent(uid, "Quote", `Quote ${quoteNumber} created`);
    }

    localStorage.removeItem("editQuoteId");
    localStorage.removeItem("quoteClientId");
    router.push("/dashboard/quotes/list");
  }

  /* ========== HOOKS ========== */

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

      await previewNextQuoteNumber(firebaseUser.uid);
      await loadProfileData(firebaseUser.uid, firebaseUser.email);
      await loadForEdit(firebaseUser.uid);

      autofillClientFromLocalStorage();
      initCollapsibles();

      setLoading(false);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ініціалізація підпису після того, як DOM і юзер готові
  useEffect(() => {
    if (!user || loading) return;
    setupSignature("signatureBusiness", "signatureBusinessDate");
  }, [user, loading]);

  /* ========== HANDLERS ДЛЯ JSX ========== */

  const handleAddItemClick = () => addItem();

  const handleSaveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    void saveQuote();
  };

  const handleClearBusinessSignature = () =>
    clearSignature("signatureBusiness");

  const handleBackDashboard = () => router.push("/dashboard");
  const handleGoToList = () => router.push("/dashboard/quotes/list");

  if (!user && loading) {
    return (
      <div className="clients-loading">
        <div className="clients-loading-card">Loading quote…</div>
      </div>
    );
  }

  /* ========== RENDER ========== */

  return (
    <>
      <header className="topbar">
        <h1 className="invoice-title">
          {label(tQuote.title, "Quote / Offer")}
        </h1>

        <div className="actions-right">
          <button className="btn" onClick={handleBackDashboard}>
            {label(tQuote.back, "Back to Dashboard")}
          </button>

          <button className="btn" onClick={handleGoToList}>
            {label(tQuote.list, "Saved Quotes")}
          </button>
        </div>
      </header>

      <main className="dash-main invoice-page">
        <div className="dash-content invoice-content">
          <form id="quoteForm">
            {/* Business Info */}
            <section className="collapsible">
              <button type="button" className="section-toggle">
                <span>
                  {label(tQuote.businessSection, "Business Info")}
                </span>
                <span className="toggle-icon">▶️</span>
              </button>
              <div className="section-content">
                <label htmlFor="businessName">
                  {label(tQuote.businessName, "Business Name")}
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  placeholder={label(
                    tQuote.businessName,
                    "Full Name / Business Name"
                  )}
                  autoComplete="organization"
                />

                <label htmlFor="kvk">
                  {label(tQuote.kvk, "KvK Number")}
                </label>
                <input
                  id="kvk"
                  name="kvk"
                  placeholder={label(tQuote.kvk, "KvK Number")}
                  autoComplete="off"
                />

                <label htmlFor="iban">
                  {label(tQuote.iban, "IBAN")}
                </label>
                <input
                  id="iban"
                  name="iban"
                  placeholder={label(tQuote.iban, "IBAN")}
                  autoComplete="iban"
                />

                <label htmlFor="btw">
                  {label(tQuote.btw, "VAT Number")}
                </label>
                <input
                  id="btw"
                  name="btw"
                  placeholder={label(tQuote.btw, "VAT Number")}
                  autoComplete="off"
                />

                <label htmlFor="email">
                  {label(tQuote.email, "Email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={label(
                    tQuote.email,
                    "Business Email"
                  )}
                  autoComplete="email"
                />

                <label htmlFor="businessAddress">
                  {label(tQuote.address, "Business Address")}
                </label>
                <input
                  id="businessAddress"
                  name="businessAddress"
                  placeholder={label(
                    tQuote.address,
                    "Business Address"
                  )}
                  autoComplete="street-address"
                />

                <label htmlFor="businessPhone">
                  {label(tQuote.phone, "Business Phone")}
                </label>
                <input
                  id="businessPhone"
                  name="businessPhone"
                  placeholder={label(
                    tQuote.phone,
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
                  {label(tQuote.clientSection, "Client Info")}
                </span>
                <span className="toggle-icon">▶️</span>
              </button>
              <div className="section-content">
                <label htmlFor="clientName">
                  {label(tQuote.clientName, "Client Name")}
                </label>
                <input
                  id="clientName"
                  name="clientName"
                  placeholder={label(
                    tQuote.clientName,
                    "Client Name"
                  )}
                  autoComplete="organization"
                />

                <label htmlFor="clientEmail">
                  {label(tQuote.clientEmail, "Client Email")}
                </label>
                <input
                  id="clientEmail"
                  name="clientEmail"
                  type="email"
                  placeholder={label(
                    tQuote.clientEmail,
                    "Client Email"
                  )}
                  autoComplete="email"
                />

                <label htmlFor="clientPhone">
                  {label(tQuote.clientPhone, "Client Phone")}
                </label>
                <input
                  id="clientPhone"
                  name="clientPhone"
                  type="tel"
                  placeholder="+31 6 12345678"
                  autoComplete="tel"
                />

                <label htmlFor="clientAddress">
                  {label(tQuote.clientAddress, "Client Address")}
                </label>
                <input
                  id="clientAddress"
                  name="clientAddress"
                  placeholder={label(
                    tQuote.clientAddress,
                    "Client Address"
                  )}
                  autoComplete="street-address"
                />

                <label htmlFor="quoteDate">
                  {label(tQuote.quoteDate, "Quote Date")}
                </label>
                <input id="quoteDate" name="quoteDate" type="date" />

                <label htmlFor="validUntil">
                  {label(tQuote.validUntil, "Valid Until")}
                </label>
                <input id="validUntil" name="validUntil" type="date" />

                <label htmlFor="quoteNumber">
                  {label(
                    tQuote.quoteNumber,
                    "Quote Number"
                  )}
                </label>
                <input
                  id="quoteNumber"
                  name="quoteNumber"
                  readOnly
                  placeholder={label(
                    tQuote.quoteNumber,
                    "Quote Number"
                  )}
                />

                <label htmlFor="status">
                  {label(tQuote.status, "Status")}
                </label>
                <select
                  id="status"
                  name="status"
                  autoComplete="off"
                >
                  <option value="draft">
                    {tQuote.statusdraft ?? "Draft"}
                  </option>
                  <option value="sent">
                    {tQuote.statussent ?? "Sent"}
                  </option>
                  <option value="accepted">
                    {tQuote.statusaccepted ?? "Accepted"}
                  </option>
                  <option value="rejected">
                    {tQuote.statusrejected ?? "Rejected"}
                  </option>
                </select>
              </div>
            </section>

            {/* Items */}
            <section>
              <h2>{label(tQuote.itemsSection, "Items")}</h2>
              <table>
                <thead>
                  <tr>
                    <th>
                      {label(
                        tQuote.desc,
                        "Description"
                      )}
                    </th>
                    <th>{label(tQuote.qty, "Qty")}</th>
                    <th>{label(tQuote.price, "Price")}</th>
                    <th>{label(tQuote.vat, "VAT %")}</th>
                    <th>{label(tQuote.total, "Total")}</th>
                    <th>{label(tQuote.action, "Action")}</th>
                  </tr>
                </thead>
                <tbody id="itemsBody" />
              </table>
              <button
                type="button"
                className="btn"
                onClick={handleAddItemClick}
              >
                {label(tQuote.addItem, "Add Item")}
              </button>
            </section>

            {/* Summary */}
            <section>
              <h2>{label(tQuote.summarySection, "Summary")}</h2>
              <p>
                {label(tQuote.subtotal, "Subtotal")}:{" "}
                <span id="subtotal">€0.00</span>
              </p>
              <p>
                {label(tQuote.totalVat, "Total VAT")}:{" "}
                <span id="totalVat">€0.00</span>
              </p>
              <p>
                {label(tQuote.grandTotal, "Total")}:{" "}
                <span id="grandTotal">€0.00</span>
              </p>
              <textarea
                id="note"
                name="note"
                placeholder={label(tQuote.note, "Notes...")}
                autoComplete="off"
              />
            </section>

            {/* Signatures (only Business) */}
            <section className="signatures-wrap">
              <h2>{label(tQuote.signSection, "Signatures")}</h2>

              <div className="signature-box">
                <h3>{label(tQuote.business, "Business")}</h3>
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
                  {label(tQuote.clear, "Clear")}
                </button>
                <p>
                  {label(tQuote.date, "Date")}:{" "}
                  <span id="signatureBusinessDate" />
                </p>
              </div>
            </section>

            {/* Actions */}
            <section className="step actions">
              <button
                id="saveBtn"
                className="btn"
                onClick={handleSaveClick}
              >
                {label(tQuote.btnSave, "Save Quote")}
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleGoToList}
              >
                {label(tQuote.btnSaved, "Saved Quotes")}
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