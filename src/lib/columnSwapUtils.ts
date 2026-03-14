import { ReactElement, isValidElement, Children } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Recursively checks if an element or its children contain media (images/videos)
 */
export const containsMedia = (element: ReactElement): boolean => {
  const props = element.props as Record<string, any>;
  const type = element.type as any;
  
  // Check component name for media components
  const componentName = typeof type === 'function' 
    ? type.displayName || type.name || '' 
    : typeof type === 'string' ? type : '';
  
  // Check for media HTML tags
  if (['img', 'video', 'picture'].includes(componentName.toLowerCase())) {
    return true;
  }
  
  // Check for media component names
  const mediaComponentNames = [
    'EditableImage', 
    'EditableVideo', 
    'AspectRatio',
    'ImageCarouselBlock',
    'PhotoGalleryBlock',
    'HoverOverlayImageCard'
  ];
  
  if (mediaComponentNames.some(name => componentName.includes(name))) {
    return true;
  }
  
  // Check for src prop that looks like an image
  if (props.src && typeof props.src === 'string') {
    const src = props.src.toLowerCase();
    if (src.match(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov)(\?|$)/i)) {
      return true;
    }
  }
  
  // Recursively check children
  if (props.children) {
    if (isValidElement(props.children)) {
      if (containsMedia(props.children as ReactElement)) {
        return true;
      }
    } else if (Array.isArray(props.children)) {
      for (const child of props.children) {
        if (isValidElement(child) && containsMedia(child as ReactElement)) {
          return true;
        }
      }
    }
  }
  
  return false;
};

/**
 * Checks if dynamic content for a column contains media blocks
 */
export const checkDynamicContentForMedia = async (
  pageName: string,
  sectionId: string,
  columnId: string
): Promise<boolean> => {
  const baseSectionName = `${sectionId}-${columnId}`;
  
  const { data, error } = await supabase
    .from('page_content')
    .select('content_value, content_type')
    .eq('page_name', pageName)
    .eq('section_name', baseSectionName)
    .like('content_key', 'block_%');
  
  if (error || !data) return false;
  
  return data.some(row => {
    // Direct media content types
    if (row.content_type === 'image' || row.content_type === 'video') {
      return true;
    }
    
    // Try parsing JSON content value for block type
    try {
      const parsed = JSON.parse(row.content_value);
      const mediaTypes = ['image', 'video', 'photo-gallery', 'image-carousel'];
      return mediaTypes.includes(parsed.type);
    } catch {
      return false;
    }
  });
};

/**
 * Determines if two columns should be swapped on mobile
 * (media column should appear above text column)
 */
export interface ColumnSwapResult {
  shouldSwap: boolean;
  leftIsText: boolean;
  rightHasMedia: boolean;
}

export const shouldSwapColumns = (
  leftColumnHasMedia: boolean,
  rightColumnHasMedia: boolean
): ColumnSwapResult => {
  // Swap when: left has NO media AND right HAS media
  const leftIsText = !leftColumnHasMedia;
  const shouldSwap = leftIsText && rightColumnHasMedia;
  
  return {
    shouldSwap,
    leftIsText,
    rightHasMedia: rightColumnHasMedia
  };
};