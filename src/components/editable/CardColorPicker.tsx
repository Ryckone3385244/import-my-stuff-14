import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CardColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
}

interface WebsiteStyles {
  card_background_color: string;
  green_card_background_color: string;
  black_card_background_color: string;
  gray_card_background_color: string;
}

export const CardColorPicker = ({ currentColor, onColorChange }: CardColorPickerProps) => {
  const [styles, setStyles] = useState<WebsiteStyles | null>(null);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    const { data, error } = await supabase
      .from('website_styles')
      .select('card_background_color, green_card_background_color, black_card_background_color, gray_card_background_color')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching card colors:", error);
      return;
    }

    if (data) {
      setStyles(data);
    }
  };

  if (!styles) return null;

  const colorOptions = [
    { label: 'None (Default)', value: 'none', color: null },
    { label: 'Card Background', value: 'card', color: styles.card_background_color },
    { label: 'Card 1', value: 'green', color: styles.green_card_background_color },
    { label: 'Card 2', value: 'black', color: styles.black_card_background_color },
    { label: 'Card 3', value: 'gray', color: styles.gray_card_background_color },
  ];

  const getCurrentLabel = () => {
    const option = colorOptions.find(opt => opt.value === currentColor);
    return option?.label || 'Select Color';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-2 bg-gray-700 hover:bg-gray-600 text-white"
          title="Change card color for entire row"
        >
          <Palette className="w-4 h-4 mr-1" />
          {getCurrentLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {colorOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onColorChange(option.value)}
            className="flex items-center gap-2"
          >
            {option.color && (
              <div
                className="w-4 h-4 rounded border border-border"
                style={{ backgroundColor: `hsl(${option.color})` }}
              />
            )}
            <span className={currentColor === option.value ? 'font-semibold' : ''}>
              {option.label}
            </span>
            {currentColor === option.value && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
