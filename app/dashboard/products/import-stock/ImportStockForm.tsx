"use client";

import { useState, useRef, useTransition } from "react";
import { importStock, type StockImportResult } from "./actions";

const TEMPLATE = `slug,colour,size,quantity
aso-oke-wrap-coat,,XS,5
aso-oke-wrap-coat,,S,12
aso-oke-wrap-coat,,M,8
aso-oke-wrap-coat,,L,3
bazin-riche-jacket,Indigo,M,4
bazin-riche-jacket,Black,M,2
`;

export default function ImportStockForm() {
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<StockImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a .csv file.");
      return;
    }
    setCsv(await file.text());
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!csv.trim()) { setError("Paste CSV or upload a .csv file."); return; }
    const fd = new FormData();
    fd.set("csv", csv);
    startTransition(async () => {
      try {
        setResult(await importStock(fd));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed.");
      }
    });
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "asofe-stock-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="px-5 py-2.5 text-[11px] tracking-[0.18em] uppercase border"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
        >
          Upload .csv
        </button>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-[11px] tracking-[0.18em] uppercase lux-link"
          style={{ color: "var(--color-muted)" }}
        >
          Download template ↓
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <label className="block">
          <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>
            CSV contents
          </span>
          <textarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            rows={14}
            placeholder={TEMPLATE}
            spellCheck={false}
            className="w-full bg-transparent border py-3 px-4 text-xs font-mono leading-relaxed outline-none focus:border-[var(--color-ink)]"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </label>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="submit"
            disabled={pending}
            className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            {pending ? "Updating…" : "Update stock"}
          </button>
          <span className="text-xs" style={{ color: "var(--color-muted)" }}>
            Each row replaces the stock quantity for that (product, size). Sizes must exist on the product.
          </span>
        </div>

        {error && <p className="text-sm" style={{ color: "var(--color-oxblood)" }}>{error}</p>}
      </form>

      {result && <Results r={result} />}
    </div>
  );
}

function Results({ r }: { r: StockImportResult }) {
  return (
    <div className="space-y-6 pt-6 border-t" style={{ borderColor: "var(--color-rule)" }}>
      <div className="flex gap-px">
        <Stat k="Updated" v={r.updated} colour="var(--color-emerald)" />
        <Stat k="Failed"  v={r.failed}  colour="var(--color-oxblood)" />
        <Stat k="Total"   v={r.total}   colour="var(--color-muted)" />
      </div>

      {r.results.length > 0 && (
        <ul className="space-y-2 text-sm">
          {r.results.map((row, i) => (
            <li key={i} className="flex items-start gap-4 py-2 border-b" style={{ borderColor: "var(--color-rule)" }}>
              <span className="text-[10px] tracking-[0.18em] uppercase w-16 flex-shrink-0 pt-0.5" style={{ color: row.status === "ok" ? "var(--color-emerald)" : "var(--color-oxblood)" }}>
                {row.status === "ok" ? "Updated" : "Failed"}
              </span>
              <span className="font-mono text-xs pt-0.5 flex-shrink-0" style={{ color: "var(--color-ink)" }}>
                {row.slug || "(no slug)"}{row.colour ? ` · ${row.colour}` : ""} · {row.size || "(no size)"}
              </span>
              {row.status === "ok" && (
                <span className="text-xs tabular-nums" style={{ color: "var(--color-muted)" }}>→ qty {row.quantity}</span>
              )}
              {row.status === "error" && (
                <span className="text-xs flex-1" style={{ color: "var(--color-ink-soft)" }}>{row.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ k, v, colour }: { k: string; v: number; colour: string }) {
  return (
    <div className="flex-1 p-6" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <p className="text-[10px] tracking-[0.18em] uppercase mb-3" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className="display text-3xl tabular-nums" style={{ color: colour }}>{v}</p>
    </div>
  );
}
