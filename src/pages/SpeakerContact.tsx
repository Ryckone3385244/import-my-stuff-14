import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CheckCircle2, Upload, X } from "lucide-react";

const contactSchema = z.object({
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000, "Message must be less than 5000 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface Speaker {
  id: string;
  name: string;
  email: string | null;
}

export default function SpeakerContact() {
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [projectManagers, setProjectManagers] = useState<Array<{
    name: string;
    email: string;
  }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  useEffect(() => {
    loadSpeakerData();
    loadProjectManagers();
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
      }
    }
    setLoading(false);
  };

  const loadProjectManagers = async () => {
    try {
      // First get users with project_manager role
      const { data: pmUsers, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "project_manager");

      if (rolesError || !pmUsers || pmUsers.length === 0) {
        return;
      }

      // Then get their profiles
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("display_name, email")
        .in("user_id", pmUsers.map(u => u.user_id));

      if (profileError) {
        return;
      }

      if (profiles && profiles.length > 0) {
        setProjectManagers(
          profiles.map(profile => ({
            name: profile.display_name || "Project Manager",
            email: profile.email || "",
          }))
        );
      }
    } catch (error) {
      console.error("Error loading project managers:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be less than 20MB");
        return;
      }
      setUploadedFile(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
  };

  const onSubmit = async (data: ContactFormData) => {
    if (!speaker) {
      toast.error("Speaker information not found");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileUrl = null;
      let fileName = null;

      // Upload file if provided
      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const filePath = `${speaker.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, uploadedFile);

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('support-attachments')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = uploadedFile.name;
      }

      const { error } = await supabase.functions.invoke("send-speaker-contact", {
        body: {
          speakerName: speaker.name,
          speakerEmail: speaker.email,
          subject: data.subject,
          message: data.message,
          projectManagers: projectManagers,
          fileUrl: fileUrl,
          fileName: fileName,
          speakerId: speaker.id,
        },
      });

      if (error) throw error;

      setIsSuccess(true);
      reset();
      setUploadedFile(null);
      toast.success("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Determine specific error type and provide user-friendly message
      let errorTitle = "Unable to Send Message";
      let errorMessage = "";
      let errorAction = "";
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes("network") || errorText.includes("fetch") || errorText.includes("failed to fetch")) {
          errorTitle = "Connection Error";
          errorMessage = "Unable to connect to the server.";
          errorAction = "Please check your internet connection and try again.";
        } else if (errorText.includes("timeout")) {
          errorTitle = "Request Timeout";
          errorMessage = "The server took too long to respond.";
          errorAction = "Please wait a moment and try again.";
        } else if (errorText.includes("upload") || errorText.includes("file")) {
          errorTitle = "File Upload Failed";
          errorMessage = error.message;
          errorAction = "Please try removing the attachment and submitting again, or use a smaller file.";
        } else if (errorText.includes("rate limit") || errorText.includes("too many")) {
          errorTitle = "Too Many Requests";
          errorMessage = "You've made too many requests in a short time.";
          errorAction = "Please wait a few minutes before trying again.";
        } else if (errorText.includes("server") || errorText.includes("500") || errorText.includes("internal")) {
          errorTitle = "Server Error";
          errorMessage = "Something went wrong on our end.";
          errorAction = "Please try again later. If the problem persists, contact support.";
        } else {
          errorMessage = error.message;
          errorAction = "Please try again. If the problem continues, contact us directly.";
        }
      } else {
        errorMessage = "An unexpected error occurred while sending your message.";
        errorAction = "Please try again. If the problem continues, contact us directly.";
      }
      
      toast.error(errorTitle, {
        description: `${errorMessage} ${errorAction}`,
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Contact Us - Speaker Portal</title>
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
        <title>Contact Us - Speaker Portal</title>
      </Helmet>

      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>

      <Card>
        <CardHeader>
          <CardTitle>Contact Your Project Manager</CardTitle>
          <CardDescription>
            Send a message to your project manager and our team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="mb-6">
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">Message Sent Successfully!</h2>
              <p className="text-muted-foreground mb-6 max-w-md">
                Your message has been sent to your project manager. They will get back to you as soon as possible.
              </p>
              <Button onClick={() => setIsSuccess(false)}>
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  {...register("subject")}
                  placeholder="Brief description of your inquiry"
                  disabled={isSubmitting}
                  className="bg-background"
                />
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  {...register("message")}
                  placeholder="Please provide detailed information about your inquiry..."
                  rows={8}
                  disabled={isSubmitting}
                  className="bg-background"
                />
                {errors.message && (
                  <p className="text-sm text-destructive">{errors.message.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment">Attachment (optional)</Label>
                <div className="space-y-3">
                  {uploadedFile && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <Input
                      id="attachment"
                      type="file"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="cursor-pointer"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum file size: 20MB
                  </p>
                </div>
              </div>

              {projectManagers.length > 0 && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Your message will be sent to:
                  </p>
                  <ul className="text-sm space-y-1">
                    {projectManagers.map((pm, index) => (
                      <li key={index} className="font-medium">{pm.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                * Required fields
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </>
  );
}