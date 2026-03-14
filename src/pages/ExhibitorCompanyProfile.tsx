import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Helmet } from "react-helmet-async";
import { Trash2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";

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
  tiktok?: string;
  youtube?: string;
};

type Address = {
  street_line_1?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

const ExhibitorCompanyProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isModal = searchParams.get('modal') === 'true';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exhibitorData, setExhibitorData] = useState<{
    id: string;
    name: string;
    logo_url?: string;
    banner_url?: string;
    short_description?: string;
    description?: string;
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
  const [addressId, setAddressId] = useState<string | null>(null);
  const [socialMediaId, setSocialMediaId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [productImages, setProductImages] = useState<{[key: number]: File}>({});
  const [supabaseClient, setSupabaseClient] = useState(supabase);
  const [newSocialPlatform, setNewSocialPlatform] = useState<string>("");
  const [newSocialUrl, setNewSocialUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("company");

  useEffect(() => {
    loadExhibitorData();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['company', 'address', 'social', 'products'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadExhibitorData = async () => {
    // Check for impersonation tokens first
    const impToken = sessionStorage.getItem('impersonation_token');
    const impRefresh = sessionStorage.getItem('impersonation_refresh');
    
    let client = supabase;
    
    if (impToken && impRefresh) {
      // Create impersonation client
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
    
    if (!session) {
      navigate("/exhibitor-portal/login");
      return;
    }

    const { data: exhibitor, error } = await client
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
      return;
    }

    if (exhibitor) {
      setExhibitorData(exhibitor);
      if (exhibitor.logo_url) setLogoPreview(exhibitor.logo_url);
      if (exhibitor.banner_url) setBannerPreview(exhibitor.banner_url);

      // Load social media
      const { data: socialData } = await client
        .from("exhibitor_social_media")
        .select("*")
        .eq("exhibitor_id", exhibitor.id)
        .maybeSingle();
      if (socialData) {
        setSocialMedia(socialData);
        setOriginalSocialMedia(socialData);
        setSocialMediaId(socialData.id);
      }

      // Load address
      const { data: addressData } = await client
        .from("exhibitor_address")
        .select("*")
        .eq("exhibitor_id", exhibitor.id)
        .maybeSingle();
      if (addressData) {
        setAddress(addressData);
        setOriginalAddress(addressData);
        setAddressId(addressData.id);
      }

      // Load products
      const { data: productsData } = await client
        .from("exhibitor_products")
        .select("*")
        .eq("exhibitor_id", exhibitor.id);
      if (productsData) {
        setProducts(productsData);
        setOriginalProducts(JSON.parse(JSON.stringify(productsData)));
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
        name: (formData.get("name") as string) || exhibitorData?.name || "",
        short_description: (formData.get("short_description") as string) || exhibitorData?.short_description || "",
        description: (formData.get("description") as string) || exhibitorData?.description || "",
        website: (formData.get("website") as string) || exhibitorData?.website || "",
        booth_number: (formData.get("booth_number") as string) || exhibitorData?.booth_number || "",
      };

      let logoUrl = exhibitorData?.logo_url;
      let bannerUrl = exhibitorData?.banner_url;

      // Upload logo
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${exhibitorData.id}-logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("exhibitor-logos")
          .upload(fileName, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabaseClient.storage.from("exhibitor-logos").getPublicUrl(fileName);
        logoUrl = urlData.publicUrl;
      }

      // Upload banner
      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop();
        const fileName = `${exhibitorData.id}-banner-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("exhibitor-logos")
          .upload(fileName, bannerFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabaseClient.storage.from("exhibitor-logos").getPublicUrl(fileName);
        bannerUrl = urlData.publicUrl;
      }

      // Only submit the changes for the active tab
      if (activeTab === 'company') {
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
        
        // Only submit if there are actual changes
        if (Object.keys(pendingChanges).length === 0) {
          toast({
            title: "No changes detected",
            description: "Please make some changes before submitting for approval.",
          });
          setSaving(false);
          return;
        }
        
        // Submit company changes for approval
        const { error: updateError } = await supabaseClient
          .from("exhibitors")
          .update({
            approval_status: 'pending_approval',
            pending_changes: pendingChanges,
            submitted_for_approval_at: new Date().toISOString(),
          })
          .eq("id", exhibitorData.id);
        if (updateError) throw updateError;
      } else if (activeTab === 'social') {
        // Check if social media changed
        const socialMediaFields: (keyof SocialMedia)[] = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'];
        const socialMediaChanged = socialMediaFields.some(field => 
          (socialMedia[field] || '') !== (originalSocialMedia[field] || '')
        );
        
        if (!socialMediaChanged) {
          toast({
            title: "No changes detected",
            description: "Please make some changes before submitting for approval.",
          });
          setSaving(false);
          return;
        }
        
        // Submit social media changes for approval
        const socialMediaUpdate: {
          exhibitor_id: string;
          id?: string;
          approval_status: string;
          pending_changes: SocialMedia;
          submitted_for_approval_at: string;
        } = {
          exhibitor_id: exhibitorData.id,
          approval_status: 'pending_approval',
          pending_changes: socialMedia,
          submitted_for_approval_at: new Date().toISOString(),
        };
        if (socialMediaId) {
          socialMediaUpdate.id = socialMediaId;
        }
        const { error: socialError } = await supabaseClient
          .from("exhibitor_social_media")
          .upsert(socialMediaUpdate, { onConflict: 'exhibitor_id' });
        if (socialError) throw socialError;
      } else if (activeTab === 'address') {
        // Check if address changed
        const addressFields: (keyof Address)[] = ['street_line_1', 'city', 'postcode', 'country'];
        const addressChanged = addressFields.some(field => 
          (address[field] || '') !== (originalAddress[field] || '')
        );
        
        if (!addressChanged) {
          toast({
            title: "No changes detected",
            description: "Please make some changes before submitting for approval.",
          });
          setSaving(false);
          return;
        }
        
        // Submit address changes for approval
        const addressUpdate: {
          exhibitor_id: string;
          id?: string;
          approval_status: string;
          pending_changes: Address;
          submitted_for_approval_at: string;
        } = {
          exhibitor_id: exhibitorData.id,
          approval_status: 'pending_approval',
          pending_changes: address,
          submitted_for_approval_at: new Date().toISOString(),
        };
        if (addressId) {
          addressUpdate.id = addressId;
        }
        const { error: addressError } = await supabaseClient
          .from("exhibitor_address")
          .upsert(addressUpdate, { onConflict: 'exhibitor_id' });
        if (addressError) throw addressError;
      } else if (activeTab === 'products') {
        // Update products - only submit those that changed
        let anyProductChanged = false;
        
        for (const [index, product] of products.entries()) {
          const originalProduct = originalProducts.find(p => p.id === product.id);
          const hasNewImage = !!productImages[index];
          const productChanged = !originalProduct ||
            product.product_name !== originalProduct.product_name ||
            product.description !== originalProduct.description ||
            hasNewImage;
          
          if (!productChanged) continue;
          anyProductChanged = true;
          
          let productImageUrl = product.image_url;
          
          // Upload product image if changed
          if (productImages[index]) {
            const file = productImages[index];
            const fileExt = file.name.split(".").pop();
            const fileName = `${exhibitorData.id}-product-${Date.now()}-${index}.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage
              .from("exhibitor-logos")
              .upload(fileName, file, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabaseClient.storage.from("exhibitor-logos").getPublicUrl(fileName);
            productImageUrl = urlData.publicUrl;
          }
          
          // Submit product changes for approval
          if (product.id) {
            await supabaseClient.from("exhibitor_products").update({ 
              approval_status: 'pending_approval',
              pending_changes: { ...product, image_url: productImageUrl },
              submitted_for_approval_at: new Date().toISOString(),
            }).eq("id", product.id);
          } else {
            // New products also need approval
            await supabaseClient.from("exhibitor_products").insert({ 
              exhibitor_id: exhibitorData.id,
              product_name: product.product_name,
              description: product.description,
              image_url: productImageUrl,
              approval_status: 'pending_approval',
              pending_changes: { 
                product_name: product.product_name,
                description: product.description,
                image_url: productImageUrl 
              },
              submitted_for_approval_at: new Date().toISOString(),
            });
          }
        }
        
        if (!anyProductChanged) {
          toast({
            title: "No changes detected",
            description: "Please make some changes before submitting for approval.",
          });
          setSaving(false);
          return;
        }
      }

      toast({ 
        title: "Success", 
        description: "Your changes have been submitted for approval and will be reviewed by an administrator." 
      });
      setProductImages({});
      
      // Invalidate exhibitor progress cache to update completion percentage
      if (exhibitorData?.id) {
        await queryClient.invalidateQueries({ queryKey: ["exhibitor-progress", exhibitorData.id] });
      }
      
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

  const addProduct = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setProducts([...products, { product_name: "", description: "" }]);
  };

  const removeProduct = async (index: number) => {
    const product = products[index];
    if (product.id) {
      await supabaseClient.from("exhibitor_products").delete().eq("id", product.id);
    }
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, value: string) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const handleProductImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image file size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setProductImages({ ...productImages, [index]: file });
    }
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
      <Helmet>
        <title>Company Profile - Exhibitor Portal</title>
        <meta name="description" content="Edit your company profile and listing" />
      </Helmet>
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
                    logoUrl={exhibitorData?.logo_url}
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
                    logoUrl={exhibitorData?.logo_url}
                    renderTrigger={true}
                  />
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="mb-6">
                  <h1 className="text-4xl font-bold text-foreground">Company Profile</h1>
                  <p className="text-lg text-muted-foreground max-w-3xl mt-2">
                    Manage your exhibitor profile, contacts, and products
                  </p>
                </div>
                    
                <Card className="mt-6">
            <CardHeader>
              <CardDescription>Edit your listing information below</CardDescription>
            </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="company">Company</TabsTrigger>
                        <TabsTrigger value="address">Address</TabsTrigger>
                        <TabsTrigger value="social">Social Media</TabsTrigger>
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
                          <Label htmlFor="short_description">Showguide Listing (Max 300 characters)</Label>
                          <Textarea
                            id="short_description"
                            name="short_description"
                            defaultValue={exhibitorData?.short_description}
                            rows={3}
                            placeholder="Brief overview - no website, name, or bullet points"
                            maxLength={300}
                          />
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
                          <Label>Company Logo</Label>
                          <div className="flex items-center gap-4">
                            {logoPreview && (
                              <img src={logoPreview} alt="Logo" className="h-20 w-20 object-contain rounded border" />
                            )}
                            <Input type="file" accept="image/*" onChange={handleLogoChange} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Company Banner (JPEG or PNG)</Label>
                          <div className="flex items-center gap-4">
                            {bannerPreview && (
                              <img src={bannerPreview} alt="Banner" className="h-20 w-40 object-cover rounded border" />
                            )}
                            <Input type="file" accept="image/*" onChange={handleBannerChange} />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="social" className="space-y-6 mt-6">
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
                          {socialMedia.linkedin && (
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
                          {socialMedia.facebook && (
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
                          {socialMedia.instagram && (
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
                          {socialMedia.tiktok && (
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
                          {socialMedia.youtube && (
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
                          {!socialMedia.linkedin && !socialMedia.facebook && !socialMedia.instagram && !socialMedia.tiktok && !socialMedia.youtube && (
                            <p className="text-sm text-muted-foreground text-center py-4">No social media accounts added</p>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="address" className="space-y-6 mt-6">
                        <div className="space-y-2">
                          <Label>Street Address</Label>
                          <Input
                            value={address.street_line_1 || ""}
                            onChange={(e) => setAddress({ ...address, street_line_1: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={address.city || ""}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Postcode</Label>
                          <Input
                            value={address.postcode || ""}
                            onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Input
                            value={address.country || ""}
                            onChange={(e) => setAddress({ ...address, country: e.target.value })}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="products" className="space-y-6 mt-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Products</h3>
                          <Button type="button" onClick={addProduct} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
                          </Button>
                        </div>
                        {products.map((product, index) => (
                          <div key={index} className="p-4 border rounded-lg space-y-4 relative">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => removeProduct(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <div className="space-y-4">
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
                              <div className="space-y-2">
                                <Label>Product Image</Label>
                                <div className="flex items-center gap-4">
                                  {(product.image_url || productImages[index]) && (
                                    <img 
                                      src={productImages[index] ? URL.createObjectURL(productImages[index]) : product.image_url} 
                                      alt="Product" 
                                      className="h-20 w-20 object-cover rounded border" 
                                    />
                                  )}
                                  <Input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => handleProductImageChange(index, e)} 
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>

                    <div className="mt-8">
                      <Button type="submit" className="w-full" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
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

export default ExhibitorCompanyProfile;
