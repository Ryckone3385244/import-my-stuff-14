import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Loader2, AlertCircle, CheckCircle, FolderArchive, FileImage, Database, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { remapMediaUrlsClient } from "@/lib/remapMediaUrls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define media buckets that contain user-uploaded files
const MEDIA_BUCKETS = [
  { id: 'media-library', name: 'Media Library', description: 'Main media assets' },
  { id: 'exhibitor-logos', name: 'Exhibitor Logos', description: 'Company logos' },
  { id: 'speaker-headshots', name: 'Speaker Headshots', description: 'Speaker photos' },
  { id: 'marketing-materials', name: 'Marketing Materials', description: 'Marketing assets' },
  { id: 'supplier-files', name: 'Supplier Files', description: 'Supplier documents' },
  { id: 'speaker-forms', name: 'Speaker Forms', description: 'Speaker submission forms' },
];

interface ExportProgress {
  stage: 'idle' | 'exporting-data' | 'fetching-files' | 'downloading-files' | 'creating-zip' | 'complete';
  currentBucket?: string;
  filesProcessed: number;
  totalFiles: number;
  bucketsProcessed: number;
  totalBuckets: number;
}

interface ImportProgress {
  stage: 'idle' | 'extracting' | 'uploading-files' | 'importing-data' | 'remapping-urls' | 'complete';
  currentBucket?: string;
  filesUploaded: number;
  totalFiles: number;
  bucketsProcessed: number;
  totalBuckets: number;
}

interface FileManifest {
  bucketId: string;
  fileName: string;
  originalUrl: string;
  mimeType?: string;
  size?: number;
}

export const AdminCompleteExportImport = () => {
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    stage: 'idle',
    filesProcessed: 0,
    totalFiles: 0,
    bucketsProcessed: 0,
    totalBuckets: 0
  });
  
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    stage: 'idle',
    filesUploaded: 0,
    totalFiles: 0,
    bucketsProcessed: 0,
    totalBuckets: 0
  });
  
  const [selectedBuckets, setSelectedBuckets] = useState<Set<string>>(
    new Set(MEDIA_BUCKETS.map(b => b.id))
  );
  
  const [exportResult, setExportResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isExporting = exportProgress.stage !== 'idle' && exportProgress.stage !== 'complete';
  const isImporting = importProgress.stage !== 'idle' && importProgress.stage !== 'complete';

  const toggleBucket = (bucketId: string) => {
    const newSet = new Set(selectedBuckets);
    if (newSet.has(bucketId)) {
      newSet.delete(bucketId);
    } else {
      newSet.add(bucketId);
    }
    setSelectedBuckets(newSet);
  };

  const handleCompleteExport = async () => {
    setExportProgress({
      stage: 'exporting-data',
      filesProcessed: 0,
      totalFiles: 0,
      bucketsProcessed: 0,
      totalBuckets: selectedBuckets.size
    });
    setExportResult(null);

    try {
      // Dynamic import of JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Step 1: Export project data JSON
      toast.info('Exporting database records...');
      const { data: projectData, error: exportError } = await supabase.functions.invoke('export-project-data');
      
      if (exportError) throw exportError;

      // Step 2: Fetch and download files from each selected bucket
      const fileManifest: FileManifest[] = [];
      const bucketList = Array.from(selectedBuckets);
      let totalFilesCount = 0;
      let processedFiles = 0;

      setExportProgress(prev => ({ ...prev, stage: 'fetching-files' }));

      // First pass: count all files
      for (const bucketId of bucketList) {
        try {
          const { data } = await supabase.functions.invoke('export-media-zip', {
            body: { bucketName: bucketId, offset: 0, limit: 1 }
          });
          totalFilesCount += data?.totalFiles || 0;
        } catch (err) {
          console.warn(`Could not count files in ${bucketId}:`, err);
        }
      }

      setExportProgress(prev => ({ ...prev, totalFiles: totalFilesCount }));

      // Second pass: download all files
      setExportProgress(prev => ({ ...prev, stage: 'downloading-files' }));

      for (let bucketIndex = 0; bucketIndex < bucketList.length; bucketIndex++) {
        const bucketId = bucketList[bucketIndex];
        const bucketFolder = zip.folder(`media/${bucketId}`);
        
        setExportProgress(prev => ({
          ...prev,
          currentBucket: bucketId,
          bucketsProcessed: bucketIndex
        }));

        let offset = 0;
        const limit = 20;
        let hasMore = true;

        while (hasMore) {
          try {
            const { data, error } = await supabase.functions.invoke('export-media-zip', {
              body: { bucketName: bucketId, offset, limit }
            });

            if (error) {
              console.error(`Error fetching files from ${bucketId}:`, error);
              break;
            }

            hasMore = data?.hasMore || false;
            offset += limit;

            for (const file of data?.files || []) {
              try {
                if (!file.signedUrl) continue;

                const response = await fetch(file.signedUrl);
                if (!response.ok) {
                  console.warn(`Failed to download ${file.name} from ${bucketId}`);
                  continue;
                }

                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();
                
                // Add to zip in bucket subfolder
                bucketFolder?.file(file.name, arrayBuffer);
                
                // Build the original URL pattern for mapping
                // The actual URL will be determined from the manifest during import
                const { data: { publicUrl } } = supabase.storage
                  .from(bucketId)
                  .getPublicUrl(file.name);
                
                // Add to manifest for URL remapping
                fileManifest.push({
                  bucketId,
                  fileName: file.name,
                  originalUrl: publicUrl,
                  mimeType: blob.type,
                  size: blob.size
                });

                processedFiles++;
                setExportProgress(prev => ({ ...prev, filesProcessed: processedFiles }));
              } catch (fileErr) {
                console.warn(`Error processing file ${file.name}:`, fileErr);
              }
            }
          } catch (batchErr) {
            console.error(`Error processing batch from ${bucketId}:`, batchErr);
            break;
          }
        }
      }

      setExportProgress(prev => ({
        ...prev,
        bucketsProcessed: bucketList.length,
        stage: 'creating-zip'
      }));

      // Step 3: Add project data and manifest to zip
      const enhancedProjectData = {
        ...projectData,
        completeExport: {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          includesMedia: true,
          buckets: bucketList,
          fileManifest
        }
      };

      zip.file('project-data.json', JSON.stringify(enhancedProjectData, null, 2));
      zip.file('file-manifest.json', JSON.stringify(fileManifest, null, 2));
      zip.file('README.txt', `
COMPLETE PROJECT EXPORT
=======================

This archive contains:

1. project-data.json - All database records (exhibitors, speakers, pages, settings, etc.)
2. file-manifest.json - List of all exported media files with their original URLs
3. media/ - Folder containing all media files organized by bucket

Buckets included:
${bucketList.map(b => `  - ${b}`).join('\n')}

Total files: ${processedFiles}
Export date: ${new Date().toISOString()}

IMPORT INSTRUCTIONS:
1. Go to your new project's Admin panel
2. Navigate to the Export/Import section
3. Use "Complete Import" and select this ZIP file
4. The import will:
   - Upload all media files to their respective buckets
   - Import all database records
   - Automatically remap all image URLs to the new locations

Note: User accounts are NOT included and will need to be recreated manually.
      `.trim());

      toast.info('Creating ZIP archive...');
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Download the ZIP
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complete-project-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(prev => ({ ...prev, stage: 'complete' }));
      setExportResult({
        filesExported: processedFiles,
        bucketsExported: bucketList.length,
        tables: Object.keys(projectData.metadata?.tableCounts || {}).length,
        zipSize: (zipBlob.size / (1024 * 1024)).toFixed(2) + ' MB'
      });

      toast.success(`Complete export finished! ${processedFiles} files + all data packaged.`);

    } catch (error: any) {
      console.error('Complete export error:', error);
      toast.error(error.message || 'Failed to create complete export');
      setExportProgress(prev => ({ ...prev, stage: 'idle' }));
    }
  };

  const handleCompleteImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportProgress({
      stage: 'extracting',
      filesUploaded: 0,
      totalFiles: 0,
      bucketsProcessed: 0,
      totalBuckets: 0
    });
    setImportResult(null);

    try {
      // Ensure a fresh auth token before uploads / backend calls (prevents "Invalid JWT")
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again to import.');
        await supabase.auth.signOut();
        window.location.assign('/login?redirect=/admin');
        return;
      }

      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh failed:', refreshError);
        toast.error('Session expired. Please log in again to import.');
        await supabase.auth.signOut();
        window.location.assign('/login?redirect=/admin');
        return;
      }

      const JSZip = (await import('jszip')).default;
      
      toast.info('Reading ZIP file...');
      const zipData = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(zipData);

      // Step 1: Read project data and manifest
      const projectDataFile = zip.file('project-data.json');
      const manifestFile = zip.file('file-manifest.json');

      if (!projectDataFile) {
        throw new Error('Invalid export: project-data.json not found in ZIP');
      }

      const projectDataText = await projectDataFile.async('text');
      const projectData = JSON.parse(projectDataText);

      let fileManifest: FileManifest[] = [];
      if (manifestFile) {
        const manifestText = await manifestFile.async('text');
        fileManifest = JSON.parse(manifestText);
      }

      // Step 2: Upload media files
      const mediaFolder = zip.folder('media');
      const urlMappings: { oldUrl: string; newUrl: string }[] = [];
      
      if (mediaFolder) {
        // Get all files grouped by bucket
        // Using 'any' type for JSZip objects since we're dynamically importing
        const bucketFiles = new Map<string, { path: string; file: any }[]>();
        
        zip.forEach((relativePath: string, zipEntry: any) => {
          if (relativePath.startsWith('media/') && !zipEntry.dir) {
            const parts = relativePath.replace('media/', '').split('/');
            if (parts.length >= 2) {
              const bucketId = parts[0];
              const fileName = parts.slice(1).join('/');
              
              if (!bucketFiles.has(bucketId)) {
                bucketFiles.set(bucketId, []);
              }
              bucketFiles.get(bucketId)!.push({ path: fileName, file: zipEntry });
            }
          }
        });

        const totalFiles = Array.from(bucketFiles.values()).reduce((sum, files) => sum + files.length, 0);
        const bucketList = Array.from(bucketFiles.keys());
        
        setImportProgress(prev => ({
          ...prev,
          stage: 'uploading-files',
          totalFiles,
          totalBuckets: bucketList.length
        }));

        let uploadedCount = 0;

        for (let bucketIndex = 0; bucketIndex < bucketList.length; bucketIndex++) {
          const bucketId = bucketList[bucketIndex];
          const files = bucketFiles.get(bucketId) || [];

          setImportProgress(prev => ({
            ...prev,
            currentBucket: bucketId,
            bucketsProcessed: bucketIndex
          }));

          for (const { path: fileName, file: zipEntry } of files) {
            try {
              const fileData = await zipEntry.async('arraybuffer');
              const blob = new Blob([fileData]);

              // Upload to Supabase storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucketId)
                .upload(fileName, blob, {
                  cacheControl: '3600',
                  upsert: true
                });

              if (uploadError) {
                console.warn(`Failed to upload ${fileName} to ${bucketId}:`, uploadError);
                continue;
              }

              // Get public URL for the uploaded file
              const { data: { publicUrl } } = supabase.storage
                .from(bucketId)
                .getPublicUrl(fileName);

              // Find original URL from manifest
              const manifestEntry = fileManifest.find(
                m => m.bucketId === bucketId && m.fileName === fileName
              );

              if (manifestEntry?.originalUrl && publicUrl) {
                urlMappings.push({
                  oldUrl: manifestEntry.originalUrl,
                  newUrl: publicUrl
                });
              }

              uploadedCount++;
              setImportProgress(prev => ({ ...prev, filesUploaded: uploadedCount }));

            } catch (uploadErr) {
              console.warn(`Error uploading ${fileName}:`, uploadErr);
            }
          }
        }

        setImportProgress(prev => ({
          ...prev,
          bucketsProcessed: bucketList.length
        }));
      }

      // Step 3: Import database data
      setImportProgress(prev => ({ ...prev, stage: 'importing-data' }));
      toast.info('Importing database records...');

      const { data: importData, error: importError } = await supabase.functions.invoke('import-project-data', {
        body: { importData: projectData }
      });

      if (importError) {
        console.error('Import error:', importError);
        toast.error('Data import failed, but files were uploaded');
      }

      // Step 4: Remap URLs if we have mappings
      let remapResult = null;
      if (urlMappings.length > 0) {
        setImportProgress(prev => ({ ...prev, stage: 'remapping-urls' }));
        toast.info(`Remapping ${urlMappings.length} media URLs...`);

        try {
          const results = await remapMediaUrlsClient(urlMappings);
          remapResult = results;

          if (results.errors?.length) {
            console.warn('URL remapping completed with errors:', results.errors);
          }
        } catch (remapErr) {
          console.warn('URL remapping failed:', remapErr);
        }
      }

      setImportProgress(prev => ({ ...prev, stage: 'complete' }));
      setImportResult({
        filesUploaded: importProgress.filesUploaded,
        urlsRemapped: urlMappings.length,
        importData: importData,
        remapResult
      });

      toast.success('Complete import finished! Reloading page...');
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) {
      console.error('Complete import error:', error);
      toast.error(error.message || 'Failed to complete import');
      setImportProgress(prev => ({ ...prev, stage: 'idle' }));
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const getExportProgressPercent = () => {
    if (exportProgress.stage === 'idle') return 0;
    if (exportProgress.stage === 'complete') return 100;
    if (exportProgress.stage === 'exporting-data') return 5;
    if (exportProgress.stage === 'fetching-files') return 10;
    if (exportProgress.stage === 'creating-zip') return 95;
    if (exportProgress.totalFiles === 0) return 15;
    return 15 + (exportProgress.filesProcessed / exportProgress.totalFiles) * 75;
  };

  const getImportProgressPercent = () => {
    if (importProgress.stage === 'idle') return 0;
    if (importProgress.stage === 'complete') return 100;
    if (importProgress.stage === 'extracting') return 5;
    if (importProgress.stage === 'importing-data') return 80;
    if (importProgress.stage === 'remapping-urls') return 90;
    if (importProgress.totalFiles === 0) return 10;
    return 10 + (importProgress.filesUploaded / importProgress.totalFiles) * 65;
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Package className="h-4 w-4" />
        <AlertTitle>Complete Export/Import with Media Files</AlertTitle>
        <AlertDescription>
          This tool creates a complete backup including all database records AND all uploaded media files 
          (logos, photos, documents). When you import to a new project, images will work automatically.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="export">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">
            <Download className="mr-2 h-4 w-4" />
            Complete Export
          </TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="mr-2 h-4 w-4" />
            Complete Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderArchive className="h-5 w-5" />
                Create Complete Backup
              </CardTitle>
              <CardDescription>
                Export all database records AND all media files into a single ZIP archive.
                This ensures nothing is lost when migrating to a new project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bucket Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select media buckets to include:</Label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {MEDIA_BUCKETS.map(bucket => (
                    <div key={bucket.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={bucket.id}
                        checked={selectedBuckets.has(bucket.id)}
                        onCheckedChange={() => toggleBucket(bucket.id)}
                        disabled={isExporting}
                      />
                      <Label
                        htmlFor={bucket.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {bucket.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress */}
              {isExporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{exportProgress.stage.replace(/-/g, ' ')}</span>
                    {exportProgress.currentBucket && (
                      <span className="text-muted-foreground">
                        Bucket: {exportProgress.currentBucket}
                      </span>
                    )}
                  </div>
                  <Progress value={getExportProgressPercent()} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Files: {exportProgress.filesProcessed} / {exportProgress.totalFiles}
                    </span>
                    <span>
                      Buckets: {exportProgress.bucketsProcessed} / {exportProgress.totalBuckets}
                    </span>
                  </div>
                </div>
              )}

              {/* Export Result */}
              {exportResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Export Complete</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 text-sm space-y-1">
                      <li>• Files exported: {exportResult.filesExported}</li>
                      <li>• Buckets included: {exportResult.bucketsExported}</li>
                      <li>• Database tables: {exportResult.tables}</li>
                      <li>• Archive size: {exportResult.zipSize}</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleCompleteExport}
                disabled={isExporting || selectedBuckets.size === 0}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Complete Backup...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download Complete Backup (Data + All Media)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restore from Complete Backup
              </CardTitle>
              <CardDescription>
                Upload a complete backup ZIP file to restore all database records and media files.
                Image URLs will be automatically updated to work in this project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This will overwrite existing data with matching IDs 
                  and may upload many files to storage. Make sure to backup your current data first.
                </AlertDescription>
              </Alert>

              {/* Progress */}
              {isImporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{importProgress.stage.replace(/-/g, ' ')}</span>
                    {importProgress.currentBucket && (
                      <span className="text-muted-foreground">
                        Bucket: {importProgress.currentBucket}
                      </span>
                    )}
                  </div>
                  <Progress value={getImportProgressPercent()} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Files: {importProgress.filesUploaded} / {importProgress.totalFiles}
                    </span>
                    <span>
                      Buckets: {importProgress.bucketsProcessed} / {importProgress.totalBuckets}
                    </span>
                  </div>
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Import Complete</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 text-sm space-y-1">
                      <li>• Files uploaded: {importResult.filesUploaded}</li>
                      <li>• URLs remapped: {importResult.urlsRemapped}</li>
                      {importResult.importData?.summary && (
                        <>
                          <li>• Records imported: {importResult.importData.summary.totalRecords}</li>
                          <li>• Duration: {importResult.importData.summary.duration}</li>
                        </>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleCompleteImport}
                  disabled={isImporting}
                  className="hidden"
                  id="complete-import-file"
                />
                <label htmlFor="complete-import-file">
                  <Button
                    disabled={isImporting}
                    className="w-full"
                    size="lg"
                    asChild
                  >
                    <span>
                      {isImporting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Restoring Backup...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Complete Backup (.zip)
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
