# Pre-launch claims audit

Every place on the public site where Asofe states something that could be
challenged (operationally, legally, or numerically) before we have the
relevant infrastructure live. Confirm or revise each before public launch.

Format: `file:line — claim — verification needed`

## Operational — physical operations

| Location | Claim | Question to answer |
|---|---|---|
| `app/page.tsx:301` | "Pieces are dispatched from our London hub" | Does the hub physically exist? Where? Who staffs it? |
| `app/page.tsx:170` | "UK delivery on stocked pieces" | Have we agreed terms with a UK courier? See [open decisions](#open-decisions). |
| `app/page.tsx:263` | "weeks of waiting, customs paperwork, and a leap of faith on returns" (problem framing — defensible) | OK |
| `app/page.tsx:269` | "two to four days, and handle returns locally" | Predicated on hub + courier. Confirm pre-launch. |
| `app/page.tsx:373` | "UK fulfilment, returns handling, and access to diaspora shoppers" | Same — fulfilment depends on hub. |
| `app/page.tsx:568` | Fictional testimonial: "Asofe is the only place I can buy from these designers and receive in the UK without the customs headache." | Replace with real quote or remove the testimonial section pre-launch. |
| `app/sellers/page.tsx:157` | "Ship your collection to our consolidator in Lagos" | Does this consolidator partner exist? Named contact? |
| `app/sellers/page.tsx` (Metrics section, ~ln 285) | "UK fulfilled / One contract / GBP checkout / UK returns" — softened to qualitative, but still implies live ops | Hub + customs + returns must exist before this is publishable. |
| `app/concierge/page.tsx:38` | "small team — based in London and Lagos — available by email and WhatsApp" | True today? Or aspirational? |
| `app/contact/page.tsx:63` | "Our Lagos atelier holds a rotating selection from each designer" | Does this physical Lagos showroom exist? |
| `app/contact/page.tsx:70` | "Lagos & London" header | Same. |
| `app/careers/page.tsx:19` | "small team across Lagos and London" | True? |

## Numeric claims removed pre-launch

| Location | Old | New |
|---|---|---|
| `app/page.tsx:171` | "500+ Verified designers in onboarding" | "Founding designers — First houses now being onboarded" |
| `app/page.tsx:172` | "99 % Order success rate" | "Authentic — Every piece sourced from its atelier" |
| `app/page.tsx:170` | "2–4 d UK delivery" | "UK fulfilled — Designer-direct, dispatched from London" |
| `app/sellers/page.tsx` (Metrics) | "2–3 days average UK delivery / One hub / GBP £ / Local" | Replaced with qualitative versions (see file). |

## Legal / trading disclosure

**Trading entity**: Asofe is a trading name of **Kadd Consulting Limited**.
- Company number: **15467682** (registered in England and Wales)
- Registered office: 33 Lansbury Road, Newton Leys, Bletchley, Bucks, United Kingdom, MK3 5QP
- VAT: ⚠ status not yet confirmed — add VAT number if registered, or note "not registered for VAT (under UK threshold)" if not

| Location | Status |
|---|---|
| `app/privacy/page.tsx:22` | ✓ Done — full entity + Co Hse + registered office |
| `app/terms/page.tsx:23` | ✓ Done |
| `app/buyer-protection/page.tsx` | ✓ Merchant of record line updated |
| `components/Footer.tsx` | ✓ Done — Co Hse number + registered office. Add VAT line when status confirmed. |

## Open decisions

These are the answers needed before the operational claims above can be made truthfully:

1. **UK hub** — exists / doesn't / when?
2. **Lagos consolidator** — named partner / DIY / non-existent?
3. **UK courier** — DPD / Royal Mail Tracked 48 / Evri / Whistl?
4. **Customs handling** — own EORI + IOSS, customs agent, or designer self-declares?
5. **Returns operator** — same as hub? Different vendor? Same-day inspection claim defensible?
6. **Lagos showroom** — physical address exists? Open to public?
7. **Team locations** — "London and Lagos" — both true today, or aspirational?

## Once each of the above is resolved

Sweep this file's first column and either:
- update the relevant copy in the codebase, or
- delete the operational claim that isn't yet true.

Then remove this file (it's only useful pre-launch).
