import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Copy all page_content rows from one section/card to another,
 * optionally on a different page.
 */
export const pasteContentToTarget = async (
  source: {
    pageName: string;
    sectionName: string;
  },
  target: {
    pageName: string;
    sectionName: string;
  }
) => {
  // Fetch source content
  const { data: sourceContent, error: fetchError } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_name', source.pageName)
    .eq('section_name', source.sectionName);

  if (fetchError) {
    console.error('Failed to fetch source content:', fetchError);
    toast.error('Failed to paste content');
    return false;
  }

  if (!sourceContent || sourceContent.length === 0) {
    toast.info('Nothing to paste — source has no content');
    return false;
  }

  // Insert into target with new IDs
  const newRows = sourceContent.map(row => ({
    page_name: target.pageName,
    section_name: target.sectionName,
    content_key: `${row.content_key}-paste-${Date.now()}`,
    content_type: row.content_type,
    content_value: row.content_value,
  }));

  const { error: insertError } = await supabase
    .from('page_content')
    .insert(newRows);

  if (insertError) {
    console.error('Failed to paste content:', insertError);
    toast.error('Failed to paste content');
    return false;
  }

  toast.success('Content pasted successfully');
  return true;
};

/**
 * Copy a section (including its column order and content) to a target page.
 */
export const pasteSectionToPage = async (
  source: {
    pageName: string;
    sectionId: string;
  },
  target: {
    pageName: string;
    afterSectionId?: string;
  }
) => {
  const newSectionId = `${source.sectionId}-paste-${Date.now()}`;

  // Copy column order
  const { data: columns } = await supabase
    .from('section_column_order')
    .select('*')
    .eq('page_name', source.pageName)
    .eq('section_id', source.sectionId);

  if (columns && columns.length > 0) {
    const newColumns = columns.map(col => ({
      page_name: target.pageName,
      section_id: newSectionId,
      column_id: col.column_id,
      column_order: col.column_order,
      visible: col.visible,
      card_color: col.card_color,
      show_border: col.show_border,
      vertical_align: col.vertical_align,
      column_width: col.column_width,
    }));

    await supabase.from('section_column_order').insert(newColumns);
  }

  // Copy all page_content for this section's cards
  const { data: content } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_name', source.pageName)
    .like('section_name', `${source.sectionId}%`);

  if (content && content.length > 0) {
    const newContent = content.map(row => ({
      page_name: target.pageName,
      section_name: row.section_name.replace(source.sectionId, newSectionId),
      content_key: row.content_key,
      content_type: row.content_type,
      content_value: row.content_value,
    }));

    await supabase.from('page_content').insert(newContent);
  }

  // Add to section order
  const { data: existingSections } = await supabase
    .from('page_section_order')
    .select('section_order')
    .eq('page_name', target.pageName)
    .order('section_order', { ascending: false })
    .limit(1);

  const nextOrder = (existingSections?.[0]?.section_order ?? 0) + 1;

  // Copy background from source
  const { data: sourceSection } = await supabase
    .from('page_section_order')
    .select('background_type, background_value, no_mobile_swap')
    .eq('page_name', source.pageName)
    .eq('section_id', source.sectionId)
    .maybeSingle();

  await supabase.from('page_section_order').insert({
    page_name: target.pageName,
    section_id: newSectionId,
    section_order: nextOrder,
    visible: true,
    status: 'published',
    background_type: sourceSection?.background_type || 'none',
    background_value: sourceSection?.background_value || null,
    no_mobile_swap: sourceSection?.no_mobile_swap || false,
  });

  toast.success('Section pasted successfully');
  return newSectionId;
};

/**
 * Copy column content (all dynamic blocks) from source to target column.
 */
export const pasteColumnContent = async (
  source: {
    pageName: string;
    sectionId: string;
    columnId: string;
  },
  target: {
    pageName: string;
    sectionId: string;
    columnId: string;
  }
) => {
  const sourceCardId = `${source.sectionId}-${source.columnId}`;
  const targetCardId = `${target.sectionId}-${target.columnId}`;

  const { data: content } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_name', source.pageName)
    .eq('section_name', sourceCardId);

  if (!content || content.length === 0) {
    toast.info('Nothing to paste — source column is empty');
    return false;
  }

  const timestamp = Date.now();
  const newContent = content.map((row, i) => ({
    page_name: target.pageName,
    section_name: targetCardId,
    content_key: `${row.content_key.split('-paste-')[0]}-paste-${timestamp}-${i}`,
    content_type: row.content_type,
    content_value: row.content_value,
  }));

  const { error } = await supabase.from('page_content').insert(newContent);

  if (error) {
    console.error('Failed to paste column content:', error);
    toast.error('Failed to paste');
    return false;
  }

  toast.success('Column content pasted');
  return true;
};

/**
 * Copy a single component (content block) to a target column.
 */
export const pasteComponentToColumn = async (
  source: {
    pageName: string;
    cardId: string;
    contentKey: string;
  },
  target: {
    pageName: string;
    cardId: string;
  }
) => {
  const { data: content } = await supabase
    .from('page_content')
    .select('*')
    .eq('page_name', source.pageName)
    .eq('section_name', source.cardId)
    .eq('content_key', source.contentKey);

  if (!content || content.length === 0) {
    toast.info('Nothing to paste');
    return false;
  }

  const timestamp = Date.now();
  const newContent = content.map(row => ({
    page_name: target.pageName,
    section_name: target.cardId,
    content_key: `block_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
    content_type: row.content_type,
    content_value: row.content_value,
  }));

  const { error } = await supabase.from('page_content').insert(newContent);

  if (error) {
    console.error('Failed to paste component:', error);
    toast.error('Failed to paste');
    return false;
  }

  toast.success('Component pasted');
  return true;
};
