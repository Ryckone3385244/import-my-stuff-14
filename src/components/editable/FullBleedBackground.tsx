import { ReactNode, CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FullBleedBackgroundProps {
  children: ReactNode;
  backgroundType?: 'color' | 'image' | 'gradient' | 'none';
  backgroundValue?: string | null;
  overlayOpacity?: number;
  className?: string;
}

// Map preset references to website_styles column names
const PRESET_MAP: Record<string, string> = {
  'preset:card': 'card_background_color',
  'preset:card1': 'green_card_background_color',
  'preset:card2': 'black_card_background_color',
  'preset:card3': 'gray_card_background_color',
};

// Default fallback values for presets
const PRESET_FALLBACKS: Record<string, string> = {
  'preset:card': '0 0% 100%',
  'preset:card1': '142 76% 36%',
  'preset:card2': '0 0% 3.9%',
  'preset:card3': '240 4.8% 95.9%',
};

/**
 * A wrapper component that renders full-bleed (edge-to-edge) backgrounds
 * while keeping content properly contained. Uses the negative margin technique
 * to break out of centered containers without causing horizontal overflow.
 * 
 * Supports preset references (e.g., 'preset:card1') that automatically resolve
 * to current Design System colors from website_styles.
 */
export const FullBleedBackground = ({
  children,
  backgroundType = 'none',
  backgroundValue = null,
  overlayOpacity = 0,
  className = '',
}: FullBleedBackgroundProps) => {
  // Fetch website styles for resolving preset references
  const { data: websiteStyles } = useQuery({
    queryKey: ['website-styles-background'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_styles')
        .select('card_background_color, green_card_background_color, black_card_background_color, gray_card_background_color, gradient_start_color, gradient_end_color, gradient_angle')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const hasBackground = backgroundType !== 'none' && backgroundValue;

  if (!hasBackground) {
    return <>{children}</>;
  }

  // Resolve preset references to actual color values
  const resolvePreset = (value: string): string => {
    if (value.startsWith('preset:')) {
      if (value === 'preset:gradient') {
        // Return gradient CSS
        const startColor = websiteStyles?.gradient_start_color || '142 76% 36%';
        const endColor = websiteStyles?.gradient_end_color || '220 70% 50%';
        const angle = websiteStyles?.gradient_angle || '135deg';
        return `linear-gradient(${angle}, hsl(${startColor}), hsl(${endColor}))`;
      }
      
      const column = PRESET_MAP[value];
      if (column && websiteStyles) {
        return (websiteStyles as Record<string, string>)[column] || PRESET_FALLBACKS[value] || value;
      }
      return PRESET_FALLBACKS[value] || value;
    }
    return value;
  };

  const getBackgroundStyle = (): CSSProperties => {
    if (!backgroundValue) return {};
    
    const resolvedValue = resolvePreset(backgroundValue);
    
    if (backgroundType === 'color') {
      // Check if it's a preset that was resolved to HSL
      if (backgroundValue.startsWith('preset:') && backgroundValue !== 'preset:gradient') {
        return { backgroundColor: `hsl(${resolvedValue})` };
      }
      // Legacy: raw HSL value
      return { backgroundColor: `hsl(${resolvedValue})` };
    } else if (backgroundType === 'gradient') {
      // For gradient presets, resolvedValue is already the full CSS gradient
      if (backgroundValue.startsWith('preset:gradient')) {
        return { background: resolvedValue };
      }
      // Legacy: raw gradient value
      return { background: resolvedValue };
    } else if (backgroundType === 'image') {
      // Parse backgroundValue for overlay - format: "url|opacity" or just "url"
      const [imageUrl, opacityStr] = backgroundValue.split('|');
      const parsedOpacity = opacityStr ? parseFloat(opacityStr) : overlayOpacity;
      
      return {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        '--overlay-opacity': parsedOpacity,
      } as CSSProperties;
    }
    return {};
  };

  // Check if we need overlay for image backgrounds
  const isImageWithOverlay = backgroundType === 'image' && backgroundValue;
  const [, opacityStr] = (backgroundValue || '').split('|');
  const parsedOpacity = opacityStr ? parseFloat(opacityStr) : overlayOpacity;
  const showOverlay = isImageWithOverlay && parsedOpacity > 0;

  return (
    <div
      className={`relative w-[100vw] left-1/2 -ml-[50vw] overflow-x-clip ${className}`}
      style={getBackgroundStyle()}
    >
      {/* Black overlay for image backgrounds */}
      {showOverlay && (
        <div 
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: parsedOpacity }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
