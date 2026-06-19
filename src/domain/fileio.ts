// Shared client-side spreadsheet I/O for the CSV/XLSX import flows (F2, F8)
// and template downloads. Uses papaparse for CSV and SheetJS for XLSX.
import Papa from "papaparse";
import * as XLSX from "xlsx";

export type RawRow = Record<string, string>;

/** Parse an uploaded .csv or .xlsx file into an array of string-keyed rows. */
export async function parseSpreadsheet(file: File): Promise<RawRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    return new Promise((resolve, reject) => {
      Papa.parse<RawRow>(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: (res) => resolve(res.data.map(normalizeRow)),
        error: reject,
      });
    });
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "", raw: false });
    return json.map(normalizeRow);
  }
  throw new Error("Unsupported file type. Please upload a .csv or .xlsx file.");
}

function normalizeRow(row: RawRow): RawRow {
  const out: RawRow = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim()] = (v ?? "").toString().trim();
  }
  return out;
}

/** Build and trigger a CSV download from a header row + example rows. */
export function downloadCsv(filename: string, headers: string[], exampleRows: string[][]) {
  const csv = Papa.unparse({ fields: headers, data: exampleRows });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
