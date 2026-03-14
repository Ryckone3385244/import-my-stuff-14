import { useState } from "react";
import { Link } from "react-router-dom";
import { FaFacebookF, FaXTwitter, FaLinkedinIn, FaInstagram } from "react-icons/fa6";
import { EditableText } from "@/components/editable/EditableText";
import { EditableIcon } from "@/components/editable/EditableIcon";
import { EditableImage } from "@/components/editable/EditableImage";
import { PageWithDraggableSections, SectionWithDraggableColumns } from "@/components/editable";
import { useEditMode, EditModeOverride } from "@/contexts/EditModeContext";
import { useQuery } from "@tanstack/react-query";
import { fetchMenuItems } from "@/lib/supabaseQueries";
import { DEFAULT_EVENT, QUERY_KEYS } from "@/lib/constants";
import { useEventSettings } from "@/hooks/useEventSettings";
import { supabase } from "@/integrations/supabase/client";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { isEditMode } = useEditMode();
  const [isFooterEditing, setIsFooterEditing] = useState(false);

  const { data: footerMenuItems } = useQuery({
    queryKey: [QUERY_KEYS.FOOTER_MENU_ITEMS],
    queryFn: () => fetchMenuItems("footer"),
  });

  const { data: eventSettings } = useEventSettings();

  const { data: contactEmailContent } = useQuery({
    queryKey: ["footer-contact-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_content")
        .select("content_value")
        .eq("page_name", "footer")
        .eq("section_name", "contact")
        .eq("content_key", "email")
        .maybeSingle();
      if (error) throw error;
      return data?.content_value || DEFAULT_EVENT.EMAIL;
    },
  });

  const { data: contactPhoneContent } = useQuery({
    queryKey: ["footer-contact-phone"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_content")
        .select("content_value")
        .eq("page_name", "footer")
        .eq("section_name", "contact")
        .eq("content_key", "phone")
        .maybeSingle();
      if (error) throw error;
      return data?.content_value || DEFAULT_EVENT.PHONE;
    },
  });

  const { data: marketingSocialLinks } = useQuery({
    queryKey: ["marketing-tools-social"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_tools")
        .select("*")
        .eq("tool_type", "social_media");
      if (error) throw error;
      return data;
    },
  });

  const contactEmail = (eventSettings as any)?.contact_email || contactEmailContent || DEFAULT_EVENT.EMAIL;
  const contactPhone = (eventSettings as any)?.contact_phone || contactPhoneContent || DEFAULT_EVENT.PHONE;
  const contactPhoneFormatted = contactPhone.replace(/[^0-9+]/g, '');

  const getSocialUrl = (platform: string) => {
    const marketingLink = marketingSocialLinks?.find(
      (item) => item.social_platform === platform
    );
    if (marketingLink?.social_url) return marketingLink.social_url;
    const eventKey = `${platform}_url` as keyof typeof eventSettings;
    return (eventSettings as any)?.[eventKey] || null;
  };

  const mainColumns = [
    {
      id: "venue",
      component: (
        <div className="lg:pr-10">
          <Link to="/" className="inline-block mb-4">
            {eventSettings?.logo_url && (
              <img 
                src={eventSettings.logo_url} 
                alt={eventSettings?.event_name ?? DEFAULT_EVENT.NAME} 
                className="h-auto max-w-full rounded-none w-[72%] md:w-[90%]" 
              />
            )}
          </Link>
          <div className="space-y-3">
            <EditableText
              pageName="footer"
              sectionName="venue"
              contentKey="running-alongside"
              defaultValue="Running alongside"
              className="text-sm text-white/80"
              as="p"
            />
            <EditableImage
              pageName="footer"
              sectionName="venue"
              contentKey="running-alongside-image"
              defaultSrc="/placeholder.svg"
              alt="Running alongside logo"
              className="max-w-[250px] h-auto rounded-none"
            />
          </div>
        </div>
      )
    },
    {
      id: "contact",
      component: (
        <div className="lg:pr-10">
          <EditableText
            pageName="footer" 
            sectionName="contact" 
            contentKey="title" 
            defaultValue="Contact Us" 
            className="text-lg font-bold mb-4 text-primary" 
            as="h3"
          />
          <div className="space-y-3">
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <EditableIcon 
                  pageName="footer" 
                  sectionName="contact" 
                  contentKey="email-icon" 
                  defaultIcon="Mail" 
                  className="h-5 w-5 text-white" 
                />
                <span className="text-sm text-white">{contactEmail}</span>
              </div>
            ) : (
              <a href={`mailto:${contactEmail}`} className="flex items-center gap-2 text-white/80 hover:text-primary transition-colors">
                <EditableIcon 
                  pageName="footer" 
                  sectionName="contact" 
                  contentKey="email-icon" 
                  defaultIcon="Mail" 
                  className="h-5 w-5 text-white/80" 
                />
                <span className="text-sm text-white/80 underline">{contactEmail}</span>
              </a>
            )}
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <EditableIcon 
                  pageName="footer" 
                  sectionName="contact" 
                  contentKey="phone-icon" 
                  defaultIcon="Phone" 
                  className="h-5 w-5 text-white" 
                />
                <span className="text-sm text-white">{contactPhone}</span>
              </div>
            ) : (
              <a href={`tel:${contactPhoneFormatted}`} className="flex items-center gap-2 text-white/80 hover:text-primary transition-colors">
                <EditableIcon 
                  pageName="footer" 
                  sectionName="contact" 
                  contentKey="phone-icon" 
                  defaultIcon="Phone" 
                  className="h-5 w-5 text-white/80" 
                />
                <span className="text-sm text-white/80">{contactPhone}</span>
              </a>
            )}
            <div className="flex items-start gap-2 pt-2">
              <EditableIcon 
                pageName="footer" 
                sectionName="contact" 
                contentKey="location-icon" 
                defaultIcon="MapPin" 
                className="h-5 w-5 text-white mt-1 flex-shrink-0" 
              />
              <div>
                <EditableText
                  pageName="footer"
                  sectionName="contact"
                  contentKey="location-name"
                  defaultValue={eventSettings?.location ?? DEFAULT_EVENT.LOCATION}
                  className="font-semibold text-white"
                  as="p"
                />
                <EditableText
                  pageName="footer"
                  sectionName="contact"
                  contentKey="address-line-1"
                  defaultValue={eventSettings?.address_line_1 ?? DEFAULT_EVENT.ADDRESS_LINE_1}
                  className="text-sm text-white/80"
                  as="p"
                />
                <EditableText
                  pageName="footer"
                  sectionName="contact"
                  contentKey="address-line-2"
                  defaultValue={eventSettings?.address_line_2 ?? DEFAULT_EVENT.ADDRESS_LINE_2}
                  className="text-sm text-white/80"
                  as="p"
                />
                <EditableText
                  pageName="footer"
                  sectionName="contact"
                  contentKey="address-line-3"
                  defaultValue={eventSettings?.address_line_3 ?? DEFAULT_EVENT.ADDRESS_LINE_3}
                  className="text-sm text-white/80"
                  as="p"
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "quick-links",
      component: (
        <div>
          <EditableText 
            pageName="footer" 
            sectionName="quick-links" 
            contentKey="title" 
            defaultValue="Quick Links" 
            className="text-lg font-bold mb-4 text-primary" 
            as="h3"
          />
          <nav className="space-y-2">
            {footerMenuItems && footerMenuItems.length > 0 ? (
              footerMenuItems.map((item) => (
                isEditMode ? (
                  <div key={item.id} className="block text-sm">
                    <span className="text-sm text-white">{item.label}</span>
                  </div>
                ) : (
                  <Link 
                    key={item.id}
                    to={item.url} 
                    className="block text-sm text-white hover:text-primary transition-colors hover:translate-x-1 duration-200"
                    {...(item.open_in_new_tab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {item.label}
                  </Link>
                )
              ))
            ) : null}
          </nav>
        </div>
      )
    },
    {
      id: "legal-social",
      component: (
        <div>
          <EditableText 
            pageName="footer" 
            sectionName="legal" 
            contentKey="title" 
            defaultValue="Legal" 
            className="text-lg font-bold mb-4 text-primary" 
            as="h3"
          />
          <nav className="space-y-2 mb-6">
            {isEditMode ? (
              <div className="block text-sm">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-privacy" defaultValue="Privacy Policy" className="text-sm text-white" as="span" />
              </div>
            ) : (
              <Link to="/privacy-policy" className="block text-sm text-white hover:text-primary transition-colors hover:translate-x-1 duration-200">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-privacy" defaultValue="Privacy Policy" className="text-sm text-white" as="span" />
              </Link>
            )}
            {isEditMode ? (
              <div className="block text-sm">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-terms" defaultValue="Terms & Conditions" className="text-sm text-white" as="span" />
              </div>
            ) : (
              <Link to="/terms-conditions" className="block text-sm text-white hover:text-primary transition-colors hover:translate-x-1 duration-200">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-terms" defaultValue="Terms & Conditions" className="text-sm text-white" as="span" />
              </Link>
            )}
            {isEditMode ? (
              <div className="block text-sm">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-cookie" defaultValue="Cookie Policy" className="text-sm text-white" as="span" />
              </div>
            ) : (
              <Link to="/cookie-policy" className="block text-sm text-white hover:text-primary transition-colors hover:translate-x-1 duration-200">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-cookie" defaultValue="Cookie Policy" className="text-sm text-white" as="span" />
              </Link>
            )}
            {isEditMode ? (
              <div className="block text-sm">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-sitemap" defaultValue="Sitemap" className="text-sm text-white" as="span" />
              </div>
            ) : (
              <Link to="/sitemap" className="block text-sm text-white hover:text-primary transition-colors hover:translate-x-1 duration-200">
                <EditableText pageName="footer" sectionName="legal" contentKey="link-sitemap" defaultValue="Sitemap" className="text-sm text-white" as="span" />
              </Link>
            )}
          </nav>

          <EditableText 
            pageName="footer" 
            sectionName="social" 
            contentKey="title" 
            defaultValue="Follow Us" 
            className="text-lg font-bold mb-4 text-primary" 
            as="h3"
          />
          <div className="flex gap-3">
            {getSocialUrl("facebook") && (
              <a href={getSocialUrl("facebook")!} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-all duration-300 hover:scale-110 p-2">
                <FaFacebookF size={14} className="block overflow-visible flex-shrink-0" />
              </a>
            )}
            {getSocialUrl("twitter") && (
              <a href={getSocialUrl("twitter")!} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-all duration-300 hover:scale-110 p-2">
                <FaXTwitter size={14} className="block overflow-visible flex-shrink-0" />
              </a>
            )}
            {getSocialUrl("linkedin") && (
              <a href={getSocialUrl("linkedin")!} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-all duration-300 hover:scale-110 p-2">
                <FaLinkedinIn size={14} className="block overflow-visible flex-shrink-0" />
              </a>
            )}
            {getSocialUrl("instagram") && (
              <a href={getSocialUrl("instagram")!} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-all duration-300 hover:scale-110 p-2">
                <FaInstagram size={14} className="block overflow-visible flex-shrink-0" />
              </a>
            )}
          </div>
        </div>
      )
    }
  ];

  const copyrightColumns = [
    {
      id: "copyright-text",
      component: (
        <EditableText
          pageName="footer"
          sectionName="copyright"
          contentKey="copyright"
          defaultValue={eventSettings?.copyright_text || `© ${currentYear} Grab & Go Expo. All rights reserved.`}
          className="text-sm text-white"
          as="p"
        />
      )
    },
    {
      id: "organiser-text",
      component: (
        <EditableText
          pageName="footer"
          sectionName="copyright"
          contentKey="organiser"
          defaultValue={eventSettings?.organiser_info || "An event organised by Fortem Food And Drink Ltd."}
          className="text-sm text-white text-right"
          as="p"
        />
      )
    }
  ];

  const footerSections = [
    {
      id: "footer-main",
      component: (
        <section className="py-4 md:py-[30px]">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="footer"
              sectionId="footer-columns"
              columns={mainColumns}
              className="grid grid-cols-1 md:grid-cols-[1.4fr_1.3fr_0.8fr_1fr] gap-8"
            />
          </div>
        </section>
      )
    },
    {
      id: "footer-copyright",
      component: (
        <section className="pt-8 border-t border-border/30">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="footer"
              sectionId="copyright-columns"
              columns={copyrightColumns}
              className="grid grid-cols-1 md:grid-cols-2 gap-2"
            />
          </div>
        </section>
      )
    }
  ];

  // When not in edit mode or footer editing is off, reset state
  const footerEditable = isEditMode && isFooterEditing;

  return (
    <>
      {/* Edit Footer toggle bar */}
      {isEditMode && (
        <div className="relative z-10 flex items-center justify-center py-2 border-t border-dashed gap-3" style={{ background: 'rgba(30,33,40,0.85)', borderColor: 'rgba(77,159,255,0.3)' }}>
          {!isFooterEditing ? (
            <button
              onClick={() => setIsFooterEditing(true)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-90"
              style={{ background: '#4d9fff', color: '#fff' }}
            >
              Edit Footer
            </button>
          ) : (
            <button
              onClick={() => setIsFooterEditing(false)}
              className="px-4 py-1.5 rounded-md text-xs font-medium transition-colors hover:opacity-90"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#e8eaed', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              Close Footer Editor
            </button>
          )}
        </div>
      )}
      <EditModeOverride isEditMode={footerEditable}>
        <footer className="bg-[hsl(var(--black-card))] text-[hsl(var(--black-card-foreground))] pt-16 pb-8">
          <div className="container mx-auto px-4">
            {footerEditable ? (
              <PageWithDraggableSections
                pageName="footer"
                sections={footerSections}
                isMainContent={false}
              />
            ) : (
              footerSections.map(s => <div key={s.id}>{s.component}</div>)
            )}
          </div>
        </footer>
      </EditModeOverride>
    </>
  );
};

export default Footer;
