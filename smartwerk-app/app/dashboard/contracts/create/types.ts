  // app/dashboard/contracts/create/types.ts

  /**
   * ЄДИНІ статуси контракту у всій системі
   */
  export type ContractStatus =
    | "draft"       // створений, редагується
    | "signed"      // підписаний тобою
    | "completed";  // фінал, без редагування

  /**
   * Snapshot бізнесу на момент створення контракту
   * Після збереження НЕ редагується
   */
  export type BusinessSnapshot = {
    name: string;
    kvk: string;
    btw: string;
    iban: string;
    address: string;
    phone: string;
    email: string;
  };

  export type ContractClient = {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };

  export type ContractProject = {
    title: string;
    scope: string;
    timeline: string;
    paymentTerms: string;
    legalTerms: string;
  };

  /**
   * ❗ ТІЛЬКИ ТВОЙ ПІДПИС
   * ❗ Завжди існує, але може бути порожнім рядком
   */
  export type ContractSignature = {
    freelancer: string;
    freelancerDate: string; // YYYY-MM-DD
  };

  /**
   * Повний стан форми контракту
   * ❗ НІЧОГО optional
   */
  export interface ContractFormState {
    contractId: string;
    status: ContractStatus;
    date: string;

    businessSnapshot: BusinessSnapshot | null;
    client: ContractClient;
    project: ContractProject;

    signatures: ContractSignature;
  }

  /* ================= HELPERS ================= */

  export function todayISODate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  export const EMPTY_BUSINESS_SNAPSHOT: BusinessSnapshot = {
    name: "",
    kvk: "",
    btw: "",
    iban: "",
    address: "",
    phone: "",
    email: "",
  };

  export const EMPTY_CLIENT: ContractClient = {
    id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  };

  export const EMPTY_PROJECT: ContractProject = {
    title: "",
    scope: "",
    timeline: "",
    paymentTerms: "",
    legalTerms: "",
  };

  export const EMPTY_SIGNATURE: ContractSignature = {
    freelancer: "",
    freelancerDate: "",
  };

  /**
   * ЄДИНИЙ правильний initial state
   */
  export function createInitialContractForm(): ContractFormState {
    return {
      contractId: "",
      status: "draft",
      date: todayISODate(),
      businessSnapshot: { ...EMPTY_BUSINESS_SNAPSHOT },
      client: { ...EMPTY_CLIENT },
      project: { ...EMPTY_PROJECT },
      signatures: { ...EMPTY_SIGNATURE },
    };
  }