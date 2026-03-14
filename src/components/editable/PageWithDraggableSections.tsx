import { ReactNode, ReactElement, useEffect, useCallback, isValidElement, cloneElement, Children } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSectionOrder } from '@/hooks/useSectionOrder';
import { ElementStylesProvider } from '@/hooks/useElementStylesContext';
import { DraggableSection } from './DraggableSection';
import { DynamicCard } from './DynamicCard';
import { SectionWithDraggableColumns } from './SectionWithDraggableColumns';
import { BC } from '@/components/builder/builderColors';

/** Builder-styled button for edit-mode controls */
const BuilderBtn = ({ onClick, children, size = 'sm', variant = 'outline' }: {
  onClick: () => void; children: React.ReactNode; size?: 'sm' | 'lg'; variant?: 'outline' | 'primary' | 'green';
}) => {
  const styles: React.CSSProperties = variant === 'primary'
    ? { background: BC.blue, color: BC.white, border: 'none' }
    : variant === 'green'
    ? { background: '#16a34a', color: BC.white, border: 'none' }
    : { background: 'transparent', color: BC.textMuted, border: `1px solid ${BC.border}` };
  const pad = size === 'lg' ? 'px-5 py-2.5 text-sm' : 'px-3 py-1.5 text-xs';
  return (
    <button onClick={onClick} style={styles}
      className={`${pad} rounded-md font-medium flex items-center gap-2 transition-colors hover:opacity-90`}
    >{children}</button>
  );
};
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { PageContentCacheProvider } from '@/hooks/usePageContentCache';
import { toast } from 'sonner';

export interface ContentRef {
  sectionName: string;
  contentKey: string;
}

/**
 * Recursively clones a React element tree and updates identifying props
 * (sectionName, contentKey, cardId, sectionId) so duplicated sections have independent content.
 * Also collects content references for hardcoded sections that need their page_content duplicated.
 * 
 * @param element - The React element to clone
 * @param originalSectionId - The original section ID
 * @param newSectionId - The new duplicated section ID
 * @param contentRefs - Array to collect content references (mutated)
 * @returns A cloned element with updated identifying props
 */
const cloneSectionElementWithNewIds = (
  element: ReactElement,
  originalSectionId: string,
  newSectionId: string,
  contentRefs: ContentRef[] = []
): ReactElement => {
  const props = element.props as Record<string, any>;
  const newProps: Record<string, any> = {};
  let hasChanges = false;

  // Update sectionId if present (used by SectionWithDraggableColumns)
  if (props.sectionId && typeof props.sectionId === 'string') {
    if (props.sectionId === originalSectionId || props.sectionId.includes(originalSectionId)) {
      newProps.sectionId = props.sectionId.replace(originalSectionId, newSectionId);
      hasChanges = true;
    }
  }

  // Update cardId if present (used by EditableCard, DynamicCard, etc.)
  if (props.cardId && typeof props.cardId === 'string') {
    if (props.cardId === originalSectionId || props.cardId.includes(originalSectionId)) {
      newProps.cardId = props.cardId.replace(originalSectionId, newSectionId);
      hasChanges = true;
    }
  }

  // Update sectionName if present (used by EditableText, EditableImage, EditableIcon, etc.)
  if (props.sectionName && typeof props.sectionName === 'string') {
    const oldSectionName = props.sectionName;
    let newSectionName: string;
    
    if (props.sectionName === originalSectionId || props.sectionName.includes(originalSectionId)) {
      // Section name already contains the original section ID - just replace it
      newSectionName = props.sectionName.replace(originalSectionId, newSectionId);
    } else {
      // Hardcoded section name (e.g., "cards") - prefix with newSectionId::
      newSectionName = `${newSectionId}::${props.sectionName}`;
    }
    
    newProps.sectionName = newSectionName;
    hasChanges = true;
    
    // Collect content reference if contentKey is also present
    if (props.contentKey && typeof props.contentKey === 'string') {
      contentRefs.push({
        sectionName: oldSectionName,
        contentKey: props.contentKey
      });
    }
  }

  // Update contentKey if it references the section ID
  if (props.contentKey && typeof props.contentKey === 'string') {
    if (props.contentKey.includes(originalSectionId)) {
      newProps.contentKey = props.contentKey.replace(originalSectionId, newSectionId);
      hasChanges = true;
    }
  }

  // Update columns array for SectionWithDraggableColumns
  if (props.columns && Array.isArray(props.columns)) {
    const newColumns = props.columns.map((col: { id: string; component: ReactElement }) => {
      let newColId = col.id;
      if (col.id.includes(originalSectionId)) {
        newColId = col.id.replace(originalSectionId, newSectionId);
      }
      
      const newComponent = isValidElement(col.component)
        ? cloneSectionElementWithNewIds(col.component, originalSectionId, newSectionId, contentRefs)
        : col.component;
      
      return {
        ...col,
        id: newColId,
        component: newComponent
      };
    });
    newProps.columns = newColumns;
    hasChanges = true;
  }

  // Recursively process children
  let newChildren = props.children;
  if (props.children) {
    if (isValidElement(props.children)) {
      const clonedChild = cloneSectionElementWithNewIds(props.children as ReactElement, originalSectionId, newSectionId, contentRefs);
      if (clonedChild !== props.children) {
        newChildren = clonedChild;
        hasChanges = true;
      }
    } else if (Array.isArray(props.children)) {
      const clonedChildren = Children.map(props.children, (child) => {
        if (isValidElement(child)) {
          return cloneSectionElementWithNewIds(child as ReactElement, originalSectionId, newSectionId, contentRefs);
        }
        return child;
      });
      // Check if any children actually changed
      const childrenChanged = clonedChildren?.some((child, index) => child !== props.children[index]);
      if (childrenChanged) {
        newChildren = clonedChildren;
        hasChanges = true;
      }
    }
  }

  // Only clone if we have changes to apply
  if (hasChanges) {
    return cloneElement(element, { ...newProps, children: newChildren });
  }

  return element;
};

interface PageWithDraggableSectionsProps {
  pageName: string;
  sections: {
    id: string;
    component: ReactElement;
  }[];
  children?: ReactNode;
  /** When true, this instance registers insert handlers with the builder. Only one per page should set this. */
  isMainContent?: boolean;
}

/**
 * PageWithDraggableSections - Wrapper component that makes page sections reorderable.
 * 
 * @example
 * ```tsx
 * <PageWithDraggableSections
 *   pageName="home"
 *   sections={[
 *     { id: 'hero', component: <HeroSection /> },
 *     { id: 'features', component: <FeaturesSection /> },
 *     { id: 'cta', component: <CTASection /> }
 *   ]}
 * />
 * ```
 */
export const PageWithDraggableSections = ({
  pageName,
  sections: sectionConfigs,
  children,
  isMainContent = true
}: PageWithDraggableSectionsProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const defaultSections = sectionConfigs.map(s => s.id);
  const { 
    sections, 
    updateSectionOrder, 
    duplicateSection, 
    toggleSectionVisibility, 
    deleteSection,
    addSection,
    publishSection,
    updateSectionBackground,
    moveSectionUp,
    moveSectionDown,
    toggleMobileSwap,
    isLoading 
  } = useSectionOrder(pageName, defaultSections);

  // Register insert handlers with builder context
  const handleBuilderInsertSection = useCallback((columns: number) => {
    // Add section at the end of the page
    const lastSection = sections[sections.length - 1];
    const afterId = lastSection ? lastSection.id : 'start';
    addSection(afterId, columns, 'below');
    toast.success(`Added ${columns}-column section`);
  }, [sections, addSection]);

  const handleBuilderInsertContent = useCallback((type: string) => {
    const selected = builder?.selectedElement;
    let targetCardId: string | null = null;

    if (selected?.type === 'column' && selected.columnId) {
      // The DynamicCard cardId is "{sectionId}-{columnId}" for dynamic sections
      if (selected.sectionId) {
        targetCardId = `${selected.sectionId}-${selected.columnId}`;
      } else {
        targetCardId = selected.columnId;
      }
    } else if (selected?.type === 'component' && selected.columnId) {
      if (selected.sectionId) {
        targetCardId = `${selected.sectionId}-${selected.columnId}`;
      } else {
        targetCardId = selected.columnId;
      }
    } else if (selected?.type === 'section' && selected.sectionId) {
      // Find the first column in the section
      const sectionColumn = document.querySelector(
        `[data-builder-section-id="${selected.sectionId}"] [data-builder-column-id]`
      );
      const colId = sectionColumn?.getAttribute('data-builder-column-id') || null;
      if (colId) {
        targetCardId = `${selected.sectionId}-${colId}`;
      }
    }

    if (!targetCardId) {
      toast.info('Select a column (or a component inside a column) first.');
      return;
    }

    window.dispatchEvent(new CustomEvent('builder:insert-content', {
      detail: {
        pageName,
        cardId: targetCardId,
        type,
      },
    }));
  }, [builder?.selectedElement, pageName]);

  useEffect(() => {
    if (builder && isEditMode && isMainContent) {
      builder.registerInsertHandlers({
        onInsertContent: handleBuilderInsertContent,
        onInsertSection: handleBuilderInsertSection,
      });
      return () => builder.unregisterInsertHandlers();
    }
  }, [builder, isEditMode, isMainContent, handleBuilderInsertContent, handleBuilderInsertSection]);

  const visibleSections = sections;

  const handleDuplicateSection = (sectionIdToDuplicate: string) => {
    const baseId = sectionIdToDuplicate.split('-copy-')[0];
    const sectionConfig = sectionConfigs.find(s => s.id === baseId);

    if (sectionConfig && isValidElement(sectionConfig.component)) {
      const contentRefs: ContentRef[] = [];

      cloneSectionElementWithNewIds(
        sectionConfig.component,
        sectionConfig.id,
        `temp-${Date.now()}`,
        contentRefs
      );

      const remappedRefs = contentRefs.map(ref => {
        if (sectionIdToDuplicate !== sectionConfig.id) {
          return {
            sectionName: `${sectionIdToDuplicate}::${ref.sectionName}`,
            contentKey: ref.contentKey
          };
        }
        return ref;
      });

      duplicateSection(sectionIdToDuplicate, remappedRefs);
    } else {
      duplicateSection(sectionIdToDuplicate);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Handle content dragging between sections/columns
    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === 'content' && overData?.type === 'column') {
      // This would trigger content movement logic
      return;
    }
  };

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <ElementStylesProvider pageName={pageName}>
    <PageContentCacheProvider pageName={pageName}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        {visibleSections.length === 0 && isEditMode && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <p style={{ color: BC.textMuted }} className="text-lg text-center">
              This page is empty. Use the left Insert panel to add a section.
            </p>
          </div>
        )}
        {visibleSections.map((section, index) => {
          // Match section config by base ID (before -copy- suffix)
          const baseId = section.id.split('-copy-')[0];
          const sectionConfig = sectionConfigs.find(s => s.id === baseId || s.id === section.id);
          
          const isFirst = index === 0;
          const isLast = index === visibleSections.length - 1;
          
          // Handle dynamically added sections (new-section-*) or card-based sections
          // or any section without a matching config (treat as dynamic)
          const isDynamicSection = section.id.startsWith('new-section-');
          const isCardBasedSection = section.id.includes('card-') && !sectionConfig;
          const isUnmatchedSection = !sectionConfig;
          
          if (isDynamicSection || isCardBasedSection || isUnmatchedSection) {
            const columnMatch = section.id.match(/new-section-(\d)-col/);
            const columnCount = columnMatch ? parseInt(columnMatch[1]) : 1;
            
            // Generate column configs for draggable columns
            const dynamicColumns = Array.from({ length: columnCount }).map((_, i) => ({
              id: `card-${i}`,
              component: (
                <DynamicCard
                  key={`${section.id}-card-${i}`}
                  pageName={pageName}
                  cardId={`${section.id}-card-${i}`}
                  sectionId={section.id}
                  columnId={`card-${i}`}
                />
              )
            }));
            
            return (
              <div key={section.id}>
                 <DraggableSection 
                   id={section.id}
                   pageName={pageName}
                   visible={section.visible}
                   backgroundType={section.backgroundType}
                   backgroundValue={section.backgroundValue}
                   isFirst={isFirst}
                   isLast={isLast}
                   noMobileSwap={section.noMobileSwap}
                   onMoveUp={moveSectionUp}
                   onMoveDown={moveSectionDown}
                   onDuplicate={handleDuplicateSection}
                   onToggleVisibility={toggleSectionVisibility}
                   onDelete={deleteSection}
                   onBackgroundChange={(type, value) => updateSectionBackground(section.id, type, value)}
                   onToggleMobileSwap={toggleMobileSwap}
                   isTitleSection={section.id.toLowerCase().includes('title')}
                  >
                    <section className="py-4 md:py-[30px] relative">
                      <div className="container mx-auto px-[10px] md:px-4">
                        <SectionWithDraggableColumns
                          pageName={pageName}
                          sectionId={section.id}
                          columns={dynamicColumns}
                          className={(() => {
                            // Special case: advisory-board and partners pages show 2 columns on mobile
                            const isMobile2ColPage = pageName === 'advisory-board' || pageName === 'partners';
                            const mobileClass = isMobile2ColPage ? 'grid-cols-2' : 'grid-cols-1';
                            const gapClass = isMobile2ColPage ? 'gap-4 md:gap-6' : 'gap-6';
                            
                            if (columnCount === 1) return `grid grid-cols-1 ${gapClass}`;
                            if (columnCount === 2) return `grid ${mobileClass} md:grid-cols-2 ${gapClass}`;
                            if (columnCount === 3) return `grid ${mobileClass} md:grid-cols-3 ${gapClass}`;
                            return `grid ${mobileClass} md:grid-cols-2 lg:grid-cols-4 ${gapClass}`;
                          })()}
                          sectionBackground={{ type: section.backgroundType, value: section.backgroundValue }}
                          noMobileSwap={section.noMobileSwap}
                        />
                      </div>
                    </section>
                  </DraggableSection>
              </div>
            );
          }
          
          if (!sectionConfig) return null;
          
          // Check if this is a duplicated section (has -copy- in the ID)
          const isDuplicatedSection = section.id !== sectionConfig.id && section.id.includes('-copy-');
          
          // For duplicated sections, clone the component tree and update all identifying props
          let renderedComponent = sectionConfig.component;
          if (isDuplicatedSection && isValidElement(renderedComponent)) {
            // We don't need to collect contentRefs here since duplication already happened
            // This is just for rendering the cloned component with updated props
            renderedComponent = cloneSectionElementWithNewIds(
              renderedComponent,
              sectionConfig.id,
              section.id,
              [] // Empty array - we don't need to collect refs during render
            );
          }
          
          return (
            <div key={section.id}>
               <DraggableSection 
                 id={section.id}
                 pageName={pageName}
                 visible={section.visible}
                 backgroundType={section.backgroundType}
                 backgroundValue={section.backgroundValue}
                 isFirst={isFirst}
                 isLast={isLast}
                 noMobileSwap={section.noMobileSwap}
                 onMoveUp={moveSectionUp}
                 onMoveDown={moveSectionDown}
                 onDuplicate={handleDuplicateSection}
                 onToggleVisibility={toggleSectionVisibility}
                 onDelete={deleteSection}
                 onBackgroundChange={(type, value) => updateSectionBackground(section.id, type, value)}
                 onToggleMobileSwap={toggleMobileSwap}
                 isTitleSection={section.id.toLowerCase().includes('title')}
               >
                {renderedComponent}
              </DraggableSection>
            </div>
          );
        })}
      </DndContext>
      
      
      {children}
    </PageContentCacheProvider>
    </ElementStylesProvider>
  );
};
