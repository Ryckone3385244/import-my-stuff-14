import { supabase } from "@/integrations/supabase/client";

interface OptimizeImageOptions {
  bucket: string;
  path: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

interface OptimizeImageResult {
  optimizedUrl: string;
  originalPath: string;
  optimizedPath: string;
  format: string;
}

/**
 * Optimizes an uploaded image by resizing, converting to WebP, and applying compression
 * Stores both original and optimized versions
 */
export async function optimizeUploadedImage(
  options: OptimizeImageOptions
): Promise<OptimizeImageResult> {
  const { bucket, path, maxWidth = 1920, maxHeight = 1920, quality = 92 } = options;

  // Skip SVG files
  if (path.toLowerCase().endsWith('.svg')) {
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      optimizedUrl: publicUrl,
      originalPath: path,
      optimizedPath: path,
      format: 'svg'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('optimize-image-upload', {
      body: {
        bucket,
        path,
        maxWidth,
        maxHeight,
        quality
      }
    });

    if (error) throw error;
    if (!data) throw new Error('No data returned from optimization');

    return data as OptimizeImageResult;
  } catch (error) {
    console.error('Image optimization failed:', error);
    // Return original image URL as fallback
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      optimizedUrl: publicUrl,
      originalPath: path,
      optimizedPath: path,
      format: 'original'
    };
  }
}
