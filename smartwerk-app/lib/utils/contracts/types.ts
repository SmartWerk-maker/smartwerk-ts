// app/utils/contracts/types.ts (або де вони у тебе лежать)

export type ContractStatus =
  | "draft"
  | "signed"
  | "completed";

export interface ContractPdfData {
  contractId: string;
  date: string;
  status: ContractStatus;

  business: {
    name: string;
    kvk: string;
    btw: string;
    iban: string;
    email: string;
    phone: string;
    address: string;
  };

  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };

  project: {
    title: string;
    scope: string;
    timeline: string;
    paymentTerms: string;
    legalTerms: string;
  };

  signatures: {
    freelancer: string;
    freelancerDate: string;
  };
}