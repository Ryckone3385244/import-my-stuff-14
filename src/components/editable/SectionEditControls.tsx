import { ChevronUp, ChevronDown, Copy, Eye, EyeOff, Trash2, Palette, Smartphone } from 'lucide-react';
import { BC } from '@/components/builder/builderColors';

interface SectionEditControlsProps {
  id: string;
  visible: boolean;
  isTitleSection?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  noMobileSwap?: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenBackgroundDialog?: () => void;
  onToggleMobileSwap?: (id: string) => void;
  showBackgroundButton?: boolean;
}

const ControlBtn = ({
  onClick,
  disabled,
  title,
  children,
  variant = 'default',
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'amber';
}) => {
  const bg = variant === 'danger' ? BC.red : variant === 'amber' ? BC.amber : BC.controlOverlay;
  const bgHover = variant === 'danger' ? '#ff6b6b' : variant === 'amber' ? '#f59e0b' : BC.controlOverlayHover;
  const color = variant === 'danger' || variant === 'amber' ? BC.shellBg : BC.text;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ background: bg, color, border: 'none' }}
      className="h-8 w-8 p-0 rounded-md flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = bgHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}
    >
      {children}
    </button>
  );
};

export const SectionEditControls = ({
  id, visible, isTitleSection = false, isFirst = false, isLast = false,
  noMobileSwap = false, onMoveUp, onMoveDown, onDuplicate, onToggleVisibility,
  onDelete, onOpenBackgroundDialog, onToggleMobileSwap, showBackgroundButton = false,
}: SectionEditControlsProps) => {
  return (
    <>
      {/* Move up/down */}
      <div className="absolute left-4 top-4 flex flex-col gap-1 z-[60]">
        <ControlBtn onClick={() => onMoveUp?.(id)} disabled={isFirst} title="Move section up">
          <ChevronUp className="w-5 h-5" />
        </ControlBtn>
        <ControlBtn onClick={() => onMoveDown?.(id)} disabled={isLast} title="Move section down">
          <ChevronDown className="w-5 h-5" />
        </ControlBtn>
      </div>

      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex gap-2 z-[60]">
        {onToggleMobileSwap && (
          <ControlBtn
            onClick={() => onToggleMobileSwap(id)}
            title={noMobileSwap ? 'Mobile swap disabled – click to enable' : 'Mobile swap enabled – click to disable'}
            variant={noMobileSwap ? 'amber' : 'default'}
          >
            <Smartphone className="w-4 h-4" />
          </ControlBtn>
        )}
        {showBackgroundButton && onOpenBackgroundDialog && (
          <ControlBtn onClick={onOpenBackgroundDialog} title="Change background">
            <Palette className="w-4 h-4" />
          </ControlBtn>
        )}
        {onDuplicate && (
          <ControlBtn onClick={() => onDuplicate(id)} title="Duplicate section">
            <Copy className="w-4 h-4" />
          </ControlBtn>
        )}
        {onToggleVisibility && (
          <ControlBtn onClick={() => onToggleVisibility(id)} title={visible ? 'Hide section' : 'Show section'}>
            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </ControlBtn>
        )}
        {onDelete && (
          <ControlBtn
            onClick={() => {
              if (isTitleSection) {
                if (window.confirm('Page title sections cannot be deleted. Would you like to hide this section instead?')) {
                  onToggleVisibility?.(id);
                }
              } else {
                if (window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
                  onDelete(id);
                }
              }
            }}
            title={isTitleSection ? 'Hide section (cannot delete title sections)' : 'Delete section'}
            variant="danger"
          >
            <Trash2 className="w-4 h-4" />
          </ControlBtn>
        )}
      </div>
    </>
  );
};
