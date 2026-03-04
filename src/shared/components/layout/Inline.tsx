import { HTMLAttributes, ReactNode } from "react";

type InlineProps = {
  children: ReactNode;
  gap?: "1" | "2" | "3" | "4" | "5" | "6" | "8";
  align?: "start" | "center" | "end" | "between";
} & HTMLAttributes<HTMLDivElement>;

const gapClass: Record<NonNullable<InlineProps["gap"]>, string> = {
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
  "8": "gap-8"
};

const alignClass: Record<NonNullable<InlineProps["align"]>, string> = {
  start: "items-start justify-start",
  center: "items-center justify-start",
  end: "items-end justify-start",
  between: "items-center justify-between"
};

export function Inline({ children, gap = "3", align = "center", className = "", ...props }: InlineProps) {
  return (
    <div className={`flex flex-row ${gapClass[gap]} ${alignClass[align]} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
