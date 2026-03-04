import { ReactNode } from "react";
import { SortIcon } from "./Icons";

type SortHeaderLabelProps = {
  children: ReactNode;
  active?: boolean;
  direction?: "asc" | "desc";
  onClick?: () => void;
};

export function SortHeaderLabel({ children, active = false, direction = "asc", onClick }: SortHeaderLabelProps) {
  const content = (
    <>
      <span>{children}</span>
      <span className="relative inline-flex h-3 w-2 items-center justify-center">
        <SortIcon className={`h-3 w-2 ${active ? "text-action-primary" : "text-text-muted"}`} />
        {active ? (
          <span
            className={`pointer-events-none absolute ${direction === "asc" ? "-top-[5px]" : "top-[5px]"} text-[8px] leading-none text-action-primary`}
          >
            {direction === "asc" ? "▲" : "▼"}
          </span>
        ) : null}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? "text-action-primary" : ""}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      {content}
    </span>
  );
}
