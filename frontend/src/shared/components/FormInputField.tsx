import { useMemo, useState } from "react";

type FormInputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  optional?: boolean;
  type?: "text" | "email" | "date" | "password";
  size?: "sm" | "md" | "lg";
  state?: "default" | "error" | "disabled";
  autoComplete?: string;
  min?: string;
  max?: string;
};

const baseInputClass =
  "w-full rounded-md border px-3 outline-none focus:border-border-focus text-text-secondary placeholder:text-text-muted";

function placeholderFromLabel(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("first name")) return "Enter first name";
  if (normalized.includes("middle name")) return "Enter middle name";
  if (normalized.includes("last name")) return "Enter last name";
  if (normalized.includes("email")) return "name@company.com";
  if (normalized.includes("address")) return "Street, building, barangay";
  if (normalized === "city") return "Enter city";
  if (normalized.includes("region")) return "Enter region/province";
  if (normalized.includes("zip")) return "Enter zip code";
  if (normalized.includes("country")) return "Enter country";
  if (normalized.includes("imessage")) return "iMessage handle (optional)";
  if (normalized.includes("position")) return "e.g. Senior Frontend Developer";
  if (normalized.includes("contract")) return "e.g. Full-time, Contract";
  if (normalized === "category") return "Enter category name";
  if (normalized === "skill") return "Enter skill name";
  if (normalized.includes("year")) return "YYYY";
  if (normalized.includes("degree")) return "e.g. BS Computer Science";
  if (normalized.includes("school")) return "e.g. University of San Carlos";
  if (normalized.includes("project name")) return "e.g. Talent Dashboard Revamp";
  if (normalized === "role") return "e.g. Lead Frontend Engineer";
  if (normalized.includes("duration")) return "e.g. Jan 2025 - Present";
  if (normalized.includes("title")) return "Enter title";
  if (normalized.includes("video url")) return "https://...";
  if (normalized.includes("score")) return "e.g. 850/1000";
  if (normalized.includes("result link")) return "https://...";
  if (normalized.includes("technologies")) return "React, TypeScript, Tailwind";
  return "Enter value";
}

export function FormInputField({
  label,
  value,
  onChange,
  placeholder,
  error,
  optional,
  type = "text",
  size = "md",
  state = "default",
  autoComplete,
  min,
  max
}: FormInputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = useMemo(() => {
    if (type !== "password") return type;
    return showPassword ? "text" : "password";
  }, [showPassword, type]);
  const resolvedPlaceholder = placeholder ?? placeholderFromLabel(label);
  const sizeClass = size === "sm" ? "h-8 text-xs" : size === "lg" ? "h-11 text-base" : "h-10 text-sm";
  const computedState = error ? "error" : state;
  const stateClass =
    computedState === "error"
      ? "border-border-danger"
      : computedState === "disabled"
        ? "border-border-subtle bg-surface-muted text-text-muted"
        : "border-border-default bg-surface-default";
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-5 text-text-primary">{label}</label>
        {optional ? <span className="text-sm text-text-muted">Optional</span> : null}
      </div>
      <div className="relative">
        <input
          type={resolvedType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={computedState === "disabled"}
          placeholder={type === "date" ? undefined : resolvedPlaceholder}
          autoComplete={autoComplete}
          min={min}
          max={max}
          className={`${baseInputClass} ${sizeClass} ${stateClass} ${type === "password" ? "pr-16" : ""}`}
        />
        {type === "password" ? (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-text-muted hover:text-text-secondary"
            onClick={() => setShowPassword((previous) => !previous)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-text-danger">{error}</p> : null}
    </div>
  );
}
