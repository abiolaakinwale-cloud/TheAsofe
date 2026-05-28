import type { ReactNode } from "react";
import { getSiteSettings } from "@/lib/cms";
import { updateSiteSettings } from "./actions";
import ImagePicker from "@/components/admin/ImagePicker";

export default async function AdminCmsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const s = await getSiteSettings();

  return (
    <>
      <p className="eyebrow mb-4" style={{ color: "var(--color-oxblood)" }}>Editorial</p>
      <h1 className="display text-4xl lg:text-5xl mb-2" style={{ color: "var(--color-ink)" }}>The homepage.</h1>
      <p className="text-sm mb-10 max-w-2xl" style={{ color: "var(--color-ink-soft)" }}>
        Edit the hero, journal card, and concierge band. Saving publishes immediately.
      </p>

      {saved && (
        <p className="mb-10 text-sm" style={{ color: "var(--color-emerald)" }}>
          Saved. The homepage has been updated.
        </p>
      )}

      <form action={updateSiteSettings} className="space-y-16 max-w-4xl">
        <Section title="Hero">
          <Grid>
            <Text name="hero.eyebrow"        label="Eyebrow"            defaultValue={s.hero.eyebrow} />
            <Text name="hero.title"          label="Headline"           defaultValue={s.hero.title} full />
            <ImagePicker name="hero.image"   label="Hero image"         folder="cms/hero" defaultValue={s.hero.image} full />
            <Area name="hero.body"           label="Body"               defaultValue={s.hero.body} rows={3} full />
            <Text name="hero.primaryLabel"   label="Primary CTA label"  defaultValue={s.hero.primaryLabel} />
            <Text name="hero.primaryHref"    label="Primary CTA link"   defaultValue={s.hero.primaryHref} />
            <Text name="hero.secondaryLabel" label="Secondary CTA label" defaultValue={s.hero.secondaryLabel} />
            <Text name="hero.secondaryHref"  label="Secondary CTA link"  defaultValue={s.hero.secondaryHref} />
          </Grid>
        </Section>

        <Section title="Journal card">
          <Grid>
            <Text name="journal.eyebrow" label="Eyebrow"   defaultValue={s.journal.eyebrow} />
            <Text name="journal.title"   label="Headline"  defaultValue={s.journal.title} full />
            <ImagePicker name="journal.image" label="Journal card image" folder="cms/journal" defaultValue={s.journal.image} full />
            <Area name="journal.body"    label="Body"      defaultValue={s.journal.body} rows={3} full />
            <Text name="journal.label"   label="CTA label" defaultValue={s.journal.label} />
            <Text name="journal.href"    label="CTA link"  defaultValue={s.journal.href} />
          </Grid>
        </Section>

        <Section title="Concierge band">
          <Grid>
            <Text name="concierge.eyebrow" label="Eyebrow"   defaultValue={s.concierge.eyebrow} />
            <Text name="concierge.title"   label="Headline"  defaultValue={s.concierge.title} full />
            <Area name="concierge.body"    label="Body"      defaultValue={s.concierge.body} rows={3} full />
            <Text name="concierge.label"   label="CTA label" defaultValue={s.concierge.label} />
            <Text name="concierge.href"    label="CTA link"  defaultValue={s.concierge.href} />
          </Grid>
        </Section>

        <div className="pt-4">
          <button type="submit" className="px-8 py-4 text-[12px] tracking-[0.22em] uppercase font-medium" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-ground)" }}>
            Publish changes
          </button>
        </div>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] tracking-[0.18em] uppercase font-medium mb-6" style={{ color: "var(--color-muted)" }}>{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid lg:grid-cols-2 gap-x-10 gap-y-6">{children}</div>;
}

function Text({ name, label, defaultValue, full }: { name: string; label: string; defaultValue: string; full?: boolean }) {
  return (
    <label className={full ? "block lg:col-span-2" : "block"}>
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="w-full bg-transparent border-b py-2 text-sm outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}

function Area({ name, label, defaultValue, rows, full }: { name: string; label: string; defaultValue: string; rows: number; full?: boolean }) {
  return (
    <label className={full ? "block lg:col-span-2" : "block"}>
      <span className="block mb-2 text-[10px] tracking-[0.18em] uppercase font-medium" style={{ color: "var(--color-ink)" }}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full bg-transparent border py-2 px-3 text-sm leading-relaxed outline-none focus:border-[var(--color-ink)]"
        style={{ borderColor: "var(--color-rule)", color: "var(--color-ink)" }}
      />
    </label>
  );
}
