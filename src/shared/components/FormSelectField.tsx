import { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "./Icons";

type Option = {
  label: string;
  value: string;
};

type FormSelectFieldProps = {
  label: string;
  options: Option[];
  error?: string;
  hint?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">;

export function FormSelectField({
  label,
  options,
  error,
  hint,
  className = "",
  ...props
}: FormSelectFieldProps) {
  return (
    <div className="flex w-full flex-col gap-1">
      <label className="text-sm font-medium leading-5 text-text-primary">{label}</label>
      <div className="relative">
        <select
          className={`h-10 w-full appearance-none rounded-md border bg-surface-default px-3 pr-9 text-sm leading-5 text-text-secondary outline-none ${
            error ? "border-border-danger" : "border-border-default"
          } ${className}`.trim()}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>
      {error ? <p className="text-xs text-text-danger">{error}</p> : hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
