import { describe, expect, it } from "vitest";
import { hasDeviceLocalUri, validateDiagnosisDescription } from "./inputValidation";

describe("input validation", () => {
  it("rejects missing and oversized diagnosis descriptions", () => {
    expect(validateDiagnosisDescription(undefined).ok).toBe(false);
    expect(validateDiagnosisDescription("short").ok).toBe(false);
    expect(validateDiagnosisDescription("x".repeat(4001)).ok).toBe(false);
  });

  it("trims valid diagnosis descriptions", () => {
    expect(validateDiagnosisDescription("  Engine stalls at idle  ")).toEqual({
      ok: true,
      value: "Engine stalls at idle",
    });
  });

  it("recognizes device-local media URIs", () => {
    expect(hasDeviceLocalUri("file:///tmp/photo.jpg")).toBe(true);
    expect(hasDeviceLocalUri("content://media/photo")).toBe(true);
    expect(hasDeviceLocalUri("/api/storage/objects/uploads/photo")).toBe(false);
  });
});