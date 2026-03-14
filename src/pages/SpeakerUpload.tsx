import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2, Clock, X } from "lucide-react";

interface Speaker {
  id: string;
  name: string;
}

interface SubmissionData {
  id: string;
  approval_status: string;
  created_at: string;
}

export default function SpeakerUpload() {
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState(supabase);
  const [existingSubmission, setExistingSubmission] = useState<SubmissionData | null>(null);

  useEffect(() => {
    loadSpeakerData();
  }, []);

  const loadSpeakerData = async () => {
    const impToken = sessionStorage.getItem('impersonation_token');
    const impRefresh = sessionStorage.getItem('impersonation_refresh');
    
    let client = supabase;
    
    if (impToken && impRefresh) {
      client = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: {
            storage: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
            persistSession: false,
            autoRefreshToken: true,
          },
        }
      );
      
      await client.auth.setSession({
        access_token: impToken,
        refresh_token: impRefresh,
      });
      
      setSupabaseClient(client);
    }

    const { data: { session } } = await client.auth.getSession();
    if (session) {
      const { data: speakerData } = await client
        .from("speakers")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (speakerData) {
        setSpeaker(speakerData);
        
        // Check for existing submission
        const { data: submissionData } = await client
          .from("speaker_submissions")
          .select("*")
          .eq("speaker_id", speakerData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (submissionData) {
          setExistingSubmission(submissionData);
        }
      }
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please upload a PDF file');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !speaker) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase storage
      const fileExt = 'pdf';
      const fileName = `${speaker.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('speaker-submissions')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabaseClient.storage
        .from('speaker-submissions')
        .getPublicUrl(fileName);

      // Create submission record
      const { data: submission, error: submissionError } = await supabaseClient
        .from('speaker_submissions')
        .insert({
          speaker_id: speaker.id,
          pdf_url: publicUrl,
          pdf_filename: file.name,
          approval_status: 'pending_approval',
        })
        .select()
        .maybeSingle();

      if (submissionError) throw submissionError;

      // Parse the PDF using edge function
      const { error: parseError } = await supabaseClient.functions.invoke('parse-speaker-submission', {
        body: {
          submissionId: submission.id,
          pdfUrl: publicUrl,
          speakerId: speaker.id,
        },
      });

      if (parseError) {
        console.error('Error parsing PDF:', parseError);
        toast.warning('Form uploaded but parsing failed and is pending approval from our account managers.');
      } else {
        toast.success('Speaker form uploaded and parsed successfully and is pending approval from our account managers!');
      }

      setUploadSuccess(true);
      setFile(null);
      // Reload to get the new submission
      await loadSpeakerData();
    } catch (error) {
      console.error('Error uploading form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload form';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Upload Speaker Form - Speaker Portal</title>
        </Helmet>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Upload Speaker Form - Speaker Portal</title>
      </Helmet>

      <h1 className="text-3xl font-bold mb-6">Upload Your Speaker Form</h1>

      <Card>
        <CardHeader>
          <CardTitle>Submit Your Completed Form</CardTitle>
          <CardDescription>
            Upload your speaker form as a PDF to finalize your session details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingSubmission && existingSubmission.approval_status === "pending_approval" ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="mb-6">
                <Clock className="w-20 h-20 text-yellow-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">Form Pending Review</h2>
              <p className="text-muted-foreground mb-4 max-w-md">
                Your speaker form has been submitted and is awaiting admin approval.
              </p>
              <p className="text-sm text-muted-foreground">
                Submitted: {new Date(existingSubmission.created_at).toLocaleDateString()}
              </p>
            </div>
          ) : existingSubmission && existingSubmission.approval_status === "rejected" ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="mb-6">
                <X className="w-20 h-20 text-red-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">Form Rejected</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Your speaker form was rejected. Please upload a new form with the required corrections.
              </p>
              <Button onClick={() => setExistingSubmission(null)}>
                Upload New Form
              </Button>
            </div>
          ) : uploadSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="mb-6">
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">Form Uploaded Successfully!</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Your speaker form has been submitted and is pending approval from our account managers. 
                You'll be notified once it's been processed.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="speaker-form">Speaker Form (PDF)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="speaker-form"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="hidden"
                  />
                  <label
                    htmlFor="speaker-form"
                    className="cursor-pointer flex flex-col items-center justify-center"
                  >
                    {file ? (
                      <FileText className="w-16 h-16 text-primary mb-3" />
                    ) : (
                      <Upload className="w-16 h-16 text-muted-foreground mb-3" />
                    )}
                    {file ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            setFile(null);
                          }}
                          className="mt-2"
                        >
                          Remove file
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground text-center px-4">
                        Upload your completed speaker form (PDF, maximum file size: 10MB). Please be patient and don't click anything while the form is uploading, you will be notified once your form has been submitted
                      </span>
                    )}
                  </label>
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-sm">Instructions:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Download the speaker form template</li>
                  <li>Complete all required fields</li>
                  <li>Save as PDF</li>
                  <li>Upload using the form above</li>
                </ul>
              </div>

              {file && (
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading and Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Speaker Form
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
