import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useSpeaker } from "@/contexts/SpeakerContext";
import { Loader2, Upload, X } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  bio: z.string().optional(),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  linkedin_url: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  seminar_title: z.string().optional(),
  seminar_description: z.string().optional(),
});

export default function SpeakerProfile() {
  const { reloadSpeaker } = useSpeaker();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [speaker, setSpeaker] = useState<{ id: string; name: string; bio?: string | null; photo_url?: string | null; [key: string]: unknown } | null>(null);
  const [supabaseClient, setSupabaseClient] = useState(supabase);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    title: "",
    company: "",
    email: "",
    phone: "",
    linkedin_url: "",
    seminar_title: "",
    seminar_description: "",
    photo_url: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

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
      const { data, error } = await client
        .from("speakers")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Failed to load profile");
        setLoading(false);
        return;
      }

      if (data) {
        setSpeaker(data);
        setFormData({
          name: data.name || "",
          bio: data.bio || "",
          title: data.title || "",
          company: data.company || "",
          email: data.email || "",
          phone: data.phone || "",
          linkedin_url: data.linkedin_url || "",
          seminar_title: data.seminar_title || "",
          seminar_description: data.seminar_description || "",
          photo_url: data.photo_url || "",
        });
        setPhotoPreview(data.photo_url || "");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const validationResult = profileSchema.safeParse(formData);
      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setSaving(false);
        return;
      }

      let photoUrl = formData.photo_url;

      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('speaker-headshots')
          .upload(filePath, photoFile);

        if (uploadError) {
          toast.error("Failed to upload photo");
          setSaving(false);
          return;
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from('speaker-headshots')
          .getPublicUrl(filePath);

        photoUrl = publicUrl;
      }

      const { error } = await supabaseClient
        .from("speakers")
        .update({
          name: formData.name,
          bio: formData.bio,
          title: formData.title,
          company: formData.company,
          email: formData.email,
          phone: formData.phone,
          linkedin_url: formData.linkedin_url,
          seminar_title: formData.seminar_title,
          seminar_description: formData.seminar_description,
          photo_url: photoUrl,
        })
        .eq("id", speaker.id);

      if (error) throw error;

      // If seminar title and description are filled, create/update draft session
      if (formData.seminar_title && formData.seminar_description) {
        const { data: existingDraft } = await supabaseClient
          .from("draft_sessions")
          .select("id")
          .eq("speaker_id", speaker.id)
          .maybeSingle();

        if (existingDraft) {
          // Update existing draft
          await supabaseClient
            .from("draft_sessions")
            .update({
              seminar_title: formData.seminar_title,
              seminar_description: formData.seminar_description,
            })
            .eq("id", existingDraft.id);
        } else {
          // Create new draft
          await supabaseClient
            .from("draft_sessions")
            .insert({
              speaker_id: speaker.id,
              seminar_title: formData.seminar_title,
              seminar_description: formData.seminar_description,
              status: "draft",
            });
        }
      }

      toast.success("Profile updated successfully!");
      await loadSpeakerData();
      await reloadSpeaker(); // Reload parent speaker data
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Your Profile - Speaker Portal</title>
      </Helmet>

      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your speaker profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                        setFormData({ ...formData, photo_url: "" });
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
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="seminar_title">Seminar Title</Label>
              <Input
                id="seminar_title"
                value={formData.seminar_title}
                onChange={(e) => setFormData({ ...formData, seminar_title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="seminar_description">Seminar Description</Label>
              <Textarea
                id="seminar_description"
                value={formData.seminar_description}
                onChange={(e) => setFormData({ ...formData, seminar_description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

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
      </form>
    </>
  );
}