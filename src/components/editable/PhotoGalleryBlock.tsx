import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePickerDialog } from './ImagePickerDialog';
import { useEditMode } from '@/contexts/EditModeContext';
import { Trash2, Plus, Settings, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GalleryConfig {
  desktop: number;
  tablet: number;
  mobile: number;
  aspectRatio: 'square' | '4:3' | '16:9';
  objectFit: 'cover' | 'contain' | 'scale-down';
  width?: { value: string; unit: '%' | 'px' };
  disableLightbox?: boolean;
}

interface PhotoGalleryBlockProps {
  images: string[];
  config?: GalleryConfig;
  onUpdate: (images: string[]) => void;
  onConfigUpdate?: (config: GalleryConfig) => void;
}

export const PhotoGalleryBlock = ({ 
  images, 
  config = { desktop: 3, tablet: 2, mobile: 2, aspectRatio: 'square', objectFit: 'cover' },
  onUpdate,
  onConfigUpdate 
}: PhotoGalleryBlockProps) => {
  const { isEditMode } = useEditMode();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempConfig, setTempConfig] = useState<GalleryConfig>(config);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const goToPrevious = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const goToNext = () => {
    if (lightboxIndex !== null && lightboxIndex < images.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') closeLightbox();
  };

  const handleAddImage = (imageUrl: string) => {
    if (editingIndex !== null) {
      const newImages = [...images];
      newImages[editingIndex] = imageUrl;
      onUpdate(newImages);
      setEditingIndex(null);
    } else {
      onUpdate([...images, imageUrl]);
    }
  };

  const handleAddImages = (imageUrls: string[]) => {
    onUpdate([...images, ...imageUrls]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onUpdate(newImages);
  };

  const openPickerForEdit = (index: number) => {
    setEditingIndex(index);
    setIsPickerOpen(true);
  };

  const openPickerForAdd = () => {
    setEditingIndex(null);
    setIsPickerOpen(true);
  };

  const handleConfigSave = () => {
    if (onConfigUpdate) {
      onConfigUpdate(tempConfig);
    }
    setIsConfigOpen(false);
  };

  const handleConfigOpen = () => {
    setTempConfig(config);
    setIsConfigOpen(true);
  };

  const getGridClass = () => {
    const mobileClass = config.mobile === 1 ? 'grid-cols-1' : config.mobile === 2 ? 'grid-cols-2' : 'grid-cols-1';
    const tabletClass = config.tablet === 1 ? 'md:grid-cols-1' : config.tablet === 2 ? 'md:grid-cols-2' : config.tablet === 3 ? 'md:grid-cols-3' : config.tablet === 4 ? 'md:grid-cols-4' : 'md:grid-cols-2';
    const desktopClass = config.desktop === 1 ? 'lg:grid-cols-1' : config.desktop === 2 ? 'lg:grid-cols-2' : config.desktop === 3 ? 'lg:grid-cols-3' : config.desktop === 4 ? 'lg:grid-cols-4' : config.desktop === 5 ? 'lg:grid-cols-5' : config.desktop === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-3';
    return `grid gap-4 ${mobileClass} ${tabletClass} ${desktopClass}`;
  };

  const getAspectClass = () => {
    switch (config.aspectRatio) {
      case 'square':
        return 'aspect-square';
      case '4:3':
        return 'aspect-[4/3]';
      case '16:9':
      default:
        return 'aspect-video';
    }
  };

  const getObjectFitClass = () => {
    switch (config.objectFit) {
      case 'contain':
        return 'object-contain';
      case 'scale-down':
        return 'object-scale-down';
      case 'cover':
      default:
        return 'object-cover';
    }
  };

  return (
    <div 
      className="space-y-4"
      style={{
        width: config.width ? 
          (config.width.unit === '%' ? `${config.width.value}%` : `${config.width.value}px`) 
          : '100%'
      }}
    >
      <div className={getGridClass()}>
        {images.map((image, index) => (
          <div key={index} className={`relative group ${getAspectClass()}`}>
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className={`w-full h-full ${getObjectFitClass()} rounded-lg`}
              onClick={() => {
                if (isEditMode) {
                  openPickerForEdit(index);
                } else if (!config.disableLightbox) {
                  openLightbox(index);
                }
              }}
              style={{ cursor: config.disableLightbox && !isEditMode ? 'default' : 'pointer' }}
            />
            {isEditMode && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage(index);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {isEditMode && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={openPickerForAdd}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Images
          </Button>
          {onConfigUpdate && (
            <Button variant="outline" onClick={handleConfigOpen}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
      <ImagePickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        onImageSelect={handleAddImage}
        onImagesSelect={handleAddImages}
        onFileUpload={() => {}}
        currentImages={images}
        onReorder={onUpdate}
      />
      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={closeLightbox}
      >
        <DialogContent
          className="max-w-[95vw] w-full h-[95vh] p-0 bg-black/95 border-0 [&>button]:hidden overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {lightboxIndex !== null && images[lightboxIndex] && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20 bg-black/50 z-50 h-10 w-10 rounded-full"
                onClick={closeLightbox}
              >
                <X className="h-6 w-6" />
              </Button>

              {lightboxIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 h-12 w-12 z-50 rounded-full"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              <img
                src={images[lightboxIndex]}
                alt={`Gallery image ${lightboxIndex + 1}`}
                className="max-w-[calc(100%-8rem)] max-h-[calc(100%-4rem)] w-auto h-auto object-contain"
              />

              {lightboxIndex < images.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 h-12 w-12 z-50 rounded-full"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {lightboxIndex + 1} / {images.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gallery Settings</DialogTitle>
            <DialogDescription>
              Configure how many images to show on different screen sizes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="desktop-gallery">Desktop (images per row)</Label>
              <Input
                id="desktop-gallery"
                type="number"
                min="1"
                max="6"
                value={tempConfig.desktop}
                onChange={(e) => setTempConfig(prev => ({ ...prev, desktop: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tablet-gallery">Tablet (images per row)</Label>
              <Input
                id="tablet-gallery"
                type="number"
                min="1"
                max="4"
                value={tempConfig.tablet}
                onChange={(e) => setTempConfig(prev => ({ ...prev, tablet: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-gallery">Mobile (images per row)</Label>
              <Input
                id="mobile-gallery"
                type="number"
                min="1"
                max="2"
                value={tempConfig.mobile}
                onChange={(e) => setTempConfig(prev => ({ ...prev, mobile: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aspectRatio-gallery">Image Format</Label>
              <Select
                value={tempConfig.aspectRatio}
                onValueChange={(value: 'square' | '4:3' | '16:9') => 
                  setTempConfig(prev => ({ ...prev, aspectRatio: value }))
                }
              >
                <SelectTrigger id="aspectRatio-gallery">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">Square (1:1)</SelectItem>
                  <SelectItem value="4:3">Standard (4:3)</SelectItem>
                  <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectFit-gallery">Image Fit</Label>
              <Select
                value={tempConfig.objectFit}
                onValueChange={(value: 'cover' | 'contain' | 'scale-down') => 
                  setTempConfig(prev => ({ ...prev, objectFit: value }))
                }
              >
                <SelectTrigger id="objectFit-gallery">
                  <SelectValue placeholder="Select image fit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill, may crop)</SelectItem>
                  <SelectItem value="contain">Contain (show all, may have borders)</SelectItem>
                  <SelectItem value="scale-down">Scale Down (show all, never enlarge)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gallery Width</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={tempConfig.width?.value || '100'}
                  onChange={(e) => setTempConfig({ 
                    ...tempConfig, 
                    width: { value: e.target.value, unit: tempConfig.width?.unit || '%' }
                  })}
                  placeholder="100"
                  min="1"
                />
                <Select
                  value={tempConfig.width?.unit || '%'}
                  onValueChange={(value: '%' | 'px') => setTempConfig({ 
                    ...tempConfig, 
                    width: { value: tempConfig.width?.value || '100', unit: value }
                  })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="%">%</SelectItem>
                    <SelectItem value="px">px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="disableLightbox-gallery">Disable click to enlarge</Label>
              <input
                id="disableLightbox-gallery"
                type="checkbox"
                checked={tempConfig.disableLightbox || false}
                onChange={(e) => setTempConfig(prev => ({ ...prev, disableLightbox: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
            </div>
          </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleConfigSave} className="bg-pink-600 hover:bg-pink-700 text-white">
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
