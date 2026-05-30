import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.nappy.co" },
      // Supabase Storage public objects for seller-uploaded product images
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

// Sentry wrapping is safe whether or not NEXT_PUBLIC_SENTRY_DSN is set.
// Without a DSN, init is skipped at runtime and bundle impact is minimal.
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,   // for source-map uploads
  disableLogger: true,
  tunnelRoute: "/monitoring",                  // proxy past ad-blockers
  widenClientFileUpload: true,
});
