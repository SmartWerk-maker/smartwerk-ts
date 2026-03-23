// app/dashboard/profile/logic.ts

export interface ValidationResult {
  kvkTaken: boolean;
  ibanTaken: boolean;
  vatTaken: boolean;
}

/**
 * Викликає API /api/profile/validate
 * Перевіряє унікальність KvK, IBAN, VAT
 */
export async function validateUniqueFields(
  uid: string,
  kvk: string,
  iban: string,
  vat: string
): Promise<ValidationResult> {
  const res = await fetch("/api/profile/validate", {
    method: "POST",
    body: JSON.stringify({ uid, kvk, iban, vat }),
  });

  if (!res.ok) {
    return {
      kvkTaken: false,
      ibanTaken: false,
      vatTaken: false,
    };
  }

  return (await res.json()) as ValidationResult;
}