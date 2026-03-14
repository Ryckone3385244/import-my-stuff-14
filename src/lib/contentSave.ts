import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SaveContentParams {
  pageName: string;
  sectionName: string;
  contentKey: string;
  contentValue: string;
  contentType: string;
}

/**
 * Immediately saves content to the database via upsert.
 * Used by all editable components for instant persistence.
 */
export const saveContentImmediately = async ({
  pageName,
  sectionName,
  contentKey,
  contentValue,
  contentType
}: SaveContentParams): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: sectionName,
        content_key: contentKey,
        content_value: contentValue,
        content_type: contentType
      }, {
        onConflict: 'page_name,section_name,content_key'
      });

    if (error) {
      console.error('[contentSave] Failed to save:', error);
      toast.error('Failed to save changes');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[contentSave] Error:', err);
    toast.error('Failed to save changes');
    return false;
  }
};
