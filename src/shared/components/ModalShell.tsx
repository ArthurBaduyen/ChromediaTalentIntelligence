import { ReactNode } from "react";
import { CloseIcon } from "./Icons";

type ModalShellProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  maxWidthClassName?: string;
  bodyClassName?: string;
  showHeaderDivider?: boolean;
  children: ReactNode;
};

export function ModalShell({
  open,
  title,
  onClose,
  maxWidthClassName = "max-w-[560px]",
  bodyClassName = "",
  showHeaderDivider = true,
  children
}: ModalShellProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-surface-overlay/35 px-4 py-6">
      <div
        className={`w-full rounded-md border border-border-subtle bg-surface-default p-4 shadow-lg ${maxWidthClassName} ${bodyClassName}`.trim()}
      >
        <div
          className={`mb-4 flex items-start justify-between pb-4 ${
            showHeaderDivider ? "border-b border-border-subtle" : ""
          }`}
        >
          <h2 className="text-sm font-semibold leading-5 text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-primary"
            aria-label="Close modal"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
