import { useRef, useState } from "react";
import { Modal, Notice } from "./components";
import { IconUpload, IconDownload, IconWarn, IconCheck } from "./icons";
import { parseSpreadsheet, downloadCsv, type RawRow } from "@/domain/fileio";
import type { ImportResult } from "@/domain/types";

interface Props<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Columns in the EDMO-provided template, in order. */
  templateHeaders: string[];
  /** A single example row demonstrating good data. */
  exampleRow: string[];
  templateFilename: string;
  maxRows: number;
  /** Validate parsed rows → valid records + per-row errors + duplicate warnings. */
  validate: (rows: RawRow[]) => ImportResult<T>;
  /** Persist the valid records (as DRAFT). Returns nothing; caller toasts. */
  onConfirm: (valid: T[]) => void;
  /** Optional extra guidance shown on the upload step (e.g. catalog dependency). */
  uploadHint?: string;
}

export function ImportDialog<T>({
  open,
  onClose,
  title,
  templateHeaders,
  exampleRow,
  templateFilename,
  maxRows,
  validate,
  onConfirm,
  uploadHint,
}: Props<T>) {
  const [result, setResult] = useState<ImportResult<T> | null>(null);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    setFileName("");
    setParseError("");
    setBusy(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    setBusy(true);
    setParseError("");
    try {
      const rows = await parseSpreadsheet(file);
      if (rows.length === 0) {
        setParseError("The file has no data rows.");
        setBusy(false);
        return;
      }
      if (rows.length > maxRows) {
        setParseError(`This file has ${rows.length} rows. The per-batch limit is ${maxRows}. Split it and try again.`);
        setBusy(false);
        return;
      }
      setFileName(file.name);
      setResult(validate(rows));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not read this file.");
    }
    setBusy(false);
  }

  function confirm() {
    if (!result) return;
    onConfirm(result.valid);
    close();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      maxWidth="max-w-2xl"
      footer={
        result ? (
          <>
            <button className="btn-secondary" onClick={reset}>
              Upload a different file
            </button>
            <button className="btn-primary" onClick={confirm} disabled={result.valid.length === 0}>
              Import {result.valid.length} as Draft
            </button>
          </>
        ) : (
          <button className="btn-secondary" onClick={close}>
            Cancel
          </button>
        )
      }
    >
      {!result ? (
        <div>
          <div className="mb-4 flex items-center justify-between rounded-md border border-edmo-line bg-edmo-bg/60 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-edmo-ink">Step 1 · Download the template</p>
              <p className="text-xs text-edmo-muted">Populate it with your data, then upload below. Up to {maxRows} rows per batch.</p>
            </div>
            <button
              className="btn-secondary"
              onClick={() => downloadCsv(templateFilename, templateHeaders, [exampleRow])}
            >
              <IconDownload width={16} height={16} /> Template
            </button>
          </div>

          {uploadHint && (
            <div className="mb-4">
              <Notice tone="info">{uploadHint}</Notice>
            </div>
          )}

          <p className="mb-2 text-sm font-bold text-edmo-ink">Step 2 · Upload your file</p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-edmo-line bg-edmo-bg/40 px-6 py-10 text-edmo-muted hover:border-edmo-accent hover:bg-edmo-blue-50/50"
          >
            <IconUpload width={28} height={28} />
            <span className="text-sm font-bold text-edmo-ink">
              {busy ? "Reading file…" : "Click to choose a .csv or .xlsx file"}
            </span>
            <span className="text-xs">Expected columns: {templateHeaders.join(", ")}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {parseError && (
            <div className="mt-3">
              <Notice tone="warn">{parseError}</Notice>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Summary */}
          <div className="mb-4 grid grid-cols-3 gap-3">
            <SummaryStat label="Total rows" value={result.totalRows} />
            <SummaryStat label="Valid" value={result.valid.length} tone="ok" />
            <SummaryStat label="Errors" value={result.errors.length} tone={result.errors.length ? "warn" : undefined} />
          </div>

          <p className="mb-3 text-sm text-edmo-muted">
            <span className="font-bold text-edmo-ink">{fileName}</span> · valid rows will import as
            DRAFT. Rows with errors are skipped — fix them and re-upload if needed.
          </p>

          {result.duplicateWarnings.length > 0 && (
            <div className="mb-3">
              <Notice tone="warn">
                {result.duplicateWarnings.length} row(s) match an existing record. These are imported
                as warnings, not blocked.
              </Notice>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mb-2 rounded-md border border-status-warn/30">
              <div className="flex items-center gap-2 border-b border-status-warn/20 bg-status-warn-bg px-3 py-2 text-xs font-bold uppercase tracking-wide text-status-warn">
                <IconWarn width={14} height={14} /> Rows with errors (skipped)
              </div>
              <div className="max-h-48 overflow-y-auto scroll-thin">
                <table className="w-full text-sm">
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="border-b border-edmo-line/60 last:border-0">
                        <td className="w-16 px-3 py-1.5 font-bold text-edmo-muted">Row {e.row}</td>
                        <td className="px-3 py-1.5 text-edmo-muted">{e.field}</td>
                        <td className="px-3 py-1.5 text-edmo-ink">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.valid.length > 0 && result.errors.length === 0 && (
            <Notice tone="success">
              <span className="inline-flex items-center gap-1">
                <IconCheck width={15} height={15} /> All {result.valid.length} rows passed validation.
              </span>
            </Notice>
          )}
        </div>
      )}
    </Modal>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-md border border-edmo-line bg-white px-3 py-2 text-center">
      <div
        className={`text-xl font-extrabold ${
          tone === "ok" ? "text-status-published" : tone === "warn" ? "text-status-warn" : "text-edmo-navy"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-edmo-muted">{label}</div>
    </div>
  );
}
