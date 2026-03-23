import * as XLSX from "xlsx";

interface TaxExcelData {
  quarter: string
  date: string

  revenue: number
  expenses: number
  profit: number

  taxableIncome: number
  incomeTax: number
  zvw: number

  totalTax: number
  netIncome: number
}

export function generateTaxExcel(data: TaxExcelData) {

  const rows = [
    { Field: "Quarter", Value: data.quarter },
    { Field: "Date", Value: data.date },

    {},

    { Field: "Revenue", Value: data.revenue },
    { Field: "Expenses", Value: data.expenses },
    { Field: "Profit", Value: data.profit },

    {},

    { Field: "Taxable income", Value: data.taxableIncome },
    { Field: "Income tax", Value: data.incomeTax },
    { Field: "ZVW", Value: data.zvw },

    {},

    { Field: "Total tax", Value: data.totalTax },
    { Field: "Net income", Value: data.netIncome },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Tax Report"
  );

  XLSX.writeFile(
    workbook,
    "smartwerk-tax-report.xlsx"
  );
}