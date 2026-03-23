// app/utils/contracts/generateContractPdf.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { ContractPdfData } from "./types";

export function generateContractPdf(
  data: ContractPdfData,
  withBranding = true
) {
  const doc = new jsPDF();

  /* ===== TITLE ===== */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CONTRACT", 105, 15, { align: "center" });

  /* ===== BUSINESS INFO ===== */
  doc.setFontSize(12);
  doc.text("Business Info:", 14, 30);

  doc.setFont("helvetica", "normal");
  doc.text(
    [
      data.business.name || "-",
      `KvK: ${data.business.kvk || "-"}`,
      `BTW: ${data.business.btw || "-"}`,
      `IBAN: ${data.business.iban || "-"}`,
      `Email: ${data.business.email || "-"}`,
      `Phone: ${data.business.phone || "-"}`,
      `Address: ${data.business.address || "-"}`,
    ],
    14,
    36
  );

  /* ===== CLIENT INFO ===== */
  doc.setFont("helvetica", "bold");
  doc.text("Client Info:", 120, 30);

  doc.setFont("helvetica", "normal");
  doc.text(
    [
      data.client.name || "-",
      data.client.email || "-",
      data.client.phone || "-",
      data.client.address || "-",
    ],
    120,
    36
  );

  /* ===== DIVIDER ===== */
  doc.setDrawColor(200);
  doc.line(14, 70, 195, 70);

  /* ===== META TABLE ===== */
  autoTable(doc, {
    startY: 80,
    head: [["Contract ID", "Date", "Status"]],
    body: [[data.contractId, data.date, data.status]],
    theme: "grid",
  });

  const lastY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY ?? 80;

  let y = lastY + 10;

  const block = (label: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 14, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    const safe = text.trim() || "-";
    doc.text(doc.splitTextToSize(safe, 180), 14, y);

    y += 14;
  };

  /* ===== PROJECT ===== */
  block("Project Title", data.project.title);
  block("Scope of Work", data.project.scope);
  block("Timeline", data.project.timeline);
  block("Payment Terms", data.project.paymentTerms);
  block("Legal Terms", data.project.legalTerms);

  /* ===== SIGNATURE (FREELANCER ONLY) ===== */
  if (data.signatures.freelancer) {
    doc.addImage(data.signatures.freelancer, "PNG", 14, y, 60, 20);
    doc.text("Freelancer Signature", 14, y + 26);
    doc.text(`Date: ${data.signatures.freelancerDate}`, 14, y + 32);
  }

  /* ===== FOOTER ===== */
  if (withBranding) {
    doc.setFontSize(10);
    doc.text("Generated with SmartWerk", 105, 290, { align: "center" });
  }

  doc.save(`${data.contractId}.pdf`);
}