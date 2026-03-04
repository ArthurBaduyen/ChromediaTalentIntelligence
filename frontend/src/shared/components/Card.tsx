import { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "title">;

export function Card({ title, subtitle, children, className = "", ...props }: CardProps) {
  return (
    <article
      className={`rounded-md border border-border-subtle bg-surface-default p-4 shadow-sm ${className}`.trim()}
      {...props}
    >
      {title ? <h3 className="text-sm font-semibold text-text-primary">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-xs text-text-muted">{subtitle}</p> : null}
      <div className={title || subtitle ? "mt-3" : ""}>{children}</div>
    </article>
  );
}
