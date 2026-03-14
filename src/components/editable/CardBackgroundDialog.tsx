import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Paintbrush, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CardBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentValue: string | null;
  currentBorder?: boolean;
  currentVerticalAlign?: 'top' | 'center';
  onSave: (value: string | null, showBorder?: boolean, verticalAlign?: 'top' | 'center') => void;
}

export const CardBackgroundDialog = ({
  open,
  onOpenChange,
  currentValue,
  currentBorder = false,
  currentVerticalAlign = 'top',
  onSave
}: CardBackgroundDialogProps) => {
  const [selectedColor, setSelectedColor] = useState(currentValue || 'default');
  const [showBorder, setShowBorder] = useState<boolean>(currentBorder);
  const [verticalAlign, setVerticalAlign] = useState<'top' | 'center'>(currentVerticalAlign);

  const { data: websiteStyles } = useQuery({
    queryKey: ['website-styles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_styles')
        .select('card_background_color, green_card_background_color, black_card_background_color, gray_card_background_color, gradient_start_color, gradient_end_color, transparent_card_text_color, transparent_card_title_color')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    // Map legacy 'none' to 'transparent'
    if (currentValue === 'none' || currentValue === 'transparent' || currentValue === null) {
      setSelectedColor('transparent');
    } else if (currentValue === 'card') {
      setSelectedColor('default');
    } else if (currentValue === 'gray') {
      setSelectedColor('gray');
    } else if (currentValue) {
      setSelectedColor(currentValue);
    } else {
      setSelectedColor('default');
    }
    setShowBorder(currentBorder);
    setVerticalAlign(currentVerticalAlign);
  }, [currentValue, currentBorder, currentVerticalAlign]);

  const colorOptions = [
    { 
      id: 'transparent', 
      label: 'Card 4 (Transparent)', 
      value: null,
      className: 'bg-transparent border-2 border-dashed border-border',
      style: { 
        color: websiteStyles?.transparent_card_text_color 
          ? `hsl(${websiteStyles.transparent_card_text_color})` 
          : 'hsl(0 0% 5%)'
      }
    },
    { 
      id: 'default', 
      label: 'Default (White)', 
      value: websiteStyles?.card_background_color || '0 0% 100%',
      className: 'bg-card text-card-foreground'
    },
    { 
      id: 'green', 
      label: 'Primary Brand', 
      value: websiteStyles?.green_card_background_color || '142 76% 36%',
      className: 'bg-[hsl(var(--green-card))] text-[hsl(var(--green-card-foreground))]'
    },
    { 
      id: 'black', 
      label: 'Black', 
      value: websiteStyles?.black_card_background_color || '0 0% 3.9%',
      className: 'bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))]'
    },
    { 
      id: 'gray', 
      label: 'Muted / Gray', 
      value: websiteStyles?.gray_card_background_color || '240 4.8% 95.9%',
      style: { backgroundColor: `hsl(${websiteStyles?.gray_card_background_color || '240 4.8% 95.9%'})`, color: 'hsl(0 0% 5%)' }
    },
    { 
      id: 'gradient', 
      label: 'Gradient', 
      value: websiteStyles?.gradient_start_color && websiteStyles?.gradient_end_color
        ? `linear-gradient(135deg, hsl(${websiteStyles.gradient_start_color}), hsl(${websiteStyles.gradient_end_color}))`
        : 'linear-gradient(135deg, hsl(142 76% 36%), hsl(220 70% 50%))',
      style: websiteStyles?.gradient_start_color && websiteStyles?.gradient_end_color
        ? { background: `linear-gradient(135deg, hsl(${websiteStyles.gradient_start_color}), hsl(${websiteStyles.gradient_end_color}))` }
        : { background: 'linear-gradient(135deg, hsl(142 76% 36%), hsl(220 70% 50%))' }
    }
  ];

  const handleSave = () => {
    const selected = colorOptions.find(opt => opt.id === selectedColor);
    if (selected) {
      let backgroundKey: string | null;

      if (selected.id === 'transparent') {
        backgroundKey = 'transparent';
      } else if (selected.id === 'default') {
        backgroundKey = 'card';
      } else if (selected.id === 'gradient') {
        backgroundKey = 'gradient';
      } else {
        backgroundKey = selected.id;
      }

      onSave(backgroundKey, showBorder, verticalAlign);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Card Background
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="colors" className="flex-1">
              <Paintbrush className="h-4 w-4 mr-2" />
              Colors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Background</Label>
              <div className="grid grid-cols-2 gap-3">
                {colorOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedColor(option.id)}
                    className={`
                      relative h-24 rounded-lg border-2 transition-all overflow-hidden
                      ${selectedColor === option.id ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
                      ${option.className || ''}
                    `}
                    style={option.style}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                        option.id === 'black' || option.id === 'gradient' 
                          ? 'bg-white/90 text-black' 
                          : option.id === 'transparent'
                            ? 'bg-black/80 text-white'
                            : option.id === 'gray'
                              ? 'bg-black/10 text-black'
                              : 'bg-black/10'
                      }`}>
                        {option.label}
                      </span>
                    </div>
                    {selectedColor === option.id && (
                      <div className="absolute top-2 right-2">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Sparkles className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 pt-4 border-t">
          <Checkbox 
            id="show-border" 
            checked={showBorder}
            onCheckedChange={(checked) => setShowBorder(checked as boolean)}
          />
          <Label htmlFor="show-border" className="text-sm cursor-pointer">
            Show border
          </Label>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <Label className="text-sm font-medium">Vertical Alignment</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={verticalAlign === 'top' ? 'default' : 'outline'}
              onClick={() => setVerticalAlign('top')}
              className="w-full"
            >
              Top
            </Button>
            <Button
              type="button"
              variant={verticalAlign === 'center' ? 'default' : 'outline'}
              onClick={() => setVerticalAlign('center')}
              className="w-full"
            >
              Center
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            Apply Background
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
