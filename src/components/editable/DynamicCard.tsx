import { useEffect } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useDynamicContent } from '@/hooks/useDynamicContent';
import { DynamicContentBlock } from './DynamicContentBlock';
import { useElementStylesContext } from '@/hooks/useElementStylesContext';

interface DynamicCardProps {
  pageName: string;
  cardId: string;
  className?: string;
  /** Parent section ID – used to look up column-level element styles */
  sectionId?: string;
  /** Column ID within the section */
  columnId?: string;
}

export const DynamicCard = ({
  pageName,
  cardId,
  className = '',
  sectionId,
  columnId,
}: DynamicCardProps) => {
  const { isEditMode } = useEditMode();
  const { blocks, isLoading, addBlock, updateBlock, deleteBlock, moveBlock, duplicateBlock } = useDynamicContent(pageName, cardId);
  const stylesCtx = useElementStylesContext();

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ pageName: string; cardId: string; type: string }>;
      const detail = customEvent.detail;
      if (!detail || detail.pageName !== pageName || detail.cardId !== cardId) return;

      const type = detail.type as Parameters<typeof addBlock>[0];
      void addBlock(type);
    };

    window.addEventListener('builder:insert-content', handler);
    return () => window.removeEventListener('builder:insert-content', handler);
  }, [pageName, cardId, addBlock]);

  if (isLoading) {
    return (
      <div className={`${className} p-6`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Read column-level element styles so the card's inner layout respects them
  const scopedId = sectionId && columnId ? `${sectionId}::${columnId}` : null;
  const columnStyles = scopedId ? (stylesCtx?.getElementStyle(scopedId) || {}) : {};

  // Default layout: flex column, full width – but let element_styles override
  const defaultLayout: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'wrap',
    gap: '1rem',
    width: '100%',
    alignItems: 'stretch',
    alignContent: 'flex-start',
  };

  // Merge: column element_styles override defaults
  const mergedStyle: React.CSSProperties = {
    ...defaultLayout,
    ...columnStyles,
  };

  return (
    <div
      className={`${className} p-3 md:p-6`}
      style={mergedStyle}
    >
      {blocks.map((block, index) => (
        <DynamicContentBlock
          key={block.id}
          block={block}
          pageName={pageName}
          cardId={cardId}
          onUpdate={updateBlock}
          onDelete={deleteBlock}
          onMove={moveBlock}
          onDuplicate={duplicateBlock}
          isFirst={index === 0}
          isLast={index === blocks.length - 1}
        />
      ))}
    </div>
  );
};
