export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export function sanitizeText(value: string, maxLength = 200) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidPhilippinesMobile(value: string) {
  return /^9\d{9}$/.test(digitsOnly(value));
}

export function parsePositiveAmount(value: string) {
  const normalized = value.replace(/,/g, "").replace(/\$/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function uniqueBy<T>(items: T[], keyOf: (item: T) => string) {
  const seen = new Set<string>();
  const next: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}

export function requireText(
  value: string,
  field: string,
  errors: Record<string, string>,
  options?: { min?: number; max?: number }
) {
  const min = options?.min ?? 1;
  const max = options?.max ?? 200;
  const trimmed = value.trim();
  if (trimmed.length < min) {
    errors[field] = "This field is required.";
    return;
  }
  if (trimmed.length > max) {
    errors[field] = `Must be ${max} characters or less.`;
  }
}

export function hasErrors(errors: Record<string, string>) {
  return Object.keys(errors).length > 0;
}
