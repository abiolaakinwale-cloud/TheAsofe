// UK fulfilment hub — the "from" address on every outbound label.
// Currently using the Kadd Consulting Limited registered office as the
// shipping origin; swap to the actual fulfilment partner address once
// that arrangement is confirmed.
//
// TODO (pre-launch): confirm whether parcels actually depart from this
// address or from a 3PL warehouse. See docs/PRE-LAUNCH-CLAIMS.md.

import type { Address } from "./types";

export const UK_HUB_ADDRESS: Address = {
  name: "Asofe Fulfilment",
  line1: "33 Lansbury Road",
  line2: "Newton Leys",
  city: "Bletchley",
  postcode: "MK3 5QP",
  country: "GB",
  phone: null,
  email: "correspondence@theasofe.com",
};

// Reasonable defaults when parcel dimensions aren't specified per-product
// (none of the 22 products currently carry weight/dim metadata).
export const DEFAULT_PARCEL = {
  length_cm: 30,
  width_cm: 20,
  height_cm: 10,
  weight_grams: 800,    // average for a single garment in tissue + box
};
