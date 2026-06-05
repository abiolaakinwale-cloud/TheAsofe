import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Suspense } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ReferralBanner from "@/components/ReferralBanner";
import PostHogProvider from "@/components/PostHogProvider";
import WelcomeOfferModal from "@/components/WelcomeOfferModal";
import { getCategories } from "@/lib/queries";
import { bagCount } from "@/lib/bag";
import { commerceEnabled } from "@/lib/launch-mode";
import { getServerSupabase } from "@/lib/supabase/server";
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, DEFAULT_OG_IMAGE } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "African luxury", "African fashion", "aso oke", "bazin riche", "kente",
    "mud cloth", "Ankara", "African designers", "luxury marketplace",
    "ready-to-wear", "African leather goods", "African jewellery",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_GB",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)",  color: "#1a1815" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await getServerSupabase();
  const commerce = commerceEnabled();
  const [categories, bag, userRes] = await Promise.all([
    commerce ? getCategories() : Promise.resolve([]),
    commerce ? bagCount() : Promise.resolve(0),
    sb.auth.getUser(),
  ]);
  const user = userRes.data.user;
  const signedIn = !!user;
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <PostHogProvider userId={user?.id ?? null} email={user?.email ?? null}>
            {commerce && <ReferralBanner />}
            <Navigation categories={categories} bagCount={bag} signedIn={signedIn} commerce={commerce} />
            <main className="flex-1">{children}</main>
            {commerce && !signedIn && <WelcomeOfferModal />}
            <Footer commerce={commerce} />
          </PostHogProvider>
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
