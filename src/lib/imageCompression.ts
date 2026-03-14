/**
 * Compress an image file to be under target size
 * @param file Original image file
 * @param maxSizeKB Target size in KB (default 500KB)
 * @returns Compressed image blob
 */
export async function compressImage(
  file: File,
  maxSizeKB: number = 500
): Promise<Blob> {
  const fileSizeMB = file.size / (1024 * 1024);
  
  // If file is already small enough, return as-is
  if (file.size <= maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions (max 1920px on longest side for web)
      let width = img.width;
      let height = img.height;
      const maxDimension = 1920;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels to get under target size
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // If still too large and quality can go lower, try again (JPEG only)
            if (mimeType === 'image/jpeg' && blob.size > maxSizeKB * 1024 && quality > 0.1) {
              quality -= 0.1;
              tryCompress();
            } else {
              resolve(blob);
            }
          },
          mimeType,
          mimeType === 'image/jpeg' ? quality : undefined
        );
      };

      tryCompress();
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert a Blob to File
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}
