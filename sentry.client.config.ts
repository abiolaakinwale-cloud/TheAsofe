// Sentry — browser. Initialised only when NEXT_PUBLIC_SENTRY_DSN is present;
// without it, Sentry is a no-op. Set the env var in Vercel to enable.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0.1,         // 10% of transactions
    replaysSessionSampleRate: 0,    // off by default — opt in if you want
    replaysOnErrorSampleRate: 1,    // capture replay when an error happens
    ignoreErrors: [
      "NEXT_REDIRECT",              // server-action redirects (expected)
      "ResizeObserver loop limit exceeded",
    ],
  });
}
