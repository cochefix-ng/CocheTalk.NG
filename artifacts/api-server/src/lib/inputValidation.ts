export function validateDiagnosisDescription(value: unknown) {
  if (typeof value !== "string") return { ok: false as const, error: "Description is required" };
  const description = value.trim();
  if (description.length < 10 || description.length > 4000) {
    return { ok: false as const, error: "Description must be between 10 and 4000 characters" };
  }
  return { ok: true as const, value: description };
}

export function hasDeviceLocalUri(value: unknown) {
  return typeof value === "string" && /^(file|content):\/\//i.test(value);
}