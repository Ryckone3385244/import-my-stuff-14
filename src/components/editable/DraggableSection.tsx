import { ReactNode, useState } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional, ClipboardItem } from '@/contexts/BuilderContext';
import { useElementStylesContext } from '@/hooks/useElementStylesContext';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import { SectionBackgroundDialog } from './SectionBackgroundDialog';
import { FullBleedBackground } from './FullBleedBackground';
import { BuilderContextMenu } from './BuilderContextMenu';
import { pasteSectionToPage } from '@/lib/clipboardOperations';
import { BC } from '@/components/builder/builderColors';

interface DraggableSectionProps {
  id: string;
  pageName?: string;
  children: ReactNode;
  className?: string;
  visible?: boolean;
  backgroundType?: 'color' | 'image' | 'gradient' | 'none';
  backgroundValue?: string | null;
  isFirst?: boolean;
  isLast?: boolean;
  noMobileSwap?: boolean;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBackgroundChange?: (type: 'color' | 'image' | 'gradient' | 'none', value: string | null) => void;
  onToggleMobileSwap?: (id: string) => void;
  isTitleSection?: boolean;
}

export const DraggableSection = ({
  id, pageName = '', children, className = '', visible = true, backgroundType = 'none',
  backgroundValue = null, isFirst = false, isLast = false, noMobileSwap = false,
  onMoveUp, onMoveDown, onDuplicate, onToggleVisibility, onDelete,
  onBackgroundChange, onToggleMobileSwap, isTitleSection = false
}: DraggableSectionProps) => {
  const { isEditMode, markStructuralChange } = useEditMode();
  const builder = useBuilderOptional();
  const stylesCtx = useElementStylesContext();
  const [showBackgroundDialog, setShowBackgroundDialog] = useState(false);

  const elementStyle = stylesCtx?.getElementStyle(id) || {};

  if (!visible && !isEditMode) {
    return null;
  }

  const hasBackground = backgroundType !== 'none' && backgroundValue;
  const isSelected = builder?.selectedElement?.type === 'section' && builder.selectedElement.id === id;

  const selectSection = () => {
    if (!isEditMode || !builder) return;

    builder.selectElement({
      id,
      type: 'section',
      pageName,
      sectionId: id,
      label: `Section: ${id}`,
      contentData: {
        backgroundType,
        backgroundValue,
        visible,
        noMobileSwap,
      },
      onContentSave: (data) => {
        if (data.backgroundType !== undefined && onBackgroundChange) {
          onBackgroundChange(data.backgroundType, data.backgroundValue);
        }
      },
      actions: [
        ...(!isFirst && onMoveUp ? [{ id: 'move-up', label: 'Move section up', onClick: () => onMoveUp(id) }] : []),
        ...(!isLast && onMoveDown ? [{ id: 'move-down', label: 'Move section down', onClick: () => onMoveDown(id) }] : []),
        ...(onDuplicate ? [{ id: 'duplicate', label: 'Duplicate section', onClick: () => onDuplicate(id) }] : []),
        ...(onToggleVisibility ? [{ id: 'visibility', label: visible ? 'Hide section' : 'Show section', onClick: () => onToggleVisibility(id), tone: 'warn' as const }] : []),
        ...(onToggleMobileSwap ? [{ id: 'mobile-swap', label: noMobileSwap ? 'Enable mobile swap' : 'Disable mobile swap', onClick: () => onToggleMobileSwap(id) }] : []),
        ...(onDelete ? [{
          id: 'delete',
          label: isTitleSection ? 'Hide title section' : 'Delete section',
          tone: 'danger' as const,
          onClick: () => {
            if (isTitleSection) {
              onToggleVisibility?.(id);
              return;
            }
            if (window.confirm('Are you sure you want to delete this section? This action cannot be undone.')) {
              onDelete(id);
            }
          }
        }] : []),
      ],
    });
  };

  const cache = usePageContentCacheOptional();

  const handlePaste = async (clipboard: ClipboardItem) => {
    if (clipboard.type === 'section') {
      await pasteSectionToPage(
        { pageName: clipboard.sourcePageName, sectionId: clipboard.sourceSectionId },
        { pageName, afterSectionId: id }
      );
      if (cache) await cache.refreshPage();
      // Trigger section order refresh by marking a structural change
      markStructuralChange(pageName);
    }
  };

  return (
    <>
      <BuilderContextMenu
        elementType="section"
        clipboardData={{
          sourcePageName: pageName,
          sourceSectionId: id,
        }}
        onPaste={handlePaste}
        onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
        onDelete={onDelete ? () => {
          if (isTitleSection) {
            onToggleVisibility?.(id);
          } else if (window.confirm('Are you sure you want to delete this section?')) {
            onDelete(id);
          }
        } : undefined}
        onToggleVisibility={onToggleVisibility ? () => onToggleVisibility(id) : undefined}
        onMoveUp={onMoveUp ? () => onMoveUp(id) : undefined}
        onMoveDown={onMoveDown ? () => onMoveDown(id) : undefined}
        isVisible={visible}
        isFirst={isFirst}
        isLast={isLast}
        label={`Section: ${id}`}
      >
        <div
          data-builder-section-id={id}
          onClick={selectSection}
          className={`relative w-full ${className}`}
          style={isEditMode ? {
            ...elementStyle,
            border: isSelected ? `2px solid ${BC.blue}` : `2px dashed ${BC.borderHover}`,
            margin: '24px 0',
            padding: '16px',
            boxShadow: isSelected ? `0 0 0 2px ${BC.blueBorder}` : 'none',
            ...((!visible) ? { opacity: 0.5, background: BC.redBg } : {}),
          } : elementStyle}
        >
          <FullBleedBackground
            backgroundType={backgroundType}
            backgroundValue={backgroundValue}
            className={hasBackground ? 'py-4 md:py-[30px]' : ''}
          >
            <div className={`${isTitleSection || isFirst ? 'animate-fade-up' : ''} w-full`}>
              {children}
            </div>
          </FullBleedBackground>
        </div>
      </BuilderContextMenu>

      {onBackgroundChange && (
        <SectionBackgroundDialog
          open={showBackgroundDialog}
          onOpenChange={setShowBackgroundDialog}
          currentType={backgroundType}
          currentValue={backgroundValue}
          onSave={(type, value) => onBackgroundChange(type, value)}
        />
      )}
    </>
  );
};
