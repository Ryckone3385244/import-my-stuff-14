import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LayoutPartial {
  id: string;
  partial_type: 'navbar' | 'footer';
  name: string;
  description: string | null;
  is_template: boolean;
  template_key: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** Fetch all layout partials */
export const useLayoutPartials = (type?: 'navbar' | 'footer') => {
  return useQuery({
    queryKey: ['layout-partials', type],
    queryFn: async () => {
      let query = supabase.from('layout_partials').select('*').order('is_default', { ascending: false }).order('name');
      if (type) query = query.eq('partial_type', type);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as LayoutPartial[];
    },
  });
};

/** Get the default partial for a type */
export const useDefaultPartial = (type: 'navbar' | 'footer') => {
  return useQuery({
    queryKey: ['layout-partial-default', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('layout_partials')
        .select('*')
        .eq('partial_type', type)
        .eq('is_default', true)
        .maybeSingle();
      if (error) throw error;
      return data as LayoutPartial | null;
    },
  });
};

/**
 * Resolve which navbar/footer partial to use for a given page URL.
 * Falls back to the global default if the page has no override.
 */
export const useResolvedPartial = (pageUrl: string | null, type: 'navbar' | 'footer') => {
  return useQuery({
    queryKey: ['resolved-partial', type, pageUrl],
    queryFn: async () => {
      // Check page-level override
      if (pageUrl) {
        const col = type === 'navbar' ? 'navbar_partial_id' : 'footer_partial_id';
        const { data: page } = await supabase
          .from('website_pages')
          .select(col)
          .eq('page_url', pageUrl)
          .maybeSingle();

        const overrideId = (page as Record<string, any> | null)?.[col] as string | null;
        if (overrideId) {
          const { data: partial } = await supabase
            .from('layout_partials')
            .select('*')
            .eq('id', overrideId)
            .single();
          if (partial) return partial as LayoutPartial;
        }
      }

      // Fall back to global default
      const { data: defaultPartial } = await supabase
        .from('layout_partials')
        .select('*')
        .eq('partial_type', type)
        .eq('is_default', true)
        .maybeSingle();

      return defaultPartial as LayoutPartial | null;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Get the pageName used for content storage for a given partial.
 * Convention: "partial-{type}-{id}" e.g. "partial-navbar-abc123"
 */
export const getPartialPageName = (partial: LayoutPartial): string => {
  return `partial-${partial.partial_type}-${partial.id}`;
};
