import { useState, useEffect } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { useEventSettingsContext } from '@/contexts/EventSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePickerDialog } from './ImagePickerDialog';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Image as ImageIcon, Share2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sanitizeHtml } from '@/lib/utils';
import { BC } from '@/components/builder/builderColors';

interface PopupImageBlockProps {
  blockId: string;
  content: string;
  onUpdate: (blockId: string, content: string) => void;
}

interface PopupImageData {
  imageUrl: string;
  popupTitle: string;
  popupContent: string;
}

export const PopupImageBlock = ({
  blockId,
  content,
  onUpdate,
}: PopupImageBlockProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const { replacePlaceholders, eventSettings } = useEventSettingsContext();
  const [isEditing, setIsEditing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<PopupImageData>(() => {
    try {
      return JSON.parse(content);
    } catch {
      return {
        imageUrl: '/placeholder.svg',
        popupTitle: 'Popup Title',
        popupContent: '<p>Your popup content here</p>',
      };
    }
  });

  // Update data when content changes
  useEffect(() => {
    try {
      const parsed = JSON.parse(content);
      setData(parsed);
    } catch {
      // Keep existing data on parse error
    }
  }, [content]);

  const handleSave = () => {
    onUpdate(blockId, JSON.stringify(data));
    setIsEditing(false);
    toast.success('Popup image saved');
  };

  const handleImageSelect = (url: string) => {
    setData(prev => ({ ...prev, imageUrl: url }));
    setShowImagePicker(false);
  };

  const handleFileUpload = async (file: File) => {
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `popup-${timestamp}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(fileName);

      setData(prev => ({ ...prev, imageUrl: publicUrl }));
      setShowImagePicker(false);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    }
  };

  const handleImageClick = () => {
    if (!isEditMode) {
      setShowPopup(true);
    }
  };

  const isPartnersRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/partners');

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

  const handleShare = async () => {
    const title = replacePlaceholders(data.popupTitle || '').trim();
    const slug = generateSlug(title);

    if (!slug) {
      toast.error('Unable to generate partner link');
      return;
    }

    const domain = eventSettings?.event_domain
      ? `https://${eventSettings.event_domain}`
      : window.location.origin;
    const shareUrl = `${domain}/partners/${slug}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Partner profile link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying partner link:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleBlockClick = (e: React.MouseEvent) => {
    if (!isEditMode || !builder) return;
    e.stopPropagation();

    const elementId = `popup-image-${blockId}`;
    builder.selectElement({
      id: elementId,
      type: 'component',
      pageName: '',
      componentType: 'popupImage',
      label: `Popup Image: ${data.popupTitle || blockId}`,
      actions: [
        {
          id: 'edit',
          label: 'Edit Popup Image',
          tone: 'primary',
          onClick: () => setIsEditing(true),
        },
      ],
    });
  };

  const isSelected = builder?.selectedElement?.id === `popup-image-${blockId}`;

  // Edit mode view
  if (isEditMode && isEditing) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-background">
        <div className="space-y-2">
          <Label>Image</Label>
          <div className="flex items-center gap-2">
            <div className="relative w-24 h-24 border rounded overflow-hidden">
              <img
                src={data.imageUrl}
                alt="Popup trigger"
                className="w-full h-full object-cover"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowImagePicker(true)}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Change Image
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`popup-title-${blockId}`}>Popup Title</Label>
          <Input
            id={`popup-title-${blockId}`}
            value={data.popupTitle}
            onChange={(e) => setData(prev => ({ ...prev, popupTitle: e.target.value }))}
            placeholder="Enter popup title"
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label>Popup Content</Label>
          <RichTextEditor
            content={data.popupContent}
            onChange={(content) => setData(prev => ({ ...prev, popupContent: content }))}
          />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              try {
                setData(JSON.parse(content));
              } catch {
                // Keep current data
              }
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            Save
          </Button>
        </div>

        <ImagePickerDialog
          open={showImagePicker}
          onOpenChange={setShowImagePicker}
          onImageSelect={handleImageSelect}
          onFileUpload={handleFileUpload}
        />
      </div>
    );
  }

  // View mode (or edit mode not actively editing)
  return (
    <>
      <div
        className={`relative group ${isEditMode ? 'cursor-pointer' : 'cursor-pointer'}`}
        onClick={isEditMode ? handleBlockClick : handleImageClick}
      >
        <img
          src={data.imageUrl}
          alt={data.popupTitle || 'Click to view details'}
          className="w-full h-auto rounded-lg transition-opacity hover:opacity-90"
        />
        
        {/* Selection highlight in edit mode */}
        {isEditMode && isSelected && (
          <div
            className="absolute inset-0 pointer-events-none z-[70] rounded-lg"
            style={{
              border: `2px solid ${BC.blue}`,
              boxShadow: `0 0 0 2px ${BC.blue}33`,
            }}
          />
        )}
      </div>

      {/* Popup Dialog */}
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{replacePlaceholders(data.popupTitle)}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div
              className="prose prose-sm max-w-none [&_h1]:text-[length:var(--h1-size,2.25rem)] [&_h2]:text-[length:var(--h2-size,1.875rem)] [&_h3]:text-[length:var(--h3-size,1.5rem)] prose-strong:font-bold"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(replacePlaceholders(data.popupContent)) }}
            />
            {isPartnersRoute && (
              <div className="flex justify-start pt-6">
                <Button type="button" variant="outline" size="sm" onClick={handleShare} className="gap-2">
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied ? 'Link copied!' : 'Share Partner Profile'}
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
