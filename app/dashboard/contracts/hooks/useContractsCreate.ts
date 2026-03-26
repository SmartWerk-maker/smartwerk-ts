import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import {
  ContractFormState,
  ContractStatus,
  BusinessSnapshot,
  createInitialContractForm,
  todayISODate,
} from "../create/types";

/* ================= TYPES ================= */

export type ClientDoc = {
  id: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  // fallback для старих даних
  email?: string;
  phone?: string;
  address?: string;
};

type UserProfileDoc = {
  companyName?: string;
  kvk?: string;
  iban?: string;
  vatNumber?: string;
  phone?: string;
  city?: string;
  country?: string;
  email?: string;
};

type ContractDoc = Partial<ContractFormState> & {
  clientName?: string;
  projectTitle?: string;
};

/* ================= NORMALIZERS ================= */

function normalizeStatus(value: unknown): ContractStatus {
  return value === "draft" || value === "signed" || value === "completed"
    ? value
    : "draft";
}

function normalizeBusinessSnapshot(
  data: unknown
): BusinessSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const b = data as Partial<BusinessSnapshot>;

  return {
    name: b.name ?? "",
    kvk: b.kvk ?? "",
    btw: b.btw ?? "",
    iban: b.iban ?? "",
    address: b.address ?? "",
    phone: b.phone ?? "",
    email: b.email ?? "",
  };
}

/* ================= HOOK ================= */

export function useContractsCreate(
  uid?: string,
  editContractId?: string | null
) {
  const isEdit = Boolean(editContractId);
  const uidSafe = useMemo(() => uid ?? null, [uid]);

  const [form, setForm] = useState<ContractFormState>(
    createInitialContractForm()
  );
  const [clients, setClients] = useState<ClientDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD PROFILE → SNAPSHOT ================= */

  const loadBusinessSnapshot = useCallback(async (u: string) => {
    const snap = await getDoc(doc(db, "users", u));
    if (!snap.exists()) return;

    const p = snap.data() as UserProfileDoc;
    const address = [p.city, p.country].filter(Boolean).join(", ");

    const snapshot: BusinessSnapshot = {
      name: p.companyName ?? "",
      kvk: p.kvk ?? "",
      btw: p.vatNumber ?? "",
      iban: p.iban ?? "",
      address,
      phone: p.phone ?? "",
      email: p.email ?? "",
    };

    setForm((prev) => ({
      ...prev,
      businessSnapshot: snapshot,
    }));
  }, []);

  /* ================= LOAD CLIENTS ================= */

  const loadClients = useCallback(async (u: string) => {
    const q = query(
      collection(db, "users", u, "clients"),
      limit(100)
    );
    const snap = await getDocs(q);

    const list: ClientDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));

    setClients(list);
  }, []);

  /* ================= GENERATE CONTRACT ID ================= */

  const generateContractId = useCallback(async (u: string) => {
    const ref = doc(db, "users", u);
    const year = new Date().getFullYear();
    let generated = "";

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const last =
        (snap.data()?.lastContractNumber as number | undefined) ?? 0;
      const next = last + 1;

      tx.set(ref, { lastContractNumber: next }, { merge: true });
      generated = `CT-${year}-${String(next).padStart(3, "0")}`;
    });

    setForm((p) => ({ ...p, contractId: generated }));
  }, []);

  /* ================= LOAD EXISTING ================= */

  const loadExistingContract = useCallback(
    async (u: string, id: string) => {
      const snap = await getDoc(
        doc(db, "users", u, "contracts", id)
      );
      if (!snap.exists()) return;

      const d = snap.data() as ContractDoc;

      setForm({
        contractId: d.contractId ?? "",
        status: normalizeStatus(d.status),
        date: d.date ?? todayISODate(),

        businessSnapshot: normalizeBusinessSnapshot(
          d.businessSnapshot
        ),

        client: {
          id: d.client?.id ?? "",
          name: d.client?.name ?? "",
          email: d.client?.email ?? "",
          phone: d.client?.phone ?? "",
          address: d.client?.address ?? "",
        },

        project: {
          title: d.project?.title ?? "",
          scope: d.project?.scope ?? "",
          timeline: d.project?.timeline ?? "",
          paymentTerms: d.project?.paymentTerms ?? "",
          legalTerms: d.project?.legalTerms ?? "",
        },

        signatures: {
          freelancer: d.signatures?.freelancer ?? "",
          freelancerDate: d.signatures?.freelancerDate ?? "",
        },
      });
    },
    []
  );

  /* ================= INIT ================= */

  useEffect(() => {
    if (!uidSafe) {
      setLoading(false);
      return;
    }

    let active = true;

    async function init(u: string) {
      setLoading(true);
      setError(null);

      try {
        await loadClients(u);

        if (editContractId) {
          await loadExistingContract(u, editContractId);
        } else {
          setForm(createInitialContractForm());
          await loadBusinessSnapshot(u);
          await generateContractId(u);
        }
      } catch (e) {
        console.error(e);
        if (active) setError("Failed to load contract data");
      } finally {
        if (active) setLoading(false);
      }
    }

    void init(uidSafe);
    return () => {
      active = false;
    };
  }, [
    uidSafe,
    editContractId,
    loadClients,
    loadExistingContract,
    loadBusinessSnapshot,
    generateContractId,
  ]);

  /* ================= SELECT CLIENT ================= */

  const selectClient = useCallback(
    (clientId: string) => {
      const c = clients.find((x) => x.id === clientId);
      if (!c) return;

      setForm((p) => ({
        ...p,
        client: {
          id: clientId,
          name: c.clientName ?? "",
          email: c.clientEmail ?? c.email ?? "",
          phone: c.clientPhone ?? c.phone ?? "",
          address: c.clientAddress ?? c.address ?? "",
        },
      }));
    },
    [clients]
  );

  /* ================= SAVE ================= */

  const saveContract = useCallback(async () => {
    if (!uidSafe) {
      setError("Not authenticated");
      return false;
    }

    if (!form.businessSnapshot) {
      setError("Business data missing");
      return false;
    }

    const payload = {
      contractId: form.contractId,
      status: form.status,
      date: form.date,

      businessSnapshot: form.businessSnapshot,
      client: form.client,
      project: form.project,
      signatures: form.signatures,

      clientName: form.client.name,
      projectTitle: form.project.title,

      updatedAt: serverTimestamp(),
    };

    try {
      setSaving(true);
      setError(null);

      if (isEdit && editContractId) {
        await updateDoc(
          doc(db, "users", uidSafe, "contracts", editContractId),
          payload
        );
      } else {
        await addDoc(
          collection(db, "users", uidSafe, "contracts"),
          {
            ...payload,
            createdAt: serverTimestamp(),
          }
        );
      }

      return true;
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Failed to save contract";
      setError(msg);
      return false;
    } finally {
      setSaving(false);
    }
  }, [uidSafe, form, isEdit, editContractId]);

  /* ================= API ================= */

  return {
    form,
    setForm,
    clients,
    loading,
    saving,
    error,
    selectClient,
    saveContract,
    isEdit,
  };
}