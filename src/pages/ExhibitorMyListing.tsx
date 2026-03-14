import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";

const exhibitorSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  short_description: z.string().max(360, "Maximum 60 words (approx 360 characters)").optional(),
  description: z.string().optional(),
  showguide_entry: z.string().max(360, "Maximum 60 words (approx 360 characters)").optional(),
  website: z.string().trim().url("Invalid URL").optional().or(z.literal("")).nullable().transform(val => val || ""),
  booth_number: z.string().optional(),
});

type Contact = {
  id?: string;
  full_name: string;
  email: string;
  telephone: string;
  job_title: string;
  profile_picture_url?: string;
  password?: string;
  is_active: boolean;
};

type Product = {
  id?: string;
  product_name: string;
  description: string;
  image_url?: string;
};

type SocialMedia = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
};

type Address = {
  street_line_1?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

const ExhibitorMyListing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isModal = searchParams.get('modal') === 'true';
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exhibitorData, setExhibitorData] = useState<{
    id: string;
    name: string;
    logo_url?: string;
    banner_url?: string;
    short_description?: string;
    description?: string;
    showguide_entry?: string;
    website?: string;
    booth_number?: string;
  } | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [socialMedia, setSocialMedia] = useState<SocialMedia>({});
  const [originalSocialMedia, setOriginalSocialMedia] = useState<SocialMedia>({});
  const [address, setAddress] = useState<Address>({});
  const [originalAddress, setOriginalAddress] = useState<Address>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [originalContacts, setOriginalContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [showguideDeadline, setShowguideDeadline] = useState<string>("");

  useEffect(() => {
    loadExhibitorData();
  }, []);

  const loadExhibitorData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/exhibitor-portal/login");
      return;
    }

    const { data: exhibitor, error } = await supabase
      .from("exhibitors")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error("Error loading exhibitor:", error);
      toast({
        title: "Error",
        description: "Failed to load exhibitor data",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!exhibitor) {
      if (!isModal) {
        toast({
          title: "No Exhibitor Profile",
          description: "Your exhibitor profile has not been set up yet. Please contact the admin.",
          variant: "destructive",
        });
      }
      setLoading(false);
      if (!isModal) {
        navigate("/exhibitor-portal");
      }
      return;
    }

    if (exhibitor) {
      setExhibitorData(exhibitor);
      if (exhibitor.logo_url) setLogoPreview(exhibitor.logo_url);
      if (exhibitor.banner_url) setBannerPreview(exhibitor.banner_url);

      // Load social media
      const { data: socialData } = await supabase
        .from("exhibitor_social_media")
        .select("*")
        .eq("exhibitor_id", exhibitor.id)
        .maybeSingle();
      if (socialData) {
        setSocialMedia(socialData);
        setOriginalSocialMedia(socialData);
      }

      // Load address
      const { data: addressData } = await supabase
        .from("exhibitor_address")
        .select("*")
        .eq("exhibitor_id", exhibitor.id)
        .maybeSingle();
      if (addressData) {
        setAddress(addressData);
        setOriginalAddress(addressData);
      }

      // Load contacts
      const { data: contactsData } = await supabase
        .from("exhibitor_contacts")
        .select("*")
        .eq("exhibitor_id", exhibitor.id);
      if (contactsData) {
        setContacts(contactsData);
        setOriginalContacts(JSON.parse(JSON.stringify(contactsData)));
      }

      // Load products
      const { data: productsData } = await supabase
        .from("exhibitor_products")
        .select("*")
        .eq("exhibitor_id", exhibitor.id);
      if (productsData) {
        setProducts(productsData);
        setOriginalProducts(JSON.parse(JSON.stringify(productsData)));
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
    }

    setLoading(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Logo file size must be less than 5MB",
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
          description: "Banner file size must be less than 5MB",
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        name: formData.get("name") as string,
        short_description: formData.get("short_description") as string,
        description: formData.get("description") as string,
        showguide_entry: formData.get("showguide_entry") as string,
        website: formData.get("website") as string,
        booth_number: formData.get("booth_number") as string,
      };

      exhibitorSchema.parse(data);

      let logoUrl = exhibitorData?.logo_url;
      let bannerUrl = exhibitorData?.banner_url;

      // Upload logo
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${exhibitorData.id}-logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("exhibitor-logos")
          .upload(fileName, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("exhibitor-logos").getPublicUrl(fileName);
        logoUrl = urlData.publicUrl;
      }

      // Upload banner
      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const fileName = `${exhibitorData.id}-banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("exhibitor-logos")
          .upload(fileName, bannerFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("exhibitor-logos").getPublicUrl(fileName);
        bannerUrl = urlData.publicUrl;
      }

      // Build pending_changes with ONLY the fields that actually changed
      const pendingChanges: Record<string, string | null | undefined> = {};
      
      if (data.name !== (exhibitorData?.name || '')) {
        pendingChanges.name = data.name;
      }
      if (data.short_description !== (exhibitorData?.short_description || '')) {
        pendingChanges.short_description = data.short_description;
      }
      if (data.description !== (exhibitorData?.description || '')) {
        pendingChanges.description = data.description;
      }
      if (data.showguide_entry !== (exhibitorData?.showguide_entry || '')) {
        pendingChanges.showguide_entry = data.showguide_entry;
      }
      if (data.website !== (exhibitorData?.website || '')) {
        pendingChanges.website = data.website;
      }
      if (data.booth_number !== (exhibitorData?.booth_number || '')) {
        pendingChanges.booth_number = data.booth_number;
      }
      if (logoUrl !== exhibitorData?.logo_url) {
        pendingChanges.logo_url = logoUrl;
      }
      if (bannerUrl !== exhibitorData?.banner_url) {
        pendingChanges.banner_url = bannerUrl;
      }
      
      // Only submit exhibitor changes if there are actual changes
      if (Object.keys(pendingChanges).length > 0) {
        // Store changes in pending_changes for approval
        const { error: exhibitorError } = await supabase
          .from("exhibitors")
          .update({
            pending_changes: pendingChanges,
            approval_status: "pending_approval",
            submitted_for_approval_at: new Date().toISOString(),
          })
          .eq("id", exhibitorData.id);

        if (exhibitorError) throw exhibitorError;
      }

      // Helper function to check if social media changed
      const socialMediaChanged = () => {
        const fields: (keyof SocialMedia)[] = ['facebook', 'instagram', 'linkedin', 'twitter', 'tiktok', 'youtube'];
        return fields.some(field => (socialMedia[field] || '') !== (originalSocialMedia[field] || ''));
      };
      
      // Helper function to check if address changed
      const addressChanged = () => {
        const fields: (keyof Address)[] = ['street_line_1', 'city', 'postcode', 'country'];
        return fields.some(field => (address[field] || '') !== (originalAddress[field] || ''));
      };

      // Store social media changes for approval - only if changed
      if (socialMediaChanged()) {
        const { error: socialError } = await supabase
          .from("exhibitor_social_media")
          .upsert({
            exhibitor_id: exhibitorData.id,
            pending_changes: socialMedia,
            approval_status: "pending_approval",
            submitted_for_approval_at: new Date().toISOString(),
          });
        if (socialError) throw socialError;
      }

      // Store address changes for approval - only if changed
      if (addressChanged()) {
        const { error: addressError } = await supabase
          .from("exhibitor_address")
          .upsert({
            exhibitor_id: exhibitorData.id,
            pending_changes: address,
            approval_status: "pending_approval",
            submitted_for_approval_at: new Date().toISOString(),
          });
        if (addressError) throw addressError;
      }

      // Store contact changes for approval - only if changed
      for (const contact of contacts) {
        const originalContact = originalContacts.find(c => c.id === contact.id);
        const contactChanged = !originalContact || 
          contact.full_name !== originalContact.full_name ||
          contact.email !== originalContact.email ||
          contact.telephone !== originalContact.telephone ||
          contact.job_title !== originalContact.job_title ||
          contact.is_active !== originalContact.is_active;
        
        if (contactChanged) {
          if (contact.id) {
            await supabase.from("exhibitor_contacts").update({
              pending_changes: contact,
              approval_status: "pending_approval",
              submitted_for_approval_at: new Date().toISOString(),
            }).eq("id", contact.id);
          } else {
            await supabase.from("exhibitor_contacts").insert({
              exhibitor_id: exhibitorData.id,
              full_name: contact.full_name,
              email: contact.email,
              telephone: contact.telephone,
              job_title: contact.job_title,
              pending_changes: contact,
              approval_status: "pending_approval",
              submitted_for_approval_at: new Date().toISOString(),
            });
          }
        }
      }

      // Store product changes for approval - only if changed
      for (const product of products) {
        const originalProduct = originalProducts.find(p => p.id === product.id);
        const productChanged = !originalProduct ||
          product.product_name !== originalProduct.product_name ||
          product.description !== originalProduct.description ||
          product.image_url !== originalProduct.image_url;
        
        if (productChanged) {
          if (product.id) {
            await supabase.from("exhibitor_products").update({
              pending_changes: product,
              approval_status: "pending_approval",
              submitted_for_approval_at: new Date().toISOString(),
            }).eq("id", product.id);
          } else {
            await supabase.from("exhibitor_products").insert({
              exhibitor_id: exhibitorData.id,
              product_name: product.product_name,
              pending_changes: product,
              approval_status: "pending_approval",
              submitted_for_approval_at: new Date().toISOString(),
            });
          }
        }
      }

      // Send admin notification
      try {
        await supabase.functions.invoke("notify-admin-submission", {
          body: {
            exhibitorId: exhibitorData.id,
            exhibitorName: data.name,
            submissionType: "Profile & Listing Update",
          },
        });
      } catch {
        // Admin notification failed but submission succeeded
      }

      toast({
        title: "Changes submitted for approval", 
        description: "Your changes will be published once approved by an administrator" 
      });
      await loadExhibitorData();
    } catch (error) {
      console.error("Error updating exhibitor:", error);
      const message = error instanceof Error ? error.message : 'Failed to update listing';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addContact = () => {
    setContacts([...contacts, { full_name: "", email: "", telephone: "", job_title: "", is_active: true }]);
  };

  const removeContact = async (index: number) => {
    const contact = contacts[index];
    if (contact.id) {
      await supabase.from("exhibitor_contacts").delete().eq("id", contact.id);
    }
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string | boolean) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  const addProduct = () => {
    setProducts([...products, { product_name: "", description: "" }]);
  };

  const removeProduct = async (index: number) => {
    const product = products[index];
    if (product.id) {
      await supabase.from("exhibitor_products").delete().eq("id", product.id);
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${isModal ? 'p-12' : 'min-h-screen'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!exhibitorData) {
    if (isModal) {
      // In modal mode, show compact error without full-screen container
      return (
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Exhibitor Profile</CardTitle>
              <CardDescription>
                Your exhibitor profile has not been set up yet. Please contact the admin for assistance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.parent.postMessage('closeModal', '*')} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Exhibitor Profile</CardTitle>
            <CardDescription>
              Your exhibitor profile has not been set up yet. Please contact the admin for assistance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/exhibitor-portal")} className="w-full">
              Return to Portal Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Edit My Listing" 
        description="Manage your exhibitor profile"
        noIndex
      />
      <div className="min-h-screen flex flex-col">
        {!isModal && <Navbar />}
        
        <main className={`flex-1 pb-12 ${isModal ? '' : 'pt-page'}`}>
          <div className="container mx-auto px-6">
            <div className={isModal ? '' : 'flex gap-8 mt-[60px]'}>
              {/* Always-visible Sidebar */}
              {!isModal && (
                <aside className="w-64 flex-shrink-0 sticky top-24 h-fit hidden lg:block">
                  <ExhibitorSidebar 
                    exhibitorName={exhibitorData?.name}
                    standNumber={exhibitorData?.booth_number}
                    renderTrigger={false}
                    alwaysVisible={true}
                  />
                </aside>
              )}

              {/* Mobile menu trigger */}
              {!isModal && (
                <div className="lg:hidden fixed top-20 left-4 z-50">
                  <ExhibitorSidebar 
                    exhibitorName={exhibitorData?.name}
                    standNumber={exhibitorData?.booth_number}
                    renderTrigger={true}
                  />
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <Card>
            <CardHeader>
              <CardTitle>Edit Your Listing</CardTitle>
              <CardDescription>Manage your exhibitor profile, contacts, and products</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Tabs defaultValue="company" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="company">Company</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="social">Social Media</TabsTrigger>
                    <TabsTrigger value="contacts">Contacts</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                  </TabsList>

                  <TabsContent value="company" className="space-y-6 mt-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Company Name *</Label>
                      <Input id="name" name="name" defaultValue={exhibitorData?.name} required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="booth_number">Booth Number</Label>
                      <Input id="booth_number" name="booth_number" defaultValue={exhibitorData?.booth_number} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" name="website" type="url" placeholder="https://" defaultValue={exhibitorData?.website} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="short_description">Short Description (Max 60 words)</Label>
                      <Textarea
                        id="short_description"
                        name="short_description"
                        defaultValue={exhibitorData?.short_description}
                        rows={3}
                        placeholder="Brief overview - no website, name, or bullet points"
                      />
                      <p className="text-xs text-muted-foreground">Please don't include your website or your name as we'll add this in for you. No bulletpoints either.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Company Profile (Full Description)</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={exhibitorData?.description}
                        rows={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showguide_entry">Showguide Entry (Max 60 words)</Label>
                        {showguideDeadline && (
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                            Deadline: {new Date(showguideDeadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <Textarea
                        id="showguide_entry"
                        name="showguide_entry"
                        defaultValue={exhibitorData?.showguide_entry}
                        rows={3}
                        placeholder="Brief description for showguide (max 60 words)"
                      />
                      <p className="text-xs text-muted-foreground">
                        {exhibitorData?.showguide_entry ? Math.ceil(exhibitorData.showguide_entry.length / 6) : 0} / 60 words
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Company Logo</Label>
                      <div className="flex items-center gap-4">
                        {logoPreview && (
                          <img src={logoPreview} alt="Logo" className="h-20 w-20 object-contain rounded border" />
                        )}
                        <Input type="file" accept="image/*" onChange={handleLogoChange} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Exhibitor Banner (1250 x 350px recommended)</Label>
                      <div className="flex items-center gap-4">
                        {bannerPreview && (
                          <img src={bannerPreview} alt="Banner" className="h-20 w-40 object-cover rounded border" />
                        )}
                        <Input type="file" accept="image/*" onChange={handleBannerChange} />
                      </div>
                      <p className="text-xs text-muted-foreground">Max 5MB. Recommended: 1250 x 350px</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="social" className="space-y-6 mt-6">
                    <div className="space-y-2">
                      <Label>Facebook</Label>
                      <Input
                        value={socialMedia.facebook || ""}
                        onChange={(e) => setSocialMedia(prev => ({ ...prev, facebook: e.target.value }))}
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instagram</Label>
                      <Input
                        value={socialMedia.instagram || ""}
                        onChange={(e) => setSocialMedia(prev => ({ ...prev, instagram: e.target.value }))}
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>LinkedIn</Label>
                      <Input
                        value={socialMedia.linkedin || ""}
                        onChange={(e) => setSocialMedia(prev => ({ ...prev, linkedin: e.target.value }))}
                        placeholder="https://linkedin.com/company/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Twitter</Label>
                      <Input
                        value={socialMedia.twitter || ""}
                        onChange={(e) => setSocialMedia(prev => ({ ...prev, twitter: e.target.value }))}
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>TikTok</Label>
                      <Input
                        value={socialMedia.tiktok || ""}
                        onChange={(e) => setSocialMedia(prev => ({ ...prev, tiktok: e.target.value }))}
                        placeholder="https://tiktok.com/@..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>YouTube</Label>
                      <Input
                        value={socialMedia.youtube || ""}
                        onChange={(e) => setSocialMedia(prev => ({ ...prev, youtube: e.target.value }))}
                        placeholder="https://youtube.com/@..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="address" className="space-y-6 mt-6">
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input
                        value={address.street_line_1 || ""}
                        onChange={(e) => setAddress(prev => ({ ...prev, street_line_1: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={address.city || ""}
                          onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postcode</Label>
                        <Input
                          value={address.postcode || ""}
                          onChange={(e) => setAddress(prev => ({ ...prev, postcode: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input
                        value={address.country || ""}
                        onChange={(e) => setAddress(prev => ({ ...prev, country: e.target.value }))}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="contacts" className="space-y-6 mt-6">
                    <Button type="button" onClick={addContact} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Add Contact
                    </Button>
                    {contacts.map((contact, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Contact {index + 1}</h4>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeContact(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Full Name</Label>
                              <Input
                                value={contact.full_name}
                                onChange={(e) => updateContact(index, "full_name", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input
                                type="email"
                                value={contact.email}
                                onChange={(e) => updateContact(index, "email", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Telephone</Label>
                              <Input
                                value={contact.telephone}
                                onChange={(e) => updateContact(index, "telephone", e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Job Title</Label>
                              <Input
                                value={contact.job_title}
                                onChange={(e) => updateContact(index, "job_title", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`active-${index}`}
                              checked={contact.is_active}
                              onChange={(e) => updateContact(index, "is_active", e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor={`active-${index}`}>Active</Label>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="products" className="space-y-6 mt-6">
                    <Button type="button" onClick={addProduct} variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Add Product
                    </Button>
                    {products.map((product, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Product {index + 1}</h4>
                            <Button type="button" variant="destructive" size="sm" onClick={() => removeProduct(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label>Product Name</Label>
                            <Input
                              value={product.product_name}
                              onChange={(e) => updateProduct(index, "product_name", e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={product.description}
                              onChange={(e) => updateProduct(index, "description", e.target.value)}
                              rows={3}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>

                <div className="mt-6">
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? "Saving..." : "Save All Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
        {!isModal && <Footer />}
      </div>
    </>
  );
};

export default ExhibitorMyListing;
