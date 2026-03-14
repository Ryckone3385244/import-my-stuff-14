import { DynamicHelmet } from "@/components/DynamicHelmet";
import { JsonLdSchema } from "@/components/JsonLdSchema";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Globe, MapPin, Facebook, Instagram, Linkedin, Share2, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventSettings } from "@/hooks/useEventSettings";
import { ExhibitorContactForm } from "@/components/ExhibitorContactForm";
import { useState, useEffect } from "react";

const ExhibitorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: eventSettings } = useEventSettings();
  const [copied, setCopied] = useState(false);

  // Try to find exhibitor by ID first, then by slug
  const { data: exhibitor, isLoading } = useQuery({
    queryKey: ["exhibitor-detail", id],
    queryFn: async () => {
      // First try by ID (UUID format)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      if (isUuid) {
        const { data, error } = await supabase
          .from("exhibitors")
          .select("*, meta_title, meta_description")
          .eq("id", id)
          .or('approval_status.eq.approved,approval_status.is.null')
          .eq('is_active', true)
          .maybeSingle();
        if (error) throw error;
        if (data) return data as typeof data & { meta_title?: string; meta_description?: string };
      }
      
      // Fallback: try matching by name slug
      const { data: allExhibitors, error: allError } = await supabase
        .from("exhibitors")
        .select("*, meta_title, meta_description")
        .or('approval_status.eq.approved,approval_status.is.null')
        .eq('is_active', true);
      if (allError) throw allError;
      
      const match = allExhibitors?.find(e => generateSlug(e.name) === id);
      if (match) return match as typeof match & { meta_title?: string; meta_description?: string };
      
      throw new Error("Exhibitor not found");
    },
  });

  // Social media query
  const { data: socialMedia } = useQuery({
    queryKey: ["exhibitor-social", exhibitor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("exhibitor_social_media")
        .select("*")
        .eq("exhibitor_id", exhibitor!.id)
        .or('approval_status.eq.approved,approval_status.is.null')
        .maybeSingle();
      return data;
    },
    enabled: !!exhibitor?.id,
  });

  // Products query
  const { data: products = [] } = useQuery({
    queryKey: ["exhibitor-products", exhibitor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("exhibitor_products")
        .select("*")
        .eq("exhibitor_id", exhibitor!.id)
        .or('approval_status.eq.approved,approval_status.is.null');
      return data || [];
    },
    enabled: !!exhibitor?.id,
  });

  const handleShare = () => {
    const domain = eventSettings?.event_domain 
      ? `https://${(eventSettings.event_domain as string).replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : window.location.origin;
    const slug = exhibitor?.name ? generateSlug(exhibitor.name) : exhibitor?.id || '';
    const url = `${domain}/exhibitors/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!exhibitor) {
    return (
      <div className="min-h-screen bg-background pt-page">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Exhibitor Not Found</h1>
          <Button variant="outline" onClick={() => navigate("/exhibitors")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Exhibitors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DynamicHelmet
        customTitle={exhibitor.meta_title || `${exhibitor.name} - Exhibitor | {eventName}`}
        description={exhibitor.meta_description || `Learn more about ${exhibitor.name}, exhibiting at {eventName}. {eventDate} at {eventLocation}.`}
        keywords={`${exhibitor.name}, {eventName}, exhibitor, {eventLocation}`}
        ogImage={exhibitor.logo_url || undefined}
        ogType="profile"
      />
      <JsonLdSchema 
        type={["Organization", "BreadcrumbList"]} 
        breadcrumbs={[{ name: "Exhibitors", url: "/exhibitors" }, { name: exhibitor.name }]}
      />

      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />

        <main className="flex-1">
          <section className="py-12 container mx-auto px-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/exhibitors")}
              className="mb-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exhibitors
            </Button>

            <div className="max-w-[1000px] mx-auto">
              {/* Banner */}
              {exhibitor.banner_url && (
                <div className="w-full aspect-[16/5] overflow-hidden rounded-t-lg">
                  <img src={exhibitor.banner_url} alt="Banner" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Header */}
              <div className="p-6 border border-border bg-card rounded-lg mb-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-6">
                  {exhibitor.logo_url && (
                    <img 
                      src={exhibitor.logo_url} 
                      alt={exhibitor.name} 
                      className="w-24 h-24 md:w-[115px] md:h-[115px] object-contain border border-border rounded p-2" 
                    />
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">{exhibitor.name}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{exhibitor.booth_number ? `Booth ${exhibitor.booth_number}` : "Booth TBC"}</span>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className={`grid w-full ${exhibitor.show_contact_button ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <TabsTrigger value="overview">Company Overview</TabsTrigger>
                    <TabsTrigger value="products">Products</TabsTrigger>
                    {exhibitor.show_contact_button && (
                      <TabsTrigger value="contact">Contact</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-6">
                    {(exhibitor.company_profile || exhibitor.description) ? (
                      <div>
                        <h3 className="text-xl font-semibold mb-3">About Us</h3>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {exhibitor.company_profile || exhibitor.description}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-xl font-semibold mb-3">About Us</h3>
                        <p className="text-muted-foreground leading-relaxed">Coming soon</p>
                      </div>
                    )}

                    {exhibitor.website && (
                      <div className="space-y-3">
                        <h4 className="font-semibold">Visit Us</h4>
                        <a href={exhibitor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                          <Globe className="h-4 w-4" />
                          <span>{exhibitor.website}</span>
                        </a>
                      </div>
                    )}

                    {socialMedia && (socialMedia.facebook || socialMedia.instagram || socialMedia.linkedin) && (
                      <div className="space-y-3">
                        <h4 className="font-semibold">Follow Us</h4>
                        <div className="flex flex-wrap gap-4">
                          {socialMedia.facebook && (
                            <a href={socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                              <Facebook className="h-5 w-5" />
                              <span className="text-sm">Facebook</span>
                            </a>
                          )}
                          {socialMedia.instagram && (
                            <a href={socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                              <Instagram className="h-5 w-5" />
                              <span className="text-sm">Instagram</span>
                            </a>
                          )}
                          {socialMedia.linkedin && (
                            <a href={socialMedia.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-primary">
                              <Linkedin className="h-5 w-5" />
                              <span className="text-sm">LinkedIn</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Share button - inside Company Overview tab only */}
                    <div className="pt-4">
                      <Button onClick={handleShare} className="gap-2">
                        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                        {copied ? "Link copied!" : "Share exhibitor profile"}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="products" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {products.map((product) => (
                        <div key={product.id} className="border border-border rounded-lg p-4 space-y-3">
                          {product.image_url && (
                            <img src={product.image_url} alt={product.product_name} className="w-full h-40 object-cover rounded" />
                          )}
                          <h4 className="font-semibold">{product.product_name}</h4>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                        </div>
                      ))}
                      {products.length === 0 && (
                        <p className="text-muted-foreground col-span-2 text-center py-8">No products available yet</p>
                      )}
                    </div>
                  </TabsContent>

                  {exhibitor.show_contact_button && (
                    <TabsContent value="contact" className="mt-6">
                      <div className="max-w-xl mx-auto">
                        <h3 className="text-xl font-semibold mb-4">Get in Touch</h3>
                        <p className="text-muted-foreground mb-6">
                          Interested in {exhibitor.name}'s products or services? Send them a message.
                        </p>
                        <ExhibitorContactForm
                          exhibitorId={exhibitor.id}
                          exhibitorName={exhibitor.name}
                        />
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

/** Generate a URL-friendly slug from a name */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export default ExhibitorDetail;
