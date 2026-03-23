// modules/explanations/explanationTypes.ts

export type ExplanationSection =
  | "income"
  | "deductions"
  | "tax"
  | "vat"
  | "net";

export type ExplanationSeverity =
  | "info"
  | "success"
  | "warning"
  | "error";

export interface Explanation {
  section: ExplanationSection;
  title: string;
  points: string[];
  severity?: ExplanationSeverity;
}
export interface ExplainableAmount {
  value: number;
  formula: string;
  inputs: Record<string, number>;
  explanation: string[];
}