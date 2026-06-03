import { describe, it, expect } from "vitest";
import { shippingFor, FREE_SHIPPING_THRESHOLD_GBP, STANDARD_SHIPPING_GBP } from "../shipping";

describe("shippingFor", () => {
  it("charges standard shipping below threshold", () => {
    const s = shippingFor(50);
    expect(s.qualifies).toBe(false);
    expect(s.charge).toBe(STANDARD_SHIPPING_GBP);
    expect(s.remaining).toBe(FREE_SHIPPING_THRESHOLD_GBP - 50);
    expect(s.progress).toBeCloseTo(50 / FREE_SHIPPING_THRESHOLD_GBP);
  });

  it("qualifies exactly at the threshold", () => {
    const s = shippingFor(FREE_SHIPPING_THRESHOLD_GBP);
    expect(s.qualifies).toBe(true);
    expect(s.charge).toBe(0);
    expect(s.remaining).toBe(0);
    expect(s.progress).toBe(1);
  });

  it("qualifies above the threshold", () => {
    const s = shippingFor(FREE_SHIPPING_THRESHOLD_GBP + 100);
    expect(s.qualifies).toBe(true);
    expect(s.charge).toBe(0);
    expect(s.progress).toBe(1);
  });

  it("clamps remaining at zero", () => {
    expect(shippingFor(99_999).remaining).toBe(0);
  });
});
