import { describe, expect, it } from "vitest";
import { annualEntitlement, daysBetween, exitReentryFee, leaveLimit, loanCheck } from "@/awtad/lib/ess-rules";

describe("self-service rules", () => {
  it("counts leave days inclusively", () => expect(daysBetween("2026-01-01", "2026-01-05")).toBe(5));
  it("gives 21 days before 5 years and 30 after", () => {
    const now = new Date("2026-06-01");
    expect(annualEntitlement({ id: 1, join_date: "2024-01-01" }, [], now).quota).toBe(21);
    expect(annualEntitlement({ id: 1, join_date: "2020-01-01" }, [], now).quota).toBe(30);
  });
  it("uses contract leave days when set and subtracts approved annual leave this year", () => {
    const r = annualEntitlement({ id: 1, annual_leave_days: 25 }, [{ employee_id: 1, type: "سنوية", status: "معتمدة", from_date: "2026-02-01", days: 7 }], new Date("2026-06-01"));
    expect(r.balance).toBe(18);
  });
  it("caps marriage leave at 5 days", () => expect(leaveLimit("زواج")).toBe(5));
  it("blocks loan installments above 10% of wage", () => {
    expect(loanCheck(6000, 6, 10000).ok).toBe(true);
    expect(loanCheck(6000, 5, 10000).ok).toBe(false);
  });
  it("estimates exit re-entry fees", () => {
    expect(exitReentryFee("مفردة", 60)).toBe(200);
    expect(exitReentryFee("مفردة", 90)).toBe(300);
    expect(exitReentryFee("متعددة", 120)).toBe(700);
  });
});
