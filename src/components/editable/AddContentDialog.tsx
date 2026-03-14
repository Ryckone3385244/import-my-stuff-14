import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image, Type, Video, MousePointerClick, Sparkles, Images, ImagePlay, ChevronDown, Code, Heading2, ImagePlus, Layers, CalendarDays } from 'lucide-react';
import { BC } from '@/components/builder/builderColors';

interface AddContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (contentType: 'image' | 'text' | 'button' | 'video' | 'icon-with-text' | 'photo-gallery' | 'image-carousel' | 'accordion' | 'embed' | 'sectionTitle' | 'popupImage' | 'hover-overlay-card') => void;
}

const items: { type: Parameters<AddContentDialogProps['onSelect']>[0]; icon: typeof Type; label: string }[] = [
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'text', icon: Type, label: 'Body Text' },
  { type: 'sectionTitle', icon: Heading2, label: 'Section Title' },
  { type: 'button', icon: MousePointerClick, label: 'Button' },
  { type: 'video', icon: Video, label: 'Video' },
  { type: 'icon-with-text', icon: Sparkles, label: 'Icon + Text' },
  { type: 'photo-gallery', icon: Images, label: 'Photo Gallery' },
  { type: 'image-carousel', icon: ImagePlay, label: 'Image Carousel' },
  { type: 'accordion', icon: ChevronDown, label: 'Accordion' },
  { type: 'embed', icon: Code, label: 'Embed Code' },
  { type: 'popupImage', icon: ImagePlus, label: 'Popup Image' },
  { type: 'hover-overlay-card', icon: Layers, label: 'Hover Card' },
];

export const AddContentDialog = ({ open, onOpenChange, onSelect }: AddContentDialogProps) => {
  const handleSelect = (type: Parameters<AddContentDialogProps['onSelect']>[0]) => {
    onSelect(type);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col border-0" style={{ background: BC.panelBg, color: BC.text }}>
        <DialogHeader>
          <DialogTitle style={{ color: BC.text }}>Add Content</DialogTitle>
          <DialogDescription style={{ color: BC.textMuted }}>
            Choose the type of content you want to add to your card
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-4 flex-1 pr-4">
          <div className="grid grid-cols-2 gap-3">
            {items.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                style={{ border: `1px solid ${BC.border}`, color: BC.textMuted }}
                className="h-24 flex flex-col gap-2 items-center justify-center rounded-lg transition-all hover:border-[#4d9fff80] hover:bg-[rgba(77,159,255,0.08)] hover:text-[#e8eaed]"
              >
                <Icon className="w-8 h-8" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
            {/* Theater Agenda — cast to any since it's an extra type */}
            <button
              onClick={() => handleSelect('theater-agenda' as any)}
              style={{ border: `1px solid ${BC.border}`, color: BC.textMuted }}
              className="h-24 flex flex-col gap-2 items-center justify-center rounded-lg transition-all hover:border-[#4d9fff80] hover:bg-[rgba(77,159,255,0.08)] hover:text-[#e8eaed]"
            >
              <CalendarDays className="w-8 h-8" />
              <span className="text-sm">Theater Agenda</span>
            </button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
