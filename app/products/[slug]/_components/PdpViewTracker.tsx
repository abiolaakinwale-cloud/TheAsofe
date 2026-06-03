"use client";

import { useEffect } from "react";
import { trackClient } from "@/components/PostHogProvider";

type Props = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  inStock: boolean;
};

const SESSION_KEY = "asofe.pdp.viewed";

export default function PdpViewTracker({ slug, name, brand, category, price, inStock }: Props) {
  useEffect(() => {
    try {
      const seen = new Set<string>(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]"));
      if (seen.has(slug)) return;
      seen.add(slug);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(seen).slice(-50)));
    } catch {
      /* sessionStorage unavailable — track anyway */
    }
    trackClient("product_view", { slug, name, brand, category, price, in_stock: inStock });
  }, [slug, name, brand, category, price, inStock]);

  return null;
}
