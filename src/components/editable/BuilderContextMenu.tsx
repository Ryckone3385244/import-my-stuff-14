import { ReactNode, useCallback, useRef, useState, type CSSProperties } from 'react';
import { useBuilderOptional, ClipboardItem } from '@/contexts/BuilderContext';
import { useEditMode } from '@/contexts/EditModeContext';
import { Copy, ClipboardPaste, Trash2, Eye, EyeOff, MoveUp, MoveDown, Layers } from 'lucide-react';
import {
  BuilderFloatingMenu,
  BuilderMenuItem,
  BuilderMenuLabel,
  BuilderMenuSeparator,
} from './BuilderFloatingMenu';

interface BuilderContextMenuProps {
  children: ReactNode;
  /** What type of element this wraps */
  elementType: 'section' | 'column' | 'component';
  /** Data needed to copy this element */
  clipboardData: Omit<ClipboardItem, 'type'>;
  /** Callbacks */
  onCopy?: () => void;
  onPaste?: (clipboard: ClipboardItem) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleVisibility?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isVisible?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  /** Extra label for display */
  label?: string;
  /** Optional wrapper props so parent layout (flex/grid/order/width) is preserved */
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
}

export const BuilderContextMenu = ({
  children,
  elementType,
  clipboardData,
  onCopy,
  onPaste,
  onDelete,
  onDuplicate,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  isVisible = true,
  isFirst = false,
  isLast = false,
  label,
  wrapperClassName,
  wrapperStyle,
}: BuilderContextMenuProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const [menu, setMenu] = useState<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });

  const closeMenu = useCallback(() => setMenu((m) => ({ ...m, open: false })), []);

  const openMenuAt = useCallback((x: number, y: number) => {
    setMenu({ open: true, x, y });
  }, []);

  const handleCopy = useCallback(() => {
    if (!builder) return;
    builder.copyToClipboard({
      type: elementType,
      ...clipboardData,
    });
    onCopy?.();
  }, [builder, elementType, clipboardData, onCopy]);

  const handlePaste = useCallback(() => {
    if (!builder?.clipboard || !onPaste) return;
    onPaste(builder.clipboard);
  }, [builder?.clipboard, onPaste]);

  const handleAction = useCallback(
    (action?: () => void) => {
      closeMenu();
      action?.();
    },
    [closeMenu]
  );

  if (!isEditMode) {
    // Preserve layout-affecting wrapper props (e.g. flex-basis/width) in view mode.
    if (wrapperClassName || wrapperStyle) {
      return (
        <div className={`relative ${wrapperClassName || ''}`} style={wrapperStyle}>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  const canPaste = builder?.clipboard != null && onPaste != null;
  const clipboardType = builder?.clipboard?.type;

  return (
    <div
      ref={wrapperRef}
      className={`relative ${wrapperClassName || ''}`}
      style={wrapperStyle}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const x = e.clientX;
        const y = e.clientY;
        // Defer open so the same pointer event can't immediately hit the menu overlay and close it.
        window.setTimeout(() => openMenuAt(x, y), 0);
      }}
    >
      {children}

      <BuilderFloatingMenu open={menu.open} x={menu.x} y={menu.y} onClose={closeMenu}>
        {label && (
          <>
            <BuilderMenuLabel>{label}</BuilderMenuLabel>
            <BuilderMenuSeparator />
          </>
        )}

        <BuilderMenuItem onSelect={() => handleAction(handleCopy)}>
          <Copy className="h-3.5 w-3.5" />
          Copy {elementType}
        </BuilderMenuItem>

        {canPaste && (
          <BuilderMenuItem onSelect={() => handleAction(() => void handlePaste())}>
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste {clipboardType} here
          </BuilderMenuItem>
        )}

        {onDuplicate && (
          <BuilderMenuItem onSelect={() => handleAction(onDuplicate)}>
            <Layers className="h-3.5 w-3.5" />
            Duplicate {elementType}
          </BuilderMenuItem>
        )}

        {(onMoveUp || onMoveDown) && (
          <>
            <BuilderMenuSeparator />
            {onMoveUp && !isFirst && (
              <BuilderMenuItem onSelect={() => handleAction(onMoveUp)}>
                <MoveUp className="h-3.5 w-3.5" />
                Move up
              </BuilderMenuItem>
            )}
            {onMoveDown && !isLast && (
              <BuilderMenuItem onSelect={() => handleAction(onMoveDown)}>
                <MoveDown className="h-3.5 w-3.5" />
                Move down
              </BuilderMenuItem>
            )}
          </>
        )}

        {(onToggleVisibility || onDelete) && (
          <>
            <BuilderMenuSeparator />
            {onToggleVisibility && (
              <BuilderMenuItem onSelect={() => handleAction(onToggleVisibility)}>
                {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {isVisible ? 'Hide' : 'Show'} {elementType}
              </BuilderMenuItem>
            )}
            {onDelete && (
              <BuilderMenuItem destructive onSelect={() => handleAction(onDelete)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete {elementType}
              </BuilderMenuItem>
            )}
          </>
        )}
      </BuilderFloatingMenu>
    </div>
  );
};
