import { supabase } from '@/integrations/supabase/client';

/**
 * Creates a version snapshot of the current page state.
 * Captures content, section order, and column order.
 */
export const createVersionSnapshot = async (pageName: string): Promise<boolean> => {
  try {
    // Fetch all page data in parallel
    const [
      { data: content }, 
      { data: sectionOrder }, 
      { data: columnOrder }
    ] = await Promise.all([
      supabase.from('page_content').select('*').eq('page_name', pageName),
      supabase.from('page_section_order').select('*').eq('page_name', pageName),
      supabase.from('section_column_order').select('*').eq('page_name', pageName)
    ]);

    // Get current user
    const { data: userData } = await supabase.auth.getUser();

    // Get the latest version number for this page
    const { data: versions } = await supabase
      .from('page_versions')
      .select('version_number')
      .eq('page_name', pageName)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (versions?.[0]?.version_number || 0) + 1;

    // Insert the new version
    const { error } = await supabase.from('page_versions').insert({
      page_name: pageName,
      content_snapshot: content || [],
      section_order_snapshot: sectionOrder || [],
      column_order_snapshot: columnOrder || [],
      version_number: nextVersion,
      created_by: userData?.user?.id || null
    });

    if (error) {
      console.error('[pageVersioning] Failed to create snapshot:', error);
      return false;
    }

    console.log(`[pageVersioning] Created version ${nextVersion} for page "${pageName}"`);
    return true;
  } catch (err) {
    console.error('[pageVersioning] Error creating snapshot:', err);
    return false;
  }
};

/**
 * Restores a page to a specific version.
 */
export const restoreVersion = async (pageName: string, versionId: string): Promise<boolean> => {
  try {
    // Fetch the version snapshot
    const { data: version, error: fetchError } = await supabase
      .from('page_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (fetchError || !version) {
      console.error('[pageVersioning] Version not found:', fetchError);
      return false;
    }

    // Create a backup snapshot before restoring
    await createVersionSnapshot(pageName);

    // Clear existing content
    await Promise.all([
      supabase.from('page_content').delete().eq('page_name', pageName),
      supabase.from('page_section_order').delete().eq('page_name', pageName),
      supabase.from('section_column_order').delete().eq('page_name', pageName)
    ]);

    // Restore content
    const contentSnapshot = version.content_snapshot as any[];
    if (contentSnapshot && contentSnapshot.length > 0) {
      const contentToInsert = contentSnapshot.map(({ id, created_at, updated_at, ...rest }) => rest);
      await supabase.from('page_content').insert(contentToInsert);
    }

    // Restore section order
    const sectionOrderSnapshot = version.section_order_snapshot as any[];
    if (sectionOrderSnapshot && sectionOrderSnapshot.length > 0) {
      const sectionsToInsert = sectionOrderSnapshot.map(({ id, created_at, updated_at, ...rest }) => rest);
      await supabase.from('page_section_order').insert(sectionsToInsert);
    }

    // Restore column order
    const columnOrderSnapshot = version.column_order_snapshot as any[];
    if (columnOrderSnapshot && columnOrderSnapshot.length > 0) {
      const columnsToInsert = columnOrderSnapshot.map(({ id, created_at, updated_at, ...rest }) => rest);
      await supabase.from('section_column_order').insert(columnsToInsert);
    }

    console.log(`[pageVersioning] Restored page "${pageName}" to version ${version.version_number}`);
    return true;
  } catch (err) {
    console.error('[pageVersioning] Error restoring version:', err);
    return false;
  }
};

/**
 * Gets the version history for a page.
 */
export const getVersionHistory = async (pageName: string, limit = 20) => {
  const { data, error } = await supabase
    .from('page_versions')
    .select('id, version_number, created_at, created_by')
    .eq('page_name', pageName)
    .order('version_number', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[pageVersioning] Failed to fetch history:', error);
    return [];
  }

  return data || [];
};
