import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { settingsApi } from './api';

// Fetched once per app session and reused — every PDF export was
// hardcoding "AbyteDistribix" regardless of the Company Information saved
// under Settings, so the field was effectively dead. Cached rather than
// re-fetched per export since it rarely changes mid-session.
let companyInfoCache: { name: string; address: string; phone: string; email: string } | null = null;

async function getCompanyInfo() {
  if (companyInfoCache) return companyInfoCache;
  try {
    const res = await settingsApi.getAll();
    const byKey = (key: string) => (res.data as any[]).find((s) => s.key === key)?.value || '';
    companyInfoCache = {
      name: byKey('company_name') || 'AbyteDistribix',
      address: byKey('company_address'),
      phone: byKey('company_phone'),
      email: byKey('company_email'),
    };
  } catch {
    companyInfoCache = { name: 'AbyteDistribix', address: '', phone: '', email: '' };
  }
  return companyInfoCache;
}

/** Exports an array of flat objects to a downloadable .xlsx file. */
export function exportToExcel(filename: string, rows: Record<string, any>[], sheetName = 'Report') {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Exports several named row-sets to one .xlsx file, one sheet per set. */
export function exportMultiSheetExcel(filename: string, sheets: { name: string; rows: Record<string, any>[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Exports a titled table to a downloadable A4 .pdf file. */
export async function exportToPdf(filename: string, title: string, head: string[], body: (string | number)[][]) {
  const company = await getCompanyInfo();
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(company.name, 14, 15);
  let y = 21;
  const contactLine = [company.address, company.phone, company.email].filter(Boolean).join(' · ');
  if (contactLine) {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(contactLine, 14, y);
    doc.setTextColor(0);
    y += 6;
  }
  doc.setFontSize(11);
  doc.text(title, 14, y + 3);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y + 9);
  doc.setTextColor(0);

  autoTable(doc, {
    head: [head],
    body,
    startY: y + 14,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 30, 60], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${filename}.pdf`);
}
