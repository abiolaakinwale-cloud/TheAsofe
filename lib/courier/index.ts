import { stubProvider } from "./stub";
import { shippoProvider } from "./shippo";
import type { CourierProvider } from "./types";

export * from "./types";

/**
 * Returns the active provider based on env. Shippo activates when
 * SHIPPO_API_TOKEN is set; otherwise the stub takes over so the admin UI
 * works end-to-end pre-launch without external calls.
 */
export function getCourierProvider(): CourierProvider {
  if (process.env.SHIPPO_API_TOKEN) return shippoProvider;
  return stubProvider;
}

export function isCourierStub(): boolean {
  return !process.env.SHIPPO_API_TOKEN;
}
