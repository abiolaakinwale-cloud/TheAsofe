// Provider-agnostic courier shape. The abstraction lets us swap Shippo for
// EasyPost (or a direct carrier API) without changing any admin code.

export type Address = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  postcode: string;
  country: string;          // ISO-2 ("GB", "FR", …)
  phone?: string | null;
  email?: string | null;
};

export type Parcel = {
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_grams: number;
};

export type LabelRequest = {
  orderId: string;
  reference: string;        // shown on the label, max 35 chars
  from: Address;            // Asofe UK hub
  to: Address;              // customer shipping address
  parcel: Parcel;
  serviceLevel?: "tracked_48" | "tracked_24" | "next_day" | "standard";
};

export type LabelResult = {
  provider: "shippo" | "easypost" | "stub";
  parcelId: string;         // courier's internal id; used by tracking webhook correlation
  courier: string;          // human-readable: "Royal Mail Tracked 48", "DPD", …
  trackingRef: string;
  trackingUrl: string | null;
  labelUrl: string;         // PDF download
  costPence: number;        // GBP, in pence; 0 if unknown
  etaDate: string | null;   // ISO date
};

export type TrackingStatus =
  | "unknown"
  | "pre_transit"
  | "transit"
  | "delivered"
  | "returned"
  | "failure";

export type TrackingUpdate = {
  parcelId: string;
  trackingRef: string;
  status: TrackingStatus;
  message: string;
  timestamp: string;        // ISO
  location?: string;
};

export interface CourierProvider {
  name: string;
  buyLabel(req: LabelRequest): Promise<LabelResult>;
  parseTrackingWebhook(rawBody: string, headers: Headers): TrackingUpdate | null;
}
