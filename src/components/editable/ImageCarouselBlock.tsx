import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePickerDialog } from './ImagePickerDialog';
import { useEditMode } from '@/contexts/EditModeContext';
import { Trash2, Plus, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CarouselConfig {
  desktop: number;
  tablet: number;
  mobile: number;
  aspectRatio: 'square' | '4:3' | '16:9';
  objectFit: 'cover' | 'contain' | 'scale-down';
  showArrows: boolean;
  showPagination: boolean;
}

interface ImageCarouselBlockProps {
  images: string[];
  config?: CarouselConfig;
  onUpdate: (images: string[]) => void;
  onConfigUpdate?: (config: CarouselConfig) => void;
}

export const ImageCarouselBlock = ({ 
  images, 
  config = { desktop: 3, tablet: 2, mobile: 1, aspectRatio: '16:9', objectFit: 'cover', showArrows: true, showPagination: true },
  onUpdate,
  onConfigUpdate 
}: ImageCarouselBlockProps) => {
  const { isEditMode } = useEditMode();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempConfig, setTempConfig] = useState<CarouselConfig>(config);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    dragFree: true,
    containScroll: "trimSnaps",
    slidesToScroll: 1,
  }, [Autoplay({
    delay: 3000,
    stopOnInteraction: true
  })]);

  // Reinitialize Embla when config or images change
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [emblaApi, config.desktop, config.tablet, config.mobile, images.length]);

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

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

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

  if (images.length === 0) {
    return isEditMode ? (
      <>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={openPickerForAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Images
          </Button>
          {onConfigUpdate && (
            <Button variant="outline" onClick={handleConfigOpen}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
        <ImagePickerDialog
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          onImageSelect={handleAddImage}
          onImagesSelect={handleAddImages}
          onFileUpload={() => {}}
          currentImages={images}
          onReorder={onUpdate}
        />
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Carousel Settings</DialogTitle>
              <DialogDescription>
                Configure how many images to show on different screen sizes
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="desktop">Desktop (images per view)</Label>
              <Input
                id="desktop"
                type="number"
                min="1"
                max="6"
                value={tempConfig.desktop}
                onChange={(e) => setTempConfig(prev => ({ ...prev, desktop: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tablet">Tablet (images per view)</Label>
              <Input
                id="tablet"
                type="number"
                min="1"
                max="4"
                value={tempConfig.tablet}
                onChange={(e) => setTempConfig(prev => ({ ...prev, tablet: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile (images per view)</Label>
              <Input
                id="mobile"
                type="number"
                min="1"
                max="2"
                value={tempConfig.mobile}
                onChange={(e) => setTempConfig(prev => ({ ...prev, mobile: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aspectRatio">Image Format</Label>
              <Select
                value={tempConfig.aspectRatio}
                onValueChange={(value: 'square' | '4:3' | '16:9') => 
                  setTempConfig(prev => ({ ...prev, aspectRatio: value }))
                }
              >
                <SelectTrigger id="aspectRatio">
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
              <Label htmlFor="objectFit">Image Fit</Label>
              <Select
                value={tempConfig.objectFit}
                onValueChange={(value: 'cover' | 'contain' | 'scale-down') => 
                  setTempConfig(prev => ({ ...prev, objectFit: value }))
                }
              >
                <SelectTrigger id="objectFit">
                  <SelectValue placeholder="Select image fit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill, may crop)</SelectItem>
                  <SelectItem value="contain">Contain (show all, may have borders)</SelectItem>
                  <SelectItem value="scale-down">Scale Down (show all, never enlarge)</SelectItem>
                </SelectContent>
              </Select>
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
      </>
    ) : null;
  }

  // Get responsive slide width class based on config
  // Uses CSS custom properties to handle responsive breakpoints
  const getSlideWidthClass = () => {
    // Calculate percentage widths for each breakpoint
    const mobileWidth = 100 / config.mobile;
    const tabletWidth = 100 / config.tablet;
    const desktopWidth = 100 / config.desktop;
    
    // Return inline style that will be overridden by CSS media queries
    return {
      '--mobile-width': `${mobileWidth}%`,
      '--tablet-width': `${tabletWidth}%`,
      '--desktop-width': `${desktopWidth}%`,
      '--mobile-gap': `${(config.mobile - 1) * 24}px`,
      '--tablet-gap': `${(config.tablet - 1) * 24}px`,
      '--desktop-gap': `${(config.desktop - 1) * 24}px`,
    } as React.CSSProperties;
  };

  // Generate grid classes based on config
  const getGridClass = () => {
    const mobileClass = config.mobile === 1 ? 'grid-cols-1' : config.mobile === 2 ? 'grid-cols-2' : 'grid-cols-1';
    const tabletClass = config.tablet === 1 ? 'md:grid-cols-1' : config.tablet === 2 ? 'md:grid-cols-2' : config.tablet === 3 ? 'md:grid-cols-3' : config.tablet === 4 ? 'md:grid-cols-4' : 'md:grid-cols-2';
    const desktopClass = config.desktop === 1 ? 'lg:grid-cols-1' : config.desktop === 2 ? 'lg:grid-cols-2' : config.desktop === 3 ? 'lg:grid-cols-3' : config.desktop === 4 ? 'lg:grid-cols-4' : config.desktop === 5 ? 'lg:grid-cols-5' : config.desktop === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-3';
    return `grid gap-4 ${mobileClass} ${tabletClass} ${desktopClass}`;
  };

  // Get slide basis class for responsive widths
  const getSlideClass = () => {
    // Mobile-first approach: base class is for mobile, then override for tablet and desktop
    // Using 24px gap (gap-6) for calculations
    // Tailwind arbitrary values require underscores for spaces in calc(): calc(50%_-_12px)
    const mobileClass = config.mobile === 1 ? 'basis-full' : config.mobile === 2 ? 'basis-[calc(50%_-_12px)]' : 'basis-full';
    const tabletClass = config.tablet === 1 ? 'md:basis-full' : config.tablet === 2 ? 'md:basis-[calc(50%_-_12px)]' : config.tablet === 3 ? 'md:basis-[calc(33.333%_-_16px)]' : config.tablet === 4 ? 'md:basis-[calc(25%_-_18px)]' : 'md:basis-[calc(50%_-_12px)]';
    const desktopClass = config.desktop === 1 ? 'lg:basis-full' : config.desktop === 2 ? 'lg:basis-[calc(50%_-_12px)]' : config.desktop === 3 ? 'lg:basis-[calc(33.333%_-_16px)]' : config.desktop === 4 ? 'lg:basis-[calc(25%_-_18px)]' : config.desktop === 5 ? 'lg:basis-[calc(20%_-_19.2px)]' : config.desktop === 6 ? 'lg:basis-[calc(16.667%_-_20px)]' : 'lg:basis-[calc(33.333%_-_16px)]';
    // Removed 'carousel-slide' class to avoid global CSS override from index.css
    return `flex-shrink-0 ${mobileClass} ${tabletClass} ${desktopClass}`;
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

  // Calculate if navigation is needed at any breakpoint
  const minSlidesPerView = Math.min(config.mobile, config.tablet, config.desktop);
  const needsNavigation = images.length > minSlidesPerView;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {needsNavigation && config.showArrows && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full shadow-lg flex-shrink-0"
            onClick={scrollPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex-1 overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {images.map((image, index) => (
              <div 
                key={index} 
                className={getSlideClass()}
              >
                <div className={`relative ${getAspectClass()} overflow-hidden rounded-lg`}>
                  <img
                    src={image}
                    alt={`Slide ${index + 1}`}
                    className={`w-full h-full ${getObjectFitClass()}`}
                    onClick={() => isEditMode && openPickerForEdit(index)}
                    style={{ cursor: isEditMode ? 'pointer' : 'default' }}
                  />
                  {isEditMode && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(index);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {needsNavigation && config.showArrows && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0 rounded-full shadow-lg flex-shrink-0"
            onClick={scrollNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
      {needsNavigation && config.showPagination && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.ceil(images.length / minSlidesPerView) }).map((_, index) => (
            <button
              key={index}
              className="w-2 h-2 rounded-full bg-muted hover:bg-primary transition-colors"
              onClick={() => emblaApi?.scrollTo(index * minSlidesPerView)}
            />
          ))}
        </div>
      )}
      {isEditMode && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={openPickerForAdd}>
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
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carousel Settings</DialogTitle>
            <DialogDescription>
              Configure how many images to show on different screen sizes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="desktop-config">Desktop (images per view)</Label>
              <Input
                id="desktop-config"
                type="number"
                min="1"
                max="6"
                value={tempConfig.desktop}
                onChange={(e) => setTempConfig(prev => ({ ...prev, desktop: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tablet-config">Tablet (images per view)</Label>
              <Input
                id="tablet-config"
                type="number"
                min="1"
                max="4"
                value={tempConfig.tablet}
                onChange={(e) => setTempConfig(prev => ({ ...prev, tablet: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile-config">Mobile (images per view)</Label>
              <Input
                id="mobile-config"
                type="number"
                min="1"
                max="2"
                value={tempConfig.mobile}
                onChange={(e) => setTempConfig(prev => ({ ...prev, mobile: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aspectRatio-config">Image Format</Label>
              <Select
                value={tempConfig.aspectRatio}
                onValueChange={(value: 'square' | '4:3' | '16:9') => 
                  setTempConfig(prev => ({ ...prev, aspectRatio: value }))
                }
              >
                <SelectTrigger id="aspectRatio-config">
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
              <Label htmlFor="objectFit-config">Image Fit</Label>
              <Select
                value={tempConfig.objectFit}
                onValueChange={(value: 'cover' | 'contain' | 'scale-down') => 
                  setTempConfig(prev => ({ ...prev, objectFit: value }))
                }
              >
                <SelectTrigger id="objectFit-config">
                  <SelectValue placeholder="Select image fit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill, may crop)</SelectItem>
                  <SelectItem value="contain">Contain (show all, may have borders)</SelectItem>
                  <SelectItem value="scale-down">Scale Down (show all, never enlarge)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showArrows-config">Show Navigation Arrows</Label>
              <Switch
                id="showArrows-config"
                checked={tempConfig.showArrows}
                onCheckedChange={(checked) => setTempConfig(prev => ({ ...prev, showArrows: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showPagination-config">Show Pagination Dots</Label>
              <Switch
                id="showPagination-config"
                checked={tempConfig.showPagination}
                onCheckedChange={(checked) => setTempConfig(prev => ({ ...prev, showPagination: checked }))}
              />
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
