import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExhibitorLogoUploadProps {
  exhibitorId: string;
  exhibitorName: string;
  onUploadSuccess: () => void;
}

export const ExhibitorLogoUpload = ({ exhibitorId, exhibitorName, onUploadSuccess }: ExhibitorLogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/avif', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a logo in JPG, PNG, AVIF, WEBP, or SVG format.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${exhibitorId}-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exhibitor-logos')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get the public URL directly (optimization disabled)
      const { data: { publicUrl } } = supabase.storage
        .from('exhibitor-logos')
        .getPublicUrl(filePath);

      // Update exhibitor record with logo URL
      const { error: updateError } = await supabase
        .from('exhibitors')
        .update({ logo_url: publicUrl })
        .eq('id', exhibitorId);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw updateError;
      }

      // Upload original high-res version to Google Drive if larger than 10MB
      if (file.type !== 'image/svg+xml' && file.size > 10 * 1024 * 1024) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('fileName', `${exhibitorName}_logo_${Date.now()}.${fileExt}`);
          formData.append('folderId', 'exhibitor-logos');
          
          // Get auth token
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No session');
          
          // Use direct HTTP POST instead of .invoke() for FormData
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-google-drive`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: formData,
            }
          );
        } catch (driveError) {
          console.error('Failed to upload to Google Drive:', driveError);
          // Don't fail the upload if Google Drive fails
        }
      }

      toast({
        title: "Success!",
        description: "Your logo has been uploaded successfully.",
      });

      onUploadSuccess();
    } catch (error) {
      console.error("Error uploading logo:", error);
      const message = error instanceof Error ? error.message : 'Failed to upload logo. Please try again.';
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome {exhibitorName}</CardTitle>
          <CardDescription className="text-lg mt-4">
            Before you gain full access to the Exhibitor Portal, you must first upload your logo (in jpg, png, avif, webp, or svg format)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 pt-6">
          <div className="w-full max-w-md">
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,.avif,.webp,.svg"
              onChange={handleFileUpload}
              disabled={uploading}
              className="cursor-pointer"
              id="logo-upload"
            />
          </div>
          <Button
            onClick={() => document.getElementById('logo-upload')?.click()}
            disabled={uploading}
            size="lg"
            className="w-full max-w-md"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Choose Logo File
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
