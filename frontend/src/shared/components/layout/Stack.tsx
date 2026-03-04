import { HTMLAttributes, ReactNode } from "react";

type StackProps = {
  children: ReactNode;
  gap?: "1" | "2" | "3" | "4" | "5" | "6" | "8";
} & HTMLAttributes<HTMLDivElement>;

const gapClass: Record<NonNullable<StackProps["gap"]>, string> = {
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "5": "gap-5",
  "6": "gap-6",
  "8": "gap-8"
};

export function Stack({ children, gap = "4", className = "", ...props }: StackProps) {
  return (
    <div className={`flex flex-col ${gapClass[gap]} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
