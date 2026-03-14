import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage, handleError } from "@/lib/errorHandling";

interface ExhibitorSubmissionUploadProps {
  exhibitorId: string;
  exhibitorName: string;
  submissionType: "speaker" | "advert" | "headshot";
  managerEmail: string;
  managerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export const ExhibitorSubmissionUpload = ({
  exhibitorId,
  exhibitorName,
  submissionType,
  managerEmail,
  managerName,
  open,
  onOpenChange,
  onUploadComplete,
}: ExhibitorSubmissionUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const acceptedTypes = submissionType === "headshot"
    ? ".jpg,.jpeg,.png"
    : ".pdf,.jpg,.jpeg,.png";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const bucketName = 
        submissionType === "speaker" ? "exhibitor-speaker-submissions" :
        submissionType === "advert" ? "exhibitor-advert-submissions" :
        "exhibitor-speaker-headshots";
      
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${exhibitorId}/${Date.now()}.${fileExt}`;

      // Upload to storage (optimization disabled)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Save to database
      const tableName = 
        submissionType === "speaker" ? "exhibitor_speaker_submissions" :
        submissionType === "advert" ? "exhibitor_advert_submissions" :
        "exhibitor_speaker_headshots";

      const { error: dbError } = await supabase
        .from(tableName)
        .insert({
          exhibitor_id: exhibitorId,
          file_url: publicUrl,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
        });

      if (dbError) throw dbError;

      // Upload to Google Drive for all submission types
      try {
        const folderType = 
          submissionType === "headshot" ? "exhibitor-headshots" :
          submissionType === "speaker" ? "speaker-forms" :
          "exhibitor-adverts";
        
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('fileName', `${exhibitorName}_${selectedFile.name}`);
        formData.append('folderId', folderType);
        
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
      } catch (error) {
        const errorMessage = handleError('Upload to Google Drive', error);
        console.error('Failed to upload to Google Drive:', errorMessage);
        // Don't fail the upload if Google Drive fails
      }

      // Parse speaker forms using AI if it's a speaker submission and a PDF
      if (submissionType === "speaker" && selectedFile.type === "application/pdf") {
        try {
          // Get the submission ID we just created
          const { data: submission, error: submissionError } = await supabase
            .from("exhibitor_speaker_submissions")
            .select("id")
            .eq("exhibitor_id", exhibitorId)
            .eq("file_url", publicUrl)
            .maybeSingle();

          if (submissionError) {
            console.error('Error fetching submission:', submissionError);
          }

          if (submission) {
            // Call parse function to extract speaker data
            try {
              const { error: parseError } = await supabase.functions.invoke('parse-speaker-submission', {
                body: {
                  submissionId: submission.id,
                  pdfUrl: publicUrl,
                  speakerId: null, // No speaker record yet for exhibitor submissions
                },
              });

              if (parseError) {
                console.error('Error parsing speaker form:', parseError);
                // Don't fail the upload if parsing fails
              }
            } catch (error) {
              const errorMessage = handleError('Parse speaker form (inner)', error);
              console.error('Failed to parse speaker form:', errorMessage);
              // Don't fail the upload if parsing fails
            }
          }
        } catch (error) {
          const errorMessage = handleError('Parse speaker form', error);
          console.error('Failed to parse speaker form:', errorMessage);
          // Don't fail the upload if parsing fails
        }
      }

      // Set approval flag to false to indicate pending approval
      const approvalField = 
        submissionType === "speaker" ? "speaker_submission_approved" :
        submissionType === "headshot" ? "headshot_submission_approved" :
        "advert_submission_approved";
      
      const { error: updateError } = await supabase
        .from("exhibitors")
        .update({ [approvalField]: false })
        .eq("id", exhibitorId);

      if (updateError) throw updateError;

      // Send email notification
      const { error: emailError } = await supabase.functions.invoke("send-submission-notification", {
        body: {
          to: managerEmail,
          managerName,
          exhibitorName,
          submissionType,
          fileName: selectedFile.name,
          fileUrl: publicUrl,
        },
      });

      if (emailError) {
        console.error("Email notification error:", emailError);
        // Don't fail the upload if email fails
      }

      const typeLabel = 
        submissionType === "speaker" ? "speaker form" :
        submissionType === "advert" ? "advertisement" :
        "speaker headshot";

      toast({
        title: "Upload successful",
        description: `Your ${typeLabel} has been submitted and is pending approval from our account managers.`,
      });

      setSelectedFile(null);
      onOpenChange(false);
      onUploadComplete();
    } catch (error) {
      const errorMessage = handleError('Upload', error, 'An error occurred during upload.');
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Upload {
              submissionType === "speaker" ? "Speaker Form" :
              submissionType === "advert" ? "Advertisement" :
              "Speaker Headshot"
            }
          </DialogTitle>
          <DialogDescription>
            {submissionType === "speaker" 
              ? "Upload your completed speaker form (PDF, maximum file size: 10MB). Please be patient and don't click anything while the form is uploading, you will be notified once your form has been submitted"
              : submissionType === "advert"
                ? "Upload your advertisement artwork (PDF, JPG, or PNG). Maximum file size: 10MB"
                : "Upload your speaker headshot photo (JPG or PNG). Maximum file size: 10MB"
            }.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">Select File (Max 10MB)</Label>
            <Input
              id="file"
              type="file"
              accept={acceptedTypes}
              onChange={handleFileChange}
              disabled={uploading}
              className="mt-2"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
