export type BtwRate = 0 | 0.09 | 0.21;

export interface TaxInput {
  hoursWorked: number;
  hourlyRate: number;

  expenses: {
    vehicle: number;
    office: number;
    internet: number;
    marketing: number;
    other: number;
    extraBenefits: number;
  };

  kvkRegistered: boolean;
  isStarter: boolean;

  btwRate: BtwRate;
  korApplied: boolean;

  vat?: {
    period?: "Q1" | "Q2" | "Q3" | "Q4";
    inputVatDeductible?: number;
  } & (
    | {
        salesExVat: {
          standard?: number;
          reduced?: number;
          zero?: number;
        };
        turnoverExVat?: never;
      }
    | {
        turnoverExVat: number;
        salesExVat?: never;
      }
  );

  meta?: {
    period?: "Q1" | "Q2" | "Q3" | "Q4";
    year?: number;
    country?: string;
    businessName?: string;
    kvkNumber?: string;
    btwNumber?: string;
    iban?: string;
  };
}