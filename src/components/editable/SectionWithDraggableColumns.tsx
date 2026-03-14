import { ReactNode, ReactElement, useState, useEffect, cloneElement, isValidElement, Children } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { DraggableColumn } from './DraggableColumn';
import { CardColorPicker } from './CardColorPicker';
import { useEditMode } from '@/contexts/EditModeContext';
import { supabase } from '@/integrations/supabase/client';
import { containsMedia, checkDynamicContentForMedia, shouldSwapColumns } from '@/lib/columnSwapUtils';
import { useElementStylesContext } from '@/hooks/useElementStylesContext';

/**
 * Recursively clones a React element tree and updates identifying props
 * (sectionName, contentKey, cardId) so duplicated columns have independent content.
 * 
 * @param element - The React element to clone
 * @param originalColumnId - The original column ID (e.g., "feature-1")
 * @param newColumnId - The new duplicated column ID (e.g., "feature-1-copy-1234567890")
 * @returns A cloned element with updated identifying props
 */
const cloneElementWithNewIds = (
  element: ReactElement,
  originalColumnId: string,
  newColumnId: string
): ReactElement => {
  const props = element.props as Record<string, any>;
  const newProps: Record<string, any> = {};
  let hasChanges = false;

  // Update cardId if present (used by EditableCard, DynamicCard, etc.)
  if (props.cardId && typeof props.cardId === 'string') {
    // Replace the original column ID with the new one in the cardId
    if (props.cardId === originalColumnId || props.cardId.startsWith(`${originalColumnId}-`)) {
      newProps.cardId = props.cardId.replace(originalColumnId, newColumnId);
      hasChanges = true;
    } else if (props.cardId.includes(originalColumnId)) {
      newProps.cardId = props.cardId.replace(originalColumnId, newColumnId);
      hasChanges = true;
    }
  }

  // Update sectionName if present (used by EditableText, EditableImage, EditableIcon, etc.)
  if (props.sectionName && typeof props.sectionName === 'string') {
    if (props.sectionName === originalColumnId || props.sectionName.includes(originalColumnId)) {
      newProps.sectionName = props.sectionName.replace(originalColumnId, newColumnId);
      hasChanges = true;
    }
  }

  // Update contentKey if it references the column ID (for namespaced content keys)
  if (props.contentKey && typeof props.contentKey === 'string') {
    if (props.contentKey.startsWith(`${originalColumnId}-`) || props.contentKey.includes(originalColumnId)) {
      newProps.contentKey = props.contentKey.replace(originalColumnId, newColumnId);
      hasChanges = true;
    }
  }

  // Recursively process children
  let newChildren = props.children;
  if (props.children) {
    if (isValidElement(props.children)) {
      const clonedChild = cloneElementWithNewIds(props.children as ReactElement, originalColumnId, newColumnId);
      if (clonedChild !== props.children) {
        newChildren = clonedChild;
        hasChanges = true;
      }
    } else if (Array.isArray(props.children)) {
      const clonedChildren = Children.map(props.children, (child) => {
        if (isValidElement(child)) {
          return cloneElementWithNewIds(child as ReactElement, originalColumnId, newColumnId);
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

interface SectionWithDraggableColumnsProps {
  pageName: string;
  sectionId: string;
  columns: {
    id: string;
    component: ReactElement;
  }[];
  className?: string;
  containerClassName?: string;
  enableCrossSectionDrag?: boolean;
  sectionBackground?: {
    type?: 'color' | 'image' | 'gradient' | 'none';
    value?: string | null;
  };
  noMobileSwap?: boolean;
}

/**
 * SectionWithDraggableColumns - Wrapper component that makes columns within a section draggable.
 * Perfect for grid layouts with cards that need to be reorderable.
 * 
 * @example
 * ```tsx
 * <SectionWithDraggableColumns
 *   pageName="registration"
 *   sectionId="info-cards"
 *   columns={[
 *     { id: 'date', component: <DateCard /> },
 *     { id: 'location', component: <LocationCard /> },
 *     { id: 'duration', component: <DurationCard /> }
 *   ]}
 *   className="grid md:grid-cols-3 gap-6"
 * />
 * ```
 */
export const SectionWithDraggableColumns = ({
  pageName,
  sectionId,
  columns: columnConfigs,
  className = "grid gap-6",
  containerClassName,
  enableCrossSectionDrag = false,
  sectionBackground,
  noMobileSwap = false
}: SectionWithDraggableColumnsProps) => {
  const stylesCtx = useElementStylesContext();
  const { isEditMode } = useEditMode();
  const [styles, setStyles] = useState<{
    card_background_color?: string;
    card_text_color?: string;
    card_title_color?: string;
    green_card_background_color?: string;
    green_card_text_color?: string;
    green_card_title_color?: string;
    black_card_background_color?: string;
    black_card_text_color?: string;
    black_card_title_color?: string;
    gray_card_background_color?: string;
    gray_card_text_color?: string;
    gray_card_title_color?: string;
    gradient_start_color?: string;
    gradient_end_color?: string;
    transparent_card_text_color?: string;
    transparent_card_title_color?: string;
  } | null>(null);
  
  // Detect if 2-column layout should swap on mobile (media above text)
  // IMPORTANT: This useState MUST be called before any early returns
  const [mobileSwapInfo, setMobileSwapInfo] = useState<{ shouldSwap: boolean } | null>(null);
  
  const defaultColumns = columnConfigs.map(c => c.id);
  const { 
    columns, 
    cardColor,
    updateColumnOrder,
    updateCardColor,
    updateColumnColor,
    updateColumnBorder,
    updateColumnVerticalAlign,
    updateColumnProperties,
    toggleColumnVisibility,
    duplicateColumn,
    deleteColumn,
    isLoading 
  } = useColumnOrder(pageName, sectionId, defaultColumns);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    const { data, error } = await supabase
      .from('website_styles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching website styles:", error);
      return;
    }
    
    if (data) setStyles(data);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.id === active.id);
      const newIndex = columns.findIndex(c => c.id === over.id);
      const newColumns = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({ ...c, order: i }));
      updateColumnOrder(newColumns);
    }
  };

  // Calculate visible columns count
  const visibleColumns = columns.filter(c => c.visible);
  const visibleCount = visibleColumns.length;
  
  // Effect to detect media columns for mobile swap
  useEffect(() => {
    const detectMediaColumns = async () => {
      if (visibleCount !== 2) {
        setMobileSwapInfo(null);
        return;
      }
      
      const leftColumn = visibleColumns[0];
      const rightColumn = visibleColumns[1];
      
      // Get column configs
      const leftConfig = columnConfigs.find(c => c.id.split('-copy-')[0] === leftColumn.id.split('-copy-')[0]);
      const rightConfig = columnConfigs.find(c => c.id.split('-copy-')[0] === rightColumn.id.split('-copy-')[0]);
      
      // Check static content for media
      let leftHasMedia = leftConfig && isValidElement(leftConfig.component) ? containsMedia(leftConfig.component) : false;
      let rightHasMedia = rightConfig && isValidElement(rightConfig.component) ? containsMedia(rightConfig.component) : false;
      
      // Also check dynamic content
      if (!leftHasMedia) {
        leftHasMedia = await checkDynamicContentForMedia(pageName, sectionId, leftColumn.id);
      }
      if (!rightHasMedia) {
        rightHasMedia = await checkDynamicContentForMedia(pageName, sectionId, rightColumn.id);
      }
      
      const result = shouldSwapColumns(leftHasMedia, rightHasMedia);
      setMobileSwapInfo({ shouldSwap: result.shouldSwap });
    };
    
    detectMediaColumns();
  }, [visibleCount, visibleColumns, columnConfigs, pageName, sectionId]);

  // Early return AFTER all hooks are called
  if (isLoading) {
    return (
      <div className={className}>
        {columnConfigs.map(col => (
          <div key={col.id}>{col.component}</div>
        ))}
      </div>
    );
  }
  
  // No longer needed — flex layout auto-distributes columns

  // Get card color styles as inline styles - accepts optional color for per-column coloring
  const getCardColorStyle = (colorOverride?: string) => {
    const baseStyle = {
      borderRadius: 'var(--radius, 1rem)',
    };

    // Use the provided color override or fallback to section-wide cardColor
    const colorToUse = colorOverride ?? cardColor;

    // Default to 'card' style if styles haven't loaded yet
    if (!styles) {
      return {
        ...baseStyle,
        backgroundColor: 'hsl(0 0% 100%)',
        color: 'hsl(0 0% 5%)'
      } as React.CSSProperties;
    }
    
    switch (colorToUse) {
      case 'card':
        return {
          ...baseStyle,
          '--card-bg': `hsl(${styles.card_background_color})`,
          '--card-text': `hsl(${styles.card_text_color})`,
          '--card-title': `hsl(${styles.card_title_color})`,
          backgroundColor: `hsl(${styles.card_background_color})`,
          color: `hsl(${styles.card_text_color})`
        } as React.CSSProperties;
      case 'green':
        return {
          ...baseStyle,
          '--card-bg': `hsl(${styles.green_card_background_color})`,
          '--card-text': `hsl(${styles.green_card_text_color})`,
          '--card-title': `hsl(${styles.green_card_title_color})`,
          backgroundColor: `hsl(${styles.green_card_background_color})`,
          color: `hsl(${styles.green_card_text_color})`
        } as React.CSSProperties;
      case 'black':
        return {
          ...baseStyle,
          '--card-bg': `hsl(${styles.black_card_background_color})`,
          '--card-text': `hsl(${styles.black_card_text_color})`,
          '--card-title': `hsl(${styles.black_card_title_color})`,
          backgroundColor: `hsl(${styles.black_card_background_color})`,
          color: `hsl(${styles.black_card_text_color})`
        } as React.CSSProperties;
      case 'gray':
        return {
          ...baseStyle,
          '--card-bg': `hsl(${styles.gray_card_background_color})`,
          '--card-text': `hsl(${styles.gray_card_text_color})`,
          '--card-title': `hsl(${styles.gray_card_title_color})`,
          backgroundColor: `hsl(${styles.gray_card_background_color})`,
          color: `hsl(${styles.gray_card_text_color})`
        } as React.CSSProperties;
      case 'gradient':
        return {
          ...baseStyle,
          background: styles.gradient_start_color && styles.gradient_end_color
            ? `linear-gradient(135deg, hsl(${styles.gradient_start_color}), hsl(${styles.gradient_end_color}))`
            : 'linear-gradient(135deg, hsl(142 76% 36%), hsl(220 70% 50%))',
          color: 'hsl(0 0% 100%)'
        } as React.CSSProperties;
      case 'none':
      case 'transparent':
        return {
          ...baseStyle,
          background: 'transparent',
          boxShadow: 'none',
          color: styles.transparent_card_text_color 
            ? `hsl(${styles.transparent_card_text_color})` 
            : 'hsl(var(--transparent-card-foreground))',
          '--card-title': styles.transparent_card_title_color 
            ? `hsl(${styles.transparent_card_title_color})` 
            : 'hsl(var(--transparent-card-title))'
        } as React.CSSProperties;
      default:
        // Fallback to card style
        return {
          ...baseStyle,
          backgroundColor: `hsl(${styles.card_background_color})`,
          color: `hsl(${styles.card_text_color})`
        } as React.CSSProperties;
    }
  };

  // Read section-level element styles and apply them directly to the actual columns container
  const sectionElementStyle = stylesCtx?.getElementStyle(sectionId) || {};
  const {
    flexDirection,
    flexWrap,
    alignItems,
    justifyContent,
    gap,
    display,
    gridTemplateColumns,
  } = sectionElementStyle as Record<string, any>;

  const resolvedDisplay: React.CSSProperties['display'] =
    (display as React.CSSProperties['display']) || 'flex';

  const sectionContainerStyle: React.CSSProperties = {
    width: '100%',
    ...(resolvedDisplay === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: (gridTemplateColumns as React.CSSProperties['gridTemplateColumns']) || `repeat(${Math.max(visibleCount, 1)}, minmax(0, 1fr))`,
          gap: (gap as React.CSSProperties['gap']) || '1.5rem',
          ...(alignItems ? { alignItems } : {}),
          ...(justifyContent ? { justifyContent } : {}),
        }
      : {
          display: resolvedDisplay,
          ...(resolvedDisplay === 'flex'
            ? {
                flexWrap: (flexWrap as React.CSSProperties['flexWrap']) || 'wrap',
                gap: (gap as React.CSSProperties['gap']) || '1.5rem',
                ...(flexDirection ? { flexDirection } : {}),
                ...(alignItems ? { alignItems } : { alignItems: 'stretch' }),
                ...(justifyContent ? { justifyContent } : {}),
              }
            : {}),
        }),
  };

  const gridContent = (
    <div style={sectionContainerStyle}>
      {columns.map((column, index) => {
        // Extract the base ID (without -copy-timestamp suffix) to find the original config
        const baseColumnId = column.id.split('-copy-')[0];
        const columnConfig = columnConfigs.find(c => c.id.split('-copy-')[0] === baseColumnId);
        if (!columnConfig) return null;

        let renderedComponent = columnConfig.component;

        // If this is a duplicated column, recursively clone all child components
        // and update their identifying props (cardId, sectionName, contentKey)
        // so they point to the duplicated content in the database
        const isDuplicated = column.id !== columnConfig.id;
        if (isDuplicated && isValidElement(renderedComponent)) {
          // Use the original column config's ID as the base for replacement
          const originalColumnId = columnConfig.id;
          renderedComponent = cloneElementWithNewIds(
            renderedComponent,
            originalColumnId,
            column.id
          );
        }

        // Apply mobile swap ordering for 2-column layouts (unless noMobileSwap is enabled)
        let mobileOrderClass = '';
        if (visibleCount === 2 && mobileSwapInfo?.shouldSwap && !noMobileSwap) {
          // First column (text) should be order-2 on mobile, order-1 on desktop
          // Second column (media) should be order-1 on mobile, order-2 on desktop
          if (index === 0) {
            mobileOrderClass = 'order-2 md:order-1';
          } else {
            mobileOrderClass = 'order-1 md:order-2';
          }
        }

        return (
          <DraggableColumn
            key={column.id}
            id={column.id}
            pageName={pageName}
            sectionId={sectionId}
            visible={column.visible}
            showBorder={column.showBorder}
            verticalAlign={column.verticalAlign}
            cardStyle={getCardColorStyle(column.backgroundColor)}
            currentBackgroundColor={column.backgroundColor}
            onDuplicate={duplicateColumn}
            onToggleVisibility={toggleColumnVisibility}
            onDelete={deleteColumn}
            onCardBackgroundChange={(id, background, border, align, width) => {
              const updates: { showBorder?: boolean; verticalAlign?: 'top' | 'center'; backgroundColor?: string; columnWidth?: string } = {};
              if (background !== undefined) updates.backgroundColor = background ?? 'none';
              if (border !== undefined) updates.showBorder = border;
              if (align !== undefined) updates.verticalAlign = align;
              if (width !== undefined) updates.columnWidth = width;
              if (Object.keys(updates).length > 0) updateColumnProperties(id, updates);
            }}
            className={mobileOrderClass}
            columnWidth={column.columnWidth}
            onColumnWidthChange={(id, width) => updateColumnProperties(id, { columnWidth: width ?? '' })}
          >
            {renderedComponent}
          </DraggableColumn>
        );
      })}
    </div>
  );
  // Determine if element_styles override the default layout
  const hasLayoutOverride = display || flexDirection || alignItems || justifyContent || gap || gridTemplateColumns;

  return (
    <div className="relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={columns.map(c => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {containerClassName && !hasLayoutOverride ? (
            <div className={containerClassName}>
              {gridContent}
            </div>
          ) : (
            gridContent
          )}
        </SortableContext>
      </DndContext>
    </div>
  );
};
