import { getAdminSupabase } from "@/lib/supabase/admin";
import { setApplicationStatus } from "./actions";

type Row = {
  id: string;
  brand_name: string;
  founder_name: string;
  instagram_handle: string;
  product_category: string;
  monthly_inventory_estimate: string;
  whatsapp_number: string;
  website: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
};

export default async function AdminApplicationsPage() {
  const sb = getAdminSupabase();
  const { data: rows } = await sb
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  const apps = (rows ?? []) as Row[];
  const pending = apps.filter(a => a.status === "pending");
  const reviewed = apps.filter(a => a.status !== "pending");

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Brand applications</p>
      <h1 className="display text-4xl lg:text-5xl mb-12" style={{ color: "var(--color-ink)" }}>
        {pending.length} pending review.
      </h1>

      <Section title="Pending" empty="No applications waiting." apps={pending} />
      <div className="h-16" />
      <Section title="Reviewed" empty="Nothing reviewed yet." apps={reviewed} />
    </>
  );
}

function Section({ title, empty, apps }: { title: string; empty: string; apps: Row[] }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-6" style={{ color: "var(--color-muted)" }}>{title}</h2>
      {apps.length === 0 ? (
        <p className="text-sm py-6" style={{ color: "var(--color-muted)" }}>{empty}</p>
      ) : (
        <ul className="space-y-px">
          {apps.map(a => <ApplicationRow key={a.id} a={a} />)}
        </ul>
      )}
    </section>
  );
}

function ApplicationRow({ a }: { a: Row }) {
  const statusColour: Record<Row["status"], string> = {
    pending:  "var(--color-saffron)",
    approved: "var(--color-emerald)",
    rejected: "var(--color-oxblood)",
  };

  return (
    <li className="p-6 lg:p-8 grid lg:grid-cols-12 gap-6 lg:gap-8" style={{ boxShadow: "inset 0 0 0 1px var(--color-rule)" }}>
      <div className="lg:col-span-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-block w-2 h-2" style={{ backgroundColor: statusColour[a.status] }} />
          <p className="text-[10px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>{a.status}</p>
        </div>
        <h3 className="serif text-2xl mb-2" style={{ color: "var(--color-ink)" }}>{a.brand_name}</h3>
        <p className="text-sm mb-1" style={{ color: "var(--color-ink-soft)" }}>{a.founder_name}</p>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>{new Date(a.created_at).toLocaleString()}</p>
      </div>

      <div className="lg:col-span-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Detail k="Instagram" v={a.instagram_handle} />
        <Detail k="WhatsApp"  v={a.whatsapp_number} />
        <Detail k="Category"  v={a.product_category} />
        <Detail k="Inventory" v={a.monthly_inventory_estimate} />
        {a.website && <Detail k="Website" v={a.website} wrap />}
      </div>

      <div className="lg:col-span-2 flex flex-col gap-2 self-start">
        {a.status === "pending" ? (
          <>
            <ActionButton id={a.id} status="approved" label="Approve" />
            <ActionButton id={a.id} status="rejected" label="Reject" outline />
          </>
        ) : (
          <ActionButton id={a.id} status="pending" label="Re-open" outline />
        )}
      </div>
    </li>
  );
}

function Detail({ k, v, wrap }: { k: string; v: string; wrap?: boolean }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.18em] uppercase mb-1" style={{ color: "var(--color-muted)" }}>{k}</p>
      <p className={wrap ? "break-words" : "truncate"} style={{ color: "var(--color-ink)" }}>{v}</p>
    </div>
  );
}

function ActionButton({ id, status, label, outline }: { id: string; status: "approved" | "rejected" | "pending"; label: string; outline?: boolean }) {
  const setStatus = setApplicationStatus.bind(null, id, status);
  return (
    <form action={setStatus}>
      <button
        type="submit"
        className="w-full py-3 text-[11px] tracking-[0.18em] uppercase font-medium transition-colors"
        style={
          outline
            ? { border: "1px solid var(--color-rule)", color: "var(--color-ink)" }
            : { backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }
        }
      >
        {label}
      </button>
    </form>
  );
}
