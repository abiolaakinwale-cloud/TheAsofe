// Stub provider — generates plausible-looking labels without calling any
// external API. Used when SHIPPO_API_TOKEN is unset (i.e. local dev,
// pre-launch). Drop-in replacement for the real provider so the admin UI
// works end-to-end.

import { randomBytes } from "node:crypto";
import type { CourierProvider, LabelRequest, LabelResult, TrackingUpdate } from "./types";

export const stubProvider: CourierProvider = {
  name: "stub",

  async buyLabel(req: LabelRequest): Promise<LabelResult> {
    const trackingRef = `STUB${randomBytes(6).toString("hex").toUpperCase()}GB`;
    const parcelId    = `parcel_stub_${randomBytes(8).toString("hex")}`;
    return {
      provider: "stub",
      parcelId,
      courier: "Royal Mail Tracked 48 (stub)",
      trackingRef,
      // Royal Mail tracking page is real and will display "not found" for the
      // stubbed ref — fine for demo purposes
      trackingUrl: `https://www.royalmail.com/track-your-item#/tracking-results/${trackingRef}`,
      labelUrl: `data:application/pdf;base64,JVBERi0xLjAKJSU=`,   // empty 1-page PDF placeholder
      costPence: 450,                                              // £4.50 default
      etaDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
    };
  },

  // Stub doesn't receive webhooks (Shippo would). Returning null keeps the
  // tracking-webhook route from misbehaving when a stubbed parcel id is hit.
  parseTrackingWebhook(): TrackingUpdate | null {
    return null;
  },
};
