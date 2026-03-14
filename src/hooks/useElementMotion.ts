import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MotionConfig {
  effect_type: string;
  duration?: number;
  delay?: number;
  easing?: string;
  trigger?: 'load' | 'scroll' | 'hover';
  repeat?: boolean;
}

interface MotionMap {
  [elementId: string]: MotionConfig;
}

/**
 * Hook to load motion effects for all elements on a page.
 */
export const useElementMotion = (pageName: string) => {
  const [motionMap, setMotionMap] = useState<MotionMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMotion();
  }, [pageName]);

  const loadMotion = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('element_motion')
      .select('element_id, effect_type, effect_config')
      .eq('page_name', pageName);

    if (error) {
      console.error('[useElementMotion] Error:', error);
      setIsLoading(false);
      return;
    }

    const map: MotionMap = {};
    data?.forEach(row => {
      map[row.element_id] = {
        effect_type: row.effect_type,
        ...(row.effect_config as any || {}),
      };
    });

    setMotionMap(map);
    setIsLoading(false);
  };

  const getMotionConfig = useCallback((elementId: string): MotionConfig | null => {
    return motionMap[elementId] || null;
  }, [motionMap]);

  return { getMotionConfig, isLoading, reload: loadMotion };
};
