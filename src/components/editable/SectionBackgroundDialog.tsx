import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Paintbrush, Image, X, Sparkles, Upload, FolderOpen, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface SectionBackgroundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentType: 'color' | 'image' | 'gradient' | 'none';
  currentValue: string | null;
  onSave: (type: 'color' | 'image' | 'gradient' | 'none', value: string | null) => void;
}

// Preset references that link to Design System colors
const COLOR_PRESETS = [
  { id: 'preset:card', label: 'White Card', column: 'card_background_color', fallback: '0 0% 100%' },
  { id: 'preset:card1', label: 'Primary Brand', column: 'green_card_background_color', fallback: '142 76% 36%' },
  { id: 'preset:card2', label: 'Black Card', column: 'black_card_background_color', fallback: '0 0% 3.9%' },
  { id: 'preset:card3', label: 'Muted / Gray', column: 'gray_card_background_color', fallback: '240 4.8% 95.9%' }
] as const;

export const SectionBackgroundDialog = ({
  open,
  onOpenChange,
  currentType,
  currentValue,
  onSave
}: SectionBackgroundDialogProps) => {
  const [backgroundType, setBackgroundType] = useState<'color' | 'image' | 'gradient' | 'none'>(currentType);
  
  // For colors, store the preset ID (e.g., 'preset:card1') or legacy HSL value
  const [selectedPreset, setSelectedPreset] = useState<string>('preset:card');
  
  // Parse image URL and overlay opacity from stored value (format: "url|opacity")
  const parseImageValue = (val: string | null) => {
    if (!val) return { url: '', opacity: 0 };
    const [url, opacityStr] = val.split('|');
    return { url: url || '', opacity: opacityStr ? parseFloat(opacityStr) : 0 };
  };
  
  const initialImageData = currentType === 'image' ? parseImageValue(currentValue) : { url: '', opacity: 0 };
  const [imageUrl, setImageUrl] = useState(initialImageData.url);
  const [overlayOpacity, setOverlayOpacity] = useState(initialImageData.opacity);
  const [isUploading, setIsUploading] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'library' | 'ai'>('upload');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch media library images
  const { data: mediaLibrary } = useQuery({
    queryKey: ['media-library-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .in('file_type', ['image'])
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: open && imageTab === 'library',
  });

  const { data: websiteStyles } = useQuery({
    queryKey: ['website-styles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_styles')
        .select('card_background_color, green_card_background_color, black_card_background_color, gray_card_background_color, gradient_start_color, gradient_end_color')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Get current HSL value for a preset
  const getPresetColor = (presetId: string) => {
    const preset = COLOR_PRESETS.find(p => p.id === presetId);
    if (!preset || !websiteStyles) return preset?.fallback || '0 0% 100%';
    return (websiteStyles as Record<string, string>)[preset.column] || preset.fallback;
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setBackgroundType(currentType);
      
      if (currentType === 'color' && currentValue) {
        // Check if it's already a preset reference
        if (currentValue.startsWith('preset:')) {
          setSelectedPreset(currentValue);
        } else {
          // Legacy: try to match HSL value to a preset
          const matchedPreset = COLOR_PRESETS.find(p => {
            const presetColor = websiteStyles ? (websiteStyles as Record<string, string>)[p.column] : p.fallback;
            return presetColor === currentValue;
          });
          setSelectedPreset(matchedPreset?.id || 'preset:card');
        }
      } else if (currentType === 'image') {
        const parsed = parseImageValue(currentValue);
        setImageUrl(parsed.url);
        setOverlayOpacity(parsed.opacity);
      }
    }
  }, [open, currentType, currentValue, websiteStyles]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `section-bg-${Date.now()}.${fileExt}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('media-library')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for AI generation');
      return;
    }

    setIsGenerating(true);
    try {
      // Use the generate-image edge function
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: aiPrompt, width: 1920, height: 1080 }
      });

      if (error) throw error;
      
      if (data?.url) {
        setImageUrl(data.url);
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (backgroundType === 'color') {
      // Save preset reference instead of raw HSL value
      onSave('color', selectedPreset);
    } else if (backgroundType === 'image') {
      // Store image URL with overlay opacity (format: "url|opacity")
      const valueWithOverlay = overlayOpacity > 0 ? `${imageUrl}|${overlayOpacity}` : imageUrl;
      onSave('image', valueWithOverlay);
    } else if (backgroundType === 'gradient') {
      // Save gradient preset reference
      onSave('gradient', 'preset:gradient');
    } else {
      onSave('none', null);
    }
    onOpenChange(false);
  };

  // Get the actual image URL for preview (without overlay data)
  const previewImageUrl = imageUrl.split('|')[0];

  // Build gradient preview from current website styles
  const gradientPreview = websiteStyles?.gradient_start_color && websiteStyles?.gradient_end_color
    ? `linear-gradient(135deg, hsl(${websiteStyles.gradient_start_color}), hsl(${websiteStyles.gradient_end_color}))`
    : 'linear-gradient(135deg, hsl(142 76% 36%), hsl(220 70% 50%))';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Section Background</DialogTitle>
          <DialogDescription>
            Choose a background color or image for this section
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={backgroundType} onValueChange={(v) => setBackgroundType(v as 'color' | 'image' | 'gradient' | 'none')}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="none">
              <X className="w-4 h-4 mr-2" />
              None
            </TabsTrigger>
            <TabsTrigger value="color">
              <Paintbrush className="w-4 h-4 mr-2" />
              Color
            </TabsTrigger>
            <TabsTrigger value="gradient">
              <Sparkles className="w-4 h-4 mr-2" />
              Gradient
            </TabsTrigger>
            <TabsTrigger value="image">
              <Image className="w-4 h-4 mr-2" />
              Image
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="none" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No background will be applied to this section.
            </p>
          </TabsContent>
          
          <TabsContent value="color" className="space-y-4">
            <div className="space-y-3">
              <Label>Card Background Colors</Label>
              <p className="text-xs text-muted-foreground">
                These colors are linked to your Design System and will update automatically when changed.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_PRESETS.map((preset) => {
                  const colorValue = getPresetColor(preset.id);
                  const isLight = preset.id === 'preset:card' || preset.id === 'preset:card3';
                  
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        selectedPreset === preset.id ? 'border-primary ring-2 ring-primary' : 'border-border'
                      }`}
                      style={{ backgroundColor: `hsl(${colorValue})` }}
                    >
                      <div 
                        className="text-xs font-medium text-center mt-2"
                        style={{ color: isLight ? 'black' : 'white' }}
                      >
                        {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gradient" className="space-y-4">
            <div className="space-y-3">
              <Label>Website Gradient</Label>
              <div 
                className="w-full h-32 rounded-lg border-2 cursor-pointer hover:scale-[1.02] transition-transform border-primary ring-2 ring-primary"
                style={{ background: gradientPreview }}
              >
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm font-medium text-white drop-shadow-lg">
                    Gradient from Website Style Settings
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This gradient is configured in Admin → Website Style Settings → Gradient Colors.
                It will update automatically when you change those settings.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="image" className="space-y-4">
            {/* Image source tabs */}
            <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as 'upload' | 'library' | 'ai')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload" className="text-xs">
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="library" className="text-xs">
                  <FolderOpen className="w-3 h-3 mr-1" />
                  Library
                </TabsTrigger>
                <TabsTrigger value="ai" className="text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />
                  AI Generate
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="bg-image-upload">Upload Image</Label>
                  <div className="flex gap-2">
                    <Input
                      id="bg-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bg-image">Or paste Image URL</Label>
                  <Input
                    id="bg-image"
                    type="url"
                    value={previewImageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="library" className="space-y-3 mt-3">
                <Label>Select from Media Library</Label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {mediaLibrary?.map((media) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => setImageUrl(media.file_url)}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all hover:scale-105 ${
                        previewImageUrl === media.file_url ? 'border-primary ring-2 ring-primary' : 'border-border'
                      }`}
                    >
                      <img
                        src={media.file_url}
                        alt={media.title || media.file_name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  {(!mediaLibrary || mediaLibrary.length === 0) && (
                    <p className="col-span-4 text-sm text-muted-foreground text-center py-4">
                      No images in library
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="ai" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Describe the background image</Label>
                  <Input
                    id="ai-prompt"
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g., Abstract green gradient with geometric shapes"
                    disabled={isGenerating}
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="w-full"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isGenerating ? 'Generating...' : 'Generate Image'}
                </Button>
              </TabsContent>
            </Tabs>
            
            {/* Image preview */}
            {previewImageUrl && (
              <div className="rounded-lg overflow-hidden border relative">
                <img
                  src={previewImageUrl}
                  alt="Background preview"
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                {overlayOpacity > 0 && (
                  <div 
                    className="absolute inset-0 bg-black pointer-events-none"
                    style={{ opacity: overlayOpacity }}
                  />
                )}
              </div>
            )}
            
            {/* Overlay opacity slider */}
            {previewImageUrl && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Dark Overlay</Label>
                  <span className="text-sm text-muted-foreground">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <Slider
                  value={[overlayOpacity]}
                  onValueChange={([value]) => setOverlayOpacity(value)}
                  min={0}
                  max={0.9}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Add a dark overlay to improve text readability over the image
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            Save Background
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
