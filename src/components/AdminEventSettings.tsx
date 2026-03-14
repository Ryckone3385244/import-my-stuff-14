import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Loader2, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { QUERY_KEYS } from "@/lib/constants";
import { fetchEventSettings } from "@/lib/supabaseQueries";
import { AdminCRMManagers } from "./AdminCRMManagers";

export const AdminEventSettings = () => {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [popupImageFile, setPopupImageFile] = useState<File | null>(null);
  const [popupImagePreview, setPopupImagePreview] = useState<string>("");
  const [popupImagePendingDelete, setPopupImagePendingDelete] = useState(false);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string>("");
  const [faviconPendingDelete, setFaviconPendingDelete] = useState(false);

  const hasInitializedFormRef = useRef(false);

  const { data: eventSettings, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.EVENT_SETTINGS],
    queryFn: fetchEventSettings,
  });

  const [formData, setFormData] = useState({
    event_name: "",
    tagline: "",
    event_date: "",
    location: "",
    address_line_1: "",
    address_line_2: "",
    address_line_3: "",
    contact_email: "",
    contact_phone: "",
    organiser_info: "",
    copyright_text: "",
    floorplan_url: "",
    event_domain: "",
    event_status: "upcoming",
    showguide_listing_deadline: "",
    space_only_deadline: "",
    speaker_form_deadline: "",
    advert_submission_deadline: "",
    facebook_url: "",
    twitter_url: "",
    linkedin_url: "",
    instagram_url: "",
    youtube_url: "",
    tiktok_url: "",
    ticker_enabled: false,
    ticker_text: "",
    ticker_link_text: "",
    ticker_link_url: "",
    popup_enabled: false,
    popup_link_url: "",
  });

  // Initialize form ONCE when data first loads (prevents "reset to old values" while editing)
  useEffect(() => {
    if (eventSettings && !hasInitializedFormRef.current) {
      hasInitializedFormRef.current = true;

      setFormData({
        event_name: eventSettings.event_name || "",
        tagline: eventSettings.tagline || "",
        event_date: eventSettings.event_date || "",
        location: eventSettings.location || "",
        address_line_1: eventSettings.address_line_1 || "",
        address_line_2: eventSettings.address_line_2 || "",
        address_line_3: eventSettings.address_line_3 || "",
        contact_email: (eventSettings as any).contact_email || "",
        contact_phone: (eventSettings as any).contact_phone || "",
        organiser_info: eventSettings.organiser_info || "",
        copyright_text: eventSettings.copyright_text || "",
        floorplan_url: (eventSettings as any).floorplan_url || "",
        event_domain: (eventSettings as any).event_domain || "",
        event_status: eventSettings.event_status || "upcoming",
        showguide_listing_deadline: eventSettings.showguide_listing_deadline || "",
        space_only_deadline: eventSettings.space_only_deadline || "",
        speaker_form_deadline: eventSettings.speaker_form_deadline || "",
        advert_submission_deadline: eventSettings.advert_submission_deadline || "",
        facebook_url: (eventSettings as any).facebook_url || "",
        twitter_url: (eventSettings as any).twitter_url || "",
        linkedin_url: (eventSettings as any).linkedin_url || "",
        instagram_url: (eventSettings as any).instagram_url || "",
        youtube_url: (eventSettings as any).youtube_url || "",
        tiktok_url: (eventSettings as any).tiktok_url || "",
        ticker_enabled: (eventSettings as any).ticker_enabled || false,
        ticker_text: (eventSettings as any).ticker_text || "",
        ticker_link_text: (eventSettings as any).ticker_link_text || "",
        ticker_link_url: (eventSettings as any).ticker_link_url || "",
        popup_enabled: (eventSettings as any).popup_enabled || false,
        popup_link_url: (eventSettings as any).popup_link_url || "",
      });

      setLogoPreview(eventSettings.logo_url || "");
      setThumbnailPreview(eventSettings.thumbnail_url || "");
      setPopupImagePreview((eventSettings as any).popup_image_url || "");
      setFaviconPreview((eventSettings as any).favicon_url || "");
    }
  }, [eventSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      let logoUrl = eventSettings?.logo_url || null;
      let thumbnailUrl = eventSettings?.thumbnail_url || null;
      let popupImageUrl = (eventSettings as any)?.popup_image_url || null;
      let faviconUrl = (eventSettings as any)?.favicon_url || null;

      // Upload logo if file is selected
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media-library")
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("media-library").getPublicUrl(fileName);
        logoUrl = publicUrl;
      }

      // Upload thumbnail if file is selected
      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split(".").pop();
        const fileName = `thumbnail-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media-library")
          .upload(fileName, thumbnailFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("media-library").getPublicUrl(fileName);
        thumbnailUrl = publicUrl;
      }

      // Upload popup image if file is selected
      if (popupImageFile) {
        const fileExt = popupImageFile.name.split(".").pop();
        const fileName = `popup-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media-library")
          .upload(fileName, popupImageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("media-library").getPublicUrl(fileName);
        popupImageUrl = publicUrl;
      }

      // Upload favicon if file is selected
      if (faviconFile) {
        const fileExt = faviconFile.name.split(".").pop();
        const fileName = `favicon-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("media-library")
          .upload(fileName, faviconFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("media-library").getPublicUrl(fileName);
        faviconUrl = publicUrl;
      }

      // Handle popup image deletion
      if (popupImagePendingDelete) {
        popupImageUrl = null;
      }

      // Handle favicon deletion
      if (faviconPendingDelete) {
        faviconUrl = null;
      }

      const normalizeOptionalDate = (value: string) =>
        value && value.trim() !== "" ? value : null;

      const settingsPayload = {
        ...formData,
        showguide_listing_deadline: normalizeOptionalDate(formData.showguide_listing_deadline),
        space_only_deadline: normalizeOptionalDate(formData.space_only_deadline),
        speaker_form_deadline: normalizeOptionalDate(formData.speaker_form_deadline),
        advert_submission_deadline: normalizeOptionalDate(formData.advert_submission_deadline),
        logo_url: logoUrl,
        thumbnail_url: thumbnailUrl,
        popup_image_url: popupImageUrl,
        favicon_url: faviconUrl,
        updated_at: new Date().toISOString(),
      };

      const result = eventSettings?.id
        ? await supabase
            .from("event_settings")
            .update(settingsPayload)
            .eq("id", eventSettings.id)
            .select()
            .maybeSingle()
        : await supabase
            .from("event_settings")
            .insert(settingsPayload)
            .select()
            .maybeSingle();

      if (result.error) throw result.error;

      return result.data;
    },
    onSuccess: (saved) => {
      if (saved) {
        // Update the cache immediately so Navbar/Footer update without refresh
        queryClient.setQueryData([QUERY_KEYS.EVENT_SETTINGS], saved);

        // Update form + previews to the saved data
        hasInitializedFormRef.current = true;
        setFormData({
          event_name: saved.event_name || "",
          tagline: saved.tagline || "",
          event_date: saved.event_date || "",
          location: saved.location || "",
          address_line_1: saved.address_line_1 || "",
          address_line_2: saved.address_line_2 || "",
          address_line_3: saved.address_line_3 || "",
          contact_email: saved.contact_email || "",
          contact_phone: saved.contact_phone || "",
          organiser_info: saved.organiser_info || "",
          copyright_text: saved.copyright_text || "",
          floorplan_url: saved.floorplan_url || "",
          event_domain: saved.event_domain || "",
          event_status: saved.event_status || "upcoming",
          showguide_listing_deadline: saved.showguide_listing_deadline || "",
          space_only_deadline: saved.space_only_deadline || "",
          speaker_form_deadline: saved.speaker_form_deadline || "",
          advert_submission_deadline: saved.advert_submission_deadline || "",
          facebook_url: saved.facebook_url || "",
          twitter_url: saved.twitter_url || "",
          linkedin_url: saved.linkedin_url || "",
          instagram_url: saved.instagram_url || "",
          youtube_url: saved.youtube_url || "",
          tiktok_url: saved.tiktok_url || "",
          ticker_enabled: saved.ticker_enabled || false,
          ticker_text: saved.ticker_text || "",
          ticker_link_text: saved.ticker_link_text || "",
          ticker_link_url: saved.ticker_link_url || "",
          popup_enabled: saved.popup_enabled || false,
          popup_link_url: saved.popup_link_url || "",
        });
        setLogoPreview(saved.logo_url || "");
        setThumbnailPreview(saved.thumbnail_url || "");
        setPopupImagePreview(saved.popup_image_url || "");
        setPopupImagePendingDelete(false);
        setFaviconPreview(saved.favicon_url || "");
        setFaviconPendingDelete(false);
      }

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.EVENT_SETTINGS] });
      toast.success("Event settings updated successfully!");
      setLogoFile(null);
      setThumbnailFile(null);
      setPopupImageFile(null);
      setFaviconFile(null);
    },
    onError: (error) => {
      const message =
        (error as { message?: string } | null)?.message ||
        "Failed to update event settings";
      toast.error(message);
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePopupImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPopupImageFile(file);
      setPopupImagePendingDelete(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPopupImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeletePopupImage = () => {
    setPopupImagePendingDelete(true);
    setPopupImagePreview("");
    setPopupImageFile(null);
  };

  const handleUndoDeletePopupImage = () => {
    setPopupImagePendingDelete(false);
    setPopupImagePreview((eventSettings as any)?.popup_image_url || "");
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPendingDelete(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteFavicon = () => {
    setFaviconPendingDelete(true);
    setFaviconPreview("");
    setFaviconFile(null);
  };

  const handleUndoDeleteFavicon = () => {
    setFaviconPendingDelete(false);
    setFaviconPreview((eventSettings as any)?.favicon_url || "");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Information</CardTitle>
        <CardDescription>
          Update your event information below. All changes will be reflected across the website.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="event_name">Event Name</Label>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData(prev => ({ ...prev, event_name: e.target.value }))}
                placeholder="Customer Connect Expo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                placeholder="The leading Food-To-Go industry event"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Event Date</Label>
              <Input
                id="event_date"
                value={formData.event_date}
                onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                placeholder="29 & 30 September 2026"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="ExCel London"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_1">Address Line 1</Label>
              <Input
                id="address_line_1"
                value={formData.address_line_1}
                onChange={(e) => setFormData(prev => ({ ...prev, address_line_1: e.target.value }))}
                placeholder="One Western Gateway"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_2">Address Line 2</Label>
              <Input
                id="address_line_2"
                value={formData.address_line_2}
                onChange={(e) => setFormData(prev => ({ ...prev, address_line_2: e.target.value }))}
                placeholder="Royal Victoria Dock"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line_3">Address Line 3 (Postcode)</Label>
              <Input
                id="address_line_3"
                value={formData.address_line_3}
                onChange={(e) => setFormData(prev => ({ ...prev, address_line_3: e.target.value }))}
                placeholder="London E16 1XL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                placeholder="info@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Displayed in the footer and exhibit page contact sections
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="+44 (0) 123 456 7890"
              />
              <p className="text-xs text-muted-foreground">
                Displayed in the footer and exhibit page contact sections
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="event_status">Event Code</Label>
            <Input
              id="event_status"
              value={formData.event_status}
              onChange={(e) => setFormData(prev => ({ ...prev, event_status: e.target.value }))}
              placeholder="e.g., DEHO26"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_domain">Event Domain</Label>
            <Input
              id="event_domain"
              value={formData.event_domain}
              onChange={(e) => setFormData(prev => ({ ...prev, event_domain: e.target.value }))}
              placeholder="e.g., customerconnectexpo.com"
            />
            <p className="text-xs text-muted-foreground">
              Used for portal links in emails (e.g., exhibitor-portal/login). Enter domain without https://
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="logo">Website Logo</Label>
            <div className="flex items-center gap-4">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="flex-1"
              />
            </div>
            {logoPreview && (
              <div className="mt-2">
                <img src={logoPreview} alt="Logo preview" className="h-20 object-contain" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This logo will appear in the navbar and footer across the website
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnail">Social Media Thumbnail</Label>
            <div className="flex items-center gap-4">
              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="flex-1"
              />
            </div>
            {thumbnailPreview && (
              <div className="mt-2">
                <img src={thumbnailPreview} alt="Thumbnail preview" className="h-20 object-contain" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Used when sharing the website on social media platforms
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="favicon">Favicon (Browser Tab Icon)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="favicon"
                type="file"
                accept="image/png,image/x-icon,image/svg+xml,image/ico,.ico,.png,.svg"
                onChange={handleFaviconChange}
                className="flex-1"
              />
              {faviconPreview && !faviconPendingDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleDeleteFavicon}
                  title="Remove favicon"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
              {faviconPendingDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleUndoDeleteFavicon}
                  title="Undo remove"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {faviconPreview && !faviconPendingDelete && (
              <div className="mt-2">
                <img src={faviconPreview} alt="Favicon preview" className="h-10 w-10 object-contain border rounded" />
              </div>
            )}
            {faviconPendingDelete && (
              <p className="text-xs text-destructive">
                Favicon will be removed on save. The auto-generated favicon will be used instead.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Upload a custom favicon (.ico, .png, or .svg). If not set, an auto-generated favicon using the event name initial will be used.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organiser_info">Organiser Information</Label>
          <Textarea
            id="organiser_info"
            value={formData.organiser_info}
            onChange={(e) => setFormData(prev => ({ ...prev, organiser_info: e.target.value }))}
            placeholder="An event organised by Fortem Food And Drink Ltd. Company Registered in England No. 09810978."
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            This appears below the copyright text in the footer
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="copyright_text">Copyright Text</Label>
          <Input
            id="copyright_text"
            value={formData.copyright_text}
            onChange={(e) => setFormData(prev => ({ ...prev, copyright_text: e.target.value }))}
            placeholder="© 2025 - 2026 Customer Connect Expo. All rights reserved."
          />
          <p className="text-xs text-muted-foreground">
            Main copyright text that appears in the footer
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="floorplan_url">Floorplan PDF/Viewer URL</Label>
          <Input
            id="floorplan_url"
            type="url"
            value={formData.floorplan_url}
            onChange={(e) => setFormData(prev => ({ ...prev, floorplan_url: e.target.value }))}
            placeholder="https://example.com/floorplan.pdf"
          />
          <p className="text-xs text-muted-foreground">
            This URL will be displayed on /view-floorplan. Supports PDFs, interactive viewers, images, etc.
          </p>
          {formData.floorplan_url && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <div
                className="relative w-full bg-white rounded-lg border border-border shadow overflow-hidden"
                style={{ paddingBottom: "56.25%" }}
              >
                <object
                  data={formData.floorplan_url}
                  type="application/pdf"
                  className="absolute inset-0 w-full h-full"
                  title="Floorplan Preview"
                >
                  <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(formData.floorplan_url)}&embedded=true`}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    title="Floorplan Preview Fallback"
                  />
                </object>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div>
            <h3 className="text-lg font-semibold mb-1">Important Deadlines</h3>
            <p className="text-sm text-muted-foreground">
              Set key dates for exhibitor submissions and requirements
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="showguide_listing_deadline">Showguide Listing Deadline</Label>
              <Input
                id="showguide_listing_deadline"
                type="date"
                value={formData.showguide_listing_deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, showguide_listing_deadline: e.target.value }))}
                className="bg-white text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="space_only_deadline">Space Only Information Deadline</Label>
              <Input
                id="space_only_deadline"
                type="date"
                value={formData.space_only_deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, space_only_deadline: e.target.value }))}
                className="bg-white text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="speaker_form_deadline">Speaker Form + Headshot Submission</Label>
              <Input
                id="speaker_form_deadline"
                type="date"
                value={formData.speaker_form_deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, speaker_form_deadline: e.target.value }))}
                className="bg-white text-gray-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="advert_submission_deadline">Advert Submission Deadline</Label>
              <Input
                id="advert_submission_deadline"
                type="date"
                value={formData.advert_submission_deadline}
                onChange={(e) => setFormData({ ...formData, advert_submission_deadline: e.target.value })}
                className="bg-white text-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div>
            <h3 className="text-lg font-semibold mb-1">Social Media Accounts</h3>
            <p className="text-sm text-muted-foreground">
              Add your show's social media URLs to display in the footer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="facebook_url">Facebook URL</Label>
              <Input
                id="facebook_url"
                type="url"
                value={formData.facebook_url}
                onChange={(e) => setFormData(prev => ({ ...prev, facebook_url: e.target.value }))}
                placeholder="https://facebook.com/yourpage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twitter_url">Twitter/X URL</Label>
              <Input
                id="twitter_url"
                type="url"
                value={formData.twitter_url}
                onChange={(e) => setFormData(prev => ({ ...prev, twitter_url: e.target.value }))}
                placeholder="https://twitter.com/yourhandle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/company/yourcompany"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram URL</Label>
              <Input
                id="instagram_url"
                type="url"
                value={formData.instagram_url}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                placeholder="https://instagram.com/yourhandle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube_url">YouTube URL</Label>
              <Input
                id="youtube_url"
                type="url"
                value={formData.youtube_url}
                onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                placeholder="https://youtube.com/@yourchannel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok_url">TikTok URL</Label>
              <Input
                id="tiktok_url"
                type="url"
                value={formData.tiktok_url}
                onChange={(e) => setFormData(prev => ({ ...prev, tiktok_url: e.target.value }))}
                placeholder="https://tiktok.com/@yourhandle"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div>
            <h3 className="text-lg font-semibold mb-1">Announcement Ticker Bar</h3>
            <p className="text-sm text-muted-foreground">
              Display a customizable announcement bar above the navigation
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ticker_enabled"
              checked={formData.ticker_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ticker_enabled: checked }))}
            />
            <Label htmlFor="ticker_enabled">Enable Ticker Bar</Label>
          </div>

          {formData.ticker_enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticker_text">Ticker Text</Label>
                <Input
                  id="ticker_text"
                  value={formData.ticker_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, ticker_text: e.target.value }))}
                  placeholder="Important announcement text..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticker_link_text">Link Text (optional)</Label>
                  <Input
                    id="ticker_link_text"
                    value={formData.ticker_link_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, ticker_link_text: e.target.value }))}
                    placeholder="click here"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticker_link_url">Link URL (optional)</Label>
                  <Input
                    id="ticker_link_url"
                    value={formData.ticker_link_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, ticker_link_url: e.target.value }))}
                    placeholder="/registration or https://..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-6 border-t">
          <div>
            <h3 className="text-lg font-semibold mb-1">Announcement Popup</h3>
            <p className="text-sm text-muted-foreground">
              Display a popup image when visitors land on the homepage
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="popup_enabled"
              checked={formData.popup_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, popup_enabled: checked }))}
            />
            <Label htmlFor="popup_enabled">Enable Popup</Label>
          </div>

          {formData.popup_enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="popup_image">Popup Image</Label>
                <Input
                  id="popup_image"
                  type="file"
                  accept="image/*"
                  onChange={handlePopupImageChange}
                />
                {popupImagePreview && !popupImagePendingDelete && (
                  <div className="mt-2 relative inline-block">
                    <img src={popupImagePreview} alt="Popup preview" className="max-h-40 object-contain rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={handleDeletePopupImage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {popupImagePendingDelete && (
                  <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-destructive">Image will be removed when you save changes</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUndoDeletePopupImage}
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Undo
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload an image to display in the popup overlay
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="popup_link_url">Link URL (optional)</Label>
                <Input
                  id="popup_link_url"
                  type="url"
                  value={formData.popup_link_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, popup_link_url: e.target.value }))}
                  placeholder="https://... or /registration"
                />
                <p className="text-xs text-muted-foreground">
                  If set, clicking the image will open this link
                </p>
              </div>
            </div>
          )}
        </div>

            <div className="mt-6">
              <AdminCRMManagers />
            </div>

            <Button
              onClick={() => updateSettingsMutation.mutate()}
              disabled={updateSettingsMutation.isPending}
              className="w-full mt-6"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
