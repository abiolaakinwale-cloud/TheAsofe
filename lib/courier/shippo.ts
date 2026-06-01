// Shippo provider — talks to the Shippo aggregator API. Activates when
// SHIPPO_API_TOKEN is set. Until then, the stub takes over.
//
// API docs: https://docs.goshippo.com
// Webhook setup (do this in the Shippo dashboard once activated):
//   POST https://www.theasofe.com/api/courier/tracking-webhook
//   Events: track_updated

import crypto from "node:crypto";
import type { CourierProvider, LabelRequest, LabelResult, TrackingUpdate, TrackingStatus } from "./types";

const SHIPPO_API = "https://api.goshippo.com";

const STATUS_MAP: Record<string, TrackingStatus> = {
  UNKNOWN:     "unknown",
  PRE_TRANSIT: "pre_transit",
  TRANSIT:     "transit",
  DELIVERED:   "delivered",
  RETURNED:    "returned",
  FAILURE:     "failure",
};

type ShippoAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

function toShippoAddress(a: LabelRequest["from"]): ShippoAddress {
  return {
    name: a.name,
    street1: a.line1,
    street2: a.line2 ?? undefined,
    city: a.city,
    zip: a.postcode,
    country: a.country,
    phone: a.phone ?? undefined,
    email: a.email ?? undefined,
  };
}

export const shippoProvider: CourierProvider = {
  name: "shippo",

  async buyLabel(req: LabelRequest): Promise<LabelResult> {
    const token = process.env.SHIPPO_API_TOKEN;
    if (!token) throw new Error("SHIPPO_API_TOKEN not set");

    const headers = {
      Authorization: `ShippoToken ${token}`,
      "Content-Type": "application/json",
    };

    // 1. Create shipment (Shippo returns purchasable rates)
    const shipRes = await fetch(`${SHIPPO_API}/shipments/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        address_from: toShippoAddress(req.from),
        address_to:   toShippoAddress(req.to),
        parcels: [{
          length:        String(req.parcel.length_cm),
          width:         String(req.parcel.width_cm),
          height:        String(req.parcel.height_cm),
          distance_unit: "cm",
          weight:        String(req.parcel.weight_grams),
          mass_unit:     "g",
        }],
        async: false,
        metadata: req.reference,
      }),
    });
    if (!shipRes.ok) throw new Error(`Shippo shipment failed: ${shipRes.status} ${await shipRes.text()}`);
    const shipment = await shipRes.json() as { object_id: string; rates: { object_id: string; provider: string; servicelevel: { name: string; token: string }; amount: string; currency: string; estimated_days?: number }[] };

    // 2. Pick the cheapest UK service that matches the desired level (or fall
    //    back to cheapest overall)
    const target = req.serviceLevel ?? "tracked_48";
    const ranked = shipment.rates
      .filter(r => r.currency === "GBP")
      .sort((a, b) => Number(a.amount) - Number(b.amount));
    const preferred = ranked.find(r => r.servicelevel.token.toLowerCase().includes(target.split("_")[0]))
      ?? ranked[0];
    if (!preferred) throw new Error("No Shippo rates returned for this shipment.");

    // 3. Purchase the label
    const txRes = await fetch(`${SHIPPO_API}/transactions/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        rate: preferred.object_id,
        label_file_type: "PDF",
        async: false,
      }),
    });
    if (!txRes.ok) throw new Error(`Shippo transaction failed: ${txRes.status} ${await txRes.text()}`);
    const tx = await txRes.json() as {
      status: string;
      object_id: string;
      tracking_number: string;
      tracking_url_provider: string | null;
      label_url: string;
      messages?: { text: string }[];
    };
    if (tx.status !== "SUCCESS") {
      const msg = tx.messages?.map(m => m.text).join("; ") ?? "Unknown error";
      throw new Error(`Shippo declined the label: ${msg}`);
    }

    return {
      provider: "shippo",
      parcelId: tx.object_id,
      courier: `${preferred.provider} ${preferred.servicelevel.name}`,
      trackingRef: tx.tracking_number,
      trackingUrl: tx.tracking_url_provider,
      labelUrl: tx.label_url,
      costPence: Math.round(Number(preferred.amount) * 100),
      etaDate: preferred.estimated_days
        ? new Date(Date.now() + preferred.estimated_days * 86_400_000).toISOString().slice(0, 10)
        : null,
    };
  },

  parseTrackingWebhook(rawBody: string, headers: Headers): TrackingUpdate | null {
    // Verify the Shippo webhook signature if configured.
    // See: https://docs.goshippo.com/docs/tracking/trackingwebhooks
    const secret = process.env.SHIPPO_WEBHOOK_SECRET;
    if (secret) {
      const sigHeader = headers.get("x-shippo-signature");
      if (!sigHeader) return null;
      const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      if (sigHeader !== expected) return null;
    }

    let payload: {
      event: string;
      data: {
        object_id: string;
        tracking_number: string;
        tracking_status: { status: string; status_details?: string; status_date: string; location?: { city?: string; country?: string } };
      };
    };
    try { payload = JSON.parse(rawBody); }
    catch { return null; }

    if (payload.event !== "track_updated") return null;
    const ts = payload.data.tracking_status;
    if (!ts) return null;

    return {
      parcelId: payload.data.object_id,
      trackingRef: payload.data.tracking_number,
      status: STATUS_MAP[ts.status] ?? "unknown",
      message: ts.status_details ?? ts.status,
      timestamp: ts.status_date,
      location: [ts.location?.city, ts.location?.country].filter(Boolean).join(", ") || undefined,
    };
  },
};
