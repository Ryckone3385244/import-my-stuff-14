import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEditMode } from '@/contexts/EditModeContext';

interface Column {
  id: string;
  order: number;
  visible: boolean;
  showBorder?: boolean;
  verticalAlign?: 'top' | 'center';
  backgroundColor?: string;
  columnWidth?: string;
}

interface ColumnOrderState {
  columns: Column[];
  cardColor: string;
}

// Valid color keys for card backgrounds
const VALID_COLOR_KEYS = ['transparent', 'default', 'card', 'green', 'black', 'gray', 'gradient'] as const;
type ValidColorKey = typeof VALID_COLOR_KEYS[number];

/**
 * Normalize legacy color values to consistent values.
 * Maps "none", "card", null, undefined, "" to appropriate values.
 */
const normalizeColorValue = (value: string | null | undefined): string => {
  // Handle null, undefined, or empty string
  if (value === null || value === undefined || value === '') {
    return 'default';
  }
  
  // Map legacy "none" to "transparent"
  if (value === 'none') {
    return 'transparent';
  }
  
  // Map legacy "card" to "default" for consistency
  if (value === 'card') {
    return 'default';
  }
  
  return value;
};

/**
 * Validate that a color value is acceptable for saving.
 * Returns the validated value or 'default' if invalid.
 */
const validateColorForSave = (value: string | null | undefined): string => {
  // Never save empty strings
  if (value === '' || value === null || value === undefined) {
    return 'default';
  }
  
  // Map legacy values
  if (value === 'none') {
    return 'transparent';
  }
  
  if (value === 'card') {
    return 'default';
  }
  
  // Check if it's a valid key
  if (VALID_COLOR_KEYS.includes(value as ValidColorKey)) {
    return value;
  }
  
  // Check if it's a valid hex color
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
    return value;
  }
  
  // Check if it's a valid HSL string
  if (/^hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/i.test(value)) {
    return value;
  }
  
  // Check if it's a valid HSLA string
  if (/^hsla\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+\s*\)$/i.test(value)) {
    return value;
  }
  
  // Default fallback for invalid values
  console.warn(`Invalid color value "${value}", falling back to "default"`);
  return 'default';
};

/**
 * Deep clones content and regenerates any internal IDs to ensure 
 * duplicated blocks are completely independent from originals.
 */
const cloneContentWithNewIds = (content: string, timestamp: number): string => {
  try {
    const parsed = JSON.parse(content);
    
    // Handle accordion type - regenerate item IDs
    if (parsed.items && Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item: any, index: number) => ({
        ...item,
        id: `accordion-item-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`
      }));
    }
    
    // Handle photo-gallery and image-carousel - these store arrays of image URLs
    // which don't need ID regeneration, but ensure we deep clone the array
    if (parsed.images && Array.isArray(parsed.images)) {
      parsed.images = [...parsed.images];
    }
    
    // Handle any nested objects that might have IDs
    if (parsed.config && typeof parsed.config === 'object') {
      parsed.config = { ...parsed.config };
    }
    
    return JSON.stringify(parsed);
  } catch {
    // If not valid JSON, return as-is
    return content;
  }
};

export const useColumnOrder = (pageName: string, sectionId: string, defaultColumns: string[]) => {
  const { markStructuralChange, registerStructuralRollback, isEditMode } = useEditMode();
  const [columns, setColumns] = useState<Column[]>(
    defaultColumns.map((id, index) => ({ id, order: index, visible: true, backgroundColor: 'default' }))
  );
  const [cardColor, setCardColor] = useState<string>('default');
  const [isLoading, setIsLoading] = useState(true);
  
  // Race condition prevention: track if a save operation is in progress
  const isSavingRef = useRef(false);
  const pendingUpdatesRef = useRef<(() => Promise<void>)[]>([]);
  
  // Store previous state for rollback on error
  const previousStateRef = useRef<{ columns: Column[]; cardColor: string } | null>(null);

  // Listen for theme/style changes via custom event
  useEffect(() => {
    const handleStylesUpdated = () => {
      // Force re-render when styles are updated globally
      // This ensures CSS variable reads are in sync
      setColumns(prev => [...prev]);
    };
    
    window.addEventListener('styles-updated', handleStylesUpdated);
    return () => window.removeEventListener('styles-updated', handleStylesUpdated);
  }, []);

  // Process pending updates queue - use ref to avoid circular dependency
  const processPendingUpdatesRef = useRef<() => Promise<void>>();
  
  processPendingUpdatesRef.current = async () => {
    if (isSavingRef.current || pendingUpdatesRef.current.length === 0) return;
    
    const nextUpdate = pendingUpdatesRef.current.shift();
    if (nextUpdate) {
      await nextUpdate();
      // Process next item in queue
      processPendingUpdatesRef.current?.();
    }
  };

  const executeWithLock = useCallback(async <T>(
    operation: () => Promise<T>,
    rollbackState?: { columns: Column[]; cardColor: string }
  ): Promise<T | null> => {
    if (isSavingRef.current) {
      // Queue the operation for later
      return new Promise((resolve) => {
        pendingUpdatesRef.current.push(async () => {
          const result = await executeWithLock(operation, rollbackState);
          resolve(result);
        });
      });
    }
    
    isSavingRef.current = true;
    previousStateRef.current = rollbackState || null;
    
    try {
      const result = await operation();
      return result;
    } catch (error) {
      // Rollback on error
      if (previousStateRef.current) {
        setColumns(previousStateRef.current.columns);
        setCardColor(previousStateRef.current.cardColor);
      }
      throw error;
    } finally {
      isSavingRef.current = false;
      previousStateRef.current = null;
      // Process any queued updates
      processPendingUpdatesRef.current?.();
    }
  }, []);

  useEffect(() => {
    loadColumnOrder();
  }, [pageName, sectionId]);

  const loadColumnOrder = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('section_column_order')
      .select('*')
      .eq('page_name', pageName)
      .eq('section_id', sectionId)
      .order('column_order', { ascending: true });

    if (!error && data && data.length > 0) {
      // DATABASE IS SOURCE OF TRUTH: Once rows exist for this section, 
      // never auto-add "missing" default columns - they were intentionally deleted.
      
      // Get the stored card_color from first item, normalize legacy values
      const storedCardColor = normalizeColorValue(data[0]?.card_color);
      
      // Map database columns - normalize each column's individual card_color
      const loadedColumns = data.map(item => ({
        id: item.column_id,
        order: item.column_order,
        visible: item.visible ?? true,
        showBorder: item.show_border ?? false,
        verticalAlign: (item.vertical_align as 'top' | 'center') ?? 'top',
        backgroundColor: normalizeColorValue(item.card_color),
        columnWidth: item.column_width ?? undefined,
      }));
      
      setCardColor(storedCardColor);
      setColumns(loadedColumns);
    } else {
      // First time only - initialize with default columns and immediately persist to DB
      const defaultOrder = defaultColumns.map((id, index) => ({ 
        id, 
        order: index, 
        visible: true, 
        backgroundColor: 'default' 
      }));
      
      setColumns(defaultOrder);
      setCardColor('default');
      
      // Only persist defaults to DB when in edit mode (admin is editing)
      // This prevents RLS violations for anonymous/non-admin page views
      if (isEditMode) {
        const updates = defaultOrder.map((column, index) => ({
          page_name: pageName,
          section_id: sectionId,
          column_id: column.id,
          column_order: index,
          visible: true,
          show_border: false,
          card_color: 'default',
          vertical_align: 'top'
        }));
        
        const { error: upsertError } = await supabase
          .from('section_column_order')
          .upsert(updates, { 
            onConflict: 'page_name,section_id,column_id'
          });
          
        if (upsertError) {
          console.error('Failed to initialize column order:', upsertError);
        }
      }
    }
    
    setIsLoading(false);
  };

  const updateColumnOrder = async (newColumns: Column[]) => {
    const rollbackState = { columns: [...columns], cardColor };
    
    // Optimistic update
    setColumns(newColumns);

    await executeWithLock(async () => {
      const updates = newColumns.map((column, index) => ({
        page_name: pageName,
        section_id: sectionId,
        column_id: column.id,
        column_order: index,
        visible: column.visible,
        show_border: column.showBorder ?? false,
        vertical_align: column.verticalAlign ?? 'top',
        card_color: validateColorForSave(column.backgroundColor || cardColor)
      }));

      const { error } = await supabase
        .from('section_column_order')
        .upsert(updates, { 
          onConflict: 'page_name,section_id,column_id'
        });

      if (error) {
        console.error('Failed to save column order:', error);
        toast.error('Failed to save column order. Please ensure you have admin permissions.');
        // Rollback
        setColumns(rollbackState.columns);
        throw error;
      } else {
        // Mark structural change for versioning
        markStructuralChange(pageName);
      }
    }, rollbackState);
  };

  const updateCardColor = async (newColor: string) => {
    const rollbackState = { columns: [...columns], cardColor };
    const validatedColor = validateColorForSave(newColor);
    
    // Optimistic update
    setCardColor(validatedColor);
    const updatedColumns = columns.map(column => ({
      ...column,
      backgroundColor: validatedColor,
    }));
    setColumns(updatedColumns);

    await executeWithLock(async () => {
      const updates = updatedColumns.map((column, index) => ({
        page_name: pageName,
        section_id: sectionId,
        column_id: column.id,
        column_order: index,
        visible: column.visible,
        show_border: column.showBorder ?? false,
        vertical_align: column.verticalAlign ?? 'top',
        card_color: validatedColor,
      }));

      const { error } = await supabase
        .from('section_column_order')
        .upsert(updates, { 
          onConflict: 'page_name,section_id,column_id'
        });

      if (error) {
        console.error('Failed to save card color:', error);
        toast.error('Failed to save theme change. Please ensure you have admin permissions.');
        // Rollback
        setCardColor(rollbackState.cardColor);
        setColumns(rollbackState.columns);
        throw error;
      } else {
        toast.success('Theme updated successfully');
      }
    }, rollbackState);
  };

  /**
   * Unified function to update multiple column properties at once.
   * This prevents race conditions when updating border, alignment, and color together.
   */
  const updateColumnProperties = async (
    columnId: string, 
    updates: {
      showBorder?: boolean;
      verticalAlign?: 'top' | 'center';
      backgroundColor?: string;
      columnWidth?: string;
    }
  ) => {
    const rollbackState = { columns: [...columns], cardColor };
    
    const newColumns = columns.map(c => {
      if (c.id !== columnId) return c;
      return {
        ...c,
        ...(updates.showBorder !== undefined && { showBorder: updates.showBorder }),
        ...(updates.verticalAlign !== undefined && { verticalAlign: updates.verticalAlign }),
        ...(updates.backgroundColor !== undefined && { backgroundColor: validateColorForSave(updates.backgroundColor) }),
        ...(updates.columnWidth !== undefined && { columnWidth: updates.columnWidth }),
      };
    });
    
    // Optimistic update
    setColumns(newColumns);

    const column = newColumns.find(c => c.id === columnId);
    if (!column) return;

    await executeWithLock(async () => {
      const { error } = await supabase
        .from('section_column_order')
        .upsert({
          page_name: pageName,
          section_id: sectionId,
          column_id: columnId,
          column_order: column.order,
          visible: column.visible,
          show_border: column.showBorder ?? false,
          vertical_align: column.verticalAlign ?? 'top',
          card_color: validateColorForSave(column.backgroundColor || cardColor),
          column_width: column.columnWidth ?? null,
        }, { 
          onConflict: 'page_name,section_id,column_id'
        });

      if (error) {
        console.error('Failed to save column properties:', error);
        toast.error('Failed to save column settings. Please ensure you have admin permissions.');
        setColumns(rollbackState.columns);
        throw error;
      }
    }, rollbackState);
  };

  const updateColumnBorder = async (columnId: string, showBorder: boolean) => {
    await updateColumnProperties(columnId, { showBorder });
  };

  const updateColumnVerticalAlign = async (columnId: string, verticalAlign: 'top' | 'center') => {
    await updateColumnProperties(columnId, { verticalAlign });
  };

  const updateColumnColor = async (columnId: string, color: string) => {
    const rollbackState = { columns: [...columns], cardColor };
    const validatedColor = validateColorForSave(color);
    
    const newColumns = columns.map(c => 
      c.id === columnId ? { ...c, backgroundColor: validatedColor } : c
    );
    
    // Optimistic update
    setColumns(newColumns);

    const column = newColumns.find(c => c.id === columnId);
    if (!column) return;

    await executeWithLock(async () => {
      const { error } = await supabase
        .from('section_column_order')
        .upsert({
          page_name: pageName,
          section_id: sectionId,
          column_id: columnId,
          column_order: column.order,
          visible: column.visible,
          show_border: column.showBorder ?? false,
          vertical_align: column.verticalAlign ?? 'top',
          card_color: validatedColor
        }, { 
          onConflict: 'page_name,section_id,column_id'
        });

      if (error) {
        console.error('Failed to save column color:', error);
        toast.error('Failed to save color. Please ensure you have admin permissions.');
        setColumns(rollbackState.columns);
        throw error;
      } else {
        toast.success('Column color updated successfully');
      }
    }, rollbackState);
  };

  const toggleColumnVisibility = async (columnId: string) => {
    const newColumns = columns.map(c => 
      c.id === columnId ? { ...c, visible: !c.visible } : c
    );
    await updateColumnOrder(newColumns);
  };

  const duplicateColumn = async (columnId: string) => {
    const columnIndex = columns.findIndex(c => c.id === columnId);
    if (columnIndex === -1) return;

    const originalColumn = columns[columnIndex];
    const timestamp = Date.now();
    const newColumn: Column = {
      id: `${columnId}-copy-${timestamp}`,
      order: columnIndex + 1,
      visible: true,
      // Copy all styles from the original column
      showBorder: originalColumn?.showBorder ?? false,
      verticalAlign: originalColumn?.verticalAlign ?? 'top',
      backgroundColor: normalizeColorValue(originalColumn?.backgroundColor) || cardColor,
    };

    // IMPORTANT: Duplicate all content FIRST before updating the UI state
    // This prevents a race condition where the UI shows the new column
    // before its content exists in the database

    // 1) Duplicate dynamic card/page-builder blocks (where section_name = columnId)
    const sectionNameCandidates = [
      columnId,
      `${sectionId}-${columnId}`
    ];

    const { data: allSectionContent, error: fetchError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_name', pageName)
      .in('section_name', sectionNameCandidates);

    if (!fetchError && allSectionContent && allSectionContent.length > 0) {
      // Separate main block entries from auxiliary entries (settings, links)
      const isAuxiliaryEntry = (key: string) => key.endsWith('-settings') || key.endsWith('-link');
      const originalBlocks = allSectionContent.filter(b => b.content_key.startsWith('block_') && !isAuxiliaryEntry(b.content_key));
      const auxEntries = allSectionContent.filter(b => isAuxiliaryEntry(b.content_key));

      // Sort blocks by their order property to maintain correct sequence
      const sortedBlocks = [...originalBlocks].sort((a, b) => {
        try {
          const orderA = JSON.parse(a.content_value)?.order ?? 0;
          const orderB = JSON.parse(b.content_value)?.order ?? 0;
          return orderA - orderB;
        } catch {
          return 0;
        }
      });

      // Create new blocks with unique IDs preserving the original order values for the duplicated column
      const duplicatedBlocks = sortedBlocks.map((block) => {
        // Parse content_value to regenerate internal IDs while preserving order
        let contentValue = block.content_value;
        try {
          const parsed = JSON.parse(block.content_value);
          // Keep the original order value - don't reassign it
          
          // Deep clone the content and regenerate any internal IDs
          // cloneContentWithNewIds handles both JSON and plain text content
          if (typeof parsed.content === 'string') {
            // Try to parse content as JSON (for accordion, gallery, etc.)
            try {
              const innerParsed = JSON.parse(parsed.content);
              // Handle accordion type - regenerate item IDs
              if (innerParsed.items && Array.isArray(innerParsed.items)) {
                innerParsed.items = innerParsed.items.map((item: any, idx: number) => ({
                  ...item,
                  id: `accordion-item-${timestamp}-${parsed.order}-${idx}-${Math.random().toString(36).substr(2, 9)}`
                }));
              }
              // Handle photo-gallery and image-carousel
              if (innerParsed.images && Array.isArray(innerParsed.images)) {
                innerParsed.images = [...innerParsed.images];
              }
              parsed.content = JSON.stringify(innerParsed);
            } catch {
              // Content is plain text/HTML, keep as-is
            }
          }
          
          contentValue = JSON.stringify(parsed);
        } catch {
          // If parsing fails, use original value
        }

        // Compute the new section_name by replacing the original columnId with the new one
        // This preserves the full path structure (e.g., "new-section-2-col-123-card-0" becomes "new-section-2-col-123-card-0-copy-1234567890")
        let newSectionName = block.section_name;
        if (block.section_name === columnId) {
          newSectionName = newColumn.id;
        } else if (block.section_name?.includes(columnId)) {
          newSectionName = block.section_name.replace(columnId, newColumn.id);
        }

        return {
          page_name: pageName,
          section_name: newSectionName,
          content_key: `${block.content_key}_copy_${timestamp}`, // Generate unique block ID
          content_type: block.content_type,
          content_value: contentValue
        };
      });

      const { error: insertError } = await supabase
        .from('page_content')
        .insert(duplicatedBlocks);

      if (insertError) {
        console.error('Failed to duplicate content blocks:', insertError);
      }

      // 1b) Duplicate auxiliary entries (settings, links) for each block
      // These are stored with content_keys like "block_123-settings" or "block_123-link"
      // We already fetched them above in auxEntries
      const blockIds = sortedBlocks.map(b => b.content_key);
      
      if (auxEntries.length > 0) {
        const duplicatedAuxBlocks = auxEntries.map(block => {
          // Find the original block ID this aux entry belongs to
          const originalBlockId = blockIds.find(id => block.content_key.startsWith(id));
          if (!originalBlockId) return null; // Skip if we can't find the parent block
          
          const suffix = block.content_key.replace(originalBlockId, ''); // e.g., "-settings" or "-link"
          
          // Compute the new section_name
          let newSectionName = block.section_name;
          if (block.section_name === columnId) {
            newSectionName = newColumn.id;
          } else if (block.section_name?.includes(columnId)) {
            newSectionName = block.section_name.replace(columnId, newColumn.id);
          }
          
          return {
            page_name: pageName,
            section_name: newSectionName,
            content_key: `${originalBlockId}_copy_${timestamp}${suffix}`, // Match the new block ID with suffix
            content_type: block.content_type,
            content_value: block.content_value // Settings/link values don't need ID regeneration
          };
        }).filter(Boolean);

        if (duplicatedAuxBlocks.length > 0) {
          const { error: auxInsertError } = await supabase
            .from('page_content')
            .insert(duplicatedAuxBlocks);

          if (auxInsertError) {
            console.error('Failed to duplicate auxiliary blocks:', auxInsertError);
          }
        }
      }

      // 1c) Duplicate remaining non-block entries (e.g., hovercard images, overlay text)
      // These entries have composite section_name but content_key doesn't start with "block_"
      const isAuxiliaryEntryCheck = (key: string) => key.endsWith('-settings') || key.endsWith('-link');
      const remainingEntries = allSectionContent.filter(
        b => !b.content_key.startsWith('block_') && !isAuxiliaryEntryCheck(b.content_key)
      );

      if (remainingEntries.length > 0) {
        const duplicatedRemaining = remainingEntries.map(block => {
          const clonedContentValue = cloneContentWithNewIds(block.content_value, timestamp);
          
          let newSectionName = block.section_name;
          if (block.section_name === columnId) {
            newSectionName = newColumn.id;
          } else if (block.section_name?.includes(columnId)) {
            newSectionName = block.section_name.replace(columnId, newColumn.id);
          }
          
          return {
            page_name: pageName,
            section_name: newSectionName,
            content_key: `${block.content_key}_copy_${timestamp}`,
            content_type: block.content_type,
            content_value: clonedContentValue
          };
        });

        const { error: remainingInsertError } = await supabase
          .from('page_content')
          .insert(duplicatedRemaining);

        if (remainingInsertError) {
          console.error('Failed to duplicate remaining content entries:', remainingInsertError);
        }
      }

      // 1d) Duplicate auxiliary entries for non-block content (e.g., hovercard_*-settings)
      const remainingAux = allSectionContent.filter(
        b => !b.content_key.startsWith('block_') && isAuxiliaryEntryCheck(b.content_key)
      );

      if (remainingAux.length > 0) {
        // Find the base keys of the remaining entries we just duplicated
        const remainingBaseKeys = remainingEntries.map(b => b.content_key);
        
        const duplicatedRemainingAux = remainingAux.map(block => {
          // Find which remaining entry this aux belongs to
          const parentKey = remainingBaseKeys.find(key => block.content_key.startsWith(key));
          
          let newSectionName = block.section_name;
          if (block.section_name === columnId) {
            newSectionName = newColumn.id;
          } else if (block.section_name?.includes(columnId)) {
            newSectionName = block.section_name.replace(columnId, newColumn.id);
          }

          let newContentKey: string;
          if (parentKey) {
            const suffix = block.content_key.replace(parentKey, '');
            newContentKey = `${parentKey}_copy_${timestamp}${suffix}`;
          } else {
            newContentKey = `${block.content_key}_copy_${timestamp}`;
          }
          
          return {
            page_name: pageName,
            section_name: newSectionName,
            content_key: newContentKey,
            content_type: block.content_type,
            content_value: block.content_value
          };
        });

        const { error: remainingAuxError } = await supabase
          .from('page_content')
          .insert(duplicatedRemainingAux);

        if (remainingAuxError) {
          console.error('Failed to duplicate remaining auxiliary entries:', remainingAuxError);
        }
      }
    }

    // 2) Duplicate static card content where keys are namespaced by the column/card id
    // This handles EditableCard content (e.g., "feature-1-title", "feature-1-description")
    const { data: staticBlocks, error: staticError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_name', pageName)
      .or(`content_key.like.${columnId}-%,content_key.eq.${columnId}`);

    if (!staticError && staticBlocks && staticBlocks.length > 0) {
      const staticDuplicatedBlocks = staticBlocks.map(block => {
        // Clone content and regenerate any internal IDs for static blocks too
        const clonedContentValue = cloneContentWithNewIds(block.content_value, timestamp);
        
        // Also update section_name if it contains the column ID
        let newSectionName = block.section_name;
        if (block.section_name === columnId || block.section_name?.includes(columnId)) {
          newSectionName = block.section_name.replace(columnId, newColumn.id);
        }
        
        return {
          page_name: pageName,
          section_name: newSectionName,
          content_key: block.content_key.replace(columnId, newColumn.id),
          content_type: block.content_type,
          content_value: clonedContentValue
        };
      });

      const { error: staticInsertError } = await supabase
        .from('page_content')
        .insert(staticDuplicatedBlocks);

      if (staticInsertError) {
        console.error('Failed to duplicate static content blocks:', staticInsertError);
      }
    }

    // 3) Duplicate content where section_name contains the column ID
    // This handles cases like EditableText/EditableImage using sectionName = columnId
    // but content_key doesn't start with columnId
    const compositeSectionName = `${sectionId}-${columnId}`;
    const { data: sectionNamedBlocks, error: sectionError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_name', pageName)
      .in('section_name', [columnId, compositeSectionName])
      .not('content_key', 'like', 'block_%'); // Exclude dynamic blocks already handled in step 1

    if (!sectionError && sectionNamedBlocks && sectionNamedBlocks.length > 0) {
      // Filter out blocks already duplicated in steps 1 and 2
      const alreadyDuplicatedKeys = new Set([
        ...(staticBlocks || []).map(b => b.content_key),
        ...(allSectionContent || []).map(b => b.content_key),
      ]);
      
      const newSectionBlocks = sectionNamedBlocks.filter(
        block => !alreadyDuplicatedKeys.has(block.content_key)
      );

      if (newSectionBlocks.length > 0) {
        const sectionDuplicatedBlocks = newSectionBlocks.map(block => {
          const clonedContentValue = cloneContentWithNewIds(block.content_value, timestamp);
          
          // Compute the new section_name by replacing the original columnId with the new one
          let newSectionName = block.section_name;
          if (block.section_name === columnId) {
            newSectionName = newColumn.id;
          } else if (block.section_name?.includes(columnId)) {
            newSectionName = block.section_name.replace(columnId, newColumn.id);
          }
          
          return {
            page_name: pageName,
            section_name: newSectionName,
            content_key: block.content_key, // Keep same content_key since section_name is different
            content_type: block.content_type,
            content_value: clonedContentValue
          };
        });

        const { error: sectionInsertError } = await supabase
          .from('page_content')
          .insert(sectionDuplicatedBlocks);

        if (sectionInsertError) {
          console.error('Failed to duplicate section-named content blocks:', sectionInsertError);
        }
      }
    }

    // Register rollback so Discard can undo this structural change
    const newColumnId = newColumn.id;
    const compositeSectionNameForRollback = `${sectionId}-${newColumnId}`;
    registerStructuralRollback(`duplicate-${newColumnId}`, async () => {
      // Delete the duplicated column from section_column_order
      await supabase
        .from('section_column_order')
        .delete()
        .eq('page_name', pageName)
        .eq('section_id', sectionId)
        .eq('column_id', newColumnId);
      
      // Delete all duplicated content
      await supabase
        .from('page_content')
        .delete()
        .eq('page_name', pageName)
        .in('section_name', [newColumnId, compositeSectionNameForRollback]);
    });

    // NOW update the UI state after all content has been duplicated
    const newColumns = [
      ...columns.slice(0, columnIndex + 1),
      newColumn,
      ...columns.slice(columnIndex + 1)
    ].map((c, i) => ({ ...c, order: i }));

    await updateColumnOrder(newColumns);
  };

  const deleteColumn = async (columnId: string) => {
    const newColumns = columns
      .filter(c => c.id !== columnId)
      .map((c, i) => ({ ...c, order: i }));

    await updateColumnOrder(newColumns);

    // Delete column from section_column_order
    const { error: columnError } = await supabase
      .from('section_column_order')
      .delete()
      .eq('page_name', pageName)
      .eq('section_id', sectionId)
      .eq('column_id', columnId);

    if (columnError) {
      console.error('Failed to delete column:', columnError);
    }

    // Delete all content blocks associated with this column
    // - Static patterns sometimes use section_name = columnId
    // - Dynamic cards use section_name = `${sectionId}-${columnId}` (e.g. new-section-*-card-0)
    const { error: contentError } = await supabase
      .from('page_content')
      .delete()
      .eq('page_name', pageName)
      .in('section_name', [columnId, `${sectionId}-${columnId}`]);

    if (contentError) {
      console.error('Failed to delete content blocks:', contentError);
    }
  };

  return {
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
  };
};
