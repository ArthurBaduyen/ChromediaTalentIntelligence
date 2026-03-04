import { ReactNode, RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FloatingPopoverProps = {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
  preferredPlacement?: "bottom" | "top";
  offset?: number;
  zIndexClassName?: string;
  onRequestClose?: () => void;
};

type Position = {
  top: number;
  left: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function FloatingPopover({
  open,
  anchorRef,
  children,
  className = "",
  align = "end",
  preferredPlacement = "bottom",
  offset = 8,
  zIndexClassName = "z-[90]",
  onRequestClose
}: FloatingPopoverProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  const updatePosition = useMemo(
    () => () => {
      if (!open) return;
      const anchorEl = anchorRef.current;
      const contentEl = contentRef.current;
      if (!anchorEl || !contentEl) return;

      const anchorRect = anchorEl.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 8;

      const spaceBelow = viewportHeight - anchorRect.bottom - margin;
      const spaceAbove = anchorRect.top - margin;
      const placeTop =
        preferredPlacement === "bottom"
          ? spaceBelow < contentRect.height + offset && spaceAbove > spaceBelow
          : spaceAbove >= contentRect.height + offset;

      const top = placeTop
        ? anchorRect.top - contentRect.height - offset
        : anchorRect.bottom + offset;

      const rawLeft =
        align === "start"
          ? anchorRect.left
          : align === "center"
            ? anchorRect.left + anchorRect.width / 2 - contentRect.width / 2
            : anchorRect.right - contentRect.width;

      setPosition({
        top: clamp(top, margin, Math.max(margin, viewportHeight - contentRect.height - margin)),
        left: clamp(rawLeft, margin, Math.max(margin, viewportWidth - contentRect.width - margin))
      });
    },
    [align, anchorRef, offset, open, preferredPlacement]
  );

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const timer = window.setTimeout(updatePosition, 0);
    return () => window.clearTimeout(timer);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleReposition = () => updatePosition();
    const handleOutsideClick = (event: MouseEvent) => {
      if (!onRequestClose) return;
      const target = event.target as Node | null;
      if (!target) return;
      const anchorEl = anchorRef.current;
      const contentEl = contentRef.current;
      if (anchorEl?.contains(target) || contentEl?.contains(target)) return;
      onRequestClose();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [anchorRef, onRequestClose, open, updatePosition]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={contentRef}
      className={`fixed ${zIndexClassName} ${className}`.trim()}
      style={position ? { top: `${position.top}px`, left: `${position.left}px` } : undefined}
    >
      {children}
    </div>,
    document.body
  );
}

