// cv/utils/cvPdfExport.ts

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { CVData } from "../types";

export async function exportCVToPDF(cv: CVData) {
  // 1. Create isolated iframe (🔥 critical)
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.width = "794"; // A4
  iframe.height = "1123";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 48px;
            font-family: Inter, Arial, sans-serif;
            color: #111;
            background: #fff;
          }

          .page {
            display: grid;
            grid-template-columns: 260px 1fr;
            gap: 40px;
          }

          .sidebar {
            background: #f5f7fb;
            padding: 32px;
            border-radius: 14px;
          }

          .name {
            font-size: 26px;
            font-weight: 800;
            margin-bottom: 6px;
          }

          .role {
            font-size: 15px;
            font-weight: 600;
            color: #555;
            margin-bottom: 20px;
          }

          .contact {
            font-size: 13px;
            line-height: 1.7;
          }
            .contact strong {
          font-weight: 600;
            }

          .section {
            margin-bottom: 24px;
          }

          .section h3 {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
            margin-bottom: 8px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
          }

          .section-body {
            font-size: 13px;
            line-height: 1.65;
          }

          ul {
            padding-left: 16px;
            margin: 0;
          }

          li {
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        ${buildPdfHTML(cv)}
      </body>
    </html>
  `);
  doc.close();

  // 2. Render iframe → canvas
  const canvas = await html2canvas(doc.body, {
    scale: 2,
    backgroundColor: "#ffffff",
  });

  // 3. PDF
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;
  pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);

  if (imgHeight > pageHeight) {
    let heightLeft = imgHeight - pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(canvas, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  const fileName =
    cv.personal.fullName?.replace(/\s+/g, "_") || "CV";
  pdf.save(`${fileName}_CV.pdf`);

  document.body.removeChild(iframe);
}

function buildPdfHTML(cv: CVData): string {
  const { personal, blocks } = cv;

  const renderBlock = (title: string, content: string | string[]) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return "";

    const body = Array.isArray(content)
      ? `<ul>${content.map((i) => `<li>${i}</li>`).join("")}</ul>`
      : `<p>${content}</p>`;

    return `
      <section class="section">
        <h3>${title}</h3>
        <div class="section-body">${body}</div>
      </section>
    `;
  };

  return `
    <div class="page">
      <aside class="sidebar">
        <div class="name">${personal.fullName || ""}</div>
        <div class="role">${personal.title || ""}</div>
        <div class="contact">
          <strong>${personal.email}</strong><br/>
          ${personal.phone || ""}<br/>
          ${personal.website || ""}
        </div>
      </aside>

      <main>
        ${blocks
          .filter((b) => b.enabled)
          .map((b) =>
            renderBlock(
              b.titleKey.replace(/^\w/, (c) => c.toUpperCase()),
              b.content
            )
          )
          .join("")}
      </main>
    </div>
  `;
}