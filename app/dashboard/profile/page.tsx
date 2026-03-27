"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { Timestamp } from "firebase/firestore";


import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import { validateUniqueFields } from "./logic";
import "./profile.css";

type UserProfile = {
  fullName?: string;
  companyName?: string;
  phone?: string;
  city?: string;
  country?: string;
  kvk?: string;
  iban?: string;
  vatNumber?: string;
  plan?: string;
  trialEndsAt?: string | Timestamp;
};

interface BillingPortalResponse {
  url?: string;
  error?: string;
  [key: string]: unknown;
}

type ProfileI18n = {
  actions?: {
    back?: string;
    save?: string;
    saving?: string;
  };

  sections?: {
    account?: string;
    basic?: string;
    plan?: string;
    details?: string;
  };

  status?: {
    label?: string;
    emailVerified?: string;
    emailNotVerified?: string;
    resendVerification?: string;
  };

  plan?: {
    current?: string;
    trialStatus?: string;
    upgrade?: string;
    manageBilling?: string;
  };

  fields?: {
    fullName?: string;
    fullNamePlaceholder?: string;
    companyName?: string;
    companyNamePlaceholder?: string;
    phone?: string;
    city?: string;
    country?: string;
    kvk?: string;
    iban?: string;
    vat?: string;
  };

  messages?: {
    loading?: string;
    saved?: string;
    loadError?: string;
  };
};

type CommonI18n = {
  backToDashboard?: string;
  saving?: string;
  opening?: string;
};
async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}


export default function ProfilePage() {
  const router = useRouter();

  /* ===== i18n ===== */
  const { language } = useLanguage();
 

const tRootRaw = useTranslation(language);

const tRoot = (tRootRaw && typeof tRootRaw === "object"
  ? tRootRaw
  : {}) as {
  profile?: ProfileI18n;
  common?: CommonI18n;
};

const tProfile: ProfileI18n = tRoot.profile ?? {};
const tCommon: CommonI18n = tRoot.common ?? {};

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");



  // локальні стейти форми
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [kvk, setKvk] = useState("");
  const [iban, setIban] = useState("");
  const [vatNumber, setVatNumber] = useState("");

  function showError(msg: string) {
    setError(msg);
    setOk("");
  }

  function showSuccess(msg: string) {
    setOk(msg);
    setError("");
  }

  // 1) Auth guard + завантаження профілю через API
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setFirebaseUser(user);

      try {
        const token = await user.getIdToken();

        const res = await fetch("/api/profile/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const dbProfile = (await res.json()) as UserProfile;

        const merged: UserProfile = {
          plan: dbProfile.plan || "FREE",
          ...dbProfile,
        };

        setProfile(merged);
        setFullName(merged.fullName || "");
        setCompanyName(merged.companyName || "");
        setPhone(merged.phone || "");
        setCity(merged.city || "");
        setCountry(merged.country || "");
        setKvk(merged.kvk || "");
        setIban(merged.iban || "");
        setVatNumber(merged.vatNumber || "");
      } catch (err) {
        console.error("Profile load error:", err);
      showError(tProfile.messages?.loadError ?? "Could not load profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]); // 

  // 2) Обчислення статусу плану / trial
  const plan = (profile.plan || "FREE").toUpperCase();

  function getTrialInfo() {
    if (!profile.trialEndsAt) return null;

    let endDate: Date | null = null;

    if (profile.trialEndsAt instanceof Timestamp) {
      endDate = profile.trialEndsAt.toDate();
    } else if (typeof profile.trialEndsAt === "string") {
      endDate = new Date(profile.trialEndsAt);
    }

    if (!endDate || isNaN(endDate.getTime())) return null;

    const now = new Date();
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return "Trial expired";

    return `${diffDays} days left`;
  }

  const trialInfo = plan === "TRIAL" ? getTrialInfo() : null;

  // 3) Зберегти профіль (через API)
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;

    try {
      setSaving(true);
      setError("");
      setOk("");

      // Валідація унікальності
      const validation = await validateUniqueFields(
        firebaseUser.uid,
        kvk,
        iban,
        vatNumber
      );

      if (validation.kvkTaken) return showError("This KvK number is already registered.");
      if (validation.ibanTaken) return showError("This IBAN is already used.");
      if (validation.vatTaken) return showError("This VAT / BTW number is already used.");

      const token = await firebaseUser.getIdToken();

      const res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          profile: {
            fullName,
            companyName,
            phone,
            city,
            country,
            kvk,
            iban,
            vatNumber,
            plan: profile.plan || "FREE",
          },
        }),
      });

      const data = await res.json();

      if (!data.ok) return showError("Could not save profile.");

    showSuccess(tProfile.messages?.saved ?? "Profile saved.");
      setProfile((p) => ({
  ...p,
  fullName,
  companyName,
  phone,
  city,
  country,
  kvk,
  iban,
  vatNumber,
}));
    } catch (err) {
      console.error("Save error:", err);
      showError("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  // 4) Повторна відправка листа верифікації
  async function resendVerification() {
    if (!firebaseUser) return;

    try {
      await sendEmailVerification(firebaseUser);
      showSuccess("Verification email sent.");
    } catch {
      showError("Could not send verification email.");
    }
  }

  // 5) Stripe Billing Portal
  async function openBillingPortal() {
    if (!firebaseUser) return;

    try {
      setBillingLoading(true);
      const token = await firebaseUser.getIdToken();

      const res = await fetch("/api/stripe/create-portal", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      const data = await safeJson<BillingPortalResponse>(res);
      if (data?.url) window.location.href = data.url;
      else showError("Could not open billing portal.");
    } finally {
      setBillingLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page loading-state">
        <div className="profile-card">
         <p>{tProfile.messages?.loading ?? "Loading profile…"}</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  const emailVerified = firebaseUser.emailVerified;

  const planLabel =
  plan === "FREE"
    ? "FREE"
    : plan === "TRIAL"
    ? "TRIAL"
    : plan === "PRO"
    ? "PRO"
    : plan;

  return (
  <div className="profile-page">
    {/* TOPBAR */}
    
      <div className="profile-topbar">
        <Link href="/dashboard" className="link-ghost">
          ← {tProfile.actions?.back ?? "Back to Dashboard"}
        </Link>
      </div>

    <main className="profile-layout">
      {/* SUMMARY */}
      <section className="profile-summary">
       <h2>{tProfile.sections?.account ?? "Account"}</h2>
        {/* BASIC */}
        <div className="summary-block">
         <h3>{tProfile.sections?.basic ?? "Basic"}</h3>

          <p className="summary-email">{firebaseUser.email}</p>

          <p className="summary-label">
           {tProfile.status?.label ?? "Status"}:{" "}
            <span
              className={
                emailVerified ? "chip chip-ok" : "chip chip-warn"
              }
            >
              {emailVerified
                ? tProfile.status?.emailVerified ?? "Email verified"
                : tProfile.status?.emailNotVerified ?? "Email not verified"}
            </span>
          </p>

          {!emailVerified && (
            <button
              type="button"
              className="btn-secondary"
              onClick={resendVerification}
            >
              {tProfile.status?.resendVerification ?? "Resend verification email"}
            </button>
          )}
        </div>

        {/* PLAN */}
        <div className="summary-block">
          <h3>{tProfile.sections?.plan ?? "Plan"}</h3>

          <p className="summary-label">
            {tProfile.plan?.current ?? "Current plan"}:{" "}
            <span
              className={
                plan === "PRO"
                  ? "chip chip-pro"
                  : plan === "TRIAL"
                  ? "chip chip-trial"
                  : "chip chip-free"
              }
            >
              {planLabel}
            </span>
          </p>

          {trialInfo && (
            <p className="summary-trial">
              {tProfile.plan?.trialStatus ?? "Trial status"}:{" "}
              <strong>{trialInfo}</strong>
            </p>
          )}

          <div className="summary-actions">
            <Link href="/pricing" className="btn-primary">
              {tProfile.plan?.upgrade ?? "Upgrade / Change plan"}
            </Link>

            <button
              type="button"
              className="btn-outline"
              onClick={openBillingPortal}
              disabled={billingLoading}
            >
              {billingLoading
                ? tCommon.opening ?? "Opening…"
                : tProfile.plan?.manageBilling ?? "Manage billing"}
            </button>
          </div>
        </div>
      </section>

      {/* FORM */}
      <section className="profile-form-card">
       <h2>{tProfile.sections?.details ?? "Profile details"}</h2>

        {error && <div className="alert alert-error">{error}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <form onSubmit={handleSave} className="profile-form">
          <div className="form-grid">
            <div className="field">
              <label>{tProfile.fields?.fullName ?? "Full name"}</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={tProfile.fields?.fullNamePlaceholder ?? "Your full name"}
              />
            </div>

            <div className="field">
              <label>{tProfile.fields?.companyName ?? "Company name"}</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={
                tProfile.fields?.companyNamePlaceholder ??
                  "Business / brand name"
                    }
              />
            </div>

            <div className="field">
              <label>{tProfile.fields?.phone ?? "Phone"}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+31 6 1234 5678"
              />
            </div>

            <div className="field">
              <label>{tProfile.fields?.city ?? "City"}</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Amsterdam"
              />
            </div>

            <div className="field">
              <label>{tProfile.fields?.country ?? "Country"}</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Netherlands"
              />
            </div>

            <div className="field">
              <label>{tProfile.fields?.kvk ?? "KVK"}</label>
              <input
                type="text"
                value={kvk}
                onChange={(e) => setKvk(e.target.value)}
                placeholder="12345678"
              />
            </div>

            <div className="field">
              <label>{tProfile.fields?.iban ?? "IBAN"}</label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="NL00BANK0123456789"
              />
            </div>

            <div className="field">
              <label>{tProfile.fields?.vat ?? "VAT / BTW number"}</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder="NL123456789B01"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving
                ? tCommon.saving ?? "Saving…"
                : tProfile.actions?.save ?? "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </main>
  </div>
);
  
}