import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ElementStyleValues {
  [key: string]: string;
}

interface StylesMap {
  [elementId: string]: {
    [viewport: string]: ElementStyleValues;
  };
}

/**
 * Hook to load and apply per-viewport element styles for a page.
 * Returns a function to get computed styles for an element at the current viewport.
 */
export const useElementStyles = (pageName: string) => {
  const [stylesMap, setStylesMap] = useState<StylesMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStyles();
  }, [pageName]);

  const loadStyles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('element_styles')
      .select('element_id, viewport, styles')
      .eq('page_name', pageName);

    if (error) {
      console.error('[useElementStyles] Error:', error);
      setIsLoading(false);
      return;
    }

    const map: StylesMap = {};
    data?.forEach(row => {
      if (!map[row.element_id]) map[row.element_id] = {};
      map[row.element_id][row.viewport] = (row.styles as any) || {};
    });

    setStylesMap(map);
    setIsLoading(false);
  };

  /**
   * Get computed CSS properties for an element at a given viewport.
   * Desktop styles are base; tablet/mobile override.
   */
  const normalizeLength = (value?: string): string | undefined => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    // Auto-append px for plain numeric values (e.g. "12" -> "12px")
    if (/^-?\d*\.?\d+$/.test(trimmed)) {
      return `${trimmed}px`;
    }
    return trimmed;
  };

  const getElementStyle = useCallback((elementId: string, viewport: string = 'desktop'): React.CSSProperties => {
    const elementStyles = stylesMap[elementId];
    if (!elementStyles) return {};

    // Start with desktop as base
    const desktop = elementStyles['desktop'] || {};
    // Layer on the specific viewport
    const override = viewport !== 'desktop' ? (elementStyles[viewport] || {}) : {};

    const merged = { ...desktop, ...override };

    // Convert our keys to CSS properties
    const css: React.CSSProperties = {};
    if (merged.padding_top) css.paddingTop = normalizeLength(merged.padding_top);
    if (merged.padding_right) css.paddingRight = normalizeLength(merged.padding_right);
    if (merged.padding_bottom) css.paddingBottom = normalizeLength(merged.padding_bottom);
    if (merged.padding_left) css.paddingLeft = normalizeLength(merged.padding_left);
    if (merged.margin_top) css.marginTop = normalizeLength(merged.margin_top);
    if (merged.margin_right) css.marginRight = normalizeLength(merged.margin_right);
    if (merged.margin_bottom) css.marginBottom = normalizeLength(merged.margin_bottom);
    if (merged.margin_left) css.marginLeft = normalizeLength(merged.margin_left);
    if (merged.width) css.width = normalizeLength(merged.width) || merged.width;
    if (merged.max_width) css.maxWidth = normalizeLength(merged.max_width) || merged.max_width;
    if (merged.text_align) css.textAlign = merged.text_align as any;
    if (merged.background_color) css.backgroundColor = merged.background_color;
    if (merged.color) css.color = merged.color;
    if (merged.border_width) css.borderWidth = normalizeLength(merged.border_width);
    if (merged.border_color) css.borderColor = merged.border_color;
    if (merged.border_style) css.borderStyle = merged.border_style as any;
    if (merged.border_radius) css.borderRadius = normalizeLength(merged.border_radius);
    if (merged.display) css.display = merged.display as any;
    if (merged.flex_direction) css.flexDirection = merged.flex_direction as any;
    if (merged.flex_wrap) css.flexWrap = merged.flex_wrap as any;
    if (merged.align_items) css.alignItems = merged.align_items;
    if (merged.justify_content) css.justifyContent = merged.justify_content;
    if (merged.gap) css.gap = normalizeLength(merged.gap);
    if (merged.grid_template_columns) css.gridTemplateColumns = merged.grid_template_columns;
    if (merged.z_index) css.zIndex = merged.z_index === 'auto' ? 'auto' : parseInt(merged.z_index, 10) || merged.z_index;

    // Auto-enable flex when alignment properties are set but display isn't explicitly set
    if (!css.display && (css.alignItems || css.justifyContent)) {
      css.display = 'flex';
      if (!css.flexDirection) css.flexDirection = 'column';
    }

    return css;
  }, [stylesMap]);

  return { getElementStyle, isLoading, reload: loadStyles };
};
