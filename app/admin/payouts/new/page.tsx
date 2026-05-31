import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { lastMonthRange } from "@/lib/payouts";
import { generatePayout } from "../actions";

export default async function NewPayoutPage() {
  const sb = getAdminSupabase();
  const { data: brands } = await sb.from("brands").select("slug, name, commission_rate").order("name");
  const range = lastMonthRange();

  return (
    <>
      <Link href="/admin/payouts" className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Payouts
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Generate</p>
      <h1 className="display text-4xl lg:text-5xl mb-4" style={{ color: "var(--color-ink)" }}>
        New payout.
      </h1>
      <p className="text-sm mb-12 max-w-2xl leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
        Picks every delivered order line for the chosen designer in the chosen window, subtracts any refunds within the window, applies the brand&apos;s commission rate, and creates a draft payout statement.
      </p>

      <form action={generatePayout} className="space-y-6 max-w-xl">
        <label className="block">
          <span className="block mb-2 eyebrow" style={{ color: "var(--color-emerald)" }}>Designer</span>
          <select
            name="brand"
            required
            defaultValue=""
            className="w-full h-12 border bg-transparent px-3 text-base"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          >
            <option value="" disabled>Pick a designer…</option>
            {(brands ?? []).map(b => (
              <option key={b.slug} value={b.slug}>
                {b.name} ({Math.round(Number(b.commission_rate ?? 0.30) * 100)} % commission)
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="block mb-2 eyebrow" style={{ color: "var(--color-emerald)" }}>Period start</span>
            <input
              name="period_start"
              type="date"
              required
              defaultValue={range.start}
              className="w-full h-12 border bg-transparent px-3 text-base"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
          </label>
          <label className="block">
            <span className="block mb-2 eyebrow" style={{ color: "var(--color-emerald)" }}>Period end</span>
            <input
              name="period_end"
              type="date"
              required
              defaultValue={range.end}
              className="w-full h-12 border bg-transparent px-3 text-base"
              style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 pt-4">
          <button
            type="submit"
            className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
          >
            Generate draft
          </button>
          <Link href="/admin/payouts" className="text-[11px] tracking-[0.18em] uppercase lux-link self-center" style={{ color: "var(--color-muted)" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
