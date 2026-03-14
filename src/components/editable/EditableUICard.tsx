import { ReactNode, useState, useEffect } from 'react';
import { Card, CardProps } from '@/components/ui/card';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { CardBackgroundDialog } from './CardBackgroundDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { BC } from '@/components/builder/builderColors';

interface EditableUICardProps extends CardProps {
  children: ReactNode;
  cardId: string;
  pageName: string;
}

export const EditableUICard = ({ 
  children, 
  cardId, 
  pageName,
  className,
  variant,
  ...props 
}: EditableUICardProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backgroundKey, setBackgroundKey] = useState<string | null>(
    (variant as string) || null
  );
  const [showBorder, setShowBorder] = useState<boolean>(false);

  // Fetch website styles for gray, gradient, and transparent backgrounds
  const { data: websiteStyles } = useQuery({
    queryKey: ['website-styles-card'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_styles')
        .select('gray_card_background_color, gray_card_text_color, gradient_start_color, gradient_end_color, green_card_text_color, transparent_card_text_color, transparent_card_title_color')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Convert backgroundKey to proper variant and styles
  const getCardStyling = () => {
    let cardVariant: 'default' | 'green' | 'black' | 'borderless' | undefined;
    let customStyle: React.CSSProperties | undefined;

    switch (backgroundKey) {
      case 'none':
      case 'transparent':
        cardVariant = 'borderless';
        customStyle = { 
          background: 'transparent',
          color: websiteStyles?.transparent_card_text_color 
            ? `hsl(${websiteStyles.transparent_card_text_color})` 
            : 'hsl(var(--transparent-card-foreground))',
          '--card-title': websiteStyles?.transparent_card_title_color 
            ? `hsl(${websiteStyles.transparent_card_title_color})` 
            : 'hsl(var(--transparent-card-title))'
        } as React.CSSProperties;
        break;
      case 'card':
      case 'default':
        cardVariant = showBorder ? 'default' : 'borderless';
        break;
      case 'green':
        cardVariant = showBorder ? 'green' : 'borderless';
        customStyle = !showBorder ? { 
          backgroundColor: 'hsl(var(--green-card))', 
          color: 'hsl(var(--green-card-foreground))' 
        } : undefined;
        break;
      case 'black':
        cardVariant = showBorder ? 'black' : 'borderless';
        customStyle = !showBorder ? { 
          backgroundColor: 'hsl(var(--black-card))', 
          color: 'hsl(var(--black-card-foreground))' 
        } : undefined;
        break;
      case 'gray':
        cardVariant = showBorder ? 'default' : 'borderless';
        customStyle = {
          backgroundColor: websiteStyles?.gray_card_background_color 
            ? `hsl(${websiteStyles.gray_card_background_color})` 
            : 'hsl(var(--muted))',
          color: websiteStyles?.gray_card_text_color 
            ? `hsl(${websiteStyles.gray_card_text_color})` 
            : 'hsl(var(--foreground))'
        };
        break;
      case 'gradient':
        cardVariant = showBorder ? 'default' : 'borderless';
        customStyle = {
          background: websiteStyles?.gradient_start_color && websiteStyles?.gradient_end_color
            ? `linear-gradient(135deg, hsl(${websiteStyles.gradient_start_color}), hsl(${websiteStyles.gradient_end_color}))`
            : 'linear-gradient(135deg, hsl(var(--gradient-start)), hsl(var(--gradient-end)))',
          color: 'hsl(var(--green-card-foreground))'
        };
        break;
      default:
        cardVariant = showBorder ? 'default' : 'borderless';
    }

    return { cardVariant, customStyle };
  };

  const { cardVariant, customStyle } = getCardStyling();

  const handleSave = (value: string | null, border?: boolean) => {
    setShowBorder(border || false);
    setBackgroundKey(value);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isEditMode || !builder) return;
    e.stopPropagation();

    const elementId = `ui-card-${pageName}-${cardId}`;
    builder.selectElement({
      id: elementId,
      type: 'component',
      pageName,
      componentType: 'uiCard',
      label: `Card: ${cardId}`,
      actions: [
        {
          id: 'background',
          label: 'Change Background',
          tone: 'primary',
          onClick: () => setDialogOpen(true),
        },
      ],
    });
  };

  const isSelected = builder?.selectedElement?.id === `ui-card-${pageName}-${cardId}`;

  return (
    <>
      <div
        className="relative group"
        onClick={handleCardClick}
        style={isEditMode ? { cursor: 'pointer' } : undefined}
      >
        <Card 
          variant={cardVariant}
          className={cn(className)}
          style={{
            ...customStyle,
            ...(isEditMode && isSelected ? {
              outline: `2px solid ${BC.blue}`,
              outlineOffset: '2px',
            } : {}),
          }}
          {...props}
        >
          {children}
        </Card>
      </div>

      <CardBackgroundDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentValue={backgroundKey}
        currentBorder={showBorder}
        onSave={handleSave}
      />
    </>
  );
};
