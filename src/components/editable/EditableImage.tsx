import { useState, useEffect, useRef } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';
import { useBuilderOptional } from '@/contexts/BuilderContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Link as LinkIcon, X, Settings, Crop, Lock, Unlock, Maximize2 } from 'lucide-react';
import { BC } from '@/components/builder/builderColors';
import { Button } from '../ui/button';
import ReactCrop, { Crop as CropType, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ImagePickerDialog } from './ImagePickerDialog';
import { Link } from 'react-router-dom';
import { usePageContentCacheOptional } from '@/hooks/usePageContentCache';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EditableImageProps {
  pageName: string;
  sectionName: string;
  contentKey: string;
  defaultSrc: string;
  alt: string;
  className?: string;
  objectFitOverride?: 'cover' | 'contain' | 'scale-down';
  showControlsAlways?: boolean;
  /** When true, this image will NOT register itself as the selected element (use parent wrapper selection instead). */
  disableBuilderSelect?: boolean;
}

export const EditableImage = ({
  pageName,
  sectionName,
  contentKey,
  defaultSrc,
  alt,
  className = '',
  objectFitOverride,
  showControlsAlways = false,
  disableBuilderSelect = false,
}: EditableImageProps) => {
  const { isEditMode } = useEditMode();
  const builder = useBuilderOptional();
  const cache = usePageContentCacheOptional();
  const [imageSrc, setImageSrc] = useState(defaultSrc);
  const [isHovered, setIsHovered] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [linkTarget, setLinkTarget] = useState<'_self' | '_blank'>('_blank');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [editedLink, setEditedLink] = useState('');
  const [editedTarget, setEditedTarget] = useState<'_self' | '_blank'>('_blank');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [widthValue, setWidthValue] = useState('100');
  const [widthUnit, setWidthUnit] = useState('%');
  const [aspectRatio, setAspectRatio] = useState<'none' | 'square' | '4:3' | '16:9'>('none');
  const [objectFit, setObjectFit] = useState<'cover' | 'contain' | 'scale-down'>('cover');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [hasCustomSettings, setHasCustomSettings] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [cropAspectRatio, setCropAspectRatio] = useState<number | undefined>(undefined);
  const [isCropping, setIsCropping] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [dimensionsLocked, setDimensionsLocked] = useState(true);
  const [originalAspectRatio, setOriginalAspectRatio] = useState<number | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number | null>(null);
  const [originalHeight, setOriginalHeight] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const resizeImgRef = useRef<HTMLImageElement>(null);

  // Prevent "cache became loaded" from resetting src back to default (causes a visible blink on duplicate).
  const initKeyRef = useRef<string>('');
  const hasInitialisedRef = useRef(false);

  useEffect(() => {
    const key = `${pageName}::${sectionName}::${contentKey}`;
    const isNewKey = initKeyRef.current !== key;

    if (isNewKey) {
      initKeyRef.current = key;
      hasInitialisedRef.current = false;

      // Only reset when switching to a different image.
      setImageSrc(defaultSrc);
      setLinkUrl('');
      setLinkTarget('_blank');
      setHasCustomSettings(false);
    }

    // If this is the same image and we're only re-running because cache.isLoaded flipped,
    // don't reset anything — it causes a visible flash.
    if (!isNewKey && hasInitialisedRef.current) return;

    if (cache?.isLoaded) {
      // Read image from cache
      const cachedImg = cache.getContent(sectionName, contentKey);
      if (cachedImg !== null) {
        const isDynamicBlock = contentKey.startsWith('block_');
        if (isDynamicBlock) {
          try {
            const parsed = JSON.parse(cachedImg);
            if (parsed.type === 'image' && parsed.content) {
              setImageSrc(parsed.content);
            }
          } catch {
            setImageSrc(cachedImg);
          }
        } else {
          setImageSrc(cachedImg);
        }
      } else {
        // Cache is loaded but doesn't have this key yet (common right after duplicating)
        void loadImage();
      }

      // Read link from cache
      const cachedLink = cache.getContent(sectionName, `${contentKey}-link`);
      if (cachedLink !== null) {
        try {
          const parsed = JSON.parse(cachedLink);
          if (parsed.url) {
            setLinkUrl(parsed.url);
            setEditedLink(parsed.url);
            setLinkTarget(parsed.target || '_blank');
            setEditedTarget(parsed.target || '_blank');
          } else {
            setLinkUrl(cachedLink);
            setEditedLink(cachedLink);
          }
        } catch {
          setLinkUrl(cachedLink);
          setEditedLink(cachedLink);
        }
      } else {
        void loadLink();
      }

      // Read settings from cache
      const cachedSettings = cache.getContent(sectionName, `${contentKey}-settings`);
      if (cachedSettings !== null) {
        try {
          const parsed = JSON.parse(cachedSettings);
          setWidthValue(parsed.width?.value || '100');
          setWidthUnit(parsed.width?.unit || '%');
          setAspectRatio(parsed.aspectRatio || 'none');
          setObjectFit(parsed.objectFit || 'cover');
          setAlignment(parsed.alignment || 'left');
          setHasCustomSettings(true);
        } catch {
          // Fallback to defaults
        }
      } else {
        void loadSettings();
      }
    } else {
      loadImage();
      loadLink();
      loadSettings();
    }

    hasInitialisedRef.current = true;
  }, [pageName, sectionName, contentKey, defaultSrc, cache?.isLoaded]);

  // When settings are saved from the right-side panel (ImageEditor), refresh this image.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<any>;
      const d = ce.detail;
      if (!d) return;
      if (d.pageName !== pageName || d.sectionName !== sectionName || d.contentKey !== contentKey) return;
      loadLink();
      loadSettings();
    };
    window.addEventListener('editable-image:updated', handler);
    return () => window.removeEventListener('editable-image:updated', handler);
  }, [pageName, sectionName, contentKey]);

  const loadImage = async () => {
    // Check if this is a dynamic block
    const isDynamicBlock = contentKey.startsWith('block_');
    
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', contentKey)
      .maybeSingle();

    if (data) {
      if (isDynamicBlock) {
        // For dynamic blocks, the content_value is a JSON string with type, content, order
        try {
          const parsed = JSON.parse(data.content_value);
          if (parsed.type === 'image' && parsed.content) {
            setImageSrc(parsed.content);
          }
        } catch (e) {
          // If it's not JSON, treat as direct image URL
          setImageSrc(data.content_value);
        }
      } else {
        setImageSrc(data.content_value);
      }
    }
  };

  const loadLink = async () => {
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', `${contentKey}-link`)
      .eq('content_type', 'link')
      .maybeSingle();

    if (data) {
      // Check if the value is JSON with url and target
      try {
        const parsed = JSON.parse(data.content_value);
        if (parsed.url) {
          setLinkUrl(parsed.url);
          setEditedLink(parsed.url);
          setLinkTarget(parsed.target || '_blank');
          setEditedTarget(parsed.target || '_blank');
        } else {
          // Legacy format - just URL string
          setLinkUrl(data.content_value);
          setEditedLink(data.content_value);
          setLinkTarget('_blank');
          setEditedTarget('_blank');
        }
      } catch {
        // Legacy format - just URL string
        setLinkUrl(data.content_value);
        setEditedLink(data.content_value);
        setLinkTarget('_blank');
        setEditedTarget('_blank');
      }
    }
  };

  const loadSettings = async () => {
    const { data } = await supabase
      .from('page_content')
      .select('content_value')
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', `${contentKey}-settings`)
      .maybeSingle();

    if (data) {
      try {
        const parsed = JSON.parse(data.content_value);
        setWidthValue(parsed.width?.value || '100');
        setWidthUnit(parsed.width?.unit || '%');
        setAspectRatio(parsed.aspectRatio || 'none');
        setObjectFit(parsed.objectFit || 'cover');
        setAlignment(parsed.alignment || 'left');
        setHasCustomSettings(true);
      } catch {
        // Fallback to defaults
      }
    }
  };

  const handleSaveSettings = async () => {
    const settingsPayload = JSON.stringify({
      width: { value: widthValue, unit: widthUnit },
      aspectRatio,
      objectFit,
      alignment,
    });

    const { error } = await supabase
      .from('page_content')
      .upsert(
        {
          page_name: pageName,
          section_name: sectionName,
          content_key: `${contentKey}-settings`,
          content_value: settingsPayload,
          content_type: 'json',
        },
        {
          onConflict: 'page_name,section_name,content_key',
        }
      );

    if (error) {
      toast.error('Failed to save settings');
      console.error(error);
      return;
    }

    cache?.updateCacheEntry(sectionName, `${contentKey}-settings`, settingsPayload, 'json');
    setHasCustomSettings(true);
    toast.success('Settings saved');
    setShowSettingsDialog(false);

    // Keep BuilderSettingsPanel-driven edits in sync too
    window.dispatchEvent(
      new CustomEvent('editable-image:updated', {
        detail: { pageName, sectionName, contentKey, kind: 'settings' },
      })
    );
  };

  const getCroppedImg = (
    image: HTMLImageElement,
    crop: PixelCrop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scale = image.naturalWidth / image.width;
    
    const finalWidth = crop.width * scale;
    const finalHeight = crop.height * scale;
    
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scale,
      crop.y * scale,
      crop.width * scale,
      crop.height * scale,
      0,
      0,
      finalWidth,
      finalHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/png'
      );
    });
  };

  const getResizedImg = (
    image: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/png'
      );
    });
  };

  const handleCropImage = async () => {
    if (!completedCrop || !imgRef.current) {
      toast.error('Please select a crop area');
      return;
    }

    setIsCropping(true);
    try {
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      const timestamp = Date.now();
      const fileName = `cropped-${timestamp}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(fileName, croppedBlob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(fileName);

      await saveImageUrl(publicUrl);
      
      setShowCropDialog(false);
      setCrop(undefined);
      setCompletedCrop(undefined);
      toast.success('Image cropped successfully');
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error('Failed to crop image');
    } finally {
      setIsCropping(false);
    }
  };

  const handleResizeImage = async () => {
    if (!resizeImgRef.current || !resizeWidth || !resizeHeight) {
      toast.error('Please enter valid dimensions');
      return;
    }

    const width = parseInt(resizeWidth);
    const height = parseInt(resizeHeight);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      toast.error('Please enter valid dimensions');
      return;
    }

    setIsResizing(true);
    try {
      const resizedBlob = await getResizedImg(resizeImgRef.current, width, height);
      
      const timestamp = Date.now();
      const fileName = `resized-${timestamp}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(fileName, resizedBlob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(fileName);

      await saveImageUrl(publicUrl);
      
      setShowResizeDialog(false);
      setResizeWidth('');
      setResizeHeight('');
      toast.success('Image resized successfully');
    } catch (error) {
      console.error('Error resizing image:', error);
      toast.error('Failed to resize image');
    } finally {
      setIsResizing(false);
    }
  };

  const handleOpenCrop = () => {
    setShowCropDialog(true);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCropAspectRatio(undefined);
  };

  const handleOpenResize = () => {
    setShowResizeDialog(true);
    setTimeout(() => {
      if (resizeImgRef.current) {
        const ratio = resizeImgRef.current.naturalWidth / resizeImgRef.current.naturalHeight;
        setOriginalAspectRatio(ratio);
        setOriginalWidth(resizeImgRef.current.naturalWidth);
        setOriginalHeight(resizeImgRef.current.naturalHeight);
        setResizeWidth(resizeImgRef.current.naturalWidth.toString());
        setResizeHeight(resizeImgRef.current.naturalHeight.toString());
        setDimensionsLocked(true);
      }
    }, 100);
  };

  const getCenteredAspectCrop = (mediaWidth: number, mediaHeight: number, aspect: number): CropType => {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  };

  const applyAspectCrop = (aspect?: number) => {
    setCropAspectRatio(aspect);

    if (!imgRef.current || !aspect) {
      // Free aspect mode - let user draw crop manually
      setCrop(undefined);
      setCompletedCrop(undefined as unknown as PixelCrop | undefined);
      return;
    }

    // Use the rendered image dimensions so PixelCrop is in the same
    // coordinate system as ReactCrop's onComplete callback
    const renderedWidth = imgRef.current.width;
    const renderedHeight = imgRef.current.height;

    const centeredCrop = getCenteredAspectCrop(renderedWidth, renderedHeight, aspect);
    setCrop(centeredCrop);

    // Compute pixel crop in rendered pixels (same as ReactCrop does)
    const pixelCrop: PixelCrop = {
      unit: 'px',
      x: (centeredCrop.x / 100) * renderedWidth,
      y: (centeredCrop.y / 100) * renderedHeight,
      width: (centeredCrop.width / 100) * renderedWidth,
      height: (centeredCrop.height / 100) * renderedHeight,
    };

    setCompletedCrop(pixelCrop);
  };

  const handleResizeWidthChange = (value: string) => {
    setResizeWidth(value);
    
    // Only process if it's a valid number
    if (!value || isNaN(parseInt(value))) {
      return;
    }
    
    const width = parseInt(value);
    
    // Don't allow values greater than original width
    if (originalWidth && width > originalWidth) {
      setResizeWidth(originalWidth.toString());
      if (dimensionsLocked && originalAspectRatio && originalHeight) {
        setResizeHeight(originalHeight.toString());
      }
      return;
    }
    
    if (dimensionsLocked && originalAspectRatio) {
      const height = Math.round(width / originalAspectRatio);
      setResizeHeight(height.toString());
    }
  };

  const handleResizeHeightChange = (value: string) => {
    setResizeHeight(value);
    
    // Only process if it's a valid number
    if (!value || isNaN(parseInt(value))) {
      return;
    }
    
    const height = parseInt(value);
    
    // Don't allow values greater than original height
    if (originalHeight && height > originalHeight) {
      setResizeHeight(originalHeight.toString());
      if (dimensionsLocked && originalAspectRatio && originalWidth) {
        setResizeWidth(originalWidth.toString());
      }
      return;
    }
    
    if (dimensionsLocked && originalAspectRatio) {
      const width = Math.round(height * originalAspectRatio);
      setResizeWidth(width.toString());
    }
  };

  const handleSaveLink = async () => {
    const linkData = JSON.stringify({
      url: editedLink,
      target: editedTarget
    });
    
    const { error } = await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: sectionName,
        content_key: `${contentKey}-link`,
        content_value: linkData,
        content_type: 'link'
      }, {
        onConflict: 'page_name,section_name,content_key'
      });

    if (error) {
      toast.error('Failed to save link');
      console.error(error);
    } else {
      setLinkUrl(editedLink);
      setLinkTarget(editedTarget);
      setShowLinkDialog(false);
      toast.success('Link updated');
    }
  };

  const handleRemoveLink = async () => {
    const { error } = await supabase
      .from('page_content')
      .delete()
      .eq('page_name', pageName)
      .eq('section_name', sectionName)
      .eq('content_key', `${contentKey}-link`);

    if (error) {
      toast.error('Failed to remove link');
      console.error(error);
    } else {
      setLinkUrl('');
      setEditedLink('');
      setLinkTarget('_blank');
      setEditedTarget('_blank');
      setShowLinkDialog(false);
      toast.success('Link removed');
    }
  };

  const handleFileChange = async (file: File) => {
    setIsUploading(true);

    // Upload to Supabase Storage (use media-library bucket for consistency)
    const fileExt = file.name.split('.').pop();
    const fileName = `${pageName}-${sectionName}-${contentKey}-${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-library')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload image');
      console.error(uploadError);
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('media-library')
      .getPublicUrl(fileName);

    await saveImageUrl(publicUrl);
  };

  const handleImageSelect = async (url: string) => {
    await saveImageUrl(url);
  };

  const saveImageUrl = async (url: string) => {
    setIsUploading(true);
    
    // Check if this is a dynamic block
    const isDynamicBlock = contentKey.startsWith('block_');
    
    let payload: any;
    
    if (isDynamicBlock) {
      // For dynamic blocks, wrap in JSON with type, content, order
      payload = {
        page_name: pageName,
        section_name: sectionName,
        content_key: contentKey,
        content_value: JSON.stringify({
          type: 'image',
          content: url,
          order: 0
        }),
        content_type: 'text' // Dynamic blocks use 'text' type
      };
    } else {
      // For regular blocks, save directly
      payload = {
        page_name: pageName,
        section_name: sectionName,
        content_key: contentKey,
        content_value: url,
        content_type: 'image'
      };
    }

    // Save to database
    const { error: dbError } = await supabase
      .from('page_content')
      .upsert(payload, {
        onConflict: 'page_name,section_name,content_key'
      });

    setIsUploading(false);

    if (dbError) {
      toast.error('Failed to save image');
      console.error(dbError);
    } else {
      setImageSrc(url);
      // Update cache so re-renders don't revert to stale data
      cache?.updateCacheEntry(sectionName, contentKey, payload.content_value, payload.content_type);
      toast.success('Image updated successfully');

      // Image optimization via Edge Function is temporarily disabled to
      // prevent unexpected changes to uploaded assets (background, crop, size).
      // If re-enabled in the future, ensure it preserves transparency and
      // respects original dimensions before calling it here.
      // supabase.functions
      //   .invoke('optimize-image', {
      //     body: {
      //       bucket: 'media-library',
      //       path: url.split('/').pop(),
      //     },
      //   })
      //   .then(({ data, error }) => {
      //     if (error) {
      //       console.error('Image optimization failed:', error);
      //     } else {
      //       console.log('Image optimized successfully:', data);
      //       loadImage();
      //     }
      //   })
      //   .catch((error) => {
      //     console.error('Image optimization error:', error);
      //   });
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case '4:3':
        return 'aspect-[4/3]';
      case '16:9':
        return 'aspect-video';
      case 'none':
      default:
        return '';
    }
  };

  const getObjectFitClass = () => {
    if (aspectRatio === 'none') return '';
    switch (objectFit) {
      case 'contain':
        return 'object-contain';
      case 'scale-down':
        return 'object-scale-down';
      case 'cover':
      default:
        return 'object-cover';
    }
  };

  const ImageContent = () => (
    <img 
      src={imageSrc} 
      alt={alt} 
      className={`${className} ${getAspectClass()} ${getObjectFitClass()} inline-block`}
      style={{ 
        ...(hasCustomSettings ? {
          width: widthUnit === '%' ? `${widthValue}%` : `${widthValue}px`,
          height: aspectRatio === 'none' ? 'auto' : undefined,
        } : {}),
        borderRadius: 'var(--image-border-radius, 0)',
        padding: 'var(--image-padding, 0)'
      }}
      onLoad={() => {
        // Force a re-render after image loads to ensure visibility
        if (isUploading) {
          setIsUploading(false);
        }
      }}
    />
  );

  const handleImageClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;

    // When used inside a parent "component wrapper" (e.g. DynamicContentBlock),
    // let the wrapper handle selection so move/duplicate/delete actions remain available.
    if (disableBuilderSelect) return;

    e.preventDefault();
    e.stopPropagation();

    // Register with builder to show settings in the right panel
    if (builder) {
      const elementId = `img-${pageName}-${sectionName}-${contentKey}`;
      builder.selectElement({
        id: elementId,
        type: 'component',
        pageName,
        componentType: 'image',
        label: `Image: ${alt || contentKey}`,
        // Provide the data ImageEditor expects so changes actually save/apply
        contentData: {
          pageName,
          sectionName,
          contentKey,
          src: imageSrc,
        },
        onContentSave: async (next: any) => {
          if (next?.src && typeof next.src === 'string') {
            await saveImageUrl(next.src);
          }
        },
        actions: [
          { id: 'change', label: 'Change image', onClick: () => setShowPicker(true) },
          { id: 'link', label: linkUrl ? 'Edit link' : 'Add link', onClick: () => setShowLinkDialog(true) },
          { id: 'settings', label: 'Image settings', onClick: () => setShowSettingsDialog(true) },
        ],
      });
    }
  };

  const getAlignmentClass = () => {
    switch (alignment) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      case 'left':
      default:
        return '';
    }
  };

  const isSelected = builder?.selectedElement?.id === `img-${pageName}-${sectionName}-${contentKey}`;

  return (
    <>
      <div
        className={`relative w-full ${getAlignmentClass()}`}
      >
        {linkUrl && !isEditMode ? (
          linkUrl.startsWith('http') ? (
            <a 
              href={linkUrl} 
              target={linkTarget} 
              rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined} 
              className="block"
            >
              <ImageContent />
            </a>
          ) : (
            linkTarget === '_blank' ? (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="block">
                <ImageContent />
              </a>
            ) : (
              <Link to={linkUrl} className="block">
                <ImageContent />
              </Link>
            )
          )
        ) : (
          <div onClick={handleImageClick} className={isEditMode ? 'cursor-pointer' : ''}>
            <ImageContent />
          </div>
        )}
        
        {isEditMode && isSelected && (
          <div
            className="absolute inset-0 pointer-events-none z-[70] rounded-md"
            style={{
              border: `2px solid ${BC.blue}`,
              boxShadow: `0 0 0 2px ${BC.blue}33`,
            }}
          />
        )}

        <ImagePickerDialog
          open={showPicker}
          onOpenChange={setShowPicker}
          onImageSelect={handleImageSelect}
          onFileUpload={handleFileChange}
        />
      </div>

      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image Link</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="imageLink">Link URL</Label>
              <Input
                id="imageLink"
                value={editedLink}
                onChange={(e) => setEditedLink(e.target.value)}
                placeholder="/page or https://example.com"
              />
              <p className="text-xs text-muted-foreground">
                Use /page for internal links or full URLs for external links
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageLinkTarget">Open In</Label>
              <Select
                value={editedTarget}
                onValueChange={(value: '_self' | '_blank') => setEditedTarget(value)}
              >
                <SelectTrigger id="imageLinkTarget">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">Same Window</SelectItem>
                  <SelectItem value="_blank">New Window</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {linkUrl && (
              <Button variant="destructive" onClick={handleRemoveLink}>
                <X className="h-4 w-4 mr-2" />
                Remove Link
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveLink} className="bg-pink-600 hover:bg-pink-700 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Image Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Width</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={widthValue}
                  onChange={(e) => setWidthValue(e.target.value)}
                  placeholder="100"
                  min="1"
                />
                <Select
                  value={widthUnit}
                  onValueChange={setWidthUnit}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="aspectRatio">Aspect Ratio</Label>
              <Select
                value={aspectRatio}
                onValueChange={(value: 'none' | 'square' | '4:3' | '16:9') => setAspectRatio(value)}
              >
                <SelectTrigger id="aspectRatio">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Auto)</SelectItem>
                  <SelectItem value="square">Square (1:1)</SelectItem>
                  <SelectItem value="4:3">Standard (4:3)</SelectItem>
                  <SelectItem value="16:9">Widescreen (16:9)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectFit">Image Fit</Label>
              <Select
                value={objectFit}
                onValueChange={(value: 'cover' | 'contain' | 'scale-down') => setObjectFit(value)}
                disabled={aspectRatio === 'none'}
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
              <p className="text-xs text-muted-foreground">
                Image fit only applies when an aspect ratio is set
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alignment">Alignment</Label>
              <Select
                value={alignment}
                onValueChange={(value: 'left' | 'center' | 'right') => setAlignment(value)}
              >
                <SelectTrigger id="alignment">
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 border-t space-y-2">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setShowSettingsDialog(false);
                  handleOpenCrop();
                }}
              >
                <Crop className="w-4 h-4 mr-2" />
                Crop Image
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setShowSettingsDialog(false);
                  handleOpenResize();
                }}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Resize Image
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSaveSettings} className="bg-pink-600 hover:bg-pink-700 text-white">
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-6xl h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-shrink-0 py-4">
            <div className="space-y-2">
              <Label>Crop Aspect Ratio</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={cropAspectRatio === undefined ? "default" : "outline"}
                  onClick={() => {
                    setCropAspectRatio(undefined);
                    setCrop(undefined);
                    setCompletedCrop(undefined as unknown as PixelCrop | undefined);
                  }}
                >
                  Free
                </Button>
                <Button
                  size="sm"
                  variant={cropAspectRatio === 1 ? "default" : "outline"}
                  onClick={() => applyAspectCrop(1)}
                >
                  Square (1:1)
                </Button>
                <Button
                  size="sm"
                  variant={cropAspectRatio === 4/3 ? "default" : "outline"}
                  onClick={() => applyAspectCrop(4/3)}
                >
                  4:3
                </Button>
                <Button
                  size="sm"
                  variant={cropAspectRatio === 16/9 ? "default" : "outline"}
                  onClick={() => applyAspectCrop(16/9)}
                >
                  16:9
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center flex-1 pb-4 overflow-auto" style={{ maxHeight: 'calc(80vh - 300px)' }}>
            <div className="w-full h-full flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropAspectRatio}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  crossOrigin="anonymous"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(80vh - 300px)',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </ReactCrop>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowCropDialog(false)} disabled={isCropping}>
              Cancel
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleCropImage} 
              disabled={!completedCrop || isCropping}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {isCropping ? 'Cropping...' : 'Crop & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResizeDialog} onOpenChange={setShowResizeDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resize Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Dimensions</Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Width (px)"
                  value={resizeWidth}
                  onChange={(e) => handleResizeWidthChange(e.target.value)}
                  max={originalWidth || undefined}
                  className="w-full"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setDimensionsLocked(!dimensionsLocked)}
                  className="flex-shrink-0"
                  type="button"
                >
                  {dimensionsLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </Button>
                <Input
                  type="number"
                  placeholder="Height (px)"
                  value={resizeHeight}
                  onChange={(e) => handleResizeHeightChange(e.target.value)}
                  max={originalHeight || undefined}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Original: {originalWidth} × {originalHeight}px (images can only be resized down)
              </p>
            </div>
            <div className="flex items-center justify-center border rounded-lg p-4 bg-muted/20">
              <img
                ref={resizeImgRef}
                src={imageSrc}
                alt="Resize preview"
                crossOrigin="anonymous"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResizeDialog(false)} disabled={isResizing}>
              Cancel
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleResizeImage} 
              disabled={!resizeWidth || !resizeHeight || isResizing}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              {isResizing ? 'Resizing...' : 'Resize & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
