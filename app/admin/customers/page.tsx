import Link from "next/link";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { setCustomerStatus } from "./actions";

type Status = "pending" | "approved" | "rejected";

const STATUS_LABEL: Record<Status, string> = {
  pending:  "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<Status, string> = {
  pending:  "var(--color-amber, #b45309)",
  approved: "var(--color-cobalt)",
  rejected: "var(--color-crimson, #9f1239)",
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterRaw } = await searchParams;
  const filter = (["pending", "approved", "rejected"].includes(filterRaw ?? "")
    ? filterRaw
    : "pending") as Status;

  const sb = getAdminSupabase();
  let q = sb
    .from("profiles")
    .select("id, email, created_at, customer_status")
    .eq("role", "visitor")
    .order("created_at", { ascending: false });

  q = q.eq("customer_status", filter);

  const { data: customers } = await q;

  const [{ count: pendingCount }, { count: approvedCount }, { count: rejectedCount }] =
    await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "visitor").eq("customer_status", "pending"),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "visitor").eq("customer_status", "approved"),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "visitor").eq("customer_status", "rejected"),
    ]);

  const tabs: { label: string; status: Status; count: number | null }[] = [
    { label: "Pending",  status: "pending",  count: pendingCount },
    { label: "Approved", status: "approved", count: approvedCount },
    { label: "Rejected", status: "rejected", count: rejectedCount },
  ];

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-cobalt)" }}>Accounts</p>
      <h1 className="display text-4xl lg:text-5xl mb-10" style={{ color: "var(--color-ink)" }}>
        Customer approvals
      </h1>

      {/* Filter tabs */}
      <div className="flex gap-8 mb-10 border-b" style={{ borderColor: "var(--color-rule)" }}>
        {tabs.map(t => (
          <Link
            key={t.status}
            href={`/admin/customers?status=${t.status}`}
            className="pb-4 text-[11px] tracking-[0.18em] uppercase font-medium transition-colors"
            style={{
              color: filter === t.status ? "var(--color-ink)" : "var(--color-muted)",
              borderBottom: filter === t.status ? "1px solid var(--color-ink)" : "1px solid transparent",
            }}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-2 text-[10px]" style={{ color: "var(--color-muted)" }}>
                {t.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {(customers ?? []).length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>
          No {filter} customers.
        </p>
      ) : (
        <ul className="space-y-px">
          {(customers ?? []).map(c => {
            const status = c.customer_status as Status;
            return (
              <li
                key={c.id}
                className="p-6 lg:p-8 grid lg:grid-cols-12 items-center gap-4"
                style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}
              >
                <div className="lg:col-span-6">
                  <p className="serif text-lg" style={{ color: "var(--color-ink)" }}>{c.email}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                    Joined {new Date(c.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>

                <div className="lg:col-span-2 flex items-center">
                  <span
                    className="text-[10px] tracking-[0.18em] uppercase font-medium px-2 py-1"
                    style={{
                      color: STATUS_COLOR[status],
                      border: `1px solid ${STATUS_COLOR[status]}`,
                    }}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                </div>

                <div className="lg:col-span-4 flex items-center gap-3 flex-wrap">
                  {status !== "approved" && (
                    <form action={setCustomerStatus.bind(null, c.id, "approved")}>
                      <button
                        type="submit"
                        className="py-2 px-4 text-[10px] tracking-[0.18em] uppercase font-medium"
                        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}
                      >
                        Approve
                      </button>
                    </form>
                  )}
                  {status !== "rejected" && (
                    <form action={setCustomerStatus.bind(null, c.id, "rejected")}>
                      <button
                        type="submit"
                        className="py-2 px-4 text-[10px] tracking-[0.18em] uppercase font-medium border"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)" }}
                      >
                        Reject
                      </button>
                    </form>
                  )}
                  {status !== "pending" && (
                    <form action={setCustomerStatus.bind(null, c.id, "pending")}>
                      <button
                        type="submit"
                        className="py-2 px-4 text-[10px] tracking-[0.18em] uppercase font-medium border"
                        style={{ borderColor: "var(--color-rule)", color: "var(--color-muted)" }}
                      >
                        Reset
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
