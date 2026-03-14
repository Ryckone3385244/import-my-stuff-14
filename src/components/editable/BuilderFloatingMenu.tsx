import { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface BuilderFloatingMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export const BuilderFloatingMenu = ({
  open,
  x,
  y,
  onClose,
  children,
  className,
}: BuilderFloatingMenuProps) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuRect, setMenuRect] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuRect({ width: rect.width, height: rect.height });
  }, [open, children]);

  const pos = useMemo(() => {
    const padding = 8;
    const w = menuRect?.width ?? 240;
    const h = menuRect?.height ?? 200;
    const maxX = Math.max(padding, window.innerWidth - w - padding);
    const maxY = Math.max(padding, window.innerHeight - h - padding);
    return {
      left: Math.min(Math.max(x, padding), maxX),
      top: Math.min(Math.max(y, padding), maxY),
    };
  }, [x, y, menuRect]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10090]"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        ref={menuRef}
        role="menu"
        aria-label="Builder actions"
        className={cn(
          "fixed z-[10100] min-w-[220px] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-2xl",
          className
        )}
        style={{ left: pos.left, top: pos.top }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export const BuilderMenuSeparator = () => <div className="-mx-1 my-1 h-px bg-border" />;

interface BuilderMenuLabelProps {
  children: ReactNode;
}
export const BuilderMenuLabel = ({ children }: BuilderMenuLabelProps) => (
  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>
);

interface BuilderMenuItemProps {
  onSelect: () => void;
  children: ReactNode;
  disabled?: boolean;
  destructive?: boolean;
}

export const BuilderMenuItem = ({ onSelect, children, disabled, destructive }: BuilderMenuItemProps) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={onSelect}
    className={cn(
      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors",
      disabled
        ? "pointer-events-none opacity-50"
        : destructive
          ? "text-destructive hover:bg-accent focus:bg-accent"
          : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
    )}
  >
    {children}
  </button>
);
