// One-off: seed 4 journal posts using founder-supplied editorial imagery
// (Ankara, Wedding Guest, Occasion, Contemporary Designers). Idempotent —
// upserts by slug.
//
//   node scripts/seed-editorial-journal.mjs

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const posts = [
  {
    slug: "ankara-reimagined",
    title: "Ankara, Reimagined.",
    eyebrow: "From the Journal · The Print Issue",
    excerpt: "Bold prints, modern silhouettes. A closer look at how this season's independent designers are reinterpreting Ankara for the contemporary wardrobe.",
    body: `For a fabric that has been around as long as Ankara has, it would be easy to assume the conversation is finished. The grammar is set. The motifs are catalogued. The roles — formal, everyday, ceremonial — are clear.

What the designers on our floor are doing this season is rejecting that assumption.

We see Ankara cut in shapes that wouldn't be out of place on a Paris runway. Wide-leg trousers. Wrap dresses. Tailored blazers worn with nothing underneath. The print is no longer the whole story — it has become a single voice in a more complicated composition.

There's a generational shift in this. The designers who are reimagining Ankara grew up wearing it on Sundays. They have no need to prove their fluency in it. They can move it, reshape it, edit it. The respect is built in.

We've curated a small edit of pieces that capture what we're seeing. Cut close, cut loose, cut clean. Each one a different answer to the same question: what does Ankara look like in 2026?`,
    hero_image: "/asofe/editorial-ankara.png",
    brand: null,
    published: true,
    published_at: new Date().toISOString(),
  },
  {
    slug: "occasion-dressing",
    title: "Occasion wear that stands out.",
    eyebrow: "From the Journal · The Occasion Issue",
    excerpt: "Tailoring, drape, and the small details that turn a piece of clothing into something an event is remembered by.",
    body: `Occasion dressing in the African tradition has never been quiet. It announces itself. It commits.

What is changing in the houses we work with is the balance between announcement and restraint. A bazin riche in a deep, almost black indigo — extraordinarily luxurious to anyone who knows the fabric, easy to miss for those who don't. An agbada cut clean, without the heavy embroidery — the drape doing all the work.

This is occasion wear that demands a second look, not a first impression.

We've assembled an edit of pieces our designers consider their most quietly remarkable: dresses that move, jackets that fall properly when you sit down, kaftans cut for women who don't need to be told they're elegant.`,
    hero_image: "/asofe/category-occasion.png",
    brand: null,
    published: true,
    published_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    slug: "wedding-guest-looks",
    title: "What to wear as a wedding guest.",
    eyebrow: "From the Journal · The Wedding Issue",
    excerpt: "A small style guide for the diaspora wedding circuit — what travels well, what photographs well, and what you'll still want to wear three years from now.",
    body: `A wedding in Lagos. A reception in Accra. A traditional ceremony in London — at the parents' house — and then a white wedding the following day.

The diaspora wedding circuit asks more of a wardrobe than almost any other event in the calendar. Heat. Air-conditioning. Long flights. Photographers. The thirty hours between the bride's introduction and the bride's send-off.

A few notes from the designers on our floor:

Choose drape over structure. Anything close-fitting will get warm; anything heavily seamed will wrinkle on the plane. A well-cut wrap dress, a generous kaftan, a loose two-piece — these handle the day.

Choose colour bravely. Wedding photography is unforgiving to anyone who tries to disappear. The aunties will remember what you wore in twenty years; choose accordingly.

And choose for after. A piece worn once is a regret. A piece worn for fifteen weddings is a friend.`,
    hero_image: "/asofe/category-wedding.png",
    brand: null,
    published: true,
    published_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    slug: "contemporary-african-designers",
    title: "On contemporary African designers.",
    eyebrow: "From the Journal · The Future Issue",
    excerpt: "Who is making the most interesting clothing on the continent right now — and what they have in common.",
    body: `A few years ago, the conversation about African design was still mostly about heritage. About preserving techniques. About making sure aso oke and bògòlanfini didn't disappear into the museums.

That conversation hasn't ended — and shouldn't. But running alongside it now is a different one.

The most interesting designers we encounter today are not trying to preserve anything. They are trying to make clothes their friends will want to wear next Saturday. They learned weaving in Iseyin or Bonwire and pattern-cutting in Antwerp or Saint Martins. They use the language they grew up with and the language they trained in interchangeably, often within the same piece.

The result is a design culture that has stopped asking permission. Houses producing twelve looks a season for an international press list. Pop-ups in Brixton, Peckham, the Marais, Brooklyn. Collaborations with stylists in Vogue. A small but growing number of pieces that get attention not because they're "African" — that word doing too much heavy lifting — but because they're good.

We started Asofe because we wanted to be part of bringing those pieces somewhere they can be bought.`,
    hero_image: "/asofe/banner-contemporary.png",
    brand: null,
    published: true,
    published_at: new Date(Date.now() - 86400000 * 21).toISOString(),
  },
];

for (const p of posts) {
  const { error } = await sb
    .from("journal_posts")
    .upsert({ ...p, updated_at: new Date().toISOString() }, { onConflict: "slug" });
  if (error) {
    console.error(`✗ ${p.slug}:`, error.message);
  } else {
    console.log(`✓ ${p.slug}`);
  }
}
console.log("\nDone.");
