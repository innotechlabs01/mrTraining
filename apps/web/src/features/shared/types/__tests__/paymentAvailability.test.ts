import { isCheckoutBlocked, isMediumOperational, type PaymentAvailability } from "../paymentAvailability";

const baseAvailability: PaymentAvailability = {
  gate_known: true,
  checked_at: "2026-11-05T00:00:00Z",
  overall_indicator: "operational",
  overall_description: "all systems normal",
  checkout_allowed: true,
  reason: "",
  degraded: false,
  api_operational: true,
  checkout_operational: true,
  media: [],
  unresolved_incidents: 0,
  fail_closed: false,
  api_status: "operational",
  checkout_status: "operational",
};

describe("paymentAvailability helpers", () => {
  it("blocks when fail_closed", () => {
    expect(isCheckoutBlocked({ ...baseAvailability, fail_closed: true, checkout_allowed: true })).toBe(true);
  });
  it("blocks when checkout not allowed", () => {
    expect(isCheckoutBlocked({ ...baseAvailability, fail_closed: false, checkout_allowed: false })).toBe(true);
  });
  it("allows when available", () => {
    expect(isCheckoutBlocked({ ...baseAvailability, fail_closed: false, checkout_allowed: true })).toBe(false);
  });
  it("respects medium status", () => {
    const avail: PaymentAvailability = {
      ...baseAvailability,
      media: [{ id: "m1", name: "PSE", status: "degraded", operational: false }],
    };
    expect(isMediumOperational(avail, "PSE")).toBe(false);
    expect(isMediumOperational(avail, "missing")).toBe(true);
  });
});
