import { supabase } from "@/integrations/supabase/client";

/**
 * Downloads a file using blob-based approach to bypass cross-origin restrictions.
 * Falls back to window.open if fetch fails.
 */
export const downloadFile = async (fileUrl: string, fileName: string) => {
  try {
    // Try to detect if it's a Supabase storage URL and use the SDK
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && fileUrl.includes(supabaseUrl) && fileUrl.includes("/storage/v1/object/public/")) {
      const marker = "/storage/v1/object/public/";
      const markerIndex = fileUrl.indexOf(marker);
      if (markerIndex !== -1) {
        const pathAfterMarker = fileUrl.substring(markerIndex + marker.length);
        const slashIndex = pathAfterMarker.indexOf("/");
        if (slashIndex !== -1) {
          const bucket = pathAfterMarker.substring(0, slashIndex);
          const filePath = decodeURIComponent(pathAfterMarker.substring(slashIndex + 1));
          const { data, error } = await supabase.storage.from(bucket).download(filePath);
          if (!error && data) {
            triggerBlobDownload(data, fileName);
            return;
          }
        }
      }
    }

    // Fallback: fetch as blob
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Fetch failed");
    const blob = await response.blob();
    triggerBlobDownload(blob, fileName);
  } catch (error) {
    console.error("Download failed, opening in new tab:", error);
    window.open(fileUrl, "_blank");
  }
};

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
