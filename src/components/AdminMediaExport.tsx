import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MEDIA_BUCKETS = [
  { id: 'media-library', name: 'Media Library', description: 'Main media assets' },
  { id: 'exhibitor-logos', name: 'Exhibitor Logos', description: 'Company logos' },
  { id: 'speaker-headshots', name: 'Speaker Headshots', description: 'Speaker photos' },
];

export const AdminMediaExport = () => {
  const [exportingBuckets, setExportingBuckets] = useState<Set<string>>(new Set());

  const handleExportBucket = async (bucketName: string) => {
    setExportingBuckets(prev => new Set(prev).add(bucketName));

    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      let offset = 0;
      const limit = 20;
      let totalFiles = 0;
      let totalDownloaded = 0;
      let totalFailed = 0;
      let hasMore = true;

      toast.info(`Preparing ${bucketName} for download...`);

      // Fetch file metadata and signed URLs in batches
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('export-media-zip', {
          body: { bucketName, offset, limit },
        });

        if (error) throw error;

        if (!data || !Array.isArray(data.files)) {
          throw new Error('Invalid response from export function');
        }

        totalFiles = data.totalFiles ?? totalFiles ?? 0;
        hasMore = data.hasMore;
        offset += limit;

        // Download each file directly from storage using the signed URL
        for (const file of data.files) {
          try {
            if (!file.signedUrl) {
              console.warn(`Missing signedUrl for file ${file.name}`);
              totalFailed++;
              continue;
            }

            const response = await fetch(file.signedUrl);
            if (!response.ok) {
              console.error(`Failed to download ${file.name}: ${response.status}`);
              totalFailed++;
              continue;
            }

            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            zip.file(file.name, arrayBuffer);
            totalDownloaded++;
          } catch (err) {
            console.error(`Error downloading ${file.name}:`, err);
            totalFailed++;
          }
        }

        if (hasMore) {
          toast.info(
            `Processing ${bucketName}: ${totalDownloaded}` +
              (totalFiles ? `/${totalFiles}` : '') +
              ' files...'
          );
        }
      }

      // Generate ZIP blob
      toast.info(`Creating ZIP file for ${bucketName}...`);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${bucketName}-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Downloaded ${totalDownloaded}` +
          (totalFiles ? ` of ${totalFiles}` : '') +
          ` files from ${bucketName}` +
          (totalFailed > 0 ? ` (${totalFailed} failed)` : '')
      );
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || `Failed to export ${bucketName}`);
    } finally {
      setExportingBuckets(prev => {
        const newSet = new Set(prev);
        newSet.delete(bucketName);
        return newSet;
      });
    }
  };

  const handleExportAll = async () => {
    toast.info('Exporting all media libraries...');
    
    for (const bucket of MEDIA_BUCKETS) {
      await handleExportBucket(bucket.id);
      // Small delay between exports to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Media Libraries</CardTitle>
        <CardDescription>
          Download storage buckets as ZIP files containing all media assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MEDIA_BUCKETS.map(bucket => {
            const isExporting = exportingBuckets.has(bucket.id);
            
            return (
              <Card key={bucket.id} className="relative">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{bucket.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {bucket.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleExportBucket(bucket.id)}
                    disabled={isExporting}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export as ZIP
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={handleExportAll}
            disabled={exportingBuckets.size > 0}
            className="w-full sm:w-auto"
          >
            {exportingBuckets.size > 0 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting {exportingBuckets.size} of {MEDIA_BUCKETS.length}...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export All 3 Media Libraries
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
