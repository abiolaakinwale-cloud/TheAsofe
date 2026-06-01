import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/account";
import { cancelOrder } from "./actions";

export default async function CancelOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/signin?next=/account/orders/${id}/cancel`);

  const { data: order } = await sb
    .from("orders")
    .select("id, status, total, currency, customer_email, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  if (order.status !== "paid") {
    redirect(`/account/orders/${id}?error=${encodeURIComponent("Cancellation is only available before your order is packed.")}`);
  }

  return (
    <>
      <Link href={`/account/orders/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link mb-6 inline-block" style={{ color: "var(--color-muted)" }}>
        ← Order {id.slice(0, 8)}
      </Link>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Cancel order</p>
      <h1 className="display text-4xl lg:text-5xl mb-4" style={{ color: "var(--color-ink)" }}>
        Cancel and refund.
      </h1>
      <p className="serif italic text-lg mb-10 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
        We&apos;ll refund the full {formatPrice(order.total, order.currency)} to your original payment method.
        Most banks complete the refund in 5–10 business days.
      </p>

      <div className="max-w-2xl p-6 mb-10" style={{ backgroundColor: "var(--color-cream)" }}>
        <p className="eyebrow mb-3" style={{ color: "var(--color-oxblood)" }}>Before you do this</p>
        <ul className="text-sm leading-relaxed space-y-2 list-disc pl-5 marker:text-[var(--color-muted)]" style={{ color: "var(--color-ink)" }}>
          <li>Once cancelled, the order cannot be reinstated — you&apos;d need to place a new one.</li>
          <li>If the pieces are time-sensitive (gift, wedding, event), our concierge team may be able to expedite instead. Write to{" "}
            <a className="lux-link" href="mailto:correspondence@theasofe.com" style={{ color: "var(--color-ink)" }}>correspondence@theasofe.com</a>.</li>
          <li>If you&apos;ve already received the order, this isn&apos;t the right action — use{" "}
            <Link href={`/account/orders/${id}/return`} className="lux-link" style={{ color: "var(--color-ink)" }}>Request a return</Link>{" "}instead.</li>
        </ul>
      </div>

      <form action={cancelOrder} className="space-y-6 max-w-2xl">
        <input type="hidden" name="orderId" value={id} />

        <label className="block">
          <span className="block mb-2 eyebrow" style={{ color: "var(--color-emerald)" }}>Reason (optional)</span>
          <textarea
            name="reason"
            rows={3}
            maxLength={500}
            placeholder="Helps us improve — but you don&apos;t have to share if you&apos;d rather not."
            className="w-full border bg-transparent p-3 text-base leading-relaxed"
            style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
          />
        </label>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          <button
            type="submit"
            className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium"
            style={{ backgroundColor: "var(--color-oxblood)", color: "var(--color-ground)" }}
          >
            Cancel order &amp; refund {formatPrice(order.total, order.currency)}
          </button>
          <Link href={`/account/orders/${id}`} className="text-[11px] tracking-[0.18em] uppercase lux-link" style={{ color: "var(--color-muted)" }}>
            Keep the order
          </Link>
        </div>
      </form>
    </>
  );
}
