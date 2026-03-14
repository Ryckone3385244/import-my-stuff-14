import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditMode } from '@/contexts/EditModeContext';
import { GripVertical } from 'lucide-react';

interface DraggableContentProps {
  id: string;
  children: ReactNode;
  sectionId: string;
  columnId: string;
}

export const DraggableContent = ({
  id,
  children,
  sectionId,
  columnId,
}: DraggableContentProps) => {
  const { isEditMode } = useEditMode();
  
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
      type: 'content',
      sectionId,
      columnId,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-6 top-1/2 -translate-y-1/2 p-1 bg-blue-600 hover:bg-blue-500 rounded cursor-grab active:cursor-grabbing shadow-lg z-[70] opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to move to another section/column"
      >
        <GripVertical className="w-4 h-4 text-white" />
      </div>
      <div className="border-2 border-dashed border-blue-400 hover:border-blue-500 transition-colors">
        {children}
      </div>
    </div>
  );
};
