import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { useQueryClient } from "@tanstack/react-query";

const AdminSpeakerBulkUpload = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    uploaded: string[];
    skipped: string[];
    errors: string[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
        toast.error("Please select a ZIP file");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-speaker-forms`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      setResults(result);

      // Invalidate speakers query to refresh the list in Admin page
      queryClient.invalidateQueries({ queryKey: ["admin-speakers"] });
      queryClient.invalidateQueries({ queryKey: ["speakers"] });

      toast.success(
        `Upload complete! ${result.uploaded.length} forms processed, ${result.errors.length} errors`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload speaker forms";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Bulk Upload Speaker Forms - Admin</title>
      </Helmet>
      
      <Navbar />
      
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-4xl mx-auto px-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Speaker Forms</CardTitle>
              <CardDescription>
                Upload a ZIP file containing speaker form PDFs. Forms will be automatically
                parsed and matched to existing speakers by filename.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="zip-file">ZIP File</Label>
                <Input
                  id="zip-file"
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <p className="text-sm text-muted-foreground">
                  Name PDFs to match speaker names for automatic matching (e.g., "john-smith-form.pdf")
                </p>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload and Process Forms
                  </>
                )}
              </Button>

              {results && (
                <div className="space-y-4 mt-6 p-4 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-semibold text-green-600 mb-2">
                      ✓ Successfully Processed ({results.uploaded.length})
                    </h3>
                    {results.uploaded.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {results.uploaded.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">None</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-yellow-600 mb-2">
                      ⊘ Skipped ({results.skipped.length})
                    </h3>
                    {results.skipped.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {results.skipped.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">None</p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-red-600 mb-2">
                      ✗ Errors ({results.errors.length})
                    </h3>
                    {results.errors.length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {results.errors.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">None</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default AdminSpeakerBulkUpload;
