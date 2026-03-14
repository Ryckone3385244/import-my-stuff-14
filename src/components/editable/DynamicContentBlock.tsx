import { ContentBlock } from '@/hooks/useDynamicContent';
import { EditableText } from './EditableText';
import { EditableImage } from './EditableImage';
import { EditableVideo } from './EditableVideo';
import { EditableIcon } from './EditableIcon';
import { BuilderContextMenu } from './BuilderContextMenu';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { StyledButton } from '@/components/ui/styled-button';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional, ClipboardItem } from '@/contexts/BuilderContext';
import { useElementStylesContext } from '@/hooks/useElementStylesContext';
import { pasteComponentToColumn } from '@/lib/clipboardOperations';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import { useEventSettingsContext } from '@/contexts/EventSettingsContext';
import { Trash2, ExternalLink, Plus, Pencil, Code } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';

const TheaterAgendaEmbed = lazy(() => import('@/components/TheaterAgendaEmbed'));
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoGalleryBlock } from './PhotoGalleryBlock';
import { ImageCarouselBlock } from './ImageCarouselBlock';
import { ToggleBlock } from './ToggleBlock';
import { PopupImageBlock } from './PopupImageBlock';
import { HoverOverlayImageCard } from './HoverOverlayImageCard';
import { ExhibitorCarouselBlock } from './blocks/ExhibitorCarouselBlock';
import { ExhibitorGridBlock } from './blocks/ExhibitorGridBlock';
import { SpeakerCarouselBlock } from './blocks/SpeakerCarouselBlock';
import { SpeakerGridBlock } from './blocks/SpeakerGridBlock';
import { RegisterFormBlock } from './blocks/RegisterFormBlock';
import { HeroBlock } from './blocks/HeroBlock';
import { EventCountdownBlock } from './blocks/EventCountdownBlock';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sanitizeHtml } from '@/lib/utils';
import { BC } from '@/components/builder/builderColors';

// Helper function to determine if an HSL color needs white text for readability
// HSL format expected: "H S% L%" e.g., "220 70% 15%"
const isDarkHslColor = (hslValue: string): boolean => {
  try {
    // Parse HSL value - format: "H S% L%" or "H, S%, L%"
    const parts = hslValue.replace(/,/g, ' ').split(/\s+/).filter(p => p);
    if (parts.length < 3) return false;
    
    // Extract saturation and lightness
    const saturation = parseFloat(parts[1].replace('%', ''));
    const lightness = parseFloat(parts[2].replace('%', ''));
    
    if (isNaN(lightness) || isNaN(saturation)) return false;
    
    // Dark colors (low lightness) always need white text
    if (lightness <= 45) return true;
    
    // Highly saturated colors with medium lightness also need white text for readability
    // The higher the saturation, the higher the lightness threshold
    if (saturation >= 70 && lightness <= 65) return true;
    if (saturation >= 50 && lightness <= 55) return true;
    
    return false;
  } catch {
    return false;
  }
};

interface DynamicContentBlockProps {
  block: ContentBlock;
  pageName: string;
  cardId: string;
  onUpdate: (blockId: string, content: string) => void;
  onDelete: (blockId: string) => void;
  onMove: (blockId: string, direction: 'up' | 'down') => void;
  onDuplicate?: (blockId: string) => void;
  isFirst: boolean;
  isLast: boolean;
  sectionBackground?: {
    type?: 'color' | 'image' | 'gradient' | 'none';
    value?: string | null;
  };
}

export const DynamicContentBlock = ({
  block,
  pageName,
  cardId,
  onUpdate,
  onDelete,
  onMove,
  onDuplicate,
  isFirst,
  isLast,
  sectionBackground,
}: DynamicContentBlockProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const stylesCtx = useElementStylesContext();
  const { replacePlaceholders } = useEventSettingsContext();
  const cache = usePageContentCacheOptional();
  const elementStyle = stylesCtx?.getElementStyle(block.id) || {};
  const [isEditingButton, setIsEditingButton] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [isEditingAccordion, setIsEditingAccordion] = useState(false);
  const [isEditingEmbed, setIsEditingEmbed] = useState(false);
  const [isEditingSectionTitle, setIsEditingSectionTitle] = useState(false);
  const [editingAccordionIndex, setEditingAccordionIndex] = useState<number | null>(null);
  const [textContent, setTextContent] = useState(block.type === 'text' ? block.content : '');
  const [embedCode, setEmbedCode] = useState(block.type === 'embed' ? block.content : '');
  const [buttonData, setButtonData] = useState(() => {
    if (block.type === 'button') {
      try {
        const parsed = JSON.parse(block.content);
        
        // If button styles are missing, resolve them from CSS variables (backward compatibility)
        if (!parsed.buttonColor || !parsed.buttonForeground) {
          const computed = getComputedStyle(document.documentElement);
          const prefix = parsed.styleType === 'button2' ? '--button-2' : '--button';
          
          const getVar = (suffix: string) => {
            const rawValue = computed.getPropertyValue(`${prefix}${suffix}`).trim();
            if (!rawValue || rawValue === 'undefined' || rawValue === 'null') return null;
            if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(rawValue)) return `hsl(${rawValue})`;
            return rawValue;
          };
          
          parsed.buttonColor = parsed.buttonColor || getVar('-color') || 'hsl(var(--primary))';
          parsed.buttonForeground = parsed.buttonForeground || getVar('-foreground') || 'hsl(var(--primary-foreground))';
          parsed.padding = parsed.padding || getVar('-padding');
          parsed.borderRadius = parsed.borderRadius || getVar('-border-radius');
          parsed.border = parsed.border || getVar('-border');
          parsed.fontSize = parsed.fontSize || getVar('-font-size');
          parsed.fontWeight = parsed.fontWeight || getVar('-font-weight');
          parsed.fontStyle = parsed.fontStyle || getVar('-font-style');
          parsed.textTransform = parsed.textTransform || getVar('-text-transform');
        }
        
        return parsed;
      } catch {
        return { 
          text: 'Click Me', 
          url: '', 
          target: '_self', 
          styleType: 'button1',
          buttonColor: 'hsl(var(--primary))',
          buttonForeground: 'hsl(var(--primary-foreground))'
        };
      }
    }
    return null;
  });
  const [accordionData, setAccordionData] = useState(() => {
    if (block.type === 'accordion') {
      try {
        const parsed = JSON.parse(block.content);
        // Ensure each item has default settings
        const items = (parsed.items || []).map((item: any, index: number) => ({
          id: item.id || `accordion-item-${Date.now()}-${index}`,
          title: item.title || '',
          content: item.content || '',
          defaultOpen: item.defaultOpen || false
        }));
        return { items };
      } catch {
        return { items: [] };
      }
    }
    return null;
  });
  const [sectionTitleData, setSectionTitleData] = useState(() => {
    if (block.type === 'sectionTitle') {
      try {
        return JSON.parse(block.content);
      } catch {
        return { text: 'Section Title', color: 'gradient', alignment: 'center' };
      }
    }
    return null;
  });

  // Update buttonData when block content changes
  useEffect(() => {
    if (block.type === 'button') {
      try {
        const parsed = JSON.parse(block.content);
        let needsMigration = false;
        
        // Check if migration is needed (missing colors or invalid color values)
        const isBareHsl = (value: string | undefined) =>
          !!value && /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(value.trim());

        const hasInvalidColor =
          !parsed.buttonColor ||
          parsed.buttonColor === '' ||
          parsed.buttonColor.includes('var(--') ||
          isBareHsl(parsed.buttonColor) ||
          !parsed.buttonForeground ||
          parsed.buttonForeground === '' ||
          parsed.buttonForeground.includes('var(--') ||
          isBareHsl(parsed.buttonForeground);
        
        if (hasInvalidColor || !parsed.styleType) {
          needsMigration = true;
          const computed = getComputedStyle(document.documentElement);
          const prefix = parsed.styleType === 'button2' ? '--button-2' : '--button';
          
          const getVar = (suffix: string) => {
            const rawValue = computed.getPropertyValue(`${prefix}${suffix}`).trim();
            if (!rawValue || rawValue === 'undefined' || rawValue === 'null') return null;
            // Ignore unresolved CSS variable chains like hsl(var(--primary)) and resolve inner var instead
            if (rawValue.includes('var(')) {
              const match = rawValue.match(/var\((--[^)]+)\)/);
              if (match) {
                const inner = computed.getPropertyValue(match[1]).trim();
                if (!inner || inner === 'undefined' || inner === 'null') return null;
                if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(inner)) return `hsl(${inner})`;
                return inner;
              }
              return null;
            }
            // If it's HSL values without hsl() wrapper, add it
            if (/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(rawValue)) return `hsl(${rawValue})`;
            return rawValue;
          };
          
          // Resolve actual color values from CSS variables
          const resolveColor = (cssVar: string, fallback: string) => {
            const computed = getComputedStyle(document.documentElement);
            const varName = cssVar.replace('var(', '').replace(')', '');
            const rawValue = computed.getPropertyValue(varName).trim();
            if (rawValue && /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(rawValue)) {
              return `hsl(${rawValue})`;
            }
            return rawValue || fallback;
          };
          
          parsed.styleType = parsed.styleType || 'button1';
          parsed.buttonColor = getVar('-color') || resolveColor('var(--primary)', '#000000');
          parsed.buttonForeground = getVar('-foreground') || resolveColor('var(--primary-foreground)', '#ffffff');
          parsed.padding = parsed.padding || getVar('-padding');
          parsed.borderRadius = parsed.borderRadius || getVar('-border-radius');
          parsed.border = parsed.border || getVar('-border');
          parsed.fontSize = parsed.fontSize || getVar('-font-size');
          parsed.fontWeight = parsed.fontWeight || getVar('-font-weight');
          parsed.fontStyle = parsed.fontStyle || getVar('-font-style');
          parsed.textTransform = parsed.textTransform || getVar('-text-transform');
        }
        
        setButtonData(parsed);
        
        // Persist migration immediately
        if (needsMigration) {
          onUpdate(block.id, JSON.stringify(parsed));
        }
      } catch {
        // For invalid JSON, create default button with resolved colors
        const computed = getComputedStyle(document.documentElement);
        const resolveColor = (cssVar: string, fallback: string) => {
          const varName = cssVar.replace('var(', '').replace(')', '');
          const rawValue = computed.getPropertyValue(varName).trim();
          if (rawValue && /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(rawValue)) {
            return `hsl(${rawValue})`;
          }
          return rawValue || fallback;
        };
        
        const defaultData = { 
          text: 'Click Me', 
          url: '', 
          target: '_self', 
          styleType: 'button1',
          buttonColor: resolveColor('var(--primary)', '#000000'),
          buttonForeground: resolveColor('var(--primary-foreground)', '#ffffff')
        };
        setButtonData(defaultData);
        // Persist default data
        onUpdate(block.id, JSON.stringify(defaultData));
      }
    }
  }, [block.content, block.type, block.id, onUpdate]);

  // Update textContent when block content changes
  useEffect(() => {
    if (block.type === 'text') {
      setTextContent(block.content);
    }
  }, [block.content, block.type]);

  // Update embedCode when block content changes
  useEffect(() => {
    if (block.type === 'embed') {
      setEmbedCode(block.content);
    }
  }, [block.content, block.type]);

  // Update accordionData when block content changes
  useEffect(() => {
    if (block.type === 'accordion') {
      try {
        const parsed = JSON.parse(block.content);
        // Ensure each item has default settings
        const items = (parsed.items || []).map((item: any, index: number) => ({
          id: item.id || `accordion-item-${Date.now()}-${index}`,
          title: item.title || '',
          content: item.content || '',
          defaultOpen: item.defaultOpen || false
        }));
        setAccordionData({ items });
      } catch {
        setAccordionData({ items: [] });
      }
    }
  }, [block.content, block.type]);

  // Update sectionTitleData when block content changes
  useEffect(() => {
    if (block.type === 'sectionTitle') {
      try {
        const parsed = JSON.parse(block.content);
        setSectionTitleData(parsed);
      } catch {
        setSectionTitleData({ text: 'Section Title', color: 'gradient', alignment: 'center' });
      }
    }
  }, [block.content, block.type]);

  const handleButtonSave = () => {
    onUpdate(block.id, JSON.stringify(buttonData));
    setIsEditingButton(false);
  };

  const handleTextSave = () => {
    onUpdate(block.id, textContent);
    setIsEditingText(false);
  };

  const handleEmbedSave = () => {
    if (!embedCode.trim()) {
      toast.error('Please enter an embed code or URL');
      return;
    }

    // Extract src from iframe if full iframe code is pasted
    let extractedSrc = embedCode.trim();
    const srcMatch = embedCode.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      extractedSrc = srcMatch[1];
    }

    onUpdate(block.id, extractedSrc);
    setIsEditingEmbed(false);
    toast.success('Embed code saved successfully');
  };

  const handleSectionTitleSave = () => {
    onUpdate(block.id, JSON.stringify(sectionTitleData));
    setIsEditingSectionTitle(false);
  };

  const renderContent = () => {
    switch (block.type) {
      case 'image':
        return (
          <EditableImage
            pageName={pageName}
            sectionName={cardId}
            contentKey={block.id}
            defaultSrc={block.content}
            alt="Content image"
            className="w-full h-auto rounded-lg"
            disableBuilderSelect
          />
        );
      
      case 'text':
        return (
          <div
            className="text-foreground prose prose-sm max-w-none [&_h1]:text-[length:var(--h1-size,2.25rem)] [&_h2]:text-[length:var(--h2-size,1.875rem)] [&_h3]:text-[length:var(--h3-size,1.5rem)] prose-strong:font-bold"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(replacePlaceholders(block.content)) }}
          />
        );
      
      case 'title':
        return (
          <EditableText
            pageName={pageName}
            sectionName={cardId}
            contentKey={block.id}
            defaultValue={block.content}
            className="text-2xl font-bold"
            as="h3"
          />
        );
      
      case 'button':
        const currentButtonData = (() => {
          try {
            return JSON.parse(block.content);
          } catch {
            return { 
              text: 'Click Me', 
              url: '', 
              target: '_self', 
              fileUrl: '', 
              styleType: 'button1',
              buttonColor: 'hsl(var(--primary))',
              buttonForeground: 'hsl(var(--primary-foreground))'
            };
          }
        })();
        
        
        // Render button using StyledButton with all per-block styles
        console.log('Rendering button', block.id, 'colors:', currentButtonData.buttonColor, currentButtonData.buttonForeground);
        
        const buttonAlignmentClass = currentButtonData.alignment === 'center' 
          ? 'flex justify-center' 
          : currentButtonData.alignment === 'right' 
            ? 'flex justify-end' 
            : 'flex justify-start';

        if (!isEditMode && currentButtonData.url) {
          return (
            <div className={buttonAlignmentClass}>
              <StyledButton
                asChild
                styleType={currentButtonData.styleType || 'button1'}
                buttonColor={currentButtonData.buttonColor}
                buttonForeground={currentButtonData.buttonForeground}
                padding={currentButtonData.padding}
                borderRadius={currentButtonData.borderRadius}
                border={currentButtonData.border}
                fontSize={currentButtonData.fontSize}
                fontWeight={currentButtonData.fontWeight}
                fontStyle={currentButtonData.fontStyle}
                textTransform={currentButtonData.textTransform}
                className="w-auto inline-flex"
              >
                <a 
                  href={currentButtonData.url} 
                  target={currentButtonData.target}
                  rel={currentButtonData.target === '_blank' ? 'noopener noreferrer' : undefined}
                >
                  {currentButtonData.text}
                  {currentButtonData.target === '_blank' && (
                    <ExternalLink className="w-4 h-4 ml-2" />
                  )}
                </a>
              </StyledButton>
            </div>
          );
        }
        
        return (
          <div className={buttonAlignmentClass}>
            <StyledButton
              styleType={currentButtonData.styleType || 'button1'}
              buttonColor={currentButtonData.buttonColor}
              buttonForeground={currentButtonData.buttonForeground}
              padding={currentButtonData.padding}
              borderRadius={currentButtonData.borderRadius}
              border={currentButtonData.border}
              fontSize={currentButtonData.fontSize}
              fontWeight={currentButtonData.fontWeight}
              fontStyle={currentButtonData.fontStyle}
              textTransform={currentButtonData.textTransform}
              className="w-auto inline-flex" 
              onClick={undefined}
            >
              {currentButtonData.text}
              {currentButtonData.target === '_blank' && (
                <ExternalLink className="w-4 h-4 ml-2" />
              )}
            </StyledButton>
          </div>
        );
      
      
      case 'video':
        return (
          <EditableVideo
            pageName={pageName}
            sectionName={cardId}
            contentKey={block.id}
            defaultSrc={block.content}
            className="w-full rounded-lg"
          />
        );
      
      case 'icon-with-text':
        const iconTextData = (() => {
          try {
            return JSON.parse(block.content);
          } catch {
            return { icon: 'CheckCircle', text: 'Your text here' };
          }
        })();
        
        return (
          <div className="flex items-start gap-3">
            <EditableIcon
              pageName={pageName}
              sectionName={cardId}
              contentKey={`${block.id}-icon`}
              defaultIcon={iconTextData.icon}
              className="w-6 h-6 text-primary mt-1 flex-shrink-0"
            />
            <EditableText
              pageName={pageName}
              sectionName={cardId}
              contentKey={`${block.id}-text`}
              defaultValue={iconTextData.text}
              className="text-foreground"
              as="span"
            />
          </div>
        );
      
      case 'photo-gallery':
        const galleryData = (() => {
          try {
            const parsed = JSON.parse(block.content);
            if (Array.isArray(parsed)) {
              return { images: parsed, config: { desktop: 3, tablet: 2, mobile: 2, aspectRatio: 'square' as const, objectFit: 'cover' as const } };
            }
            return { 
              images: parsed.images || [], 
              config: parsed.config || { desktop: 3, tablet: 2, mobile: 2, aspectRatio: 'square' as const, objectFit: 'cover' as const } 
            };
          } catch {
            return { images: [], config: { desktop: 3, tablet: 2, mobile: 2, aspectRatio: 'square' as const, objectFit: 'cover' as const } };
          }
        })();
        
        return (
          <PhotoGalleryBlock
            images={galleryData.images}
            config={galleryData.config}
            onUpdate={(images) => {
              const newData = { images, config: galleryData.config };
              onUpdate(block.id, JSON.stringify(newData));
            }}
            onConfigUpdate={(config) => {
              const newData = { images: galleryData.images, config };
              onUpdate(block.id, JSON.stringify(newData));
            }}
          />
        );
      
      case 'image-carousel':
        const carouselData = (() => {
          try {
            const parsed = JSON.parse(block.content);
            if (Array.isArray(parsed)) {
              return { images: parsed, config: { desktop: 3, tablet: 2, mobile: 1, aspectRatio: '16:9' as const, objectFit: 'cover' as const, showArrows: true, showPagination: true } };
            }
            return { 
              images: parsed.images || [], 
              config: parsed.config || { desktop: 3, tablet: 2, mobile: 1, aspectRatio: '16:9' as const, objectFit: 'cover' as const, showArrows: true, showPagination: true } 
            };
          } catch {
            return { images: [], config: { desktop: 3, tablet: 2, mobile: 1, aspectRatio: '16:9' as const, objectFit: 'cover' as const, showArrows: true, showPagination: true } };
          }
        })();
        
        return (
          <ImageCarouselBlock
            images={carouselData.images}
            config={carouselData.config}
            onUpdate={(images) => {
              const newData = { images, config: carouselData.config };
              onUpdate(block.id, JSON.stringify(newData));
            }}
            onConfigUpdate={(config) => {
              const newData = { images: carouselData.images, config };
              onUpdate(block.id, JSON.stringify(newData));
            }}
          />
        );
      
      case 'accordion':
        const currentAccordionData = accordionData || { items: [] };
        
        
        return (
          <div className="space-y-2">
            {currentAccordionData.items.map((item: { id: string; title: string; content: string; defaultOpen?: boolean }, index: number) => (
              <div key={item.id} className="relative group">
                <ToggleBlock
                  title={item.title}
                  content={item.content}
                  defaultOpen={item.defaultOpen || false}
                />
                {isEditMode && (
                  <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 bg-background/90 hover:bg-background"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAccordionIndex(index);
                        setIsEditingAccordion(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 bg-background/90 hover:bg-background text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newItems = currentAccordionData.items.filter((_: any, i: number) => i !== index);
                        onUpdate(block.id, JSON.stringify({ items: newItems }));
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      
      case 'embed':
        return (
          <div>
            {block.content ? (
              <iframe
                src={block.content}
                width="100%"
                height="600px"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                className="w-full"
              />
            ) : (
              <div className="flex items-center justify-center bg-muted text-muted-foreground" style={{ minHeight: '600px' }}>
                <div className="text-center">
                  <Code className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No embed code set</p>
                  <p className="text-xs mt-1">Click to select, then use the settings panel to edit</p>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'sectionTitle':
        const currentSectionTitleData = (() => {
          try {
            return JSON.parse(block.content);
          } catch {
            return { text: 'Section Title', color: 'gradient', alignment: 'center' };
          }
        })();


        if (!currentSectionTitleData.text || !currentSectionTitleData.text.trim()) {
          return null;
        }

        const alignmentClass = currentSectionTitleData.alignment === 'left' ? 'text-left' : 'text-center';
        
        // Determine title color based on section background following the design system
        // Dark backgrounds (black, gradient, dark image) should use white/light text
        // Light backgrounds (card, gray, green, none) should use gradient title
        let colorClass = 'text-gradient-title';
        
        // Check if user explicitly set a color (not auto)
        if (currentSectionTitleData.color === 'white') {
          colorClass = 'text-white';
        } else if (currentSectionTitleData.color === 'black') {
          colorClass = 'text-black';
        } else if (currentSectionTitleData.color === 'gradient') {
          colorClass = 'text-gradient-title';
        } else {
          // Auto-detect based on section background (for 'auto' or no color set)
          const bgType = sectionBackground?.type;
          const bgValue = sectionBackground?.value;
          
          // Check if section has a dark background
          const isDarkBackground = 
            bgType === 'gradient' || // Gradients typically use brand colors which are dark
            (bgType === 'color' && bgValue && isDarkHslColor(bgValue)) ||
            (bgType === 'image' && bgValue); // Images often need white text for readability
          
          if (isDarkBackground) {
            colorClass = 'text-white';
          }
        }

        return (
          <h2 
            className={`text-4xl md:text-5xl font-bold mb-4 ${colorClass} ${alignmentClass}`}
          >
            {currentSectionTitleData.text}
          </h2>
        );

      case 'popupImage':
        return (
          <PopupImageBlock
            blockId={block.id}
            content={block.content}
            onUpdate={onUpdate}
          />
        );

      case 'hover-overlay-card':
        return (
          <HoverOverlayImageCard
            pageName={pageName}
            sectionName={cardId}
            cardId={block.id}
            defaultImageSrc="/placeholder.svg"
            imageAlt="Hover overlay card"
          />
        );

      case 'countdown': {
        const countdownData = (() => {
          try {
            return JSON.parse(block.content);
          } catch {
            return { value: '10,000+', label: 'Visitors' };
          }
        })();

        if (isEditMode) {
          return (
            <div className="text-center space-y-2">
              <input
                type="text"
                value={countdownData.value}
                onChange={(e) => {
                  const updated = { ...countdownData, value: e.target.value };
                  onUpdate(block.id, JSON.stringify(updated));
                }}
                className="text-4xl font-bold text-center w-full bg-transparent border-b border-dashed border-muted-foreground/30 focus:outline-none focus:border-primary"
                style={{ color: 'inherit' }}
                placeholder="10,000+"
              />
              <textarea
                value={countdownData.label}
                onChange={(e) => {
                  const updated = { ...countdownData, label: e.target.value };
                  onUpdate(block.id, JSON.stringify(updated));
                }}
                className="text-sm text-center w-full bg-transparent border-b border-dashed border-muted-foreground/30 focus:outline-none focus:border-primary resize-none"
                style={{ color: 'inherit' }}
                placeholder="Label"
                rows={2}
              />
            </div>
          );
        }

        return (
          <div className="text-center space-y-1">
            <AnimatedCounter
              value={countdownData.value}
              className="text-4xl font-bold"
            />
            <span
              className="text-sm opacity-80 whitespace-pre-line block"
              style={{ color: 'inherit' }}
            >
              {countdownData.label}
            </span>
          </div>
        );
      }

      case 'theater-agenda': {
        const theaterData = (() => {
          try {
            return JSON.parse(block.content);
          } catch {
            return { theaterName: 'Main Stage', showFullAgendaLink: true };
          }
        })();

        if (isEditMode) {
          return (
            <div className="space-y-4">
              <div className="space-y-2 p-4 border rounded-lg bg-background">
                <div>
                  <Label>Theater / Venue Name</Label>
                  <Input
                    value={theaterData.theaterName || ''}
                    onChange={(e) => {
                      const updated = { ...theaterData, theaterName: e.target.value };
                      onUpdate(block.id, JSON.stringify(updated));
                    }}
                    placeholder="e.g. Main Stage, Theater 1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={theaterData.showFullAgendaLink !== false}
                    onChange={(e) => {
                      const updated = { ...theaterData, showFullAgendaLink: e.target.checked };
                      onUpdate(block.id, JSON.stringify(updated));
                    }}
                  />
                  <Label>Show "View Full Agenda" link</Label>
                </div>
              </div>
              <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading agenda preview...</div>}>
                <TheaterAgendaEmbed
                  theaterName={theaterData.theaterName || 'Main Stage'}
                  showFullAgendaLink={theaterData.showFullAgendaLink !== false}
                />
              </Suspense>
            </div>
          );
        }

        return (
          <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading agenda...</div>}>
            <TheaterAgendaEmbed
              theaterName={theaterData.theaterName || 'Main Stage'}
              showFullAgendaLink={theaterData.showFullAgendaLink !== false}
            />
          </Suspense>
        );
      }

      case 'exhibitor-carousel': {
        const ecConfig = (() => { try { return JSON.parse(block.content); } catch { return {}; } })();
        return <ExhibitorCarouselBlock config={ecConfig} />;
      }

      case 'exhibitor-grid': {
        const egConfig = (() => { try { return JSON.parse(block.content); } catch { return {}; } })();
        return <ExhibitorGridBlock config={egConfig} />;
      }

      case 'speaker-carousel': {
        const scConfig = (() => { try { return JSON.parse(block.content); } catch { return {}; } })();
        return <SpeakerCarouselBlock config={scConfig} />;
      }

      case 'speaker-grid': {
        const sgConfig = (() => { try { return JSON.parse(block.content); } catch { return {}; } })();
        return <SpeakerGridBlock config={sgConfig} />;
      }

      case 'register-form': {
        const rfConfig = (() => { try { return JSON.parse(block.content); } catch { return {}; } })();
        return <RegisterFormBlock config={rfConfig} />;
      }

      case 'hero': {
        const heroConfig = (() => { try { return JSON.parse(block.content); } catch { return {}; } })();
        return <HeroBlock pageName={pageName} cardId={cardId} config={heroConfig} />;
      }

      case 'event-countdown': {
        return <EventCountdownBlock />;
      }

      default:
        return null;
    }
  };

  const isSelected =
    builder?.selectedElement?.type === 'component' &&
    builder.selectedElement.id === block.id &&
    builder.selectedElement.columnId === cardId;

  const selectComponent = (event: any) => {
    event.stopPropagation();
    if (!isEditMode || !builder) return;

    // Build content data and handlers for the settings panel
    let contentData: Record<string, any> | undefined;
    let onContentUpdate: ((data: any) => void) | undefined;
    let onContentSave: ((data: any) => void) | undefined;

    switch (block.type) {
      case 'button':
        contentData = buttonData || {};
        onContentUpdate = (data) => setButtonData(data);
        onContentSave = (data) => {
          setButtonData(data);
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      case 'text':
        contentData = { content: textContent };
        onContentUpdate = (data) => setTextContent(data.content);
        onContentSave = (data) => {
          setTextContent(data.content);
          onUpdate(block.id, data.content);
        };
        break;
      case 'embed':
        contentData = { code: embedCode };
        onContentUpdate = (data) => setEmbedCode(data.code);
        onContentSave = (data) => {
          let extractedSrc = (data.code || '').trim();
          const srcMatch = extractedSrc.match(/src=["']([^"']+)["']/);
          if (srcMatch) extractedSrc = srcMatch[1];
          setEmbedCode(extractedSrc);
          onUpdate(block.id, extractedSrc);
          toast.success('Embed saved');
        };
        break;
      case 'sectionTitle':
        contentData = sectionTitleData || {};
        onContentUpdate = (data) => setSectionTitleData(data);
        onContentSave = (data) => {
          setSectionTitleData(data);
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      case 'accordion':
        contentData = accordionData || { items: [] };
        onContentUpdate = (data) => setAccordionData(data);
        onContentSave = (data) => {
          setAccordionData(data);
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      case 'image':
        contentData = { src: block.content, pageName, sectionName: cardId, contentKey: block.id };
        onContentSave = (data) => {
          if (data.src) {
            onUpdate(block.id, data.src);
          }
        };
        break;
      case 'video':
        contentData = { src: block.content, pageName, sectionName: cardId, contentKey: block.id };
        onContentSave = (data) => {
          if (data.src) onUpdate(block.id, data.src);
        };
        break;
      case 'title':
        contentData = { text: block.content };
        onContentUpdate = (data) => {};
        onContentSave = (data) => {
          onUpdate(block.id, data.text);
        };
        break;
      case 'icon-with-text': {
        const iconData = (() => { try { return JSON.parse(block.content); } catch { return { icon: 'CheckCircle', text: 'Your text here' }; } })();
        contentData = iconData;
        onContentUpdate = () => {};
        onContentSave = (data) => {
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      }
      case 'photo-gallery': {
        const pgData = (() => { try { const p = JSON.parse(block.content); return Array.isArray(p) ? { images: p, config: { desktop: 3, tablet: 2, mobile: 2, aspectRatio: 'square', objectFit: 'cover' } } : { images: p.images || [], config: p.config || { desktop: 3, tablet: 2, mobile: 2, aspectRatio: 'square', objectFit: 'cover' } }; } catch { return { images: [], config: { desktop: 3, tablet: 2, mobile: 2, aspectRatio: 'square', objectFit: 'cover' } }; } })();
        contentData = pgData;
        onContentSave = (data) => {
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      }
      case 'image-carousel': {
        const icData = (() => { try { const p = JSON.parse(block.content); return Array.isArray(p) ? { images: p, config: { desktop: 3, tablet: 2, mobile: 1, aspectRatio: '16:9', objectFit: 'cover', showArrows: true, showPagination: true } } : { images: p.images || [], config: p.config || { desktop: 3, tablet: 2, mobile: 1, aspectRatio: '16:9', objectFit: 'cover', showArrows: true, showPagination: true } }; } catch { return { images: [], config: { desktop: 3, tablet: 2, mobile: 1, aspectRatio: '16:9', objectFit: 'cover', showArrows: true, showPagination: true } }; } })();
        contentData = icData;
        onContentSave = (data) => {
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      }
      case 'countdown': {
        const cdData = (() => { try { return JSON.parse(block.content); } catch { return { value: '10,000+', label: 'Visitors' }; } })();
        contentData = cdData;
        onContentUpdate = () => {};
        onContentSave = (data) => {
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      }
      case 'theater-agenda': {
        const taData = (() => { try { return JSON.parse(block.content); } catch { return { theaterName: 'Main Stage', showFullAgendaLink: true }; } })();
        contentData = taData;
        onContentUpdate = () => {};
        onContentSave = (data) => {
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      }
      case 'exhibitor-carousel':
      case 'exhibitor-grid':
      case 'speaker-carousel':
      case 'speaker-grid':
      case 'register-form':
      case 'hero': {
        const cfgData = (() => { try { return JSON.parse(block.content); } catch { return {}; } })();
        contentData = cfgData;
        onContentUpdate = () => {};
        onContentSave = (data) => {
          onUpdate(block.id, JSON.stringify(data));
        };
        break;
      }
      case 'popupImage': {
        contentData = { content: block.content, blockId: block.id };
        onContentSave = (data) => {
          onUpdate(block.id, data.content || block.content);
        };
        break;
      }
      case 'hover-overlay-card':
      case 'event-countdown':
      case 'toggle':
        // These have no JSON config or use inline editing
        contentData = {};
        break;
    }

    // Non-content actions (move, duplicate, delete)
    const navActions = [
      ...(!isFirst ? [{ id: 'move-up', label: 'Move component up', onClick: () => onMove(block.id, 'up') }] : []),
      ...(!isLast ? [{ id: 'move-down', label: 'Move component down', onClick: () => onMove(block.id, 'down') }] : []),
      ...(onDuplicate ? [{ id: 'duplicate', label: 'Duplicate component', onClick: () => onDuplicate(block.id) }] : []),
      {
        id: 'delete',
        label: 'Delete component',
        tone: 'danger' as const,
        onClick: () => {
          if (window.confirm('Delete this content block?')) {
            onDelete(block.id);
          }
        }
      }
    ];

    builder.selectElement({
      id: block.id,
      type: 'component',
      pageName,
      sectionId: cardId.split('-card-')[0] || cardId,
      columnId: cardId,
      componentType: block.type,
      label: `Component: ${block.type}`,
      contentData,
      onContentUpdate,
      onContentSave,
      actions: navActions,
    });
  };

  const handlePaste = async (clipboard: ClipboardItem) => {
    if (clipboard.type === 'component' && clipboard.sourceContentKey) {
      // sourceColumnId may be a full cardId (e.g. "section-card-0") or just a column id.
      // pasteComponentToColumn expects a ready-to-use cardId for the source, so pass it directly.
      const sourceCardId = clipboard.sourceColumnId?.includes('-')
        ? clipboard.sourceColumnId
        : `${clipboard.sourceSectionId}-${clipboard.sourceColumnId || 'card-0'}`;
      const success = await pasteComponentToColumn(
        { pageName: clipboard.sourcePageName, cardId: sourceCardId, contentKey: clipboard.sourceContentKey },
        { pageName, cardId }
      );
      if (success && cache) await cache.refreshPage();
    }
  };

  // Extract width from elementStyle and apply flex-based sizing like columns
  const { width: elWidth, ...elementStyleWithoutWidth } = (elementStyle || {}) as Record<string, any>;
  
  const normalizedWidth = elWidth
    ? (() => {
        const cleaned = String(elWidth).trim().replace(/\s+/g, '');
        return /^\d+$/.test(cleaned) ? `${cleaned}%` : cleaned;
      })()
    : null;

  const isFullWidth = normalizedWidth === '100%';
  // Account for parent gap (1rem = 16px) so e.g. two 50% items fit side-by-side
  const gapAdjustedWidth = normalizedWidth && !isFullWidth
    ? `calc(${normalizedWidth} - 0.5rem)`
    : normalizedWidth;
  const widthStyle: React.CSSProperties = normalizedWidth
    ? isFullWidth
      ? { flex: '0 0 100%', width: '100%', minWidth: 0 }
      : { flex: `0 1 ${gapAdjustedWidth}`, maxWidth: gapAdjustedWidth, minWidth: 0 }
    : { flex: '0 0 100%', width: '100%', minWidth: 0 };

  return (
    <BuilderContextMenu
      elementType="component"
      clipboardData={{
        sourcePageName: pageName,
        sourceSectionId: cardId.split('-card-')[0] || cardId,
        sourceColumnId: cardId,
        sourceContentKey: block.id,
        componentType: block.type,
      }}
      onPaste={handlePaste}
      onDuplicate={onDuplicate ? () => onDuplicate(block.id) : undefined}
      onDelete={() => {
        if (window.confirm('Delete this content block?')) {
          onDelete(block.id);
        }
      }}
      onMoveUp={!isFirst ? () => onMove(block.id, 'up') : undefined}
      onMoveDown={!isLast ? () => onMove(block.id, 'down') : undefined}
      isFirst={isFirst}
      isLast={isLast}
      label={`Component: ${block.type}`}
      wrapperStyle={widthStyle}
    >
      <div className="relative" onClick={selectComponent}>
        <div
          className={isEditMode ? 'p-2 rounded transition-colors' : ''}
          style={isEditMode ? {
            ...elementStyleWithoutWidth,
            border: isSelected ? `2px solid ${BC.blue}` : `2px dashed ${BC.borderHover}`,
            boxShadow: isSelected ? `0 0 0 2px ${BC.blueBorder}` : 'none',
          } : elementStyleWithoutWidth}
        >
          {renderContent()}
        </div>
      </div>
    </BuilderContextMenu>
  );
};
