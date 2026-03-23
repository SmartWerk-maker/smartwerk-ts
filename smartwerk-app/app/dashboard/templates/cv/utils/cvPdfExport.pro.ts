// cv/utils/cvPdfExport.pro.ts

import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { CVData } from "../types";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

export async function exportCVToPDFPro(cv: CVData) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.width = "794";
  iframe.height = "1123";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(buildHTML(cv));
  doc.close();

  const canvas = await html2canvas(doc.body, {
    scale: 2,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  const imgData = canvas.toDataURL("image/png");

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const fileName =
    cv.personal.fullName?.replace(/\s+/g, "_") || "CV";

  pdf.save(`${fileName}_CV.pdf`);

  document.body.removeChild(iframe);
}

/* ===============================
   HTML + CSS (PRO)
================================ */

function buildHTML(cv: CVData) {
  const { personal, blocks } = cv;

  const photo = personal.photo;

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
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 48px;
    width: ${A4_WIDTH}px;
    height: ${A4_HEIGHT}px;
    font-family: Inter, Arial, sans-serif;
    color: #111;
    background: #fff;
    overflow: hidden;
  }

  .page {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 40px;
  }

  /* SIDEBAR */
  .sidebar {
  background: #f4f6fb;
  padding: 28px;
  border-radius: 18px;
  height: 100%;
  box-shadow: 0 10px 30px rgba(0,0,0,.04);
}

  .photo {
    width: 132px;
    height: 132px;
    border-radius: 18px;
    background: #e5e7eb;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .name {
    font-size: 20px;
    font-weight: 600;
    color: #555;
    margin-bottom: 4px;
  }

  .role {
    font-size: 15px;
    font-weight: 600;
    color: #555;
    margin-bottom: 18px;
  }

  .contact {
  font-size: 12px;
  line-height: 1.7;
  color: #1f2937; /* темніше */
}
  .contact strong {
  font-weight: 600;
}

  /* CONTENT */
  .content {
    padding-top: 6px;
  }

  .section {
    margin-bottom: 22px;
  }

  .identity {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

  .section h3 {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    margin-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
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
  <div class="page">
    <aside class="sidebar">
<div class="identity">

      <div class="photo">
        ${
          photo
            ? `<img src="${photo}" />`
            : ``
        }
      </div>

      <div class="name">${personal.fullName || ""}</div>
      <div class="role">${personal.title || ""}</div>

      <div class="contact">
       <strong>${personal.email}</strong><br/>
        ${personal.phone || ""}<br/>
        ${personal.website || ""}
      </div>
   </div>
    </aside>

    <main class="content">
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
</body>
</html>
`;
}