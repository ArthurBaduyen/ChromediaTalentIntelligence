import { MouseEvent } from "react";
import { DotsVerticalIcon } from "./Icons";

type RowActionsButtonProps = {
  ariaLabel?: string;
  onClick?: () => void;
};

export function RowActionsButton({ ariaLabel = "Row actions", onClick }: RowActionsButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex text-text-muted hover:text-text-secondary"
      aria-label={ariaLabel}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClick?.();
      }}
    >
      <DotsVerticalIcon className="h-5 w-5" />
    </button>
  );
}
