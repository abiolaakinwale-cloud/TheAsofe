"use client";

import { useState, useTransition } from "react";
import { toggleWishlist } from "@/app/account/wishlist/actions";

type Size = "card" | "detail";

export default function HeartButton({
  slug,
  initial,
  size = "card",
  returnTo,
}: {
  slug: string;
  initial: boolean;
  size?: Size;
  returnTo?: string;
}) {
  const [faved, setFaved] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Stop the click bubbling up to the wrapping <Link> on product cards.
    e.preventDefault();
    e.stopPropagation();
    setFaved(prev => !prev); // optimistic
    startTransition(async () => {
      try {
        await toggleWishlist(slug, returnTo);
      } catch {
        setFaved(prev => !prev); // rollback on error
      }
    });
  }

  if (size === "detail") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={faved}
        aria-label={faved ? "Remove from wishlist" : "Save to wishlist"}
        className="w-full py-4 text-[12px] tracking-[0.18em] uppercase font-medium border transition-colors disabled:opacity-60"
        style={{
          borderColor: faved ? "var(--color-oxblood)" : "var(--color-ink)",
          color: faved ? "var(--color-oxblood)" : "var(--color-ink)",
          backgroundColor: "transparent",
        }}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Heart filled={faved} />
          {faved ? "Saved to wishlist" : "Save to wishlist"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={faved}
      aria-label={faved ? "Remove from wishlist" : "Save to wishlist"}
      className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-60 z-10"
      style={{
        backgroundColor: "rgba(250, 248, 244, 0.9)",
        backdropFilter: "blur(4px)",
      }}
    >
      <Heart filled={faved} />
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "var(--color-oxblood)" : "none"}
      stroke={filled ? "var(--color-oxblood)" : "var(--color-ink)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
