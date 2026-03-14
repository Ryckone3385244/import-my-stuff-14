import { useState, useEffect, useRef } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Link } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import { BC } from '@/components/builder/builderColors';

// YouTube URL helper functions (defined outside component for use in loadMedia)
const convertYouTubeUrlToEmbedStatic = (url: string): string => {
  if (url.includes('youtube.com/embed/')) {
    return url;
  }

  let videoId: string | null = null;

  // Handle youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // Handle youtube.com/watch?v=VIDEO_ID
  if (!videoId) {
    const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }
  }

  // Handle youtube.com/shorts/VIDEO_ID
  if (!videoId) {
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) {
      videoId = shortsMatch[1];
    }
  }

  // Handle youtube.com/live/VIDEO_ID
  if (!videoId) {
    const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
    if (liveMatch) {
      videoId = liveMatch[1];
    }
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
};

interface EditableVideoProps {
  pageName: string;
  sectionName: string;
  contentKey: string;
  defaultSrc: string;
  posterSrc?: string;
  className?: string;
  alt?: string;
}

export const EditableVideo = ({
  pageName,
  sectionName,
  contentKey,
  defaultSrc,
  posterSrc,
  className = '',
  alt = 'Video',
}: EditableVideoProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const cache = usePageContentCacheOptional();
  const isDynamicBlock = contentKey.startsWith('block_');

  const [mediaSrc, setMediaSrc] = useState(defaultSrc);
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showWidthDialog, setShowWidthDialog] = useState(false);
  const [widthValue, setWidthValue] = useState('100');
  const [widthUnit, setWidthUnit] = useState('%');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMediaSrc(defaultSrc);
    setMediaType('video');

    if (cache?.isLoaded) {
      // Read media from cache
      const cached = cache.getContent(sectionName, contentKey);
      if (cached !== null) {
        if (isDynamicBlock) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
              let url = parsed.content;
              if (/(?:youtube\.com|youtu\.be)/i.test(url) && !url.includes('youtube.com/embed/')) {
                url = convertYouTubeUrlToEmbedStatic(url);
              }
              setMediaSrc(url);
              setMediaType(parsed.type === 'image' ? 'image' : 'video');
            }
          } catch {
            setMediaSrc(cached);
          }
        } else {
          let loadedUrl = cached;
          if (/(?:youtube\.com|youtu\.be)/i.test(loadedUrl) && !loadedUrl.includes('youtube.com/embed/')) {
            loadedUrl = convertYouTubeUrlToEmbedStatic(loadedUrl);
          }
          setMediaSrc(loadedUrl);
          // Check content_type from cache entry
          const entry = cache.getContentEntry(sectionName, contentKey);
          setMediaType(entry?.content_type === 'video' ? 'video' : 'image');
        }
      }

      // Read width from cache
      const cachedWidth = cache.getContent(sectionName, `${contentKey}-width`);
      if (cachedWidth !== null) {
        try {
          const parsed = JSON.parse(cachedWidth);
          setWidthValue(parsed.value || '100');
          setWidthUnit(parsed.unit || '%');
        } catch {
          // Fallback to defaults
        }
      }
    } else {
      loadMedia();
      loadWidth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageName, sectionName, contentKey, cache?.isLoaded]);

  const loadMedia = async () => {
    try {
      if (isDynamicBlock) {
        const { data, error } = await supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', pageName)
          .eq('section_name', sectionName)
          .eq('content_key', contentKey)
          .maybeSingle();

        if (error) {
          console.error('Failed to load dynamic video block:', error);
          return;
        }

        if (data?.content_value) {
          let url = '';
          let type: 'video' | 'image' = 'video';

          try {
            const parsed = JSON.parse(data.content_value);
            if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
              url = parsed.content;
              if (parsed.type === 'image') {
                type = 'image';
              }
            } else {
              url = data.content_value;
            }
          } catch {
            url = data.content_value;
          }

          if (url) {
            // Convert YouTube URLs to embed format when loading
            if (/(?:youtube\.com|youtu\.be)/i.test(url) && !url.includes('youtube.com/embed/')) {
              url = convertYouTubeUrlToEmbedStatic(url);
            }
            setMediaSrc(url);
            setMediaType(type);
          }
        }

        return;
      }

      const { data, error } = await supabase
        .from('page_content')
        .select('content_value, content_type')
        .eq('page_name', pageName)
        .eq('section_name', sectionName)
        .eq('content_key', contentKey)
        .maybeSingle();

      if (error) {
        console.error('Failed to load media:', error);
        return;
      }

      if (data) {
        let loadedUrl = data.content_value;
        // Convert YouTube URLs to embed format when loading
        if (/(?:youtube\.com|youtu\.be)/i.test(loadedUrl) && !loadedUrl.includes('youtube.com/embed/')) {
          loadedUrl = convertYouTubeUrlToEmbedStatic(loadedUrl);
        }
        setMediaSrc(loadedUrl);
        setMediaType(data.content_type === 'video' ? 'video' : 'image');
      }
    } catch (err) {
      console.error('Unexpected error loading media:', err);
    }
  };

  const loadWidth = async () => {
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', `${contentKey}-width`)
      .maybeSingle();

    if (data) {
      try {
        const parsed = JSON.parse(data.content_value);
        setWidthValue(parsed.value || '100');
        setWidthUnit(parsed.unit || '%');
      } catch {
        // Fallback to defaults
      }
    }
  };

  const handleSaveWidth = async () => {
    const { error } = await supabase
      .from('page_content')
      .upsert(
        {
          page_name: pageName,
          section_name: sectionName,
          content_key: `${contentKey}-width`,
          content_value: JSON.stringify({ value: widthValue, unit: widthUnit }),
          content_type: 'text',
        },
        {
          onConflict: 'page_name,section_name,content_key',
        },
      );

    if (error) {
      toast.error('Failed to save width');
      console.error(error);
    } else {
      setShowWidthDialog(false);
      toast.success('Width updated');
    }
  };

  const saveMedia = async (url: string, contentType: 'video' | 'image') => {
    if (isDynamicBlock) {
      try {
        const { data } = await supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', pageName)
          .eq('section_name', sectionName)
          .eq('content_key', contentKey)
          .maybeSingle();

        let order = 0;

        if (data?.content_value) {
          try {
            const parsed = JSON.parse(data.content_value);
            if (parsed && typeof parsed === 'object' && typeof parsed.order === 'number') {
              order = parsed.order;
            }
          } catch {
            // Ignore parse errors
          }
        }

        const payload = {
          type: contentType === 'image' ? 'image' : 'video',
          content: url,
          order,
        };

        const { error } = await supabase
          .from('page_content')
          .upsert(
            {
              page_name: pageName,
              section_name: sectionName,
              content_key: contentKey,
              content_value: JSON.stringify(payload),
              content_type: 'text'
            },
            {
              onConflict: 'page_name,section_name,content_key',
            },
          );

        return { dbError: error };
      } catch (error) {
        console.error('Failed to save dynamic media block:', error);
        return { dbError: error as unknown as Error };
      }
    }

    const { error } = await supabase
      .from('page_content')
      .upsert(
        {
          page_name: pageName,
          section_name: sectionName,
          content_key: contentKey,
          content_value: url,
          content_type: contentType,
        },
        {
          onConflict: 'page_name,section_name,content_key',
        },
      );

    return { dbError: error };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.info('Starting upload...');

    const isVideo = file.type.startsWith('video/');
    const contentType: 'video' | 'image' = isVideo ? 'video' : 'image';

    const fileExt = file.name.split('.').pop();
    const fileName = `${pageName}-${sectionName}-${contentKey}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('media-library')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload file');
      console.error('Upload error:', uploadError);
      setIsUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('media-library').getPublicUrl(fileName);

    const { dbError } = await saveMedia(publicUrl, contentType);

    setIsUploading(false);

    if (dbError) {
      toast.error('Failed to save media');
      console.error('DB error:', dbError);
    } else {
      setMediaSrc(publicUrl);
      setMediaType(contentType);
      toast.success(`${isVideo ? 'Video' : 'Image'} uploaded successfully`);
      // Reload to ensure the media displays
      await loadMedia();
    }

    // Allow re-selecting the same file
    e.target.value = '';
  };

  const convertGoogleDriveUrl = (url: string): string => {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
  };

  const isGoogleDriveUrl = (url: string): boolean => {
    return url.includes('drive.google.com');
  };

  // YouTube URL detection and conversion
  const isYouTubeUrl = (url: string): boolean => {
    return /(?:youtube\.com|youtu\.be)/i.test(url);
  };

  const isYouTubeEmbedUrl = (url: string): boolean => {
    return url.includes('youtube.com/embed/');
  };

  const convertYouTubeUrlToEmbed = (url: string): string => {
    // Already an embed URL
    if (isYouTubeEmbedUrl(url)) {
      return url;
    }

    let videoId: string | null = null;

    // Handle youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) {
      videoId = shortMatch[1];
    }

    // Handle youtube.com/watch?v=VIDEO_ID
    if (!videoId) {
      const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
      if (watchMatch) {
        videoId = watchMatch[1];
      }
    }

    // Handle youtube.com/shorts/VIDEO_ID
    if (!videoId) {
      const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
      if (shortsMatch) {
        videoId = shortsMatch[1];
      }
    }

    // Handle youtube.com/live/VIDEO_ID
    if (!videoId) {
      const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
      if (liveMatch) {
        videoId = liveMatch[1];
      }
    }

    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }

    return url;
  };

  const handleUrlSave = async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    let processedUrl = urlInput;
    let contentType: 'video' | 'image' = 'video';

    if (isYouTubeUrl(urlInput)) {
      processedUrl = convertYouTubeUrlToEmbed(urlInput);
      contentType = 'video';
    } else if (isGoogleDriveUrl(urlInput)) {
      processedUrl = convertGoogleDriveUrl(urlInput);
      contentType = 'video';
    } else {
      const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(urlInput);
      contentType = isVideo ? 'video' : 'image';
    }

    const { dbError } = await saveMedia(processedUrl, contentType);

    if (dbError) {
      toast.error('Failed to save URL');
      console.error(dbError);
    } else {
      setMediaSrc(processedUrl);
      setMediaType(contentType);
      setIsDialogOpen(false);
      setUrlInput('');
      toast.success('Media URL saved successfully');
      await loadMedia();
    }
  };

  const hasMedia = mediaSrc && mediaSrc.trim() !== '';

  const numericWidth = parseFloat(widthValue);
  const isHeroBackground =
    pageName === 'home' && sectionName === 'hero' && contentKey === 'background-video';
  const effectiveWidth =
    isHeroBackground && (!widthValue || isNaN(numericWidth) || numericWidth < 100)
      ? '100'
      : widthValue;

  const handleVideoClick = (e: React.MouseEvent) => {
    if (!isEditMode || !builder) return;
    e.stopPropagation();
    
    const elementId = `video-${pageName}-${sectionName}-${contentKey}`;
    builder.selectElement({
      id: elementId,
      type: 'component',
      pageName,
      componentType: 'video',
      label: `Video: ${contentKey}`,
      actions: [
        { id: 'upload', label: 'Upload Media', tone: 'primary', onClick: () => fileInputRef.current?.click() },
        { id: 'url', label: 'Set Media URL', onClick: () => { setUrlInput(mediaSrc || ''); setIsDialogOpen(true); } },
        { id: 'width', label: 'Change Width', onClick: () => setShowWidthDialog(true) },
      ],
    });
  };

  const isSelected = builder?.selectedElement?.id === `video-${pageName}-${sectionName}-${contentKey}`;

  return (
    <div className={`relative w-full h-full ${isEditMode ? 'cursor-pointer' : ''}`} onClick={handleVideoClick}>
      {hasMedia ? (
        <div
          style={{
            width: widthUnit === '%' ? `${effectiveWidth}%` : `${effectiveWidth}px`,
            height: '100%',
            margin: '0 auto',
          }}
        >
          {mediaType === 'video' ? (
            isGoogleDriveUrl(mediaSrc) || isYouTubeEmbedUrl(mediaSrc) ? (
              <iframe
                src={mediaSrc}
                className={className}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                style={{ border: 'none', width: '100%', height: 'auto', aspectRatio: '16/9' }}
                onError={() => {
                  console.error('Failed to load video iframe:', mediaSrc);
                  toast.error('Failed to load video. Please check the URL and sharing settings.');
                }}
              />
            ) : (
              <video
                ref={videoRef}
                src={mediaSrc}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                poster={posterSrc}
                className={`w-full object-cover block ${className}`}
                onError={() => {
                  console.error('Video failed to load:', mediaSrc);
                  toast.error('Failed to load video. Please check the URL.');
                }}
              >
                Your browser does not support the video tag.
              </video>
            )
          ) : (
            <img
              src={mediaSrc}
              alt={alt}
              className={className}
              style={{ width: '100%', height: 'auto' }}
              onError={() => {
                console.error('Image failed to load:', mediaSrc);
                toast.error('Failed to load image. Please check the URL.');
              }}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          <div className="text-center">
            <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No video or image uploaded</p>
            {isEditMode && <p className="text-xs mt-1">Click to select, then use the settings panel</p>}
          </div>
        </div>
      )}

      {isEditMode && (isSelected || false) && (
        <div
          className="absolute inset-0 pointer-events-none z-[70] rounded-md"
          style={{
            border: `2px solid ${BC.blue}`,
            boxShadow: `0 0 0 2px ${BC.blue}33`,
          }}
        />
      )}

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Media URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="media-url">Video or Image URL</Label>
              <Input
                id="media-url"
                type="url"
                placeholder="https://example.com/video.mp4"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleUrlSave} className="bg-pink-600 hover:bg-pink-700 text-white">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWidthDialog} onOpenChange={setShowWidthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Media Width</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Width Value</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={widthValue}
                  onChange={(e) => setWidthValue(e.target.value)}
                  placeholder="100"
                  min="1"
                />
                <Select value={widthUnit} onValueChange={setWidthUnit}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="%">%</SelectItem>
                    <SelectItem value="px">px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Height will be automatically adjusted to maintain aspect ratio
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWidthDialog(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveWidth} className="bg-pink-600 hover:bg-pink-700 text-white">
              Save Width
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
