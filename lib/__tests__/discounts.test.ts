import { describe, it, expect, vi } from "vitest";

// Mock the admin client before importing the module under test.
const mockMaybeSingle = vi.fn();
vi.mock("../supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
    }),
  }),
}));

import { validateDiscount } from "../discounts";

const baseCode = {
  code: "WELCOME-TEST",
  kind: "percent" as const,
  value: 10,
  min_subtotal_pence: 0,
  max_uses: 1,
  uses_count: 0,
  first_order_only: false,
  customer_email: null,
  source: "welcome",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
};

describe("validateDiscount", () => {
  it("rejects unknown codes", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const r = await validateDiscount({ code: "NOPE", subtotalGbp: 100, customerEmail: null, customerId: null });
    expect(r.ok).toBe(false);
  });

  it("computes a percent discount on subtotal", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: baseCode });
    const r = await validateDiscount({ code: "WELCOME-TEST", subtotalGbp: 200, customerEmail: null, customerId: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discountPence).toBe(2000); // 10% of £200 = £20 → 2000p
  });

  it("rejects expired codes", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { ...baseCode, expires_at: new Date(Date.now() - 1000).toISOString() } });
    const r = await validateDiscount({ code: "WELCOME-TEST", subtotalGbp: 200, customerEmail: null, customerId: null });
    expect(r.ok).toBe(false);
  });

  it("rejects used codes (uses_count >= max_uses)", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { ...baseCode, uses_count: 1 } });
    const r = await validateDiscount({ code: "WELCOME-TEST", subtotalGbp: 200, customerEmail: null, customerId: null });
    expect(r.ok).toBe(false);
  });

  it("rejects email-bound codes used by a different email", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: { ...baseCode, customer_email: "other@x.com" } });
    const r = await validateDiscount({ code: "WELCOME-TEST", subtotalGbp: 200, customerEmail: "me@x.com", customerId: null });
    expect(r.ok).toBe(false);
  });
});
