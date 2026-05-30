"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 2rem", textAlign: "center", color: "#1a1815" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.22em", fontSize: 10, color: "#7a6f5f", marginBottom: 12 }}>
          Something went wrong
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 300, marginBottom: 16 }}>An error interrupted the page.</h1>
        <p style={{ color: "#7a6f5f", maxWidth: 480, margin: "0 auto 32px" }}>
          We&apos;ve been notified. Try refreshing — or come back in a moment.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "12px 32px",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            background: "#1a1815",
            color: "#faf8f4",
            border: 0,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
