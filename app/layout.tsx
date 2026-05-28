import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { getCategories } from "@/lib/queries";
import { bagCount } from "@/lib/bag";
import { getServerSupabase } from "@/lib/supabase/server";
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
  title: {
    default: "Asofe — A House of Luxury",
    template: "%s | Asofe",
  },
  description:
    "A curated marketplace of independent African luxury houses. Aso oke, bazin riche, kente, mud cloth — ready-to-wear, leather goods, and jewellery.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = await getServerSupabase();
  const [categories, bag, userRes] = await Promise.all([
    getCategories(),
    bagCount(),
    sb.auth.getUser(),
  ]);
  const signedIn = !!userRes.data.user;
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navigation categories={categories} bagCount={bag} signedIn={signedIn} />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
