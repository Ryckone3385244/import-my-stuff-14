import { useState } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { Plus } from 'lucide-react';
import { BC } from '@/components/builder/builderColors';
import { useSectionContent, SectionBlock } from '@/hooks/useSectionContent';
import { DynamicContentBlock } from './DynamicContentBlock';
import { AddContentDialog } from './AddContentDialog';

interface SectionTitleBlockProps {
  pageName: string;
  sectionId: string;
  sectionBackground?: {
    type?: 'color' | 'image' | 'gradient' | 'none';
    value?: string | null;
  };
}

export const SectionTitleBlock = ({ pageName, sectionId, sectionBackground }: SectionTitleBlockProps) => {
  const { isEditMode } = useEditMode();
  const { blocks, isLoading, addBlock, updateBlock, deleteBlock } = useSectionContent(pageName, sectionId);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddContent = (type: 'image' | 'text' | 'button' | 'video' | 'icon-with-text' | 'photo-gallery' | 'image-carousel' | 'accordion' | 'embed' | 'sectionTitle' | 'popupImage') => {
    if (type === 'sectionTitle') {
      addBlock(type);
    }
  };

  if (isLoading) {
    return null;
  }

  // Only render section title if there's content or in edit mode
  if (blocks.length === 0 && !isEditMode) {
    return null;
  }

  return (
    <div className="w-full mb-6">
      {blocks.map((block, index) => (
        <DynamicContentBlock
          key={block.id}
          block={block as any}
          pageName={pageName}
          cardId={`${sectionId}_section`}
          onUpdate={updateBlock}
          onDelete={deleteBlock}
          onMove={() => {}}
          isFirst={index === 0}
          isLast={index === blocks.length - 1}
          sectionBackground={sectionBackground}
        />
      ))}
      
      {isEditMode && blocks.length === 0 && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => setShowAddDialog(true)}
            style={{
              background: BC.controlBg,
              color: BC.textMuted,
              border: `1px dashed ${BC.borderHover}`,
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors hover:opacity-90"
            onMouseEnter={e => { e.currentTarget.style.background = BC.controlBgHover; e.currentTarget.style.color = BC.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = BC.controlBg; e.currentTarget.style.color = BC.textMuted; }}
          >
            <Plus className="w-4 h-4" />
            Add Section Title
          </button>
        </div>
      )}

      <AddContentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSelect={handleAddContent}
      />
    </div>
  );
};
