import { DynamicHelmet } from "@/components/DynamicHelmet";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, ArrowLeft, Key, Copy } from "lucide-react";
import { z } from "zod";
import { getErrorMessage } from "@/lib/errorHandling";

const speakerSchema = z.object({
  name: z.string().trim().min(1, "Speaker name is required").max(200, "Name must be less than 200 characters"),
  bio: z.string().optional(),
  title: z.string().max(200, "Title must be less than 200 characters").optional(),
  company: z.string().max(200, "Company must be less than 200 characters").optional(),
  linkedin_url: z.string().url("Must be a valid URL").max(500, "LinkedIn URL must be less than 500 characters").optional().or(z.literal("")),
  email: z.string().email("Must be a valid email").max(255, "Email must be less than 255 characters").optional().or(z.literal("")),
  phone: z.string().max(50, "Phone must be less than 50 characters").optional(),
  seminar_title: z.string().optional(),
  seminar_description: z.string().optional(),
});

const AdminSpeakerEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speakerData, setSpeakerData] = useState({
    name: "",
    bio: "",
    photo_url: "",
    company_logo_url: "",
    title: "",
    company: "",
    linkedin_url: "",
    email: "",
    phone: "",
    seminar_title: "",
    seminar_description: "",
    user_id: null as string | null,
    is_active: true,
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");
  const [generatingCredentials, setGeneratingCredentials] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [speakerLoginEmail, setSpeakerLoginEmail] = useState("");
  const [speakerPassword, setSpeakerPassword] = useState("");
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [id]);

  const checkAdminAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    if (roleError) {
      console.error("Error fetching user roles:", roleError);
    }

    const allowedRoles = ["admin", "customer_service", "project_manager"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    // Load speaker data
    const { data: speaker, error } = await supabase
      .from("speakers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast.error("Failed to load speaker data");
      navigate("/admin");
      return;
    }

    setSpeakerData({
      name: speaker.name || "",
      bio: speaker.bio || "",
      photo_url: speaker.photo_url || "",
      company_logo_url: speaker.company_logo_url || "",
      title: speaker.title || "",
      company: speaker.company || "",
      linkedin_url: speaker.linkedin_url || "",
      email: speaker.email || "",
      phone: speaker.phone || "",
      seminar_title: speaker.seminar_title || "",
      seminar_description: speaker.seminar_description || "",
      user_id: speaker.user_id || null,
      is_active: speaker.is_active ?? true,
    });
    setPhotoPreview(speaker.photo_url || "");
    setCompanyLogoPreview(speaker.company_logo_url || "");
    
    // If speaker has user_id, fetch real login email
    const isPlaceholderEmail = (email: string) => {
      const lower = email.toLowerCase();
      return lower.includes('@exhibitor.') || lower.includes('@speaker.') || lower.includes('@portal.');
    };

    if (speaker.user_id) {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("user_id", speaker.user_id)
        .maybeSingle();
      
      const profileEmail = profileData?.email && !isPlaceholderEmail(profileData.email) ? profileData.email : null;

      if (profileEmail) {
        setSpeakerLoginEmail(profileEmail);
      } else {
        // Fall back to speaker's email field
        const fallback = speaker.email && !isPlaceholderEmail(speaker.email) ? speaker.email : "";
        setSpeakerLoginEmail(fallback);
      }
    }
    
    setLoading(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setPhotoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      setCompanyLogoFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateCredentials = async () => {
    setGeneratingCredentials(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('create-speaker-credentials', {
        body: {
          speakerId: id,
          speakerName: speakerData.name,
          resetPassword: false,
        }
      });

      if (error) throw error;

      if (data?.credentials) {
        setCredentials({ email: data.credentials.email || data.credentials.username, password: data.credentials.password });
        setSpeakerLoginEmail(data.credentials.email || data.credentials.username);
        setSpeakerPassword(data.credentials.password);
        setShowCredentialsDialog(true);
        toast.success("Credentials generated successfully!");
        
        // Refresh speaker data to get updated user_id
        await checkAdminAndLoadData();
      }
    } catch (error) {
      console.error('Error generating credentials:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate credentials";
      toast.error(errorMessage);
    } finally {
      setGeneratingCredentials(false);
    }
  };

  const handleResetPassword = async () => {
    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('create-speaker-credentials', {
        body: {
          speakerId: id,
          speakerName: speakerData.name,
          resetPassword: true,
        }
      });

      if (error) throw error;


      if (data?.credentials) {
        setCredentials({ email: data.credentials.email || data.credentials.username, password: data.credentials.password });
        setSpeakerLoginEmail(data.credentials.email || data.credentials.username);
        setSpeakerPassword(data.credentials.password);
        setShowCredentialsDialog(true);
        toast.success("Password reset successfully!");
        
        // Refresh speaker data
        await checkAdminAndLoadData();
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to reset password";
      toast.error(errorMessage);
    } finally {
      setResettingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate input
      const validationResult = speakerSchema.safeParse({
        name: speakerData.name,
        bio: speakerData.bio,
        title: speakerData.title,
        company: speakerData.company,
        linkedin_url: speakerData.linkedin_url,
        email: speakerData.email,
        phone: speakerData.phone,
        seminar_title: speakerData.seminar_title,
        seminar_description: speakerData.seminar_description,
      });

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setSaving(false);
        return;
      }

      let photoUrl = speakerData.photo_url;
      let companyLogoUrl = speakerData.company_logo_url;

      // Upload new photo if file is selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('speaker-headshots')
          .upload(filePath, photoFile);

        if (uploadError) {
          toast.error("Failed to upload photo");
          setSaving(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('speaker-headshots')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      // Upload new company logo if file is selected
      if (companyLogoFile) {
        const fileExt = companyLogoFile.name.split('.').pop();
        const fileName = `company-logo-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('speaker-headshots')
          .upload(filePath, companyLogoFile);

        if (uploadError) {
          toast.error("Failed to upload company logo");
          setSaving(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('speaker-headshots')
          .getPublicUrl(filePath);

        companyLogoUrl = publicUrl;
      }

      // Update speaker
      const { error } = await supabase
        .from("speakers")
        .update({
          name: speakerData.name,
          bio: speakerData.bio,
          photo_url: photoUrl,
          company_logo_url: companyLogoUrl,
          title: speakerData.title,
          company: speakerData.company,
          linkedin_url: speakerData.linkedin_url,
          email: speakerData.email,
          phone: speakerData.phone,
          seminar_title: speakerData.seminar_title,
          seminar_description: speakerData.seminar_description,
          is_active: speakerData.is_active,
        })
        .eq("id", id);

      if (error) throw error;

      // Invalidate all speaker-related queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ["speakers"] });
      await queryClient.invalidateQueries({ queryKey: ["speaker"] });

      toast.success("Speaker updated successfully!");
      navigate("/admin");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update speaker");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DynamicHelmet titlePrefix="Edit Speaker - Admin" noIndex />
      <div className="min-h-screen bg-gray-50 pt-page">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Edit Speaker</h1>
            <Button
              variant="outline"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Admin
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Speaker Details</CardTitle>
              <CardDescription>Update speaker information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active" className="text-base font-semibold">
                      Speaker Status
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {speakerData.is_active 
                        ? "Speaker is visible on the website" 
                        : "Speaker is hidden from the website"}
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={speakerData.is_active}
                    onCheckedChange={(checked) =>
                      setSpeakerData(prev => ({ ...prev, is_active: checked }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={speakerData.name}
                    onChange={(e) =>
                      setSpeakerData(prev => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={speakerData.title}
                    onChange={(e) =>
                      setSpeakerData(prev => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={speakerData.company}
                    onChange={(e) =>
                      setSpeakerData(prev => ({ ...prev, company: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="company_logo">Company Logo</Label>
                  <div className="space-y-3">
                    {companyLogoPreview && (
                      <div className="relative inline-block">
                        <img
                          src={companyLogoPreview}
                          alt="Company logo preview"
                          className="h-32 w-32 object-contain rounded border bg-white p-2"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => {
                            setCompanyLogoFile(null);
                            setCompanyLogoPreview("");
                            setSpeakerData(prev => ({ ...prev, company_logo_url: "" }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <Input
                        id="company_logo"
                        type="file"
                        accept="image/*"
                        onChange={handleCompanyLogoChange}
                        className="cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={speakerData.email}
                    onChange={(e) =>
                      setSpeakerData(prev => ({ ...prev, email: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={speakerData.phone}
                    onChange={(e) =>
                      setSpeakerData(prev => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="photo">Headshot Photo</Label>
                  <div className="space-y-3">
                    {photoPreview && (
                      <div className="relative inline-block">
                        <img
                          src={photoPreview}
                          alt="Photo preview"
                          className="h-32 w-32 object-cover rounded-full border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview("");
                            setSpeakerData(prev => ({ ...prev, photo_url: "" }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={speakerData.bio}
                    onChange={(e) =>
                      setSpeakerData({ ...speakerData, bio: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="seminar_title">Seminar Title</Label>
                  <Input
                    id="seminar_title"
                    value={speakerData.seminar_title}
                    onChange={(e) =>
                      setSpeakerData({ ...speakerData, seminar_title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="seminar_description">Seminar Description</Label>
                  <Textarea
                    id="seminar_description"
                    value={speakerData.seminar_description}
                    onChange={(e) =>
                      setSpeakerData({ ...speakerData, seminar_description: e.target.value })
                    }
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={speakerData.linkedin_url}
                    onChange={(e) =>
                      setSpeakerData({ ...speakerData, linkedin_url: e.target.value })
                    }
                  />
                </div>
            </CardContent>
          </Card>

          {/* Speaker Submission Management */}
          <Card>
            <CardHeader>
              <CardTitle>Speaker Form Submission</CardTitle>
              <CardDescription>
                Manage speaker form submissions and approval status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Submission Status</Label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Reset the speaker's form submission to allow them to upload a new form.
                  </p>
                  <Alert>
                    <AlertTitle>Reset Form Submission</AlertTitle>
                    <AlertDescription>
                      This will delete the current speaker form submission and allow the speaker to upload a new one.
                      This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      if (!confirm("Are you sure you want to reset this speaker's form submission? This will delete the current submission.")) {
                        return;
                      }
                      
                      try {
                        const { data: submissions } = await supabase
                          .from("speaker_submissions")
                          .select("id")
                          .eq("speaker_id", id);

                        if (submissions && submissions.length > 0) {
                          for (const submission of submissions) {
                            const { error } = await supabase
                              .from("speaker_submissions")
                              .delete()
                              .eq("id", submission.id);

                            if (error) throw error;
                          }
                        }
                        
                        toast.success("Speaker form submission reset successfully");
                      } catch (error) {
                        const errorMessage = getErrorMessage(error, "Failed to reset speaker form");
                        toast.error(errorMessage);
                      }
                    }}
                    className="w-full"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reset Form Submission
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Speaker Access */}
          <Card>
            <CardHeader>
              <CardTitle>Speaker Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {speakerData.user_id ? (
                <>
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>Login Credentials Created</AlertTitle>
                    <AlertDescription>
                      This speaker has login credentials. The login email is shown below. 
                      {!speakerPassword && " For security, passwords are only shown once when generated. Click 'Reset Password' to create a new one."}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Login Email</Label>
                        <p className="text-sm text-muted-foreground mt-1 break-all font-mono">{speakerLoginEmail}</p>
                        <p className="text-xs text-muted-foreground mt-1">This is their login email - always available</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(speakerLoginEmail)}
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {speakerPassword && (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Password (Temporary Display)</Label>
                          <p className="text-sm text-muted-foreground mt-1 break-all font-mono">{speakerPassword}</p>
                          <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ COPY NOW - This password will not be shown again after you leave this page</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(speakerPassword)}
                          className="ml-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetPassword}
                      disabled={resettingPassword}
                      className="w-full"
                    >
                      {resettingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating New Password...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          {speakerPassword ? "Generate Another Password" : "Reset Password"}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {speakerPassword 
                        ? "You can generate a new password if needed"
                        : "Click to generate a new password for this speaker"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>No Login Credentials</AlertTitle>
                    <AlertDescription>
                      This speaker doesn't have login credentials yet. Generate credentials to allow them to access the speaker portal.
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateCredentials}
                    disabled={generatingCredentials}
                    className="w-full"
                  >
                    {generatingCredentials ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        Generate Login Credentials
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Save Button */}
          <Card>
            <CardContent className="pt-6">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
        </div>
        <Footer />
      </div>

      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Speaker Login Credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the speaker. They can use them to log in at the speaker portal.
            </DialogDescription>
          </DialogHeader>
          
          {credentials && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <Key className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Credentials Generated Successfully</AlertTitle>
                <AlertDescription className="text-green-700">
                  Save these credentials now. For security reasons, the password cannot be retrieved later.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Login Email</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={credentials.email}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.email)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={credentials.password}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-sm font-medium">Portal URL</Label>
                  <a
                    href="/speaker-portal/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {window.location.origin}/speaker-portal/login
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSpeakerEdit;
