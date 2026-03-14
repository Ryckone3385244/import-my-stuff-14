import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, Globe, MapPin, Facebook, Instagram, Linkedin, Mail, Share2, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExhibitorContactForm } from "./ExhibitorContactForm";
import { useEventSettings } from "@/hooks/useEventSettings";

interface Exhibitor {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  booth_number: string | null;
  company_profile: string | null;
  show_contact_button: boolean;
}

interface SocialMedia {
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
}

interface Product {
  id: string;
  product_name: string;
  description: string | null;
  image_url: string | null;
}

interface Contact {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
}

interface ExhibitorDetailDialogProps {
  exhibitor: Exhibitor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ExhibitorDetailDialog = ({ exhibitor, open, onOpenChange }: ExhibitorDetailDialogProps) => {
  const [socialMedia, setSocialMedia] = useState<SocialMedia | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [mainContact, setMainContact] = useState<Contact | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: eventSettings } = useEventSettings();

  const handleShare = () => {
    if (!exhibitor) return;
    const domain = eventSettings?.event_domain 
      ? `https://${(eventSettings.event_domain as string).replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : window.location.origin;
    const slug = exhibitor.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const url = `${domain}/exhibitors/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lock body scroll and prevent navbar transform when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  useEffect(() => {
    if (exhibitor && open) {
      loadExhibitorDetails();
    }
  }, [exhibitor, open]);

  const loadExhibitorDetails = async () => {
    if (!exhibitor?.id) return;

    const { data: socialData } = await supabase
      .from("exhibitor_social_media")
      .select("*")
      .eq("exhibitor_id", exhibitor.id)
      .or('approval_status.eq.approved,approval_status.is.null')
      .maybeSingle();
    setSocialMedia(socialData);

    const { data: productsData } = await supabase
      .from("exhibitor_products")
      .select("*")
      .eq("exhibitor_id", exhibitor.id)
      .or('approval_status.eq.approved,approval_status.is.null');
    setProducts(productsData || []);

    // Load main contact (first active contact)
    const { data: contactData } = await supabase
      .from("exhibitor_contacts")
      .select("*")
      .eq("exhibitor_id", exhibitor.id)
      .eq("is_active", true)
      .or('approval_status.eq.approved,approval_status.is.null')
      .limit(1)
      .maybeSingle();
    setMainContact(contactData);
  };

  if (!exhibitor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px] h-[70vh] overflow-hidden p-0 gap-0 max-md:max-w-[95vw] max-md:max-h-[90vh]">
        <div className="h-full overflow-y-auto rounded-lg">
        <div className="flex flex-col">
          {/* Banner */}
          {exhibitor.banner_url && (
            <div className="w-full aspect-[16/5] flex-shrink-0 overflow-hidden">
              <img src={exhibitor.banner_url} alt="Banner" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Content */}
          <div>
            {/* Header */}
            <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
              {exhibitor.logo_url && (
                <img 
                  src={exhibitor.logo_url} 
                  alt={exhibitor.name} 
                  className="w-24 h-24 md:w-[115px] md:h-[115px] object-contain border border-border rounded p-2" 
                />
              )}
              <div className="flex-1 flex flex-col justify-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">{exhibitor.name}</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{exhibitor.booth_number ? `Booth ${exhibitor.booth_number}` : "NO BOOTH NUMBER"}</span>
                </div>
              </div>
            </div>
          </div>

            {/* Tabs */}
            <div className="p-4 md:p-6">
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
                    <div key={product.id} className="border rounded-lg p-4 space-y-3">
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
                      Interested in {exhibitor.name}'s products or services? Send them a message and they'll get back to you shortly.
                    </p>
                    <ExhibitorContactForm
                      exhibitorId={exhibitor.id}
                      exhibitorName={exhibitor.name}
                      onSuccess={() => {
                        onOpenChange(false);
                      }}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExhibitorDetailDialog;
