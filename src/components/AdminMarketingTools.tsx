import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Trash2, Upload, X, FileText, Share2, Image as ImageIcon } from "lucide-react";

export const AdminMarketingTools = () => {
  const queryClient = useQueryClient();
  
  // State for PDF upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  
  // State for social media URLs
  const [socialForm, setSocialForm] = useState({
    facebook: "",
    instagram: "",
    linkedin: "",
  });
  
  // State for logo/graphic uploads
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoTitle, setLogoTitle] = useState("");
  const [graphicFile, setGraphicFile] = useState<File | null>(null);
  const [graphicTitle, setGraphicTitle] = useState("");

  // Fetch all marketing tools
  const { data: marketingTools } = useQuery({
    queryKey: ["marketing-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_tools")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get items by type
  const pdfGuides = marketingTools?.filter((t) => t.tool_type === "pdf") || [];
  const logos = marketingTools?.filter((t) => t.tool_type === "logo") || [];
  const graphics = marketingTools?.filter((t) => t.tool_type === "graphic") || [];

  // Upload PDF mutation
  const uploadPdfMutation = useMutation({
    mutationFn: async () => {
      if (!pdfFile || !pdfTitle) throw new Error("PDF file and title are required");

      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `marketing/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(filePath, pdfFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("marketing_tools")
        .insert([{
          tool_type: "pdf",
          title: pdfTitle,
          file_url: publicUrl,
          file_name: pdfFile.name,
        }]);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-tools"] });
      toast.success("PDF uploaded successfully!");
      setPdfFile(null);
      setPdfTitle("");
    },
    onError: () => {
      toast.error("Failed to upload PDF");
    },
  });

  // Save social media URLs mutation
  const saveSocialMediaMutation = useMutation({
    mutationFn: async () => {
      const platforms = Object.entries(socialForm).filter(([_, url]) => url.trim());
      
      // Delete existing social media entries (both legacy "social_media" and new "social" types)
      await supabase
        .from("marketing_tools")
        .delete()
        .in("tool_type", ["social_media", "social"]);

      // Insert new entries
      const inserts = platforms.map(([platform, url]) => ({
        tool_type: "social",
        social_platform: platform,
        social_url: url,
      }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("marketing_tools")
          .insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-tools"] });
      toast.success("Social media links saved!");
    },
    onError: () => {
      toast.error("Failed to save social media links");
    },
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async () => {
      if (!logoFile || !logoTitle) throw new Error("Logo file and title are required");

      const fileExt = logoFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `marketing/logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(filePath, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("marketing_tools")
        .insert([{
          tool_type: "logo",
          title: logoTitle,
          file_url: publicUrl,
          thumbnail_url: publicUrl,
          file_name: logoFile.name,
        }]);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-tools"] });
      toast.success("Logo uploaded successfully!");
      setLogoFile(null);
      setLogoTitle("");
    },
    onError: () => {
      toast.error("Failed to upload logo");
    },
  });

  // Upload graphic mutation
  const uploadGraphicMutation = useMutation({
    mutationFn: async () => {
      if (!graphicFile || !graphicTitle) throw new Error("Graphic file and title are required");

      const fileExt = graphicFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `marketing/graphics/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(filePath, graphicFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media-library')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("marketing_tools")
        .insert([{
          tool_type: "graphic",
          title: graphicTitle,
          file_url: publicUrl,
          thumbnail_url: publicUrl,
          file_name: graphicFile.name,
        }]);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-tools"] });
      toast.success("Graphic uploaded successfully!");
      setGraphicFile(null);
      setGraphicTitle("");
    },
    onError: () => {
      toast.error("Failed to upload graphic");
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_tools")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-tools"] });
      toast.success("Item deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete item");
    },
  });

  // Fetch event settings social URLs as fallback
  const { data: eventSettings } = useQuery({
    queryKey: ["event-settings-social"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_settings")
        .select("facebook_url, instagram_url, linkedin_url")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load existing social media URLs (prefer marketing_tools, fallback to event_settings)
  useEffect(() => {
    const currentSocialMedia = (marketingTools || []).filter(
      (t) => t.tool_type === "social_media" || t.tool_type === "social",
    );

    const next: { facebook: string; instagram: string; linkedin: string } = {
      facebook: "",
      instagram: "",
      linkedin: "",
    };

    currentSocialMedia.forEach((item) => {
      const platform = item.social_platform;
      if (
        platform === "facebook" ||
        platform === "instagram" ||
        platform === "linkedin"
      ) {
        next[platform] = item.social_url || "";
      }
    });

    // Fallback to event_settings if marketing_tools has no social entries
    if (currentSocialMedia.length === 0 && eventSettings) {
      next.facebook = eventSettings.facebook_url || "";
      next.instagram = eventSettings.instagram_url || "";
      next.linkedin = eventSettings.linkedin_url || "";
    }

    setSocialForm(next);
  }, [marketingTools, eventSettings]);

  return (
    <div className="space-y-8">
      {/* Quick Guide to Exhibiting */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Guide to Exhibiting
          </CardTitle>
          <CardDescription>
            Upload PDF guide for exhibitors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="pdf-title">Guide Title</Label>
              <Input
                id="pdf-title"
                value={pdfTitle}
                onChange={(e) => setPdfTitle(e.target.value)}
                placeholder="e.g., Exhibitor Manual 2024"
              />
            </div>
            <div>
              <Label htmlFor="pdf-file">PDF File</Label>
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              />
            </div>
            <Button
              onClick={() => uploadPdfMutation.mutate()}
              disabled={!pdfFile || !pdfTitle || uploadPdfMutation.isPending}
            >
              {uploadPdfMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </>
              )}
            </Button>
          </div>

          {pdfGuides.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="font-semibold text-sm">Uploaded Guides</h4>
              {pdfGuides.map((pdf) => (
                <div key={pdf.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{pdf.title}</p>
                      <a
                        href={pdf.file_url || ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View PDF
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItemMutation.mutate(pdf.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Media Accounts */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Show Social Media Accounts
          </CardTitle>
          <CardDescription>
            Tag us - Add your show's social media URLs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="facebook">Facebook URL</Label>
              <Input
                id="facebook"
                type="url"
                value={socialForm.facebook}
                onChange={(e) => setSocialForm(prev => ({ ...prev, facebook: e.target.value }))}
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram URL</Label>
              <Input
                id="instagram"
                type="url"
                value={socialForm.instagram}
                onChange={(e) => setSocialForm(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="https://instagram.com/yourpage"
              />
            </div>
            <div>
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                type="url"
                value={socialForm.linkedin}
                onChange={(e) => setSocialForm(prev => ({ ...prev, linkedin: e.target.value }))}
                placeholder="https://linkedin.com/company/yourpage"
              />
            </div>
            <Button
              onClick={() => saveSocialMediaMutation.mutate()}
              disabled={saveSocialMediaMutation.isPending}
            >
              {saveSocialMediaMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Social Media Links"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Show Logos */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Show Logos
          </CardTitle>
          <CardDescription>
            Upload show logos for exhibitors to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="logo-title">Logo Name</Label>
              <Input
                id="logo-title"
                value={logoTitle}
                onChange={(e) => setLogoTitle(e.target.value)}
                placeholder="e.g., Main Event Logo"
              />
            </div>
            <div>
              <Label htmlFor="logo-file">Logo Image</Label>
              <Input
                id="logo-file"
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              />
            </div>
            <Button
              onClick={() => uploadLogoMutation.mutate()}
              disabled={!logoFile || !logoTitle || uploadLogoMutation.isPending}
            >
              {uploadLogoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </>
              )}
            </Button>
          </div>

          {logos.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {logos.map((logo) => (
                <div key={logo.id} className="border rounded-lg p-4 space-y-2">
                  <img
                    src={logo.thumbnail_url || ""}
                    alt={logo.title || "Logo"}
                    className="w-full h-32 object-contain"
                  />
                  <p className="font-medium text-sm text-center">{logo.title}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteItemMutation.mutate(logo.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exhibitor Graphics */}
      <Card className="bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Exhibitor Graphics
          </CardTitle>
          <CardDescription>
            Upload promotional graphics for exhibitors to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="graphic-title">Graphic Name</Label>
              <Input
                id="graphic-title"
                value={graphicTitle}
                onChange={(e) => setGraphicTitle(e.target.value)}
                placeholder="e.g., Social Media Banner"
              />
            </div>
            <div>
              <Label htmlFor="graphic-file">Graphic Image</Label>
              <Input
                id="graphic-file"
                type="file"
                accept="image/*"
                onChange={(e) => setGraphicFile(e.target.files?.[0] || null)}
                className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300"
              />
            </div>
            <Button
              onClick={() => uploadGraphicMutation.mutate()}
              disabled={!graphicFile || !graphicTitle || uploadGraphicMutation.isPending}
            >
              {uploadGraphicMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Graphic
                </>
              )}
            </Button>
          </div>

          {graphics.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {graphics.map((graphic) => (
                <div key={graphic.id} className="border rounded-lg p-4 space-y-2">
                  <img
                    src={graphic.thumbnail_url || ""}
                    alt={graphic.title || "Graphic"}
                    className="w-full h-32 object-contain"
                  />
                  <p className="font-medium text-sm text-center">{graphic.title}</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteItemMutation.mutate(graphic.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
