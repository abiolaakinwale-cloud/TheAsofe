"use client";

import { useEffect } from "react";
import { trackClient } from "@/components/PostHogProvider";

// Delegated click tracking for the bag cross-sell cards. One listener;
// the data-cross-sell-slug attribute identifies the picked product.
export default function BagCrossSellClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const card = target?.closest<HTMLElement>("[data-cross-sell-slug]");
      if (!card) return;
      trackClient("bag_cross_sell_clicked", { slug: card.dataset.crossSellSlug });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
