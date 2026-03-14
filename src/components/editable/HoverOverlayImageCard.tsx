import { useState, useEffect } from 'react';
import { EditableImage } from './EditableImage';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { useEventSettingsContext } from '@/contexts/EventSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import DOMPurify from 'dompurify';
import { BC } from '@/components/builder/builderColors';

// Helper to read a CSS variable and normalize HSL triplets to valid CSS
const readCssColorVar = (varName: string): string | null => {
  if (typeof window === 'undefined') return null;

  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return null;

  // Already a concrete CSS color
  if (raw.startsWith('#') || raw.startsWith('rgb') || raw.startsWith('hsl')) return raw;

  // Likely an HSL triplet like: "249 73% 58%" (or with commas)
  const parts = raw.replace(/,/g, ' ').split(/\s+/).filter(Boolean).slice(0, 3);
  if (parts.length < 3) return null;

  // Convert to comma-separated HSL for maximum compatibility
  return `hsl(${parts.join(', ')})`;
};

// Read Card 1 (green-card) colors from the design system
const readCard1Colors = () => ({
  background: readCssColorVar('--green-card'),
  text: readCssColorVar('--green-card-foreground'),
  title: readCssColorVar('--green-card-title'),
});

interface HoverOverlayImageCardProps {
  pageName: string;
  sectionName: string;
  cardId: string;
  defaultImageSrc?: string;
  imageAlt?: string;
  className?: string;
}

export const HoverOverlayImageCard = ({
  pageName,
  sectionName,
  cardId,
  defaultImageSrc = '/placeholder.svg',
  imageAlt = 'Card image',
  className = '',
}: HoverOverlayImageCardProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const { replacePlaceholders } = useEventSettingsContext();
  const [overlayText, setOverlayText] = useState('');
  const [isEditingOverlay, setIsEditingOverlay] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [card1Colors, setCard1Colors] = useState<{
    background: string | null;
    text: string | null;
    title: string | null;
  }>(() => readCard1Colors());

  // Keep card 1 colors in sync if admin styles update
  useEffect(() => {
    const computeColors = () => {
      const next = readCard1Colors();
      setCard1Colors(next);
    };

    computeColors();

    // Re-read after a short delay in case styles are still loading
    const timeout = setTimeout(computeColors, 500);
    const timeout2 = setTimeout(computeColors, 1500);

    // Listen for manual style attribute changes on <html>
    const observer = new MutationObserver(computeColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    // Listen for the custom 'styles-updated' event dispatched by useWebsiteStyles
    const handleStylesUpdated = () => computeColors();
    window.addEventListener('styles-updated', handleStylesUpdated);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      observer.disconnect();
      window.removeEventListener('styles-updated', handleStylesUpdated);
    };
  }, []);

  // Use a prefix that won't be picked up by useDynamicContent's block_% query
  const getSubKey = (suffix: string) => {
    if (cardId.startsWith('block_')) {
      return `hovercard_${cardId.replace('block_', '')}_${suffix}`;
    }
    return `${cardId}-${suffix}`;
  };

  const imageContentKey = getSubKey('image');
  const overlayTextKey = getSubKey('overlay-text');

  useEffect(() => {
    setOverlayText('');
    setEditedText('');
    loadContent();
  }, [pageName, sectionName, cardId]);

  const loadContent = async () => {
    const { data: textData } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', overlayTextKey)
      .maybeSingle();

    if (textData?.content_value) {
      setOverlayText(textData.content_value);
      setEditedText(textData.content_value);
    }
  };

  const saveContent = async (key: string, value: string) => {
    await supabase
      .from('page_content')
      .upsert(
        {
          page_name: pageName,
          section_name: sectionName,
          content_key: key,
          content_value: value,
          content_type: 'text',
        },
        { onConflict: 'page_name,section_name,content_key' }
      );
  };

  const cleanupLegacyKeys = async () => {
    if (cardId.startsWith('block_')) {
      const legacyKeys = [
        `${cardId}-image`,
        `${cardId}-overlay-text`,
        `${cardId}-overlay-button-text`,
        `${cardId}-overlay-button-url`,
      ];
      
      await supabase
        .from('page_content')
        .delete()
        .eq('page_name', pageName)
        .eq('section_name', sectionName)
        .in('content_key', legacyKeys);
    }
  };

  const handleSaveOverlay = async () => {
    await saveContent(overlayTextKey, editedText);
    await cleanupLegacyKeys();
    
    setOverlayText(editedText);
    setIsEditingOverlay(false);
  };

  const handleCancelEdit = () => {
    setEditedText(overlayText);
    setIsEditingOverlay(false);
  };

  const hasOverlayContent = !!overlayText;

  const overlayScopeId = `hover-overlay-${String(cardId).replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const handleCardClick = (e: React.MouseEvent) => {
    if (!isEditMode || !builder) return;
    e.stopPropagation();

    const elementId = `hover-overlay-${pageName}-${sectionName}-${cardId}`;
    builder.selectElement({
      id: elementId,
      type: 'component',
      pageName,
      componentType: 'hoverOverlayCard',
      label: `Hover Overlay Card: ${cardId}`,
      actions: [
        {
          id: 'edit-overlay',
          label: hasOverlayContent ? 'Edit Overlay' : 'Add Overlay',
          tone: 'primary',
          onClick: () => setIsEditingOverlay(true),
        },
      ],
    });
  };

  const isSelected = builder?.selectedElement?.id === `hover-overlay-${pageName}-${sectionName}-${cardId}`;

  // Card content (image + overlay)
  const CardContent = (
    <div
      className={`relative overflow-hidden rounded-xl ${className} ${isEditMode ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Base Image */}
      <EditableImage
        pageName={pageName}
        sectionName={sectionName}
        contentKey={imageContentKey}
        defaultSrc={defaultImageSrc}
        alt={imageAlt}
        className={`w-full rounded-lg transition-transform duration-500 ${!isEditMode ? 'group-hover/card:scale-105' : ''}`}
        showControlsAlways={isEditMode}
      />

      {/* Hover Overlay - only show on hover when NOT in edit mode */}
      {!isEditMode && hasOverlayContent && (
        <div
          id={overlayScopeId}
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 transition-opacity duration-300 rounded-xl pointer-events-none"
          style={{ opacity: isHovered ? 1 : 0 }}
        >
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <rect
              width="100%"
              height="100%"
              fill={card1Colors.background || readCard1Colors().background || 'hsl(249, 73%, 58%)'}
            />
          </svg>

          <style>{`
            #${overlayScopeId} .hover-overlay-content,
            #${overlayScopeId} .hover-overlay-content *,
            #${overlayScopeId} .hover-overlay-content *::before,
            #${overlayScopeId} .hover-overlay-content *::after {
              background: transparent !important;
              background-color: transparent !important;
              box-shadow: none !important;
              border: 0 !important;
              border-radius: 0 !important;
              outline: 0 !important;
              padding: 0 !important;
            }

            #${overlayScopeId} .hover-overlay-content {
              max-width: 100% !important;
              color: ${card1Colors.text || 'white'} !important;
            }

            #${overlayScopeId} .hover-overlay-content h1,
            #${overlayScopeId} .hover-overlay-content h2,
            #${overlayScopeId} .hover-overlay-content h3,
            #${overlayScopeId} .hover-overlay-content h4,
            #${overlayScopeId} .hover-overlay-content h5,
            #${overlayScopeId} .hover-overlay-content h6 {
              color: ${card1Colors.title || card1Colors.text || 'white'} !important;
            }

            #${overlayScopeId} .hover-overlay-content h1 {
              font-size: var(--h1-size, 2.25rem) !important;
            }
            #${overlayScopeId} .hover-overlay-content h2 {
              font-size: var(--h2-size, 1.875rem) !important;
            }
            #${overlayScopeId} .hover-overlay-content h3 {
              font-size: var(--h3-size, 1.5rem) !important;
            }
            #${overlayScopeId} .hover-overlay-content h4 {
              font-size: var(--h4-size, 1.25rem) !important;
            }
            #${overlayScopeId} .hover-overlay-content h5 {
              font-size: var(--h5-size, 1.125rem) !important;
            }
            #${overlayScopeId} .hover-overlay-content h6 {
              font-size: var(--h6-size, 1rem) !important;
            }

            #${overlayScopeId} .hover-overlay-content p,
            #${overlayScopeId} .hover-overlay-content span,
            #${overlayScopeId} .hover-overlay-content li,
            #${overlayScopeId} .hover-overlay-content strong,
            #${overlayScopeId} .hover-overlay-content em,
            #${overlayScopeId} .hover-overlay-content u {
              color: ${card1Colors.text || 'white'} !important;
            }

            #${overlayScopeId} .hover-overlay-content a {
              color: ${card1Colors.text || 'white'} !important;
              text-decoration: underline !important;
            }

            #${overlayScopeId} .hover-overlay-content p,
            #${overlayScopeId} .hover-overlay-content h1,
            #${overlayScopeId} .hover-overlay-content h2,
            #${overlayScopeId} .hover-overlay-content h3,
            #${overlayScopeId} .hover-overlay-content h4,
            #${overlayScopeId} .hover-overlay-content h5,
            #${overlayScopeId} .hover-overlay-content h6,
            #${overlayScopeId} .hover-overlay-content ul,
            #${overlayScopeId} .hover-overlay-content ol {
              margin: 0.5rem 0 !important;
            }

            #${overlayScopeId} .hover-overlay-content p:first-child,
            #${overlayScopeId} .hover-overlay-content h1:first-child,
            #${overlayScopeId} .hover-overlay-content h2:first-child,
            #${overlayScopeId} .hover-overlay-content h3:first-child,
            #${overlayScopeId} .hover-overlay-content h4:first-child,
            #${overlayScopeId} .hover-overlay-content h5:first-child,
            #${overlayScopeId} .hover-overlay-content h6:first-child {
              margin-top: 0 !important;
            }

            #${overlayScopeId} .hover-overlay-content p:last-child,
            #${overlayScopeId} .hover-overlay-content ul:last-child,
            #${overlayScopeId} .hover-overlay-content ol:last-child {
              margin-bottom: 0 !important;
            }
          `}</style>

          {overlayText && (
            <div
              className="hover-overlay-content relative z-10 text-center max-w-none"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(replacePlaceholders(overlayText), {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'],
                  ALLOWED_ATTR: ['href', 'target', 'rel'],
                  FORBID_ATTR: ['style', 'class', 'bgcolor'],
                  FORBID_TAGS: ['style'],
                }),
              }}
            />
          )}
        </div>
      )}

      {/* Selection highlight */}
      {isEditMode && isSelected && (
        <div
          className="absolute inset-0 pointer-events-none z-[70] rounded-xl"
          style={{
            border: `2px solid ${BC.blue}`,
            boxShadow: `0 0 0 2px ${BC.blue}33`,
          }}
        />
      )}
    </div>
  );

  return (
    <>
      {CardContent}

      {/* Edit Dialog */}
      <Dialog open={isEditingOverlay} onOpenChange={setIsEditingOverlay}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Hover Overlay</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Overlay Text (WYSIWYG)</label>
              <RichTextEditor
                content={editedText}
                onChange={setEditedText}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Use the image settings "Add Link" to make the entire card clickable.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSaveOverlay}>
              <Check className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
