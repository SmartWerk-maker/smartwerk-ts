/**
 * TaxRules
 *
 * Universal tax configuration interface.
 * Country- and year-specific rules MUST conform to this contract.
 */

export interface TaxRules {
  meta: {
    country: string;
    year: number;
    currency: "EUR";
    version: string;
    disclaimer?: string;
  };

  /**
   * =========================
   * INCOME TAX (BOX 1)
   * =========================
   */
  incomeTax: {
    box: 1;
    brackets: TaxBracket[];
  };

  /**
   * =========================
   * ZZP DEDUCTIONS
   * =========================
   */
  zzp: {
    zelfstandigenaftrek: {
      amount: number;
      requiresHours: number;
    };
    startersaftrek: {
      amount: number;
      requiresZzpEligibility: boolean;
    };
  };

  /**
   * =========================
   * MKB VRIJSTELLING
   * =========================
   */
  mkb: {
    percentage: number;
    requiresZzpEligibility: boolean;
  };

  /**
   * =========================
   * DEDUCTION CAPS
   * =========================
   */
  caps: {
    /** Max total deductions as % of profit (e.g. 0.3748) */
    maxDeductiblePercentageOfProfit: number;
  };

  /**
   * =========================
   * ZVW
   * =========================
   */
  zvw: {
    rate: number;

    /**
     * Maximum income subject to ZVW.
     * If undefined, no cap applies.
     */
    maxBase?: number;
    
  };

  /**
   * =========================
   * BTW / VAT
   * =========================
   */
  btw: {
  rates: {
    standard: number;
    reduced: number;
    zero: number;
  };
    kor: {
      enabled: boolean;

      /** Max yearly turnover excl. VAT for KOR */
      turnoverThreshold: number; // ← NEW (20000)
      
      /**
       * VAT amount when KOR is applied (usually 0).
       */
       vatAmount: number; // usually 0
    };
  };

  /**
   * =========================
   * HEFFINGSKORTINGEN
   * =========================
   */
  heffingskortingen: {
    enabled: boolean;

     algemene: {
      max: number;
      base: "taxableIncome" | "grossIncome";
      afbouwVanaf: number;
      afbouwPercentage: number;
    };

   arbeids: {
      base: "taxableIncome" | "grossIncome";

      

      /**
       * Brackets are interpreted marginally from 0..upTo.
       * - rate: adds (incomeInBracket * rate)
       * - fixedAmount: sets korting to an exact amount at that point (plateau / hard set)
       * - afbouwRate: subtracts (incomeInBracket * afbouwRate)
       */
      brackets: Array<
        | { upTo: number; rate: number }
        | { upTo: number; fixedAmount: number }
        | { upTo: number; afbouwRate: number }
      >;
    };
  };

  /**
   * =========================
   * ROUNDING
   * =========================
   */
  rounding: {
    decimals: number;
    method: "HALF_UP" | "FLOOR" | "CEIL";
  };
}

/**
 * =========================
 * SUPPORTING TYPES
 * =========================
 */

export interface TaxBracket {
  /**
   * Upper bound of this bracket (inclusive).
   * Use Infinity for the last bracket.
   */
  upTo: number;
  rate: number;
}