import { ReactNode, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional, ClipboardItem } from '@/contexts/BuilderContext';
import { useElementStylesContext } from '@/hooks/useElementStylesContext';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import { CardBackgroundDialog } from './CardBackgroundDialog';
import { BuilderContextMenu } from './BuilderContextMenu';
import { pasteColumnContent, pasteComponentToColumn } from '@/lib/clipboardOperations';
import { BC } from '@/components/builder/builderColors';

interface DraggableColumnProps {
  id: string;
  pageName?: string;
  sectionId?: string;
  children: ReactNode;
  visible?: boolean;
  showBorder?: boolean;
  verticalAlign?: 'top' | 'center';
  cardStyle?: React.CSSProperties;
  currentBackgroundColor?: string;
  className?: string;
  columnWidth?: string;
  onDuplicate?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCardBackgroundChange?: (id: string, background: string | null, showBorder?: boolean, verticalAlign?: 'top' | 'center', columnWidth?: string) => void;
  onColumnWidthChange?: (id: string, width: string) => void;
}

export const DraggableColumn = ({
  id,
  pageName = '',
  sectionId,
  children,
  visible = true,
  showBorder: initialShowBorder = false,
  verticalAlign = 'top',
  cardStyle = {},
  currentBackgroundColor,
  className = '',
  columnWidth,
  onDuplicate,
  onToggleVisibility,
  onDelete,
  onCardBackgroundChange,
  onColumnWidthChange
}: DraggableColumnProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const stylesCtx = useElementStylesContext();
  const cache = usePageContentCacheOptional();
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  // Use section-scoped ID for element styles to prevent cross-section style sharing
  const scopedElementId = sectionId ? `${sectionId}::${id}` : id;
  const elementStyle = stylesCtx?.getElementStyle(scopedElementId) || {};
  const [currentBackground, setCurrentBackground] = useState<string | null>(currentBackgroundColor ?? null);
  const [showBorder, setShowBorder] = useState<boolean>(initialShowBorder);
  const [currentVerticalAlign, setCurrentVerticalAlign] = useState<'top' | 'center'>(verticalAlign);

  useEffect(() => {
    setShowBorder(initialShowBorder);
  }, [initialShowBorder]);

  useEffect(() => {
    setCurrentVerticalAlign(verticalAlign);
  }, [verticalAlign]);

  useEffect(() => {
    setCurrentBackground(currentBackgroundColor ?? null);
  }, [currentBackgroundColor]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: 'column',
      sectionId,
      columnId: id
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!visible && !isEditMode) {
    return null;
  }

  // Determine effective width: prefer columnWidth prop, then fall back to element_styles width
  const styleWidth = (elementStyle as any)?.width as string | undefined;
  const effectiveWidth = columnWidth || styleWidth || null;

  const normalizedWidth = effectiveWidth
    ? (() => {
        const cleaned = effectiveWidth.trim().replace(/\s+/g, '');
        return /^\d+$/.test(cleaned) ? `${cleaned}%` : cleaned;
      })()
    : null;

  // Unified flex-based width: custom width → fixed flex-basis (shrinkable), otherwise auto-fill
  // Using flex-shrink:1 so columns can shrink to accommodate container gap (1.5rem)
  const isFullWidth = normalizedWidth === '100%';
  // Account for parent gap so e.g. two 50% columns fit side-by-side
  const gapAdjustedWidth = normalizedWidth && !isFullWidth
    ? `calc(${normalizedWidth} - 0.75rem)`
    : normalizedWidth;
  const widthStyle: React.CSSProperties = normalizedWidth
    ? isFullWidth
      ? { flex: '0 0 100%', width: '100%', minWidth: 0 }
      : { flex: `0 1 ${gapAdjustedWidth}`, maxWidth: gapAdjustedWidth, minWidth: 0 }
    : { flex: '1 1 0%' };

  // Responsive: columns without custom width stack on mobile, auto-fill on desktop
  const responsiveClass = normalizedWidth ? '' : 'min-w-full md:min-w-0';

  // Remove width from elementStyle so it doesn't conflict with the flex layout
  const { width: _removedWidth, ...elementStyleWithoutWidth } = (elementStyle || {}) as Record<string, any>;

  const hasCardColor = Object.keys(cardStyle).length > 0 && currentBackgroundColor !== 'none';
  const isSelected = builder?.selectedElement?.type === 'column' && builder.selectedElement.id === scopedElementId;

  const selectColumn = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!isEditMode || !builder) return;

    builder.selectElement({
      id: scopedElementId,
      type: 'column',
      pageName,
      sectionId,
      columnId: id,
      label: `Column: ${id}`,
      contentData: {
        backgroundColor: currentBackground,
        showBorder,
        verticalAlign: currentVerticalAlign,
        columnWidth,
      },
      onContentSave: (data) => {
        // Single unified save: pass all column properties at once
        onCardBackgroundChange?.(id, data.backgroundColor, data.showBorder, data.verticalAlign, data.columnWidth);
      },
      actions: [
        ...(onDuplicate ? [{ id: 'duplicate', label: 'Duplicate column', onClick: () => onDuplicate(id) }] : []),
        ...(onToggleVisibility ? [{ id: 'visibility', label: visible ? 'Hide column' : 'Show column', tone: 'warn' as const, onClick: () => onToggleVisibility(id) }] : []),
        ...(onDelete ? [{
          id: 'delete',
          label: 'Delete column',
          tone: 'danger' as const,
          onClick: () => {
            if (window.confirm('Are you sure you want to delete this column? This action cannot be undone.')) {
              onDelete(id);
            }
          }
        }] : []),
      ],
    });
  };

  if (!isEditMode) {
    const hasDisplayOverride = elementStyleWithoutWidth.display && elementStyleWithoutWidth.display !== 'flex';
    const wrapperClass = `
      ${hasCardColor ? 'card-color-override' : ''}
      ${showBorder ? 'border border-border' : ''}
      ${currentVerticalAlign === 'center' ? 'justify-center' : ''}
      ${!hasDisplayOverride ? 'flex flex-col' : ''}
      rounded-lg
    `.trim();

    const finalStyle = showBorder
      ? { ...cardStyle, ...elementStyleWithoutWidth, border: undefined }
      : { ...cardStyle, ...elementStyleWithoutWidth };

    return (
      <div className={`h-full ${responsiveClass} ${className}`} style={widthStyle}>
        <div
          style={finalStyle}
          className={`${wrapperClass} h-full`}
        >
          {children}
        </div>
      </div>
    );
  }


  const handlePaste = async (clipboard: ClipboardItem) => {
    if (clipboard.type === 'column' && clipboard.sourceColumnId) {
      const success = await pasteColumnContent(
        { pageName: clipboard.sourcePageName, sectionId: clipboard.sourceSectionId, columnId: clipboard.sourceColumnId },
        { pageName, sectionId: sectionId || '', columnId: id }
      );
      if (success && cache) await cache.refreshPage();
    } else if (clipboard.type === 'component' && clipboard.sourceContentKey) {
      const sourceCardId = clipboard.sourceColumnId?.includes('-')
        ? clipboard.sourceColumnId
        : `${clipboard.sourceSectionId}-${clipboard.sourceColumnId || 'card-0'}`;
      const success = await pasteComponentToColumn(
        { pageName: clipboard.sourcePageName, cardId: sourceCardId, contentKey: clipboard.sourceContentKey },
        { pageName, cardId: `${sectionId}-${id}` }
      );
      if (success && cache) await cache.refreshPage();
    }
  };

  return (
    <BuilderContextMenu
      elementType="column"
      clipboardData={{
        sourcePageName: pageName,
        sourceSectionId: sectionId || '',
        sourceColumnId: id,
      }}
      onPaste={handlePaste}
      onDuplicate={onDuplicate ? () => onDuplicate(id) : undefined}
      onDelete={onDelete ? () => {
        if (window.confirm('Delete this column?')) onDelete(id);
      } : undefined}
      onToggleVisibility={onToggleVisibility ? () => onToggleVisibility(id) : undefined}
      isVisible={visible}
      label={`Column: ${id}`}
      wrapperClassName={`h-full ${responsiveClass} ${className}`}
      wrapperStyle={{ ...widthStyle, display: 'flex', flexDirection: 'column' }}
    >
      <div
        ref={setNodeRef}
        data-builder-column-id={id}
        onClick={selectColumn}
        style={style}
        className={`relative flex-1 w-full ${isDragging ? 'z-50 opacity-50' : ''} ${!visible && isEditMode ? 'opacity-50' : ''}`}
      >
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 rounded-md px-2 py-1 cursor-grab active:cursor-grabbing shadow-lg transition-all duration-200 hover:scale-110"
          style={{ background: BC.blue, color: BC.white }}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {(() => {
          const hasDisplayOverride = elementStyleWithoutWidth.display && elementStyleWithoutWidth.display !== 'flex';
          return (
            <div
              className={`${hasCardColor ? 'card-color-override' : ''} ${currentVerticalAlign === 'center' ? 'justify-center' : ''} h-full ${!hasDisplayOverride ? 'flex flex-col' : ''}`}
              style={{
                ...cardStyle,
                ...elementStyleWithoutWidth,
                ...(isEditMode ? { border: isSelected ? `2px solid ${BC.blue}` : `2px dashed ${BC.borderHover}` } : {}),
                ...(isSelected ? { boxShadow: `0 0 0 2px ${BC.blueBorder}` } : {}),
              }}
            >
              {children}
            </div>
          );
        })()}

        <CardBackgroundDialog
          open={backgroundDialogOpen}
          onOpenChange={setBackgroundDialogOpen}
          currentValue={currentBackground}
          currentBorder={showBorder}
          currentVerticalAlign={currentVerticalAlign}
          onSave={(value, border, align) => {
            setCurrentBackground(value);
            setShowBorder(!!border);
            if (align) setCurrentVerticalAlign(align);
            onCardBackgroundChange?.(id, value, border, align);
          }}
        />
      </div>
    </BuilderContextMenu>
  );
};
