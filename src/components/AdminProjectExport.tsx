import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Loader2, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { remapMediaUrlsClient } from "@/lib/remapMediaUrls";

export const AdminProjectExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRemapping, setIsRemapping] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [remapResult, setRemapResult] = useState<any>(null);
  const [exportWarnings, setExportWarnings] = useState<string[]>([]);

  const handleExport = async () => {
    setIsExporting(true);
    setImportResult(null);
    setExportWarnings([]);

    try {
      // Wait briefly to ensure any in-flight saves complete
      // This addresses timing issues where recent edits might not be committed yet
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get a timestamp of the most recent content update to verify freshness
      const { data: recentContent } = await supabase
        .from('page_content')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const lastContentUpdate = recentContent?.updated_at 
        ? new Date(recentContent.updated_at).toISOString() 
        : null;
      
      console.log('Export starting, last content update:', lastContentUpdate);

      const { data, error } = await supabase.functions.invoke('export-project-data');

      if (error) throw error;

      // Add freshness metadata to export
      if (data.project) {
        data.project.lastContentUpdate = lastContentUpdate;
        data.project.exportTimestamp = new Date().toISOString();
      }

      // Store validation warnings
      if (data.validation?.warnings?.length > 0) {
        setExportWarnings(data.validation.warnings);
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-export-v3-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show detailed export summary
      const totalItems = 
        (data.mediaLibrary?.length || 0) +
        (data.users?.roles?.length || 0) +
        (data.tables?.speakers?.length || 0) +
        (data.tables?.exhibitors?.length || 0) +
        (data.tables?.suppliers?.length || 0) +
        (data.tables?.marketingTools?.length || 0) +
        (data.pages?.length || 0) +
        (data.storage?.buckets?.length || 0);
      
      toast.success(
        `Exported ${totalItems} items (v3.1) including ${data.validation?.checksums?.totalWarnings || 0} warnings`
      );
      
      console.log('Export summary (v3.1):', {
        version: data.project.version,
        lastContentUpdate,
        userRoles: data.users?.roles?.length || 0,
        userProfiles: data.users?.profiles?.length || 0,
        mediaLibrary: data.mediaLibrary?.length || 0,
        mediaUrlMappings: data.mediaUrlMappings?.length || 0,
        speakers: data.tables?.speakers?.length || 0,
        exhibitors: data.tables?.exhibitors?.length || 0,
        suppliers: data.tables?.suppliers?.length || 0,
        marketingTools: data.tables?.marketingTools?.length || 0,
        draftSessions: data.tables?.draftSessions?.length || 0,
        pages: data.pages?.length || 0,
        rawPageContent: data.rawTables?.page_content?.length || 0,
        storageBuckets: data.storage?.buckets?.length || 0,
        storagePolicies: data.storage?.policies?.length || 0,
        theme: data.theme ? 'included' : 'none',
        warnings: data.validation?.warnings?.length || 0
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export project data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Ensure a fresh auth token before calling backend function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again and retry.');
        await supabase.auth.signOut();
        window.location.assign('/login?redirect=/admin');
        return;
      }

      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Session refresh failed:', refreshError);
        toast.error('Session expired. Please log in again and retry.');
        await supabase.auth.signOut();
        window.location.assign('/login?redirect=/admin');
        return;
      }

      const { data, error } = await supabase.functions.invoke('import-project-data', {
        body: { importData }
      });

      if (error) {
        // Try to get more details from the error
        console.error('Import error:', error);
        const errorMessage = error.message || 'Failed to import project data';
        // Check if it's an auth issue
        if (errorMessage.includes('non-2xx') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
          toast.error('Session expired or invalid. Please log in again and retry.');
        } else {
          toast.error(errorMessage);
        }
        return;
      }

      // Check if data contains an error response
      if (data?.error) {
        console.error('Import returned error:', data);
        toast.error(data.details || data.error);
        return;
      }

      setImportResult(data);
      
      const totalImported = data.summary?.totalRecords || Object.values(data.imported).reduce((a: any, b: any) => a + b, 0);
      const errorCount = Object.keys(data.errors).length;

      if (errorCount === 0) {
        toast.success(
          `Successfully imported ${totalImported} records in ${data.summary?.duration || 'N/A'}. ` +
          `Warnings: ${data.warnings?.length || 0}, Orphaned refs: ${data.orphanedReferences?.length || 0}`
        );
        // Reload the page to apply imported styles
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(`Import completed with ${errorCount} errors. Check summary below.`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import project data');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleRemapMediaUrls = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRemapping(true);
    setRemapResult(null);

    try {
      const text = await file.text();
      const exportData = JSON.parse(text);

      // Get original URL mappings from export
      const originalMappings = exportData.mediaUrlMappings || [];
      
      if (originalMappings.length === 0) {
        toast.error('No media URL mappings found in export file. Please use a v3.0+ export.');
        return;
      }

      // Fetch current media library to get new URLs
      const { data: currentMedia, error: mediaError } = await supabase
        .from('media_library')
        .select('file_name, file_url');

      if (mediaError) throw mediaError;

      // Build URL mappings: oldUrl -> newUrl based on file_name match
      const urlMappings: { oldUrl: string; newUrl: string }[] = [];
      
      for (const original of originalMappings) {
        const matchingNew = currentMedia?.find(
          (m: any) => m.file_name === original.file_name
        );
        
        if (matchingNew && original.original_url !== matchingNew.file_url) {
          urlMappings.push({
            oldUrl: original.original_url,
            newUrl: matchingNew.file_url
          });
        }
      }

      if (urlMappings.length === 0) {
        toast.info('No URL changes needed. All media files already match or no matching files found.');
        return;
      }

      console.log(`Found ${urlMappings.length} URLs to remap`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        await supabase.auth.signOut();
        window.location.assign('/login?redirect=/admin');
        return;
      }

      const results = await remapMediaUrlsClient(urlMappings);
      setRemapResult(results);

      const totalUpdated = Object.values(results.updated || {}).reduce(
        (a: number, b: any) => a + (typeof b === 'number' ? b : 0),
        0
      );

      if ((results.errors?.length || 0) === 0) {
        toast.success(`Successfully remapped ${totalUpdated} records across all tables`);
      } else {
        toast.warning(`Remapped ${totalUpdated} records with ${results.errors.length} errors`);
      }
    } catch (error: any) {
      console.error('Remap error:', error);
      toast.error(error.message || 'Failed to remap media URLs');
    } finally {
      setIsRemapping(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Project Data</CardTitle>
          <CardDescription>
            Download complete project data (v3.0) including users, media, exhibitors, speakers, suppliers, submissions, pages, menus, themes, and storage configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Project Data
              </>
            )}
          </Button>

          {exportWarnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Export Validation Warnings ({exportWarnings.length}):</p>
                  <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {exportWarnings.map((warning, idx) => (
                      <li key={idx} className="text-muted-foreground">• {warning}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Project Data</CardTitle>
          <CardDescription>
            Upload a previously exported JSON file to restore all project data including media, content, and settings. The page will reload automatically after successful import.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Warning: This will overwrite existing data with matching IDs. Make sure to backup your current data first.
            </AlertDescription>
          </Alert>

          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
              id="import-file"
            />
            <label htmlFor="import-file">
              <Button
                disabled={isImporting}
                className="w-full sm:w-auto"
                asChild
              >
                <span>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Project Data
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>

          {importResult && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Import Summary:</p>
                    {importResult.summary && (
                      <div className="text-sm space-y-1">
                        <p>Total Records: {importResult.summary.totalRecords}</p>
                        <p>Successful: {importResult.summary.successfulImports}</p>
                        <p>Failed: {importResult.summary.failedImports}</p>
                        <p>Duration: {importResult.summary.duration}</p>
                      </div>
                    )}
                    <ul className="text-sm space-y-1 max-h-60 overflow-y-auto">
                      {Object.entries(importResult.imported).map(([table, count]) => (
                        <li key={table} className={importResult.errors[table] ? 'text-destructive' : ''}>
                          {table}: {count as number} rows
                          {importResult.errors[table] && (
                            <span className="ml-2 text-xs">
                              ({importResult.errors[table]})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              {importResult.warnings?.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Import Warnings ({importResult.warnings.length}):</p>
                      <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                        {importResult.warnings.slice(0, 10).map((warning: string, idx: number) => (
                          <li key={idx} className="text-muted-foreground">• {warning}</li>
                        ))}
                        {importResult.warnings.length > 10 && (
                          <li className="text-xs text-muted-foreground">
                            ...and {importResult.warnings.length - 10} more warnings
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {importResult.orphanedReferences?.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Orphaned User References ({importResult.orphanedReferences.length}):</p>
                      <p className="text-sm text-muted-foreground">
                        Some records reference users that don't exist in this destination. These records were imported but won't have working login capabilities until users are manually created.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remap Media URLs</CardTitle>
          <CardDescription>
            After importing and re-uploading images to the media library, use this to update all content references 
            to point to the new image URLs. Upload the original export JSON file to map old URLs to new ones by filename.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ol className="list-decimal list-inside text-sm space-y-1">
                <li>First, import your project data using the Import section above</li>
                <li>Re-upload all images to the Media Library (with the same filenames)</li>
                <li>Then use this tool to update all content to use the new image URLs</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleRemapMediaUrls}
              disabled={isRemapping}
              className="hidden"
              id="remap-file"
            />
            <label htmlFor="remap-file">
              <Button
                disabled={isRemapping}
                className="w-full sm:w-auto"
                variant="secondary"
                asChild
              >
                <span>
                  {isRemapping ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Remapping URLs...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Remap Media URLs
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>

          {remapResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">URL Remap Summary:</p>
                  <p className="text-sm text-muted-foreground">
                    Processed {remapResult.urlsProcessed} URL mappings
                  </p>
                  <ul className="text-sm space-y-1">
                    {Object.entries(remapResult.updated || {}).map(([table, count]) => (
                      count as number > 0 && (
                        <li key={table}>
                          {table}: {count as number} records updated
                        </li>
                      )
                    ))}
                  </ul>
                  {remapResult.errors?.length > 0 && (
                    <div className="mt-2 text-destructive text-sm">
                      Errors: {remapResult.errors.join(', ')}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
