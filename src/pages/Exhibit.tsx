import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone } from "lucide-react";
import { useMemo } from "react";
import { EditableText, EditableEmbed } from "@/components/editable";
import { PageWithDraggableSections } from '@/components/editable';
import { useEditMode } from "@/contexts/EditModeContext";
import { useEventSettings } from "@/hooks/useEventSettings";
import { ARIA_LABELS, DEFAULT_EVENT } from "@/lib/constants";
import { usePageName } from "@/hooks/usePageName";

const Exhibit = () => {
  const pageName = usePageName();
  const { isEditMode } = useEditMode();
  const { data: eventSettings } = useEventSettings();

  // Get contact info from event_settings with fallbacks
  const email = (eventSettings as any)?.contact_email || DEFAULT_EVENT.EMAIL;
  const phone = (eventSettings as any)?.contact_phone || DEFAULT_EVENT.PHONE;

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Exhibit" 
        description="Exhibit at our expo and showcase your products to thousands of industry professionals. Book your stand today."
      />

      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative pt-page pb-12 overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
              <div className="max-w-4xl mx-auto text-center animate-fade-up">
                <EditableText 
                  pageName={pageName} 
                  sectionName="hero" 
                  contentKey="title" 
                  defaultValue="Book Your Booth" 
                  className="text-4xl md:text-5xl font-bold mb-6 text-gradient-title pt-5"
                  as="h1"
                />
                <EditableText 
                  pageName={pageName} 
                  sectionName="hero" 
                  contentKey="subtitle" 
                  defaultValue="Showcase your products to thousands of qualified buyers and decision-makers" 
                  className="text-xl md:text-2xl text-muted-foreground mb-8 w-full mx-auto"
                  as="p"
                />
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-foreground">
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      <span className="font-medium">{email}</span>
                    </div>
                  ) : (
                    <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Mail className="h-5 w-5" />
                      <span className="font-medium">{email}</span>
                    </a>
                  )}
                  <div className="hidden sm:block text-muted-foreground">|</div>
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      <span className="font-medium">{phone}</span>
                    </div>
                  ) : (
                    <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Phone className="h-5 w-5" />
                      <span className="font-medium">{phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Form Section */}
          <section className="py-12 container mx-auto px-4 bg-background">
            <div className="max-w-4xl mx-auto">
              <div className="p-4 md:p-8">
                <EditableEmbed
                  pageName={pageName}
                  sectionName="form"
                  contentKey="form-embed"
                  defaultSrc="/grab-go-exhibit-enquiry.html"
                  height="800px"
                  className="w-full"
                />
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Exhibit;