import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableImage } from "@/components/editable/EditableImage";
import { EditableIcon } from "@/components/editable/EditableIcon";
import { PageWithDraggableSections, DraggableColumn, SectionWithDraggableColumns } from '@/components/editable';
import { Button } from "@/components/ui/button";
import { StyledButton } from "@/components/ui/styled-button";
import { useMemo, useState, useEffect } from 'react';
import { X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "@/contexts/EditModeContext";
import { useColumnOrder } from "@/hooks/useColumnOrder";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { usePageName } from "@/hooks/usePageName";

const PartnerImageLink = ({ pageName, partnerId }: { pageName: string; partnerId: number }) => {
  return (
    <EditableImage 
      pageName={pageName} 
      sectionName="partners-grid" 
      contentKey={`partner-${partnerId}`} 
      defaultSrc="/placeholder.svg" 
      alt={`Sustainability partner ${partnerId}`} 
      className="w-full h-32 object-contain" 
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

const SustainabilityTrail = () => {
  const pageName = usePageName();
  const [showForm, setShowForm] = useState(false);
  const { isEditMode } = useEditMode();
  const defaultPartners = ['partner-1', 'partner-2', 'partner-3', 'partner-4', 'partner-5', 'partner-6', 'partner-7', 'partner-8', 'partner-9', 'partner-10', 'partner-11', 'partner-12', 'partner-13', 'partner-14'];
  
  const {
    columns: partners,
    updateColumnOrder,
    toggleColumnVisibility,
    duplicateColumn,
    deleteColumn,
    isLoading: partnersLoading
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
        <section className="relative pt-page pb-5 bg-background">
          <div className="container mx-auto px-4">
            <EditableText
              pageName={pageName}
              sectionName="hero"
              contentKey="title"
              defaultValue="Sustainability Trail"
              className="text-4xl md:text-5xl font-bold text-center mb-4 text-gradient-title"
              as="h1"
            />
            <EditableText
              pageName={pageName}
              sectionName="hero"
              contentKey="subtitle"
              defaultValue="Helping to build a more secure future for the hospitality industry"
              className="text-xl text-center text-muted-foreground w-full mx-auto"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'info-cards',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="p-8 rounded-xl bg-card border border-border shadow-card">
              <SectionWithDraggableColumns
                pageName={pageName}
                sectionId="info-cards"
                className="grid md:grid-cols-2 gap-8 items-center"
                columns={[
                  {
                    id: 'text-content',
                    component: (
                      <div>
                        <EditableText
                          pageName={pageName}
                          sectionName="info-cards"
                          contentKey="left-card-title"
                          defaultValue="SUSTAINABILITY IS HERE TO STAY"
                          className="text-3xl font-bold mb-6 text-primary"
                          as="h2"
                        />
                        <EditableText
                          pageName={pageName}
                          sectionName="info-cards"
                          contentKey="left-card-desc-1"
                          defaultValue="As sustainability continues to transform the hospitality sector, this brand-new feature highlights the businesses leading the charge. Spanning all areas of hotel and resort operations, from energy and water efficiency to waste reduction and eco-design, the Sustainability Trail will take visitors on a curated journey through Europe's most forward-thinking suppliers."
                          className="text-muted-foreground mb-4"
                          as="p"
                        />
                        <EditableText
                          pageName={pageName}
                          sectionName="info-cards"
                          contentKey="left-card-desc-2"
                          defaultValue="Each company featured has been hand-selected for their dedication to sustainable development and their proven impact in driving real change. Whether you're aiming to meet ESG goals, enhance efficiency, or align with guest expectations, the trail offers a direct path to practical, future-ready solutions."
                          className="text-muted-foreground mb-4"
                          as="p"
                        />
                        <EditableText
                          pageName={pageName}
                          sectionName="info-cards"
                          contentKey="left-card-desc-3"
                          defaultValue="Sustainability isn't a passing trend, it's the new benchmark. And this is where it starts."
                          className="text-muted-foreground font-semibold"
                          as="p"
                        />
                      </div>
                    )
                  },
                  {
                    id: 'image-content',
                    component: (
                      <div className="aspect-[16/9] w-full">
                        <EditableImage
                          pageName={pageName}
                          sectionName="info-cards"
                          contentKey="right-image"
                          defaultSrc="/placeholder.svg"
                          alt="Sustainability"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </section>
      )
    },
    {
      id: 'feature-cards',
      component: (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName={pageName}
              sectionId="feature-cards"
              className="grid md:grid-cols-3 gap-8"
              columns={[
                {
                  id: 'card-1',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName={pageName}
                          sectionName="feature-cards"
                          contentKey="card-1-image"
                          defaultSrc="/placeholder.svg"
                          alt="Feature 1"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="feature-cards"
                        contentKey="card-1-title"
                        defaultValue="Biodegradable Packaging and Energy"
                        className="text-xl font-bold mb-2"
                        as="h3"
                      />
                      <EditableText
                        pageName={pageName}
                        sectionName="feature-cards"
                        contentKey="card-1-desc"
                        defaultValue="Reduce your carbon footprint with our hand-picked biodegradable and energy-saving products from only the best exhibitors, contributing to a sustainable future!"
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'card-2',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName={pageName}
                          sectionName="feature-cards"
                          contentKey="card-2-image"
                          defaultSrc="/placeholder.svg"
                          alt="Feature 2"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="feature-cards"
                        contentKey="card-2-title"
                        defaultValue="Electric Delivery Bikes"
                        className="text-xl font-bold mb-2"
                        as="h3"
                      />
                      <EditableText
                        pageName={pageName}
                        sectionName="feature-cards"
                        contentKey="card-2-desc"
                        defaultValue="With deliveries only on the rise with their ease and accessibility, who would not want to make this as green as possible with electric delivery bikes?"
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'card-3',
                  component: (
                    <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border hover:shadow-lg transition-shadow overflow-hidden">
                      <div className="-m-6 mb-[10px]">
                        <EditableImage
                          pageName={pageName}
                          sectionName="feature-cards"
                          contentKey="card-3-image"
                          defaultSrc="/placeholder.svg"
                          alt="Feature 3"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                      <EditableText
                        pageName={pageName}
                        sectionName="feature-cards"
                        contentKey="card-3-title"
                        defaultValue="Food Waste"
                        className="text-xl font-bold mb-2"
                        as="h3"
                      />
                      <EditableText
                        pageName={pageName}
                        sectionName="feature-cards"
                        contentKey="card-3-desc"
                        defaultValue="Food waste is a global crisis and the best packaging services and operations are here to raise awareness of this with effective solutions to mitigate the issue! Find them on the trail!"
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        </section>
      )
    },
    {
      id: 'three-cards',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="sustainability-trail"
              sectionId="three-cards"
              className="grid md:grid-cols-3 gap-8"
              columns={Array.from({ length: 3 }, (_, i) => ({
                id: `card-${i + 1}`,
                component: (
                  <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border hover:shadow-lg transition-shadow overflow-hidden">
                    <div className="-m-6 mb-[10px]">
                      <EditableImage
                        pageName="sustainability-trail"
                        sectionName="three-cards"
                        contentKey={`card-${i + 1}-image`}
                        defaultSrc="/placeholder.svg"
                        alt={`Card ${i + 1}`}
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <EditableText
                      pageName="sustainability-trail"
                      sectionName="three-cards"
                      contentKey={`card-${i + 1}-title`}
                      defaultValue={`Card ${i + 1} Title`}
                      className="text-xl font-bold mb-2"
                      as="h3"
                    />
                    <EditableText
                      pageName="sustainability-trail"
                      sectionName="three-cards"
                      contentKey={`card-${i + 1}-desc`}
                      defaultValue={`Description for card ${i + 1}. Edit this text to add your content.`}
                      className="text-muted-foreground"
                      as="p"
                    />
                  </div>
                )
              }))}
            />
          </div>
        </section>
      )
    },
    {
      id: 'two-text-cards',
      component: (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="sustainability-trail"
              sectionId="two-text-cards"
              className="grid md:grid-cols-2 gap-8"
              columns={[
                {
                  id: 'card-1',
                  component: (
                    <div className="h-full flex flex-col p-8 rounded-xl bg-card border border-border shadow-card">
                      <EditableText
                        pageName="sustainability-trail"
                        sectionName="two-text-cards"
                        contentKey="card-1-title"
                        defaultValue="Text Card 1 Title"
                        className="text-2xl font-bold mb-4"
                        as="h3"
                      />
                      <EditableText
                        pageName="sustainability-trail"
                        sectionName="two-text-cards"
                        contentKey="card-1-desc"
                        defaultValue="Description for text card 1. This card contains only text content without any images. Edit this to add your message."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'card-2',
                  component: (
                    <div className="h-full flex flex-col p-8 rounded-xl bg-card border border-border shadow-card">
                      <EditableText
                        pageName="sustainability-trail"
                        sectionName="two-text-cards"
                        contentKey="card-2-title"
                        defaultValue="Text Card 2 Title"
                        className="text-2xl font-bold mb-4"
                        as="h3"
                      />
                      <EditableText
                        pageName="sustainability-trail"
                        sectionName="two-text-cards"
                        contentKey="card-2-desc"
                        defaultValue="Description for text card 2. This card contains only text content without any images. Edit this to add your message."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        </section>
      )
    },
    {
      id: 'exhibitors',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EditableText
              pageName="sustainability-trail"
              sectionName="exhibitors"
              contentKey="section-title"
              defaultValue="Meet Sustainable Innovators"
              className="text-3xl font-bold text-center mb-6"
              as="h2"
            />
            <EditableText
              pageName="sustainability-trail"
              sectionName="exhibitors"
              contentKey="description"
              defaultValue="Connect with leading suppliers who are pioneering sustainable solutions for the hospitality industry. From compostable packaging to energy-efficient equipment, discover products that help reduce your environmental impact while maintaining quality and efficiency."
              className="text-lg text-center max-w-4xl mx-auto mb-12"
              as="p"
            />
            
            {partnersLoading ? (
              <div className="text-center">Loading...</div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={partners.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                          <div className="h-full flex flex-col p-6 rounded-xl bg-card border border-border shadow-card flex flex-col items-start text-left h-full">
                            <div className="w-[90%] mb-4">
                              <PartnerImageLink 
                                pageName="sustainability-trail"
                                partnerId={parseInt(partnerId)}
                              />
                            </div>
                            <EditableText 
                              pageName="sustainability-trail" 
                              sectionName="partners-grid" 
                              contentKey={`${partner.id}-title`} 
                              defaultValue={`Sustainability Partner ${partnerId}`} 
                              className="text-xl font-bold mb-3" 
                              as="h3" 
                            />
                            <EditableText 
                              pageName="sustainability-trail" 
                              sectionName="partners-grid" 
                              contentKey={`${partner.id}-description`} 
                              defaultValue="Partner description goes here. Edit to add details about this sustainability partner and their eco-friendly solutions." 
                              className="text-muted-foreground mb-4 text-sm flex-1" 
                              as="p" 
                            />
                            <div className="flex flex-col gap-2">
                              {isEditMode && (
                                <div className="text-sm font-medium text-muted-foreground">
                                  Button URL:
                                  <EditableText 
                                    pageName="sustainability-trail" 
                                    sectionName="partners-grid" 
                                    contentKey={`${partner.id}-url`} 
                                    defaultValue="https://example.com" 
                                    className="text-sm ml-2 font-normal" 
                                    as="span" 
                                  />
                                </div>
                              )}
                              <PartnerLearnMoreButton 
                                pageName="sustainability-trail"
                                partnerId={parseInt(partnerId)}
                                partnerKey={partner.id}
                              />
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
    },
    {
      id: 'register-cta',
      component: (
        <section className="py-20 text-white relative overflow-hidden" style={{
          background: 'var(--gradient-title)'
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.2) 0%, transparent 70%)'
          }}></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <EditableText pageName="sustainability-trail" sectionName="cta" contentKey="title" defaultValue="Register Today" className="text-4xl md:text-5xl font-bold mb-6 pt-5" as="h2" />
                {!showForm && (
                  <>
                    <EditableText pageName="sustainability-trail" sectionName="cta" contentKey="description" defaultValue="Visit the Sustainability Trail at the expo and discover how you can make your business more environmentally friendly." className="text-xl text-white/80 mb-8" as="p" />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="px-12 py-6 text-lg shadow-glow-strong"
                    >
                      <EditableText 
                        pageName="sustainability-trail" 
                        sectionName="cta" 
                        contentKey="button-text" 
                        defaultValue="Get Your Free Ticket" 
                        as="span"
                      />
                    </StyledButton>
                  </>
                )}
              </div>
              
              {showForm && (
                <div className="overflow-hidden animate-stretch-in">
                  <div className="opacity-0 animate-form-appear">
                    <div className="flex justify-end mb-4">
                      <button onClick={() => setShowForm(false)} className="text-white hover:text-white/80 transition-colors flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg">
                        <X className="h-5 w-5" />
                        <span>Close</span>
                      </button>
                    </div>
                  
                    <div className="bg-black rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
                      <div className="p-8 md:p-12">
                        <h2 className="text-3xl font-bold mb-4 text-center text-white">Register Your Interest</h2>
                        <p className="text-white/80 text-center mx-auto">
                          Complete the form below to secure your spot at Customer Connect Expo 2026. Early registration receives exclusive benefits!
                        </p>
                      </div>

                      <div className="w-full bg-black -mb-4">
                        <iframe src="https://disastersexpotexas.lpages.co/grab-go-register-interest/" className="w-full border-0" style={{
                          height: "680px",
                          display: "block"
                        }} title="Registration Form" loading="lazy" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )
    }
  ], [showForm, partnersLoading, partners, isEditMode, sensors, pageName]);

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Sustainability Trail" 
        description="Explore the Sustainability Trail at {eventName} and discover eco-friendly solutions for the hospitality industry."
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections
            pageName={pageName}
            sections={sections}
          />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SustainabilityTrail;
