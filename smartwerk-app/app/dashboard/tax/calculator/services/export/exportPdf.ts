
import jsPDF from "jspdf";

interface TaxReportData {
  quarter: string;
  date: string;

  revenue: number;
  expenses: number;
  profit: number;

  taxableIncome: number;
  incomeTax: number;
  zvw: number;

  totalTax: number;
  netIncome: number;
}

export function generateTaxReport(data: TaxReportData) {

  const pdf = new jsPDF();

  let y = 20;

  pdf.setFontSize(18);
  pdf.text("SmartWerk Tax Report", 20, y);

  y += 10;

  pdf.setFontSize(11);

  pdf.text(`Date: ${data.date}`, 20, y);
  y += 6;

  pdf.text(`Quarter: ${data.quarter}`, 20, y);
  y += 10;

  pdf.text("Income", 20, y);
  y += 6;

  pdf.text(`Revenue: €${data.revenue.toFixed(2)}`, 20, y);
  y += 6;

  pdf.text(`Expenses: €${data.expenses.toFixed(2)}`, 20, y);
  y += 6;

  pdf.text(`Profit: €${data.profit.toFixed(2)}`, 20, y);
  y += 10;

  pdf.text("Tax calculation", 20, y);
  y += 6;

  pdf.text(`Taxable income: €${data.taxableIncome.toFixed(2)}`, 20, y);
  y += 6;

  pdf.text(`Income tax: €${data.incomeTax.toFixed(2)}`, 20, y);
  y += 6;

  pdf.text(`ZVW: €${data.zvw.toFixed(2)}`, 20, y);
  y += 6;

  pdf.text(`Total tax: €${data.totalTax.toFixed(2)}`, 20, y);
  y += 10;

  pdf.setFontSize(14);
  pdf.text(`Net income: €${data.netIncome.toFixed(2)}`, 20, y);

  y += 12;

  pdf.setFontSize(9);

  pdf.text(
    "Disclaimer: This calculator provides estimates only and does not replace professional accounting advice.",
    20,
    y
  );

  pdf.save("smartwerk-tax-report.pdf");
}