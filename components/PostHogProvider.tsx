"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let initialised = false;
function init() {
  if (initialised || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,           // we send manually so we control properties
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: false,
    person_profiles: "identified_only",
    loaded: ph => {
      if (process.env.NODE_ENV === "development") ph.debug(false);
    },
  });
  initialised = true;
}

export function trackClient(event: string, properties: Record<string, unknown> = {}): void {
  if (!KEY || typeof window === "undefined") return;
  init();
  posthog.capture(event, properties);
}

export function identifyClient(userId: string, props: Record<string, unknown> = {}): void {
  if (!KEY || typeof window === "undefined") return;
  init();
  posthog.identify(userId, props);
}

export function resetClient(): void {
  if (!KEY || typeof window === "undefined") return;
  posthog.reset();
}

type Props = {
  userId: string | null;
  email: string | null;
  children: React.ReactNode;
};

export default function PostHogProvider({ userId, email, children }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!KEY) return;
    init();
    if (userId) {
      identifyClient(userId, email ? { email } : {});
    }
  }, [userId, email]);

  useEffect(() => {
    if (!KEY || !pathname) return;
    init();
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    posthog.capture("$pageview", { $current_url: url, path: pathname });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
