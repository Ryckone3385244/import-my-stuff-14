import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEditMode } from '@/contexts/EditModeContext';

export interface ContentRef {
  sectionName: string;
  contentKey: string;
}

interface Section {
  id: string;
  order: number;
  visible: boolean;
  status?: 'draft' | 'published';
  backgroundType?: 'color' | 'image' | 'gradient' | 'none';
  backgroundValue?: string | null;
  noMobileSwap?: boolean;
}

export const useSectionOrder = (pageName: string, defaultSections: string[]) => {
  const { markStructuralChange } = useEditMode();
  const [sections, setSections] = useState<Section[]>(
    defaultSections.map((id, index) => ({ id, order: index, visible: true }))
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSectionOrder();
  }, [pageName, defaultSections.join(',')]);

  const loadSectionOrder = async () => {
    // Query for deletion markers first - these prevent hardcoded sections from being restored
    const { data: deletionMarkers } = await supabase
      .from('page_content')
      .select('content_key')
      .eq('page_name', pageName)
      .eq('section_name', '__system')
      .like('content_key', 'deleted_section:%');
    
    // Build a Set of deleted section IDs from the markers
    const deletedSectionIds = new Set<string>();
    if (deletionMarkers) {
      deletionMarkers.forEach(marker => {
        // content_key format: "deleted_section:sectionId"
        const sectionId = marker.content_key.replace('deleted_section:', '');
        deletedSectionIds.add(sectionId);
      });
    }

    const { data, error } = await supabase
      .from('page_section_order')
      .select('section_id, section_order, visible, status, background_type, background_value, no_mobile_swap')
      .eq('page_name', pageName)
      .order('section_order', { ascending: true });

    if (!error && data && data.length > 0) {
      // Map database sections
      const dbSections = data.map(item => ({
        id: item.section_id,
        order: item.section_order,
        visible: item.visible ?? true,
        status: (item.status as 'draft' | 'published') ?? 'published',
        backgroundType: (item.background_type as 'color' | 'image' | 'gradient' | 'none') ?? 'none',
        backgroundValue: item.background_value ?? null,
        noMobileSwap: item.no_mobile_swap ?? false
      }));
      
      // KEY DISTINCTION:
      // - Dynamic sections (new-section-*): Respect user deletions, DB is source of truth
      // - Hardcoded sections (from defaultSections, NOT starting with new-section-): 
      //   Must ALWAYS be present UNLESS they have a deletion marker in page_content.
      
      const dbSectionIds = new Set(data.map(item => item.section_id));
      
      // Find hardcoded sections that are missing from the database
      // Only restore non-dynamic sections that don't have a deletion marker
      const missingHardcodedSections = defaultSections.filter(id => 
        !dbSectionIds.has(id) && !id.startsWith('new-section-') && !deletedSectionIds.has(id)
      );
      
      if (missingHardcodedSections.length > 0) {
        // Calculate the max order from existing sections
        const maxOrder = dbSections.length > 0 
          ? Math.max(...dbSections.map(s => s.order)) 
          : -1;
        
        // Create missing hardcoded sections with orders after existing sections
        // But try to place them at their original default positions if possible
        const sectionsToAdd: Section[] = missingHardcodedSections.map((id, idx) => {
          // Find original position in defaultSections
          const originalPosition = defaultSections.indexOf(id);
          return {
            id,
            order: maxOrder + 1 + idx, // Will be re-ordered below
            visible: true,
            status: 'published' as const,
            backgroundType: 'none' as const,
            backgroundValue: null
          };
        });
        
        // Insert missing hardcoded sections into database
        const inserts = sectionsToAdd.map((section, idx) => ({
          page_name: pageName,
          section_id: section.id,
          section_order: maxOrder + 1 + idx,
          visible: true,
          status: 'published',
          background_type: 'none',
          background_value: null
        }));
        
        await supabase
          .from('page_section_order')
          .upsert(inserts, { onConflict: 'page_name,section_id' });
        
        // Merge with existing sections
        const allSections = [...dbSections, ...sectionsToAdd];
        
        // Re-sort to place hardcoded sections at their intended positions
        // Hardcoded sections should appear in the order defined in defaultSections
        allSections.sort((a, b) => {
          const aIsDefault = defaultSections.includes(a.id);
          const bIsDefault = defaultSections.includes(b.id);
          
          if (aIsDefault && bIsDefault) {
            // Both are defaults - use defaultSections order
            return defaultSections.indexOf(a.id) - defaultSections.indexOf(b.id);
          } else if (aIsDefault) {
            // a is default, b is dynamic - defaults come first unless b has lower order
            return defaultSections.indexOf(a.id) - b.order;
          } else if (bIsDefault) {
            // b is default, a is dynamic
            return a.order - defaultSections.indexOf(b.id);
          }
          // Both are dynamic - use existing order
          return a.order - b.order;
        });
        
        // Update orders to be sequential
        const reorderedSections = allSections.map((s, i) => ({ ...s, order: i }));
        setSections(reorderedSections);
      } else {
        setSections(dbSections);
      }
    } else {
      // First time only - initialize with default sections
      const defaultOrder = defaultSections.map((id, index) => ({ id, order: index, visible: true }));
      setSections(defaultOrder);
      
      const updates = defaultOrder.map((section, index) => ({
        page_name: pageName,
        section_id: section.id,
        section_order: index,
        visible: true
      }));
      
      await supabase
        .from('page_section_order')
        .upsert(updates, { 
          onConflict: 'page_name,section_id'
        });
    }
    
    setIsLoading(false);
  };

  const updateSectionOrder = async (newSections: Section[]) => {
    setSections(newSections);

    // Save to database
    const updates = newSections.map((section, index) => ({
      page_name: pageName,
      section_id: section.id,
      section_order: index,
      visible: section.visible,
      status: section.status ?? 'published',
      background_type: section.backgroundType ?? 'none',
      background_value: section.backgroundValue ?? null,
      no_mobile_swap: section.noMobileSwap ?? false
    }));

    const { error } = await supabase
      .from('page_section_order')
      .upsert(updates, { 
        onConflict: 'page_name,section_id'
      });

    if (error) {
      console.error('[useSectionOrder] Failed to save section order:', error);
      toast.error('Failed to save section changes. Please ensure you have admin permissions.');
    } else {
      // Mark page as having structural changes for versioning
      markStructuralChange(pageName);
    }
  };

  const duplicateSection = async (sectionId: string, contentRefs?: ContentRef[]) => {
    const sectionIndex = sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    // Create a new section with a unique ID
    const timestamp = Date.now();
    const newSection: Section = {
      id: `${sectionId}-copy-${timestamp}`,
      order: sectionIndex + 1,
      visible: true,
      // Copy background settings from original section
      backgroundType: sections[sectionIndex].backgroundType,
      backgroundValue: sections[sectionIndex].backgroundValue,
      status: sections[sectionIndex].status
    };

    // IMPORTANT: Duplicate all content FIRST before updating the UI state
    // This prevents a race condition where the UI shows the new section
    // before its content exists in the database
    
    // 1) Duplicate page_content where section_name equals or contains the original section ID
    const { data: sectionContent, error: contentError } = await supabase
      .from('page_content')
      .select('*')
      .eq('page_name', pageName)
      .or(`section_name.eq.${sectionId},section_name.like.${sectionId}-%,section_name.like.%-${sectionId}-%`);
    
    if (!contentError && sectionContent && sectionContent.length > 0) {
      const duplicatedContent = sectionContent.map(block => {
        // Replace section ID in section_name
        let newSectionName = block.section_name;
        if (block.section_name === sectionId) {
          newSectionName = newSection.id;
        } else if (block.section_name?.includes(sectionId)) {
          newSectionName = block.section_name.replace(sectionId, newSection.id);
        }
        
        // Replace section ID in content_key if present
        let newContentKey = block.content_key;
        if (block.content_key?.includes(sectionId)) {
          newContentKey = block.content_key.replace(sectionId, newSection.id);
        }
        
        return {
          page_name: pageName,
          section_name: newSectionName,
          content_key: newContentKey,
          content_type: block.content_type,
          content_value: block.content_value
        };
      });
      
      const { error: insertError } = await supabase
        .from('page_content')
        .insert(duplicatedContent);
      
      if (insertError) {
        console.error('Failed to duplicate section content:', insertError);
      }
    }
    
    // 2) Duplicate hardcoded section content using contentRefs
    // This handles sections with sectionName props like "cards" that don't contain the section ID
    if (contentRefs && contentRefs.length > 0) {
      // Get unique sectionName values to query
      const uniqueSectionNames = [...new Set(contentRefs.map(ref => ref.sectionName))];
      
      for (const originalSectionName of uniqueSectionNames) {
        // Find all contentKeys for this sectionName
        const keysForSection = contentRefs
          .filter(ref => ref.sectionName === originalSectionName)
          .map(ref => ref.contentKey);
        
        // Fetch existing content for this section_name
        const { data: hardcodedContent, error: hardcodedError } = await supabase
          .from('page_content')
          .select('*')
          .eq('page_name', pageName)
          .eq('section_name', originalSectionName)
          .in('content_key', keysForSection);
        
        if (!hardcodedError && hardcodedContent && hardcodedContent.length > 0) {
          // Create new namespaced section_name
          const namespacedSectionName = `${newSection.id}::${originalSectionName}`;
          
          const duplicatedHardcodedContent = hardcodedContent.map(block => ({
            page_name: pageName,
            section_name: namespacedSectionName,
            content_key: block.content_key,
            content_type: block.content_type,
            content_value: block.content_value
          }));
          
          const { error: insertHardcodedError } = await supabase
            .from('page_content')
            .insert(duplicatedHardcodedContent);
          
          if (insertHardcodedError) {
            console.error('Failed to duplicate hardcoded section content:', insertHardcodedError);
          }
        }
      }
    }
    
    // 3) Duplicate section_column_order entries
    const { data: columnOrders, error: columnError } = await supabase
      .from('section_column_order')
      .select('*')
      .eq('page_name', pageName)
      .eq('section_id', sectionId);
    
    if (!columnError && columnOrders && columnOrders.length > 0) {
      const duplicatedColumns = columnOrders.map(col => ({
        page_name: pageName,
        section_id: newSection.id,
        column_id: col.column_id.includes(sectionId) 
          ? col.column_id.replace(sectionId, newSection.id)
          : col.column_id,
        column_order: col.column_order,
        visible: col.visible ?? true,
        show_border: col.show_border ?? false,
        vertical_align: col.vertical_align ?? 'top',
        card_color: col.card_color ?? 'card'  // Ensure card_color is always copied with a fallback
      }));
      
      const { error: colInsertError } = await supabase
        .from('section_column_order')
        .insert(duplicatedColumns);
      
      if (colInsertError) {
        console.error('Failed to duplicate column order:', colInsertError);
      }
    }

    // NOW update the UI state after all content has been duplicated
    const newSections = [
      ...sections.slice(0, sectionIndex + 1),
      newSection,
      ...sections.slice(sectionIndex + 1)
    ].map((s, i) => ({ ...s, order: i }));

    await updateSectionOrder(newSections);
  };

  const toggleSectionVisibility = async (sectionId: string) => {
    const newSections = sections.map(s => 
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    );
    
    await updateSectionOrder(newSections);
  };

  const deleteSection = async (sectionId: string) => {
    const newSections = sections
      .filter(s => s.id !== sectionId)
      .map((s, i) => ({ ...s, order: i }));
    
    await updateSectionOrder(newSections);

    // Also delete from database
    const { error } = await supabase
      .from('page_section_order')
      .delete()
      .eq('page_name', pageName)
      .eq('section_id', sectionId);

    if (error) {
      console.error('Failed to delete section:', error);
    }

    // Insert a tombstone marker to prevent hardcoded sections from being restored
    // This is especially important for sections defined in defaultSections array
    const { error: markerError } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: '__system',
        content_key: `deleted_section:${sectionId}`,
        content_type: 'system',
        content_value: 'true'
      }, { onConflict: 'page_name,section_name,content_key' });

    if (markerError) {
      console.error('Failed to insert deletion marker:', markerError);
    }
  };

  const addSection = async (afterSectionId: string, columnCount: number, position: 'above' | 'below') => {
    const newSectionId = `new-section-${columnCount}-col-${Date.now()}`;
    
    // Handle adding to an empty page
    if (afterSectionId === 'start' || sections.length === 0) {
      const newSection: Section = {
        id: newSectionId,
        order: 0,
        visible: true,
        status: 'published'
      };
      
      const updatedSections = [newSection];
      setSections(updatedSections);
      await updateSectionOrder(updatedSections);
      return;
    }
    
    const sectionIndex = sections.findIndex(s => s.id === afterSectionId);
    if (sectionIndex === -1) return;

    const insertIndex = position === 'above' ? sectionIndex : sectionIndex + 1;
    
    const newSection: Section = {
      id: newSectionId,
      order: insertIndex,
      visible: true,
      status: 'published'
    };

    const updatedSections = [...sections];
    updatedSections.splice(insertIndex, 0, newSection);
    const reorderedSections = updatedSections.map((s, i) => ({ ...s, order: i }));

    setSections(reorderedSections);
    await updateSectionOrder(reorderedSections);
  };

  const publishSection = async (sectionId: string) => {
    const newSections = sections.map(s => 
      s.id === sectionId ? { ...s, status: 'published' as const } : s
    );
    
    await updateSectionOrder(newSections);
  };

  const updateSectionBackground = async (sectionId: string, type: 'color' | 'image' | 'gradient' | 'none', value: string | null) => {
    const newSections = sections.map(s => 
      s.id === sectionId ? { ...s, backgroundType: type, backgroundValue: value } : s
    );
    
    // Save to database
    const updates = newSections.map((section, index) => ({
      page_name: pageName,
      section_id: section.id,
      section_order: index,
      visible: section.visible,
      status: section.status ?? 'published',
      background_type: section.backgroundType ?? 'none',
      background_value: section.backgroundValue ?? null,
      no_mobile_swap: section.noMobileSwap ?? false
    }));

    const { error } = await supabase
      .from('page_section_order')
      .upsert(updates, { 
        onConflict: 'page_name,section_id'
      });

    if (error) {
      console.error('[useSectionOrder] Failed to save section background:', error);
      toast.error('Failed to save section background. Please ensure you have admin permissions.');
    } else {
      setSections(newSections);
      toast.success('Section background updated successfully');
    }
  };

  const moveSectionUp = async (sectionId: string) => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (index <= 0) return; // Already at the top
    
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    const reorderedSections = newSections.map((s, i) => ({ ...s, order: i }));
    
    await updateSectionOrder(reorderedSections);
  };

  const moveSectionDown = async (sectionId: string) => {
    const index = sections.findIndex(s => s.id === sectionId);
    if (index === -1 || index >= sections.length - 1) return; // Already at the bottom
    
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    const reorderedSections = newSections.map((s, i) => ({ ...s, order: i }));
    
    await updateSectionOrder(reorderedSections);
  };

  const toggleMobileSwap = async (sectionId: string) => {
    const newSections = sections.map(s => 
      s.id === sectionId ? { ...s, noMobileSwap: !s.noMobileSwap } : s
    );
    
    setSections(newSections);
    await updateSectionOrder(newSections);
  };

  return { 
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
  };
};
