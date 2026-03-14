import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useBuilder } from '@/contexts/BuilderContext';
import { useElementStylesContext } from '@/hooks/useElementStylesContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEditMode } from '@/contexts/EditModeContext';

interface StyleValues {
  padding_top?: string;
  padding_right?: string;
  padding_bottom?: string;
  padding_left?: string;
  margin_top?: string;
  margin_right?: string;
  margin_bottom?: string;
  margin_left?: string;
  width?: string;
  max_width?: string;
  text_align?: string;
  background_color?: string;
  color?: string;
  border_width?: string;
  border_color?: string;
  border_style?: string;
  border_radius?: string;
  display?: string;
  flex_direction?: string;
  flex_wrap?: string;
  align_items?: string;
  justify_content?: string;
  gap?: string;
  grid_template_columns?: string;
  z_index?: string;
}

const SpacingControl = ({
  label,
  values,
  prefix,
  onChange,
}: {
  label: string;
  values: StyleValues;
  prefix: 'padding' | 'margin';
  onChange: (key: string, value: string) => void;
}) => (
  <div className="space-y-2">
    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">{label}</span>
    <div className="grid grid-cols-2 gap-1.5">
      {(['top', 'right', 'bottom', 'left'] as const).map(side => {
        const key = `${prefix}_${side}`;
        return (
          <div key={key} className="flex items-center gap-1">
            <span className="text-[9px] text-white/30 w-3 uppercase">{side[0]}</span>
            <Input
              value={values[key as keyof StyleValues] || ''}
              onChange={e => onChange(key, e.target.value)}
              placeholder="0"
              className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        );
      })}
    </div>
  </div>
);

export const StyleSettings = () => {
  const { selectedElement, viewport } = useBuilder();
  const stylesCtx = useElementStylesContext();
  const [styles, setStyles] = useState<StyleValues>({});
  const [loading, setLoading] = useState(false);
  const { markStructuralChange } = useEditMode();

  // Always save/load for the currently selected builder viewport
  const targetViewport = viewport === 'custom' ? 'desktop' : viewport;

  useEffect(() => {
    if (selectedElement) {
      loadStyles();
    }
  }, [selectedElement?.id, targetViewport]);

  const loadStyles = async () => {
    if (!selectedElement) return;
    setLoading(true);
    const { data } = await supabase
      .from('element_styles')
      .select('styles')
      .eq('page_name', selectedElement.pageName)
      .eq('element_id', selectedElement.id)
      .eq('viewport', targetViewport)
      .maybeSingle();

    if (data?.styles) {
      setStyles(data.styles as unknown as StyleValues);
    } else {
      setStyles({});
    }
    setLoading(false);
  };

  const saveStyles = useCallback(async (newStyles: StyleValues) => {
    if (!selectedElement) return;

    const { error } = await supabase
      .from('element_styles')
      .upsert({
        page_name: selectedElement.pageName,
        element_id: selectedElement.id,
        viewport: targetViewport,
        styles: newStyles as any,
      }, {
        onConflict: 'page_name,element_id,viewport'
      });

    if (error) {
      console.error('[StyleSettings] Save error:', error);
    } else {
      // Reload DB styles first, THEN clear the local override so there's no flicker
      await stylesCtx?.reload();
      stylesCtx?.clearLocalOverride?.(selectedElement.id, targetViewport);
    }
  }, [selectedElement, targetViewport, stylesCtx]);

  const handleChange = (key: string, value: string) => {
    const newStyles = { ...styles, [key]: value };
    setStyles(newStyles);
    if (selectedElement?.pageName) {
      markStructuralChange(selectedElement.pageName);
    }
    // Apply local override immediately for instant preview
    if (selectedElement && stylesCtx?.setLocalOverride) {
      stylesCtx.setLocalOverride(selectedElement.id, targetViewport, newStyles as Record<string, string>);
    }
    // Debounce save to DB
    clearTimeout((window as any).__styleDebounce);
    (window as any).__styleDebounce = setTimeout(() => saveStyles(newStyles), 500);
  };

  if (!selectedElement) {
    return (
      <div className="p-3 text-white/40 text-xs text-center py-8">
        Select an element to style it
      </div>
    );
  }

  if (loading) {
    return <div className="p-3 text-white/40 text-xs text-center py-4">Loading...</div>;
  }

  return (
    <div className="p-3 space-y-4">
      <div className="bg-primary/10 border border-primary/20 rounded-md p-2 text-[10px] text-primary">
        Editing styles for <strong>{targetViewport}</strong> viewport
      </div>

      {/* Spacing */}
      <SpacingControl label="Padding" values={styles} prefix="padding" onChange={handleChange} />
      <SpacingControl label="Margin" values={styles} prefix="margin" onChange={handleChange} />

      {/* Size */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Size</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Width</Label>
            <Input
              value={styles.width || ''}
              onChange={e => handleChange('width', e.target.value)}
              placeholder="auto"
              className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Max W</Label>
            <Input
              value={styles.max_width || ''}
              onChange={e => handleChange('max_width', e.target.value)}
              placeholder="none"
              className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* Alignment */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Alignment</span>
        <Select value={styles.text_align || ''} onValueChange={v => handleChange('text_align', v)}>
          <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="justify">Justify</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Colors</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">BG</Label>
            <div className="flex gap-1 flex-1">
              <input
                type="color"
                value={styles.background_color || '#ffffff'}
                onChange={e => handleChange('background_color', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-white/10"
              />
              <Input
                value={styles.background_color || ''}
                onChange={e => handleChange('background_color', e.target.value)}
                placeholder="transparent"
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20 flex-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Text</Label>
            <div className="flex gap-1 flex-1">
              <input
                type="color"
                value={styles.color || '#000000'}
                onChange={e => handleChange('color', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-white/10"
              />
              <Input
                value={styles.color || ''}
                onChange={e => handleChange('color', e.target.value)}
                placeholder="inherit"
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20 flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Border */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Border</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Width</Label>
            <Input
              value={styles.border_width || ''}
              onChange={e => handleChange('border_width', e.target.value)}
              placeholder="0"
              className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Style</Label>
            <Select value={styles.border_style || ''} onValueChange={v => handleChange('border_style', v)}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
                <SelectItem value="dotted">Dotted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Color</Label>
            <div className="flex gap-1 flex-1">
              <input
                type="color"
                value={styles.border_color || '#cccccc'}
                onChange={e => handleChange('border_color', e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-white/10"
              />
              <Input
                value={styles.border_color || ''}
                onChange={e => handleChange('border_color', e.target.value)}
                placeholder="#ccc"
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20 flex-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Radius</Label>
            <Input
              value={styles.border_radius || ''}
              onChange={e => handleChange('border_radius', e.target.value)}
              placeholder="0"
              className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Layout</span>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Display</Label>
            <Select value={styles.display || '__default__'} onValueChange={v => handleChange('display', v === '__default__' ? '' : v)}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Default</SelectItem>
                <SelectItem value="block">Block</SelectItem>
                <SelectItem value="flex">Flex</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="none">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(styles.display === 'flex') && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-white/50 w-16">Direction</Label>
                <Select value={styles.flex_direction || ''} onValueChange={v => handleChange('flex_direction', v)}>
                  <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="row">Row</SelectItem>
                    <SelectItem value="column">Column</SelectItem>
                    <SelectItem value="row-reverse">Row Reverse</SelectItem>
                    <SelectItem value="column-reverse">Column Reverse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-white/50 w-16">Wrap</Label>
                <Select value={styles.flex_wrap || ''} onValueChange={v => handleChange('flex_wrap', v)}>
                  <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="No wrap" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nowrap">No Wrap</SelectItem>
                    <SelectItem value="wrap">Wrap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {(styles.display === 'grid') && (
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-white/50 w-16">Columns</Label>
              <Input
                value={styles.grid_template_columns || ''}
                onChange={e => handleChange('grid_template_columns', e.target.value)}
                placeholder="1fr 1fr"
                className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Align</Label>
            <Select value={styles.align_items || ''} onValueChange={v => handleChange('align_items', v)}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flex-start">Start</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="flex-end">End</SelectItem>
                <SelectItem value="stretch">Stretch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Justify</Label>
            <Select value={styles.justify_content || ''} onValueChange={v => handleChange('justify_content', v)}>
              <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flex-start">Start</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="flex-end">End</SelectItem>
                <SelectItem value="space-between">Space Between</SelectItem>
                <SelectItem value="space-around">Space Around</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-white/50 w-16">Gap</Label>
            <Input
              value={styles.gap || ''}
              onChange={e => handleChange('gap', e.target.value)}
              placeholder="0"
              className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* Position / Z-Index */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Position</span>
        <div className="flex items-center gap-2">
          <Label className="text-[10px] text-white/50 w-16">Z-Index</Label>
          <Input
            value={styles.z_index || ''}
            onChange={e => handleChange('z_index', e.target.value)}
            placeholder="auto"
            className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/20"
          />
        </div>
      </div>
    </div>
  );
};
