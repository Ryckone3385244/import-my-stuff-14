import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useElementStyles } from './useElementStyles';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { useEditMode } from '@/contexts/EditModeContext';

type DetectedViewport = 'desktop' | 'tablet' | 'mobile';

const detectViewport = (): DetectedViewport => {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

/** Local style overrides keyed by "elementId::viewport" */
type OverrideMap = Record<string, Record<string, string>>;

interface ElementStylesContextType {
  getElementStyle: (elementId: string, viewport?: string) => React.CSSProperties;
  reload: () => Promise<void>;
  /** Set local style overrides for instant preview (before DB save) */
  setLocalOverride: (elementId: string, viewport: string, styles: Record<string, string>) => void;
  /** Clear local override for an element (after DB save + reload) */
  clearLocalOverride: (elementId: string, viewport: string) => void;
}

const ElementStylesContext = createContext<ElementStylesContextType | null>(null);

export const useElementStylesContext = () => useContext(ElementStylesContext);

const normalizeLength = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^-?\d*\.?\d+$/.test(trimmed)) return `${trimmed}px`;
  return trimmed;
};

const convertStylesToCSS = (merged: Record<string, string>, base: React.CSSProperties = {}): React.CSSProperties => {
  const css: React.CSSProperties = { ...base };
  if (merged.padding_top !== undefined) css.paddingTop = normalizeLength(merged.padding_top) || undefined;
  if (merged.padding_right !== undefined) css.paddingRight = normalizeLength(merged.padding_right) || undefined;
  if (merged.padding_bottom !== undefined) css.paddingBottom = normalizeLength(merged.padding_bottom) || undefined;
  if (merged.padding_left !== undefined) css.paddingLeft = normalizeLength(merged.padding_left) || undefined;
  if (merged.margin_top !== undefined) css.marginTop = normalizeLength(merged.margin_top) || undefined;
  if (merged.margin_right !== undefined) css.marginRight = normalizeLength(merged.margin_right) || undefined;
  if (merged.margin_bottom !== undefined) css.marginBottom = normalizeLength(merged.margin_bottom) || undefined;
  if (merged.margin_left !== undefined) css.marginLeft = normalizeLength(merged.margin_left) || undefined;
  if (merged.width !== undefined) css.width = normalizeLength(merged.width) || merged.width || undefined;
  if (merged.max_width !== undefined) css.maxWidth = normalizeLength(merged.max_width) || merged.max_width || undefined;
  if (merged.text_align !== undefined) css.textAlign = merged.text_align as any;
  if (merged.background_color !== undefined) css.backgroundColor = merged.background_color || undefined;
  if (merged.color !== undefined) css.color = merged.color || undefined;
  if (merged.border_width !== undefined) css.borderWidth = normalizeLength(merged.border_width) || undefined;
  if (merged.border_color !== undefined) css.borderColor = merged.border_color || undefined;
  if (merged.border_style !== undefined) css.borderStyle = merged.border_style as any;
  if (merged.border_radius !== undefined) css.borderRadius = normalizeLength(merged.border_radius) || undefined;
  if (merged.display !== undefined) css.display = merged.display as any;
  if (merged.flex_direction !== undefined) css.flexDirection = merged.flex_direction as any;
  if (merged.flex_wrap !== undefined) css.flexWrap = merged.flex_wrap as any;
  if (merged.align_items !== undefined) css.alignItems = merged.align_items;
  if (merged.justify_content !== undefined) css.justifyContent = merged.justify_content;
  if (merged.gap !== undefined) css.gap = normalizeLength(merged.gap) || undefined;
  if (merged.grid_template_columns !== undefined) css.gridTemplateColumns = merged.grid_template_columns;
  if (merged.z_index !== undefined) css.zIndex = merged.z_index === 'auto' ? 'auto' : parseInt(merged.z_index, 10) || merged.z_index;

  // Auto-enable flex when alignment properties are set but display isn't explicitly set
  if (!css.display && (css.alignItems || css.justifyContent)) {
    css.display = 'flex';
    if (!css.flexDirection) css.flexDirection = 'column';
  }

  return css;
};

export const ElementStylesProvider = ({ pageName, children }: { pageName: string; children: ReactNode }) => {
  const { getElementStyle: rawGetElementStyle, reload } = useElementStyles(pageName);
  const builder = useBuilderOptional();
  const { isEditMode } = useEditMode();
  const [currentViewport, setCurrentViewport] = useState<DetectedViewport>(detectViewport);
  const [overrides, setOverrides] = useState<OverrideMap>({});

  useEffect(() => {
    const handleResize = () => {
      const vp = detectViewport();
      setCurrentViewport(prev => prev !== vp ? vp : prev);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setLocalOverride = useCallback((elementId: string, viewport: string, styles: Record<string, string>) => {
    setOverrides(prev => ({
      ...prev,
      [`${elementId}::${viewport}`]: styles,
    }));
  }, []);

  const clearLocalOverride = useCallback((elementId: string, viewport: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[`${elementId}::${viewport}`];
      return next;
    });
  }, []);

  // Use builder viewport when in edit mode, otherwise auto-detect
  const builderViewport = builder?.viewport;
  const effectiveDefaultViewport: DetectedViewport = 
    isEditMode && builderViewport && builderViewport !== 'custom'
      ? builderViewport as DetectedViewport
      : currentViewport;

  // Wrap getElementStyle to auto-inject the detected viewport and merge local overrides
  const getElementStyle = useCallback(
    (elementId: string, viewport?: string): React.CSSProperties => {
      const effectiveViewport = viewport || effectiveDefaultViewport;
      const base = rawGetElementStyle(elementId, effectiveViewport);

      // Check for local overrides
      const overrideKey = `${elementId}::${effectiveViewport}`;
      const localOverride = overrides[overrideKey];
      if (!localOverride) {
        // Still auto-enable flex for alignment properties from DB
        const result = { ...base };
        if (!result.display && (result.alignItems || result.justifyContent)) {
          result.display = 'flex';
          if (!result.flexDirection) result.flexDirection = 'column';
        }
        return result;
      }

      return convertStylesToCSS(localOverride, base);
    },
    [rawGetElementStyle, effectiveDefaultViewport, overrides]
  );

  return (
    <ElementStylesContext.Provider value={{ getElementStyle, reload, setLocalOverride, clearLocalOverride }}>
      {children}
    </ElementStylesContext.Provider>
  );
};
