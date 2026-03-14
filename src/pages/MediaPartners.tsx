import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableImage } from "@/components/editable/EditableImage";
import { PageWithDraggableSections, DraggableColumn } from '@/components/editable';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink, Share2, Check } from "lucide-react";
import { useEditMode } from "@/contexts/EditModeContext";
import { useEventSettings } from "@/hooks/useEventSettings";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { usePageName } from "@/hooks/usePageName";

const PartnerImageLink = ({ pageName, partnerKey }: { pageName: string; partnerKey: string }) => {
  const partnerNumber = partnerKey.replace('partner-', '').split('-')[0];
  return (
    <EditableImage 
      key={partnerKey}
      pageName={pageName} 
      sectionName="partners-grid" 
      contentKey={partnerKey} 
      defaultSrc="/placeholder.svg" 
      alt={`Media partner ${partnerNumber}`} 
      className="w-full h-40 object-contain" 
    />
  );
};

const PartnerLearnMoreButton = ({ pageName, partnerId, partnerKey }: { pageName: string; partnerId: number; partnerKey: string }) => {
  const [url, setUrl] = useState("https://example.com");

  useEffect(() => {
    const loadUrl = async () => {
      const { data } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('page_name', pageName)
        .eq('section_name', 'partners-grid')
        .eq('content_key', `${partnerKey}-url`)
        .maybeSingle();

      if (data?.content_value) {
        setUrl(data.content_value);
      }
    };

    loadUrl();

    const channel = supabase
      .channel(`partner-url-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_content',
          filter: `page_name=eq.${pageName},section_name=eq.partners-grid,content_key=eq.${partnerKey}-url`
        },
        (payload: { new?: { content_value?: string } }) => {
          if (payload.new?.content_value) {
            setUrl(payload.new.content_value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageName, partnerId, partnerKey]);

  // Don't show button if URL is empty or still the default
  if (!url || url === "https://example.com") {
    return null;
  }

  return (
    <Button 
      asChild 
      variant="outline" 
      size="sm"
      className="gap-2"
    >
      <a href={url} target="_blank" rel="noopener noreferrer">
        Learn More
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
};

const generateSlug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const PartnerShareButton = ({ pageName, partnerKey, eventSettings }: { pageName: string; partnerKey: string; eventSettings: any }) => {
  const [title, setTitle] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadTitle = async () => {
      const { data } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('page_name', pageName)
        .eq('section_name', 'partners-grid')
        .eq('content_key', `${partnerKey}-title`)
        .maybeSingle();
      if (data?.content_value) setTitle(data.content_value);
    };
    loadTitle();
  }, [pageName, partnerKey]);

  const handleShare = () => {
    if (!title) return;
    const domain = eventSettings?.event_domain
      ? `https://${eventSettings.event_domain}`
      : window.location.origin;
    const slug = generateSlug(title);
    const url = `${domain}/partners/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!title) return null;

  return (
    <Button onClick={handleShare} variant="outline" size="sm" className="gap-2">
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Link copied!" : "Share"}
    </Button>
  );
};

const MediaPartners = () => {
  const pageName = usePageName();
  const { isEditMode } = useEditMode();
  const { data: eventSettings } = useEventSettings();
  const defaultPartners = ['partner-1', 'partner-2', 'partner-3', 'partner-4', 'partner-5', 'partner-6', 'partner-7', 'partner-8', 'partner-9', 'partner-10'];
  
  const {
    columns: partners,
    updateColumnOrder,
    toggleColumnVisibility,
    duplicateColumn,
    deleteColumn,
    isLoading
  } = useColumnOrder(pageName, 'partners-grid', defaultPartners);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = partners.findIndex(p => p.id === active.id);
    const newIndex = partners.findIndex(p => p.id === over.id);

    const newPartners = arrayMove(partners, oldIndex, newIndex).map((p, index) => ({
      ...p,
      order: index
    }));

    updateColumnOrder(newPartners);
  };

  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="pt-page pb-5 bg-background">
          <div className="container mx-auto px-4 text-center">
            <EditableText pageName={pageName} sectionName="hero" contentKey="title" defaultValue="Sponsors and Partners" className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title" as="h1" />
            <EditableText pageName={pageName} sectionName="hero" contentKey="subtitle" defaultValue="Our event wouldn't be possible without the support of our amazing partners. Discover the brands that have helped make this event a success." className="text-lg text-muted-foreground w-full mx-auto" as="p" />
          </div>
        </section>
      )
    },
    {
      id: 'partners-grid',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="text-center">Loading...</div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={partners.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                    {partners.map((partner) => {
                      const partnerId = partner.id.replace('partner-', '').split('-')[0];
                      return (
                        <DraggableColumn
                          key={partner.id}
                          id={partner.id}
                          visible={partner.visible}
                          onDuplicate={duplicateColumn}
                          onToggleVisibility={toggleColumnVisibility}
                          onDelete={deleteColumn}
                        >
                          <div className="h-full flex flex-row md:flex-col items-start p-6 rounded-xl bg-card border border-border shadow-card gap-4">
                            <div className="w-[35%] md:w-full flex-shrink-0 self-start">
                              <div key={`img-${partner.id}`}>
                                <PartnerImageLink
                                  pageName={pageName}
                                  partnerKey={partner.id}
                                />
                              </div>
                            </div>
                            <div className="w-[65%] md:w-full flex flex-col">
                              <EditableText 
                                pageName={pageName} 
                                sectionName="partners-grid" 
                                contentKey={`${partner.id}-title`} 
                                defaultValue={`Media Partner ${partnerId}`} 
                                className="text-xl font-bold mb-3" 
                                as="h3" 
                              />
                              <EditableText 
                                pageName={pageName} 
                                sectionName="partners-grid" 
                                contentKey={`${partner.id}-description`} 
                                defaultValue="Partner description goes here. Edit to add details about this media partner." 
                                className="text-muted-foreground mb-4 text-sm flex-1" 
                                as="p" 
                              />
                              <div className="flex flex-col gap-2">
                                {isEditMode && (
                                  <div className="text-sm font-medium text-muted-foreground">
                                    Button URL:
                                    <EditableText 
                                      pageName={pageName} 
                                      sectionName="partners-grid" 
                                      contentKey={`${partner.id}-url`} 
                                      defaultValue="https://example.com" 
                                      className="text-sm ml-2 font-normal" 
                                      as="span" 
                                    />
                                  </div>
                                )}
                                <PartnerLearnMoreButton 
                                  pageName={pageName}
                                  partnerId={parseInt(partnerId)}
                                  partnerKey={partner.id}
                                />
                                <PartnerShareButton
                                  pageName={pageName}
                                  partnerKey={partner.id}
                                  eventSettings={eventSettings}
                                />
                              </div>
                            </div>
                          </div>
                        </DraggableColumn>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </section>
      )
    }
  ], [pageName, isEditMode, partners, isLoading, sensors]);

  return (
    <>
      <DynamicHelmet titlePrefix="Sponsors and Partners" />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections pageName={pageName} sections={sections} />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default MediaPartners;
