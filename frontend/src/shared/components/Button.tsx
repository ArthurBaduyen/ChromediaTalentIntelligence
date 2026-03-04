import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";
type ButtonTone = "default" | "danger";
type ButtonState = "default" | "disabled" | "loading";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant: ButtonVariant;
  tone?: ButtonTone;
  state?: ButtonState;
  size?: ButtonSize;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant,
  tone = "default",
  state = "default",
  size = "md",
  startIcon,
  endIcon,
  children,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = props.disabled || state === "disabled" || state === "loading";

  const base =
    "inline-flex items-center justify-center gap-1 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const sizeClass =
    size === "sm" ? "h-8 px-3 text-xs" : size === "lg" ? "h-10 px-5 text-base" : "h-9 px-4 text-sm";

  const primaryClass =
    tone === "danger"
      ? "border-action-danger bg-action-danger text-text-inverse hover:bg-action-danger-hover"
      : "border-action-primary bg-action-primary text-text-inverse hover:bg-action-primary-hover";
  const secondaryClass =
    tone === "danger"
      ? "border-transparent bg-danger-100 text-text-danger hover:bg-danger-100/80"
      : "border-transparent bg-action-secondary text-action-primary hover:bg-action-secondary-hover";
  const ghostClass =
    tone === "danger"
      ? "border-border-default bg-action-ghost text-text-danger hover:bg-danger-100"
      : "border-border-default bg-action-ghost text-text-secondary hover:bg-action-ghost-hover";

  const variantClass =
    variant === "primary"
      ? `${sizeClass} ${primaryClass}`
      : variant === "secondary"
        ? `${sizeClass} ${secondaryClass}`
        : variant === "ghost"
          ? `${sizeClass} ${ghostClass}`
          : `h-10 w-10 border-border-default bg-action-ghost text-text-muted shadow-sm hover:bg-action-ghost-hover`;

  return (
    <button type={type} disabled={isDisabled} className={`${base} ${variantClass} ${className}`.trim()} {...props}>
      {state === "loading" ? <span className="h-2 w-2 rounded-pill bg-current opacity-80" aria-hidden /> : null}
      {startIcon}
      {children}
      {endIcon}
    </button>
  );
}
