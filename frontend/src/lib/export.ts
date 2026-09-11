import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
export function exportToPdf(filename: string, title: string, head: string[], body: (string | number)[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('AbyteDistribix', 14, 15);
  doc.setFontSize(11);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.setTextColor(0);

  autoTable(doc, {
    head: [head],
    body,
    startY: 33,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 30, 60], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(`${filename}.pdf`);
}
