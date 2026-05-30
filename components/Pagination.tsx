import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
};

function buildHref(searchParams: Props["searchParams"], page: number): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (k === "page") continue;
    if (Array.isArray(v)) v.forEach(x => params.append(k, x));
    else if (typeof v === "string" && v) params.set(k, v);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

export default function Pagination({ page, totalPages, searchParams }: Props) {
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-10 lg:gap-14 pt-16 lg:pt-20 pb-2 text-[11px] tracking-[0.22em] uppercase"
      style={{ color: "var(--color-ink)" }}
    >
      {hasPrev ? (
        <Link href={buildHref(searchParams, page - 1)} className="lux-link" rel="prev">
          ← Previous
        </Link>
      ) : (
        <span aria-disabled className="opacity-25 select-none">← Previous</span>
      )}

      <span style={{ color: "var(--color-muted)" }}>
        Page{" "}
        <span className="tabular-nums" style={{ color: "var(--color-ink)" }}>{page}</span>
        {" "}of{" "}
        <span className="tabular-nums">{totalPages}</span>
      </span>

      {hasNext ? (
        <Link href={buildHref(searchParams, page + 1)} className="lux-link" rel="next">
          Next →
        </Link>
      ) : (
        <span aria-disabled className="opacity-25 select-none">Next →</span>
      )}
    </nav>
  );
}
