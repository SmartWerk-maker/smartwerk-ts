"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import { useContractsCreate } from "../hooks/useContractsCreate";
import ContractForm, { type ContractsI18nSection } from "./ContractForm";

import { useLanguage } from "@/app/providers/LanguageProvider";
import { useTranslation } from "@/app/i18n";

import "./contract.css";

export default function ContractCreatePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const tRoot = useTranslation(language);

  const tContracts: ContractsI18nSection = useMemo(
    () => (tRoot?.contracts ?? {}) as ContractsI18nSection,
    [tRoot]
  );

  const [uid, setUid] = useState<string | undefined>(undefined);

  // IMPORTANT: читаємо editContractId тільки після mount (щоб не було hydration mismatch)
  const [editContractId, setEditContractId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /* ================= AUTH ================= */
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUid(user.uid);
    });

    return () => unsub();
  }, [router]);

  /* ================= MOUNT + EDIT ID ================= */
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMounted(true);

  const id = window.localStorage.getItem("editContractId");
  setEditContractId(id ? id : null);
}, []);

  /* ================= HOOK ================= */
  const {
    form,
    setForm,
    clients,
    loading,
    saving,
    error,
    selectClient,
    saveContract,
    isEdit,
  } = useContractsCreate(uid, editContractId);

  /* ================= SAVE ================= */
  async function handleSave() {
    const ok = await saveContract();
    if (!ok) return;

    window.localStorage.removeItem("editContractId");
    router.push("/dashboard/contracts/list");
  }

  /* ================= NEW ================= */
  function handleNew() {
    window.localStorage.removeItem("editContractId");
    router.push("/dashboard/contracts/create");
  }

  // Поки не mounted — не рендеримо (прибирає hydration mismatch)
  if (!mounted || !uid) return null;

  return (
    <main className="dash-main contracts-page">
      <div className="dash-content contracts-page-content">
        {/* HEADER */}
        <div className="dash-topbar contracts-page-topbar">
          <div className="dash-topbar-left">
            <h1 className="dash-title">
              {isEdit
                ? `${tContracts.createTitle ?? "Create Contract"} (Edit)`
                : tContracts.createTitle ?? "Create Contract"}
            </h1>
          </div>

          <div className="dash-topbar-right">
            <button
              type="button"
              className="top-tab"
              onClick={() => router.push("/dashboard")}
            >
              🏠 {tContracts.actions?.backToDashboard ?? "Back to Dashboard"}
            </button>

            <button
              type="button"
              className="top-tab"
              onClick={() => router.push("/dashboard/contracts/list")}
            >
              📂 {tContracts.actions?.list ?? "Saved Contracts"}
            </button>

            {isEdit && (
            <button type="button" className="top-tab" onClick={handleNew}>
             ➕ New
            </button>
              )}
          </div>
        </div>

        {/* FORM */}
        <div className="dash-card contracts-card">
          <ContractForm
            form={form}
            setForm={setForm}
            clients={clients}
            loading={loading}
            saving={saving}
            error={error}
            onSelectClient={selectClient}
            onSave={handleSave}
            t={tContracts}
          />
        </div>
      </div>
    </main>
  );
}