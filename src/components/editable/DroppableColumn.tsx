import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditMode } from '@/contexts/EditModeContext';

interface DroppableColumnProps {
  id: string;
  sectionId: string;
  columnId: string;
  children: ReactNode;
  className?: string;
}

export const DroppableColumn = ({
  id,
  sectionId,
  columnId,
  children,
  className = '',
}: DroppableColumnProps) => {
  const { isEditMode } = useEditMode();
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      sectionId,
      columnId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isEditMode && isOver
          ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50'
          : ''
      } ${isEditMode ? 'min-h-[100px]' : ''}`}
    >
      {children}
      {isEditMode && !children && (
        <div className="p-4 text-center text-muted-foreground border-2 border-dashed border-gray-300 rounded">
          Drop content here
        </div>
      )}
    </div>
  );
};
