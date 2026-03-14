import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import { getErrorMessage } from "@/lib/errorHandling";
import { normalizeStandType } from "@/lib/standTypeNormalization";
import Footer from "@/components/Footer";
import { ArrowLeft, Loader2, Upload, Key, Copy } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ContactsManager, ContactsManagerRef } from "@/components/ContactsManager";
import { Download, CheckCircle2, XCircle } from "lucide-react";

const exhibitorSchema = z.object({
  name: z.string().trim().max(200, "Company name must be less than 200 characters").optional().or(z.literal("")),
  account_number: z.string().trim().max(100, "Account number must be less than 100 characters").optional().or(z.literal("")),
  booth_number: z.string().trim().max(50, "Booth number must be less than 50 characters").optional().or(z.literal("")),
  address_street: z.string().trim().max(500, "Street address must be less than 500 characters").optional().or(z.literal("")),
  address_city: z.string().trim().max(100, "City must be less than 100 characters").optional().or(z.literal("")),
  address_postcode: z.string().trim().max(20, "Postcode must be less than 20 characters").optional().or(z.literal("")),
  address_country: z.string().trim().max(100, "Country must be less than 100 characters").optional().or(z.literal("")),
  description: z.preprocess(
    (val) => (val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  short_description: z.string().max(300, "Showguide listing must be max 300 characters").optional().or(z.literal("")),
  website: z.preprocess(
    (val) => (val === null || val === undefined ? "" : val),
    z.union([
      z.literal(""),
      z.string().trim().url("Must be a valid URL").max(500, "Website URL must be less than 500 characters"),
    ])
  ),
});

const AdminExhibitorEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exhibitor, setExhibitor] = useState<{
    id: string;
    name: string;
    account_number?: string;
    booth_number?: string;
    logo_url?: string;
    banner_url?: string;
    description?: string;
    short_description?: string;
    website?: string;
    user_id?: string;
    speaker_submission_approved?: boolean;
    headshot_submission_approved?: boolean;
    advert_submission_approved?: boolean;
    is_active?: boolean;
    stand_type?: string;
    booth_length?: number;
    booth_width?: number;
    open_sides?: number;
    event_status?: string;
    speaking_session?: boolean;
    speaking_session_details?: string;
    advertisement?: boolean;
    advertisement_details?: string;
    created_at?: string;
    meta_title?: string;
    meta_description?: string;
  } | null>(null);
  const [generatingSeo, setGeneratingSeo] = useState(false);
  const [address, setAddress] = useState<{
    id?: string;
    street_line_1?: string;
    city?: string;
    postcode?: string;
    country?: string;
  } | null>(null);
  const [socialMedia, setSocialMedia] = useState<{
    id?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [generatingCredentials, setGeneratingCredentials] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [exhibitorLoginEmail, setExhibitorLoginEmail] = useState<string>("");
  const [exhibitorPassword, setExhibitorPassword] = useState<string>("");
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [showguideDeadline, setShowguideDeadline] = useState<string>("");
  const contactsManagerRef = useRef<ContactsManagerRef>(null);
  const [speakerSubmissions, setSpeakerSubmissions] = useState<Array<{
    id: string;
    created_at: string;
    file_name: string;
    file_url: string;
    approval_status?: string;
  }>>([]);
  const [advertSubmissions, setAdvertSubmissions] = useState<Array<{
    id: string;
    created_at: string;
    file_name: string;
    file_url: string;
    approval_status?: string;
  }>>([]);
  const [headshotSubmissions, setHeadshotSubmissions] = useState<Array<{
    id: string;
    created_at: string;
    file_name: string;
    file_url: string;
    approval_status?: string;
  }>>([]);
  const [newSocialPlatform, setNewSocialPlatform] = useState<string>("");
  const [newSocialUrl, setNewSocialUrl] = useState<string>("");

  useEffect(() => {
    checkAdminAndLoadData();
  }, [id]);

  const loadSubmissions = async () => {
    if (!id) return;
    
    try {
      const [speakerData, advertData, headshotData] = await Promise.all([
        supabase
          .from("exhibitor_speaker_submissions")
          .select("*")
          .eq("exhibitor_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("exhibitor_advert_submissions")
          .select("*")
          .eq("exhibitor_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("exhibitor_speaker_headshots")
          .select("*")
          .eq("exhibitor_id", id)
          .order("created_at", { ascending: false })
      ]);

      setSpeakerSubmissions(speakerData.data || []);
      setAdvertSubmissions(advertData.data || []);
      setHeadshotSubmissions(headshotData.data || []);
    } catch (error) {
      console.error("Error loading submissions:", error);
    }
  };

  const handleDeleteSubmission = async (submissionId: string, type: "speaker" | "advert" | "headshot") => {
    try {
      const tableName = 
        type === "speaker" ? "exhibitor_speaker_submissions" :
        type === "advert" ? "exhibitor_advert_submissions" :
        "exhibitor_speaker_headshots";

      // Delete the submission without changing approval status
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", submissionId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Submission has been removed. The exhibitor portal will now show this task as missing until a new file is uploaded.",
      });

      loadSubmissions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete submission";
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleResetSubmissionApproval = async (type: "speaker" | "headshot" | "advert") => {
    try {
      const { error } = await supabase.rpc("reset_submission_approval", {
        p_exhibitor_id: id,
        p_submission_type: type,
      });

      if (error) throw error;

      setExhibitor((prev) => {
        if (!prev) return prev;
        if (type === "speaker") {
          return { ...prev, speaker_submission_approved: false };
        }
        if (type === "headshot") {
          return { ...prev, headshot_submission_approved: false };
        }
        return { ...prev, advert_submission_approved: false };
      });

      toast({
        title: "Approval flag reset",
        description: "The submission approval status has been reset.",
      });

      await loadSubmissions();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reset approval flag.";
      toast({
        title: "Reset failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDownloadSubmission = async (fileUrl: string, fileName: string, type: "speaker" | "headshot" | "advert") => {
    const bucketMap: Record<string, string> = {
      speaker: "exhibitor-speaker-submissions",
      headshot: "exhibitor-speaker-headshots",
      advert: "exhibitor-advert-submissions",
    };
    const bucket = bucketMap[type];
    const marker = `/object/public/${bucket}/`;
    const markerIndex = fileUrl.indexOf(marker);

    if (markerIndex === -1) {
      // Fallback for URLs that don't match the expected pattern
      window.open(fileUrl, "_blank");
      return;
    }

    const filePath = decodeURIComponent(fileUrl.substring(markerIndex + marker.length));

    try {
      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download failed",
        description: "Could not download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      toast({
        title: "Access denied",
        description: "Admin privileges required",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    const { data, error } = await supabase
      .from("exhibitors")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load exhibitor data",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    if (!data) {
      toast({
        title: "Not found",
        description: "Exhibitor not found",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    // Load address data
    const { data: addressData } = await supabase
      .from("exhibitor_address")
      .select("*")
      .eq("exhibitor_id", id)
      .maybeSingle();

    // Load social media data
    const { data: socialMediaData } = await supabase
      .from("exhibitor_social_media")
      .select("*")
      .eq("exhibitor_id", id)
      .maybeSingle();

    setExhibitor(data);
    setAddress(addressData || { street_line_1: "", city: "", postcode: "", country: "" });
    setSocialMedia(socialMediaData || { linkedin: "", facebook: "", instagram: "", tiktok: "", youtube: "" });
    
    if (data.logo_url) {
      setLogoPreview(data.logo_url);
    }
    if (data.banner_url) {
      setBannerPreview(data.banner_url);
    }

    // Fetch real login email if user_id exists
    const isPlaceholderEmail = (email: string) => {
      const lower = email.toLowerCase();
      return lower.includes('@exhibitor.') || lower.includes('@speaker.') || lower.includes('@portal.');
    };

    if (data.user_id) {
      // Try user_profiles first, but reject placeholder emails
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("user_id", data.user_id)
        .maybeSingle();
      
      const profileEmail = profileData?.email && !isPlaceholderEmail(profileData.email) ? profileData.email : null;

      if (profileEmail) {
        setExhibitorLoginEmail(profileEmail);
      } else {
        // Fall back to any active contact email (prefer main contact but don't require it)
        const { data: contactData } = await supabase
          .from("exhibitor_contacts")
          .select("email")
          .eq("exhibitor_id", data.id)
          .eq("is_active", true)
          .not("email", "is", null)
          .order("is_main_contact", { ascending: false })
          .limit(1)
          .maybeSingle();
        const contactEmail = contactData?.email && !isPlaceholderEmail(contactData.email) ? contactData.email : "";
        setExhibitorLoginEmail(contactEmail);
      }
      setExhibitorPassword("");
    }

    // Load event settings for deadline
    const { data: eventSettings } = await supabase
      .from("event_settings")
      .select("showguide_listing_deadline")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eventSettings?.showguide_listing_deadline) {
      setShowguideDeadline(eventSettings.showguide_listing_deadline);
    }

    // Load submissions
    await loadSubmissions();
    
    setLoading(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Logo must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Banner must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateCredentials = async () => {
    setGeneratingCredentials(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-exhibitor-credentials', {
        body: {
          exhibitorId: exhibitor.id,
          companyName: exhibitor.name,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Store credentials and show them
      setExhibitor({ ...exhibitor, user_id: data.credentials.userId });
      setCredentials({ email: data.credentials.email, password: data.credentials.password });
      setExhibitorLoginEmail(data.credentials.email);
      setExhibitorPassword(data.credentials.password);
      setShowCredentialsDialog(true);
      
      toast({
        title: "Success",
        description: "Exhibitor credentials generated successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate credentials";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingCredentials(false);
    }
  };

  const resetPassword = async () => {
    setResettingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('create-exhibitor-credentials', {
        body: { 
          exhibitorId: exhibitor.id,
          exhibitorName: exhibitor.name,
          resetPassword: true
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Data error:', data.error);
        throw new Error(data.error);
      }

      if (!data || !data.credentials) {
        console.error('No credentials in response:', data);
        throw new Error('No credentials received from server');
      }

      // Store new password
      setCredentials({ email: data.credentials.email, password: data.credentials.password });
      setExhibitorLoginEmail(data.credentials.email);
      setExhibitorPassword(data.credentials.password);
      setShowCredentialsDialog(true);
      
      toast({
        title: "Success",
        description: "New password generated successfully",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to reset password";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate input
      const validationResult = exhibitorSchema.safeParse({
        name: exhibitor.name,
        account_number: exhibitor.account_number || "",
        booth_number: exhibitor.booth_number || "",
        address_street: address.street_line_1 || "",
        address_city: address.city || "",
        address_postcode: address.postcode || "",
        address_country: address.country || "",
        description: exhibitor.description,
        short_description: exhibitor.short_description || "",
        website: exhibitor.website || "",
      });

      if (!validationResult.success) {
        toast({
          title: "Validation Error",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      let logoUrl = exhibitor.logo_url;
      let bannerUrl = exhibitor.banner_url;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${exhibitor.id}-logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("exhibitor-logos")
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("exhibitor-logos")
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${exhibitor.id}-banner-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("exhibitor-logos")
          .upload(fileName, bannerFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("exhibitor-logos")
          .getPublicUrl(fileName);

        bannerUrl = publicUrl;
      }

      // Update exhibitor
      const { data: updatedData, error: updateError } = await supabase
        .from("exhibitors")
        .update({
          name: exhibitor.name,
          account_number: exhibitor.account_number,
          booth_number: exhibitor.booth_number,
          description: exhibitor.description,
          short_description: exhibitor.short_description,
          website: exhibitor.website,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          is_active: exhibitor.is_active ?? true,
          stand_type: normalizeStandType(exhibitor.stand_type),
          booth_length: exhibitor.booth_length,
          booth_width: exhibitor.booth_width,
          open_sides: exhibitor.open_sides,
          event_status: exhibitor.event_status,
          speaking_session: exhibitor.speaking_session ?? false,
          speaking_session_details: exhibitor.speaking_session ? exhibitor.speaking_session_details : null,
          advertisement: exhibitor.advertisement ?? false,
          advertisement_details: exhibitor.advertisement ? exhibitor.advertisement_details : null,
          meta_title: exhibitor.meta_title || null,
          meta_description: exhibitor.meta_description || null,
        })
        .eq("id", exhibitor.id)
        .select();

      if (updateError) throw updateError;
      
      if (!updatedData || updatedData.length === 0) {
        throw new Error("Failed to update exhibitor - no rows were affected. Please check your permissions.");
      }

      // Update or insert address
      if (address.id) {
        const { error: addressError } = await supabase
          .from("exhibitor_address")
          .update({
            street_line_1: address.street_line_1,
            city: address.city,
            postcode: address.postcode,
            country: address.country,
          })
          .eq("id", address.id);

        if (addressError) throw addressError;
      } else {
        const { error: addressError } = await supabase
          .from("exhibitor_address")
          .insert({
            exhibitor_id: exhibitor.id,
            street_line_1: address.street_line_1,
            city: address.city,
            postcode: address.postcode,
            country: address.country,
          });

        if (addressError) throw addressError;
      }

      // Update or insert social media
      if (socialMedia.id) {
        const { error: socialError } = await supabase
          .from("exhibitor_social_media")
          .update({
            linkedin: socialMedia.linkedin,
            facebook: socialMedia.facebook,
            instagram: socialMedia.instagram,
            tiktok: socialMedia.tiktok,
            youtube: socialMedia.youtube,
          })
          .eq("id", socialMedia.id);

        if (socialError) throw socialError;
      } else {
        const { error: socialError } = await supabase
          .from("exhibitor_social_media")
          .insert({
            exhibitor_id: exhibitor.id,
            linkedin: socialMedia.linkedin,
            facebook: socialMedia.facebook,
            instagram: socialMedia.instagram,
            tiktok: socialMedia.tiktok,
            youtube: socialMedia.youtube,
          });

        if (socialError) throw socialError;
      }

      // Save contacts
      if (contactsManagerRef.current) {
        await contactsManagerRef.current.saveContacts();
      }

      // Invalidate all exhibitor-related caches
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["exhibitor-progress", id] });
        await queryClient.invalidateQueries({ queryKey: ["exhibitors"] });
        await queryClient.invalidateQueries({ queryKey: ["exhibitor", id] });
      }

      toast({
        title: "Success",
        description: "Exhibitor has been updated",
      });
      
      navigate("/admin");
    } catch (error) {
      const errorMessage = getErrorMessage(error, "Failed to update exhibitor");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Edit Exhibitor - Admin</title>
      </Helmet>
      <div className="min-h-screen flex flex-col pt-page bg-gray-50">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 pt-page pb-12 max-w-4xl">
        <div className="mb-8 flex items-start justify-end">
          <Button
            variant="outline"
            onClick={() => navigate("/admin")}
            className="flex-shrink-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Basic Information</CardTitle>
                {exhibitor.created_at && (
                  <div className="text-sm text-muted-foreground">
                    Created: {format(new Date(exhibitor.created_at), "PPP")}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={exhibitor.name}
                  onChange={(e) => setExhibitor({ ...exhibitor, name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  value={exhibitor.account_number || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, account_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="booth">Booth Number</Label>
                <Input
                  id="booth"
                  value={exhibitor.booth_number || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, booth_number: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Exhibitor Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Exhibitor Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <ContactsManager ref={contactsManagerRef} exhibitorId={exhibitor.id} hideSaveButton={true} showContactButtonToggle={true} />
            </CardContent>
          </Card>

          {/* Company Address */}
          <Card>
            <CardHeader>
              <CardTitle>Company Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address_street">Street Address</Label>
                <Input
                  id="address_street"
                  value={address?.street_line_1 || ""}
                  onChange={(e) => setAddress({ ...address, street_line_1: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="address_city">City</Label>
                <Input
                  id="address_city"
                  value={address?.city || ""}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="address_postcode">Postcode</Label>
                <Input
                  id="address_postcode"
                  value={address?.postcode || ""}
                  onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="address_country">Country</Label>
                <Input
                  id="address_country"
                  value={address?.country || ""}
                  onChange={(e) => setAddress({ ...address, country: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Description & Media */}
          <Card>
            <CardHeader>
              <CardTitle>Description & Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="short_description">Showguide Listing (max 300 characters)</Label>
                  {showguideDeadline && (
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      Deadline: {new Date(showguideDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <Textarea
                  id="short_description"
                  value={exhibitor.short_description || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, short_description: e.target.value })}
                  rows={3}
                  maxLength={300}
                  placeholder="Brief text for the show guide (max 300 characters)..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {exhibitor.short_description?.length || 0} / 300 characters
                </p>
              </div>

              <div>
                <Label htmlFor="description">Company Profile (Full Description)</Label>
                <Textarea
                  id="description"
                  value={exhibitor.description || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, description: e.target.value })}
                  rows={6}
                  placeholder="Full company description..."
                />
              </div>

              <div>
                <Label htmlFor="logo">Company Logo (optional)</Label>
                <div className="mt-2">
                  {logoPreview && (
                    <img src={logoPreview} alt="Logo preview" className="h-24 mb-4 object-contain" />
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="flex-1"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Max 5MB</p>
                </div>
              </div>

              <div>
                <Label htmlFor="banner">Exhibitor Banner (1250 x 350px recommended)</Label>
                <div className="mt-2">
                  {bannerPreview && (
                    <img src={bannerPreview} alt="Banner preview" className="h-32 mb-4 w-full object-cover rounded" />
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      id="banner"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="flex-1"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Max 5MB. Recommended: 1250 x 350px</p>
                </div>
              </div>

              <div>
                <Label htmlFor="website">Website (optional)</Label>
                <Input
                  id="website"
                  type="url"
                  value={exhibitor.website || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, website: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new social media */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <div className="flex gap-2">
                  <Select
                    value={newSocialPlatform}
                    onValueChange={setNewSocialPlatform}
                  >
                    <SelectTrigger className="w-[180px] bg-background">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="url"
                    placeholder="Enter URL"
                    value={newSocialUrl}
                    onChange={(e) => setNewSocialUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (newSocialPlatform && newSocialUrl) {
                        setSocialMedia({ ...socialMedia, [newSocialPlatform]: newSocialUrl });
                        setNewSocialUrl("");
                        setNewSocialPlatform("");
                      }
                    }}
                    disabled={!newSocialPlatform || !newSocialUrl}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Display added social media */}
              <div className="space-y-2">
                {socialMedia?.linkedin && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex-1">
                      <p className="text-sm font-medium">LinkedIn</p>
                      <p className="text-xs text-muted-foreground truncate">{socialMedia.linkedin}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSocialMedia({ ...socialMedia, linkedin: "" })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {socialMedia?.facebook && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Facebook</p>
                      <p className="text-xs text-muted-foreground truncate">{socialMedia.facebook}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSocialMedia({ ...socialMedia, facebook: "" })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {socialMedia?.instagram && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Instagram</p>
                      <p className="text-xs text-muted-foreground truncate">{socialMedia.instagram}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSocialMedia({ ...socialMedia, instagram: "" })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {socialMedia?.tiktok && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex-1">
                      <p className="text-sm font-medium">TikTok</p>
                      <p className="text-xs text-muted-foreground truncate">{socialMedia.tiktok}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSocialMedia({ ...socialMedia, tiktok: "" })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {socialMedia?.youtube && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div className="flex-1">
                      <p className="text-sm font-medium">YouTube</p>
                      <p className="text-xs text-muted-foreground truncate">{socialMedia.youtube}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSocialMedia({ ...socialMedia, youtube: "" })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {!socialMedia?.linkedin && !socialMedia?.facebook && !socialMedia?.instagram && !socialMedia?.tiktok && !socialMedia?.youtube && (
                  <p className="text-sm text-muted-foreground text-center py-4">No social media accounts added</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SEO Settings</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={generatingSeo}
                  onClick={async () => {
                    setGeneratingSeo(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('generate-exhibitor-seo', {
                        body: { exhibitorId: exhibitor.id },
                      });
                      if (error) throw error;
                      if (data.success > 0) {
                        // Reload exhibitor data to get updated SEO
                        const { data: refreshedData } = await supabase
                          .from("exhibitors")
                          .select("meta_title, meta_description")
                          .eq("id", exhibitor.id)
                          .single();
                        if (refreshedData) {
                          setExhibitor((prev) => prev ? { 
                            ...prev, 
                            meta_title: refreshedData.meta_title,
                            meta_description: refreshedData.meta_description 
                          } : prev);
                        }
                        toast({
                          title: "SEO Generated",
                          description: "AI-generated meta title and description have been applied.",
                        });
                      } else {
                        toast({
                          title: "No Changes",
                          description: "SEO fields already filled or generation skipped.",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: error instanceof Error ? error.message : "Failed to generate SEO",
                        variant: "destructive",
                      });
                    } finally {
                      setGeneratingSeo(false);
                    }
                  }}
                >
                  {generatingSeo ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate with AI"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="meta_title">Meta Title (max 120 characters)</Label>
                <Input
                  id="meta_title"
                  value={exhibitor.meta_title || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, meta_title: e.target.value })}
                  maxLength={120}
                  placeholder="SEO title for this exhibitor's page..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {exhibitor.meta_title?.length || 0} / 120 characters
                </p>
              </div>

              <div>
                <Label htmlFor="meta_description">Meta Description (max 300 characters)</Label>
                <Textarea
                  id="meta_description"
                  value={exhibitor.meta_description || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, meta_description: e.target.value })}
                  rows={3}
                  maxLength={300}
                  placeholder="SEO description for search results..."
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {exhibitor.meta_description?.length || 0} / 300 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active" className="text-base">
                    Exhibitor Status
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {exhibitor.is_active ? "Active - Visible on website" : "Inactive - Hidden from website"}
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={exhibitor.is_active ?? true}
                  onCheckedChange={(checked) => setExhibitor({ ...exhibitor, is_active: checked })}
                />
              </div>

              <div>
                <Label htmlFor="event_status">Event Status</Label>
                <Input
                  id="event_status"
                  value={exhibitor.event_status || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, event_status: e.target.value })}
                  placeholder="e.g., Confirmed, Pending, Cancelled"
                />
              </div>
            </CardContent>
          </Card>

          {/* Booth Information */}
          <Card>
            <CardHeader>
              <CardTitle>Booth Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stand_type">Stand Type</Label>
                <Select
                  value={exhibitor.stand_type || ""}
                  onValueChange={(value) => setExhibitor({ ...exhibitor, stand_type: value })}
                >
                  <SelectTrigger id="stand_type" className="bg-background">
                    <SelectValue placeholder="Select stand type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Pipe and Drape">Pipe and Drape</SelectItem>
                    <SelectItem value="Shell">Shell</SelectItem>
                    <SelectItem value="Space only">Space only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="booth_length">Length (ft)</Label>
                  <Input
                    id="booth_length"
                    type="number"
                    step="0.1"
                    value={exhibitor.booth_length || ""}
                    onChange={(e) => setExhibitor({ ...exhibitor, booth_length: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 10"
                  />
                </div>

                <div>
                  <Label htmlFor="booth_width">Width (ft)</Label>
                  <Input
                    id="booth_width"
                    type="number"
                    step="0.1"
                    value={exhibitor.booth_width || ""}
                    onChange={(e) => setExhibitor({ ...exhibitor, booth_width: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="open_sides">Open Sides</Label>
                <Input
                  id="open_sides"
                  type="number"
                  min="0"
                  max="4"
                  value={exhibitor.open_sides || ""}
                  onChange={(e) => setExhibitor({ ...exhibitor, open_sides: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Number of open sides (0-4)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Speaking Session & Advertisement */}
          <Card>
            <CardHeader>
              <CardTitle>Speaking Session & Advertisement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="speaking_session" className="text-base">
                      Speaking Session
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {exhibitor.speaking_session ? "Yes - Has speaking session" : "No speaking session"}
                    </p>
                  </div>
                  <Switch
                    id="speaking_session"
                    checked={exhibitor.speaking_session ?? false}
                    onCheckedChange={(checked) => setExhibitor({ ...exhibitor, speaking_session: checked })}
                  />
                </div>
                
                {exhibitor.speaking_session && (
                  <>
                    <div>
                      <Label htmlFor="speaking_session_details">Speaking Session Details</Label>
                      <Textarea
                        id="speaking_session_details"
                        value={exhibitor.speaking_session_details || ""}
                        onChange={(e) => setExhibitor({ ...exhibitor, speaking_session_details: e.target.value })}
                        rows={3}
                        placeholder="Enter speaking session details..."
                      />
                    </div>

                    {/* Speaker Form Submission Status */}
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Speaker Form Submission</Label>
                        {speakerSubmissions.length > 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {speakerSubmissions.length > 0 ? (
                        <div className="space-y-2">
                          {speakerSubmissions.map((submission) => (
                            <div key={submission.id} className="flex items-center justify-between gap-2 p-2 bg-background rounded">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{submission.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(submission.created_at), "dd MMM yyyy 'at' HH:mm")}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                   onClick={() => handleDownloadSubmission(submission.file_url, submission.file_name, "speaker")}
                                  title="View"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {submission.approval_status !== "rejected" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSubmission(submission.id, "speaker")}
                                    className="text-destructive hover:text-destructive"
                                    title="Delete"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                       ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">No form submitted yet</p>
                          {exhibitor.speaker_submission_approved && (
                            <div className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
                              <span>Approval flag set but no submission found.</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleResetSubmissionApproval("speaker")}
                              >
                                Reset flag
                              </Button>
                            </div>
                          )}
                        </div>
                       )}
                    </div>

                    {/* Speaker Headshot Submission Status */}
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Speaker Headshot</Label>
                        {headshotSubmissions.length > 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                        {headshotSubmissions.length > 0 ? (
                          <div className="space-y-2">
                            {headshotSubmissions.map((submission) => (
                              <div key={submission.id} className="flex items-center justify-between gap-2 p-2 bg-background rounded">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{submission.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(submission.created_at), "dd MMM yyyy 'at' HH:mm")}
                                  </p>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                     onClick={() => handleDownloadSubmission(submission.file_url, submission.file_name, "headshot")}
                                    title="View"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  {submission.approval_status !== "rejected" && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteSubmission(submission.id, "headshot")}
                                      className="text-destructive hover:text-destructive"
                                      title="Delete"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                         ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">No headshot submitted yet</p>
                          {exhibitor.headshot_submission_approved && (
                            <div className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
                              <span>Approval flag set but no submission found.</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleResetSubmissionApproval("headshot")}
                              >
                                Reset flag
                              </Button>
                            </div>
                          )}
                        </div>
                       )}
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="advertisement" className="text-base">
                      Advertisement
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {exhibitor.advertisement ? "Yes - Has advertisement" : "No advertisement"}
                    </p>
                  </div>
                  <Switch
                    id="advertisement"
                    checked={exhibitor.advertisement ?? false}
                    onCheckedChange={(checked) => setExhibitor({ ...exhibitor, advertisement: checked })}
                  />
                </div>
                
                {exhibitor.advertisement && (
                  <>
                    <div>
                      <Label htmlFor="advertisement_details">Advertisement Details</Label>
                      <Textarea
                        id="advertisement_details"
                        value={exhibitor.advertisement_details || ""}
                        onChange={(e) => setExhibitor({ ...exhibitor, advertisement_details: e.target.value })}
                        rows={3}
                        placeholder="Enter advertisement details..."
                      />
                    </div>

                    {/* Advertisement Submission Status */}
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Advertisement Submission</Label>
                        {advertSubmissions.length > 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      {advertSubmissions.length > 0 ? (
                        <div className="space-y-2">
                          {advertSubmissions.map((submission) => (
                            <div key={submission.id} className="flex items-center justify-between gap-2 p-2 bg-background rounded">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{submission.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(submission.created_at), "dd MMM yyyy 'at' HH:mm")}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadSubmission(submission.file_url, submission.file_name, "advert")}
                                  title="View"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {submission.approval_status !== "rejected" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteSubmission(submission.id, "advert")}
                                    className="text-destructive hover:text-destructive"
                                    title="Delete"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                       ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">No advertisement submitted yet</p>
                          {exhibitor.advert_submission_approved && (
                            <div className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
                              <span>Approval flag set but no submission found.</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleResetSubmissionApproval("advert")}
                              >
                                Reset flag
                              </Button>
                            </div>
                          )}
                        </div>
                       )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exhibitor Access */}
          <Card>
            <CardHeader>
              <CardTitle>Exhibitor Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exhibitor.user_id ? (
                <>
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>Login Credentials Created</AlertTitle>
                    <AlertDescription>
                      This exhibitor has login credentials. The login email is shown below. 
                      {!exhibitorPassword && " For security, passwords are only shown once when generated. Click 'Reset Password' to create a new one."}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Login Email</Label>
                        <p className="text-sm text-muted-foreground mt-1 break-all font-mono">{exhibitorLoginEmail}</p>
                        <p className="text-xs text-muted-foreground mt-1">This is their login email - always available</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(exhibitorLoginEmail)}
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {exhibitorPassword && (
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20">
                        <div className="flex-1">
                          <Label className="text-sm font-medium">Password (Temporary Display)</Label>
                          <p className="text-sm text-muted-foreground mt-1 break-all font-mono">{exhibitorPassword}</p>
                          <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ COPY NOW - This password will not be shown again after you leave this page</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(exhibitorPassword)}
                          className="ml-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetPassword}
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
                          {exhibitorPassword ? "Generate Another Password" : "Reset Password"}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {exhibitorPassword 
                        ? "You can generate a new password if needed"
                        : "Click to generate a new password for this exhibitor"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertTitle>No Login Credentials</AlertTitle>
                    <AlertDescription>
                      This exhibitor doesn't have login credentials yet. Generate credentials to allow them to access the exhibitor portal.
                    </AlertDescription>
                  </Alert>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCredentials}
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
        </main>
        <Footer />
      </div>

      <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exhibitor Login Credentials</DialogTitle>
            <DialogDescription>
              Share these credentials with the exhibitor. They can use them to log in at the exhibitor portal.
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
                      variant="outline"
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
                      type="text"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(credentials.password)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-sm text-muted-foreground">
                  Login URL: <span className="font-mono">{window.location.origin}/exhibitor-portal/login</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminExhibitorEdit;
