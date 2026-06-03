"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { Brand } from "@/lib/data";
import {
  type Filters,
  type ActiveChip,
  activeChips,
  removeChip,
  serializeFilters,
} from "@/lib/filters";
import { trackClient } from "./PostHogProvider";

type Props = {
  current: Filters;
  brands: Brand[];
  visibleCount: number;
  totalCount: number;
  surface: "category" | "new-arrivals" | "search";
};

export default function ActiveFilterChips({ current, brands, visibleCount, totalCount, surface }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const brandsBySlug = new Map(brands.map(b => [b.slug, b]));
  const chips = activeChips(current, brandsBySlug);

  if (chips.length === 0) {
    return (
      <p className="hidden lg:block text-[11px] tracking-[0.18em] uppercase mb-6" style={{ color: "var(--color-muted)" }}>
        {visibleCount === totalCount
          ? `${totalCount} ${totalCount === 1 ? "piece" : "pieces"}`
          : `${visibleCount} of ${totalCount} ${totalCount === 1 ? "piece" : "pieces"}`}
      </p>
    );
  }

  function dropChip(chip: ActiveChip) {
    trackClient("filter_applied", { surface, key: "chip_remove", value: chip.value });
    const next = removeChip(current, chip);
    const qs = serializeFilters(next).toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    trackClient("filter_applied", { surface, key: "clear_all_from_chips" });
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6 lg:mb-8">
      <span className="text-[11px] tracking-[0.18em] uppercase mr-2" style={{ color: "var(--color-muted)" }}>
        Refined by
      </span>
      {chips.map(chip => (
        <button
          key={`${chip.key}-${chip.value}`}
          type="button"
          onClick={() => dropChip(chip)}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] tracking-[0.14em] uppercase border min-h-[36px] hover:bg-[var(--color-ink)] hover:text-[var(--color-ground)] transition-colors"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
          aria-label={`Remove filter: ${chip.label}`}
        >
          <span>{chip.label}</span>
          <span aria-hidden className="text-base leading-none -mt-px">×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="text-[11px] tracking-[0.18em] uppercase lux-link px-2 py-1.5"
        style={{ color: "var(--color-oxblood)" }}
      >
        Clear all
      </button>
      <span className="ml-auto text-[11px] tracking-[0.18em] uppercase" style={{ color: "var(--color-muted)" }}>
        {visibleCount} of {totalCount}
      </span>
      {/* re-render on URL change */}
      <span className="sr-only" aria-hidden>{searchParams?.toString()}</span>
    </div>
  );
}
