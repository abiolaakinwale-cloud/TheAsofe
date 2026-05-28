// Minimal CSV parser — supports quoted fields with commas, escaped quotes
// ("" → "), and multi-line cells inside quotes. Treats LF, CRLF, and CR as
// row separators. Trims blank lines. Good enough for seller bulk uploads.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  const pushRow = () => {
    row.push(cur);
    cur = "";
    if (row.some(c => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
      continue;
    }
    if (ch === '"') { inQuotes = true; }
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushRow();
    } else { cur += ch; }
  }
  if (cur !== "" || row.length > 0) pushRow();
  return rows;
}

// Header-keyed rows: first row is treated as the header.
export function parseCsvKeyed(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const all = parseCsv(text);
  if (all.length === 0) return { headers: [], rows: [] };
  const headers = all[0].map(h => h.trim().toLowerCase());
  const rows = all.slice(1).map(r => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = (r[i] ?? "").trim(); });
    return o;
  });
  return { headers, rows };
}
