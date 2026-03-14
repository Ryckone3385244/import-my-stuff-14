import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useBuilder } from '@/contexts/BuilderContext';
import { supabase } from '@/integrations/supabase/client';
import { Zap } from 'lucide-react';

export interface MotionConfig {
  effect_type: string;
  duration: number;
  delay: number;
  easing: string;
  trigger: 'load' | 'scroll' | 'hover';
  repeat: boolean;
}

const MOTION_PRESETS = [
  { value: 'none', label: 'None' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'fade-up', label: 'Fade Up' },
  { value: 'fade-down', label: 'Fade Down' },
  { value: 'fade-left', label: 'Fade Left' },
  { value: 'fade-right', label: 'Fade Right' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'flip-x', label: 'Flip X' },
  { value: 'flip-y', label: 'Flip Y' },
  { value: 'rotate', label: 'Rotate' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'shake', label: 'Shake' },
];

const EASING_OPTIONS = [
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'linear', label: 'Linear' },
  { value: 'spring', label: 'Spring' },
];

const defaultConfig: MotionConfig = {
  effect_type: 'none',
  duration: 0.5,
  delay: 0,
  easing: 'ease-out',
  trigger: 'scroll',
  repeat: false,
};

export const MotionSettings = () => {
  const { selectedElement } = useBuilder();
  const [config, setConfig] = useState<MotionConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedElement) loadMotion();
    else setConfig(defaultConfig);
  }, [selectedElement?.id]);

  const loadMotion = async () => {
    if (!selectedElement) return;
    setLoading(true);
    const { data } = await supabase
      .from('element_motion')
      .select('effect_type, effect_config')
      .eq('page_name', selectedElement.pageName)
      .eq('element_id', selectedElement.id)
      .maybeSingle();

    if (data) {
      setConfig({
        effect_type: data.effect_type,
        ...(data.effect_config as any),
      });
    } else {
      setConfig(defaultConfig);
    }
    setLoading(false);
  };

  const saveMotion = useCallback(async (newConfig: MotionConfig) => {
    if (!selectedElement) return;
    const { effect_type, ...rest } = newConfig;

    if (effect_type === 'none') {
      await supabase
        .from('element_motion')
        .delete()
        .eq('page_name', selectedElement.pageName)
        .eq('element_id', selectedElement.id);
      return;
    }

    await supabase
      .from('element_motion')
      .upsert({
        page_name: selectedElement.pageName,
        element_id: selectedElement.id,
        effect_type,
        effect_config: rest as any,
      }, {
        onConflict: 'page_name,element_id'
      });
  }, [selectedElement]);

  const handleChange = (key: keyof MotionConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    clearTimeout((window as any).__motionDebounce);
    (window as any).__motionDebounce = setTimeout(() => saveMotion(newConfig), 500);
  };

  if (!selectedElement) {
    return (
      <div className="p-3 text-white/40 text-xs text-center py-8">
        <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Select an element to add motion effects
      </div>
    );
  }

  if (loading) {
    return <div className="p-3 text-white/40 text-xs text-center py-4">Loading...</div>;
  }

  return (
    <div className="p-3 space-y-4">
      {/* Effect type */}
      <div className="space-y-1.5">
        <Label className="text-[10px] text-white/50 uppercase tracking-wider">Effect</Label>
        <Select value={config.effect_type} onValueChange={v => handleChange('effect_type', v)}>
          <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOTION_PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.effect_type !== 'none' && (
        <>
          {/* Trigger */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-white/50 uppercase tracking-wider">Trigger</Label>
            <Select value={config.trigger} onValueChange={v => handleChange('trigger', v)}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="load">On Page Load</SelectItem>
                <SelectItem value="scroll">On Scroll Into View</SelectItem>
                <SelectItem value="hover">On Hover</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] text-white/50 uppercase tracking-wider">Duration</Label>
              <span className="text-[10px] text-white/40">{config.duration}s</span>
            </div>
            <Slider
              value={[config.duration]}
              onValueChange={([v]) => handleChange('duration', v)}
              min={0.1}
              max={3}
              step={0.1}
              className="[&_[role=slider]]:bg-primary [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>

          {/* Delay */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] text-white/50 uppercase tracking-wider">Delay</Label>
              <span className="text-[10px] text-white/40">{config.delay}s</span>
            </div>
            <Slider
              value={[config.delay]}
              onValueChange={([v]) => handleChange('delay', v)}
              min={0}
              max={2}
              step={0.1}
              className="[&_[role=slider]]:bg-primary [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            />
          </div>

          {/* Easing */}
          <div className="space-y-1.5">
            <Label className="text-[10px] text-white/50 uppercase tracking-wider">Easing</Label>
            <Select value={config.easing} onValueChange={v => handleChange('easing', v)}>
              <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EASING_OPTIONS.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Repeat */}
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-white/50 uppercase tracking-wider">Repeat</Label>
            <Switch
              checked={config.repeat}
              onCheckedChange={v => handleChange('repeat', v)}
            />
          </div>
        </>
      )}
    </div>
  );
};
