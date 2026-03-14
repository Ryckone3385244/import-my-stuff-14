import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableIcon } from "@/components/editable/EditableIcon";
import { EditableEmbed } from "@/components/editable/EditableEmbed";
import { PageWithDraggableSections, SectionWithDraggableColumns } from '@/components/editable';
import { StyledButton } from "@/components/ui/styled-button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useMemo, useState, useEffect } from 'react';
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEventSettings } from "@/hooks/useEventSettings";
import { ARIA_LABELS } from "@/lib/constants";

const WhyExhibit = () => {
  const { data: eventSettings } = useEventSettings();
  const [showForm, setShowForm] = useState(false);
  const [statValues, setStatValues] = useState({
    stat1: '15,000+',
    stat2: '500+',
    stat3: '170+',
    stat4: '2'
  });

  useEffect(() => {
    const loadStats = async () => {
      const { data } = await supabase
        .from('page_content')
        .select('content_key, content_value')
        .eq('page_name', 'exhibit')
        .eq('section_name', 'stats')
        .in('content_key', ['stat-1-number', 'stat-2-number', 'stat-3-number', 'stat-4-number']);
      
      if (data) {
        const values: Record<string, string> = {};
        data.forEach(item => {
          if (item.content_key === 'stat-1-number') values.stat1 = item.content_value;
          if (item.content_key === 'stat-2-number') values.stat2 = item.content_value;
          if (item.content_key === 'stat-3-number') values.stat3 = item.content_value;
          if (item.content_key === 'stat-4-number') values.stat4 = item.content_value;
        });
        if (Object.keys(values).length > 0) {
          setStatValues(prev => ({ ...prev, ...values }));
        }
      }
    };
    loadStats();
  }, []);
  
  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="relative pt-page pb-5 bg-background">
          <div className="container mx-auto px-4">
                            <EditableText
                              pageName="exhibit"
              sectionName="hero"
              contentKey="title"
              defaultValue="Why Exhibit at Grab & Go Expo?"
              className="text-4xl md:text-5xl font-bold text-center mb-4 text-gradient-title"
              as="h1"
            />
                            <EditableText
                              pageName="exhibit"
              sectionName="hero"
              contentKey="subtitle"
              defaultValue="Europe's Leading Business Event Dedicated to the Growth of Restaurants & Takeaways"
              className="text-xl text-center text-muted-foreground w-full mx-auto"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'intro',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
                            <EditableText
                              pageName="exhibit"
              sectionName="intro"
              contentKey="description"
              defaultValue="Grab & Go Expo is Europe's leading event for suppliers looking to connect with the most driven and forward-thinking foodservice professionals. Showcase your products and services to thousands of qualified buyers actively seeking solutions to grow their business."
              className="text-lg text-center max-w-4xl mx-auto mb-8"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'benefits',
      component: (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
                            <EditableText
                              pageName="exhibit"
              sectionName="benefits"
              contentKey="section-title"
              defaultValue="Key Benefits of Exhibiting"
              className="text-3xl font-bold text-center mb-12"
              as="h2"
            />
                            <SectionWithDraggableColumns
                              pageName="exhibit"
              sectionId="benefits"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              columns={[
                {
                  id: 'benefit-1',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                                      <EditableIcon
                                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-1-icon"
                        defaultIcon="Users"
                        className="h-12 w-12 text-primary mb-4"
                      />
                                      <EditableText
                                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-1-title"
                        defaultValue="Reach Your Target Audience"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                                      <EditableText
                                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-1-desc"
                        defaultValue="Connect directly with thousands of decision-makers from restaurants, takeaways, and food service businesses."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'benefit-2',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableIcon
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-2-icon"
                        defaultIcon="Target"
                        className="h-12 w-12 text-primary mb-4"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-2-title"
                        defaultValue="Generate Quality Leads"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-2-desc"
                        defaultValue="Meet buyers with real purchasing power and intent to invest in their business growth."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'benefit-3',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableIcon
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-3-icon"
                        defaultIcon="Rocket"
                        className="h-12 w-12 text-primary mb-4"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-3-title"
                        defaultValue="Launch New Products"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-3-desc"
                        defaultValue="Showcase your latest innovations to an engaged audience of industry professionals."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'benefit-4',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableIcon
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-4-icon"
                        defaultIcon="Award"
                        className="h-12 w-12 text-primary mb-4"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-4-title"
                        defaultValue="Build Brand Awareness"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-4-desc"
                        defaultValue="Position your company as a leader in the foodservice industry and increase visibility."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'benefit-5',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableIcon
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-5-icon"
                        defaultIcon="Handshake"
                        className="h-12 w-12 text-primary mb-4"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-5-title"
                        defaultValue="Network with Industry Leaders"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-5-desc"
                        defaultValue="Connect with fellow suppliers, potential partners, and industry influencers."
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'benefit-6',
                  component: (
                    <div className="h-full flex flex-col justify-center p-6 rounded-xl bg-card border border-border">
                      <EditableIcon
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-6-icon"
                        defaultIcon="TrendingUp"
                        className="h-12 w-12 text-primary mb-4"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-6-title"
                        defaultValue="Gain Market Insights"
                        className="text-xl font-semibold mb-3"
                        as="h3"
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="benefits"
                        contentKey="benefit-6-desc"
                        defaultValue="Understand market trends and customer needs through direct interaction with your target audience."
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
      id: 'stats',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <SectionWithDraggableColumns
              pageName="exhibit"
              sectionId="stats"
              className="grid md:grid-cols-4 gap-8 text-center"
              columns={[
                {
                  id: 'stat-1',
                  component: (
                    <div>
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-1-number"
                        defaultValue="15,000+"
                        className="text-6xl font-bold text-primary mb-2"
                        as="div"
                        onSave={(newValue) => setStatValues(prev => ({ ...prev, stat1: newValue }))}
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-1-label"
                        defaultValue="Attendees"
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'stat-2',
                  component: (
                    <div>
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-2-number"
                        defaultValue="500+"
                        className="text-6xl font-bold text-primary mb-2"
                        as="div"
                        onSave={(newValue) => setStatValues(prev => ({ ...prev, stat2: newValue }))}
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-2-label"
                        defaultValue="Exhibitors"
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'stat-3',
                  component: (
                    <div>
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-3-number"
                        defaultValue="170+"
                        className="text-6xl font-bold text-primary mb-2"
                        as="div"
                        onSave={(newValue) => setStatValues(prev => ({ ...prev, stat3: newValue }))}
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-3-label"
                        defaultValue="Speakers"
                        className="text-muted-foreground"
                        as="p"
                      />
                    </div>
                  )
                },
                {
                  id: 'stat-4',
                  component: (
                    <div>
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-4-number"
                        defaultValue="2"
                        className="text-6xl font-bold text-primary mb-2"
                        as="div"
                        onSave={(newValue) => setStatValues(prev => ({ ...prev, stat4: newValue }))}
                      />
                      <EditableText
                        pageName="exhibit"
                        sectionName="stats"
                        contentKey="stat-4-label"
                        defaultValue="Days Of Innovation"
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
                <EditableText pageName="exhibit" sectionName="cta" contentKey="title" defaultValue="Register Today" className="text-4xl md:text-5xl font-bold mb-6 pt-5" as="h2" />
                {!showForm && (
                  <>
                    <EditableText pageName="exhibit" sectionName="cta" contentKey="description" defaultValue="Book your stand today and secure your place at Europe's premier foodservice event." className="text-xl text-white/80 mb-8" as="p" />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="font-bold px-12 py-6 text-lg shadow-glow-strong"
                    >
                      Register your interest
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
                  
                    <div className="rounded-2xl overflow-hidden">
                      <div className="w-full -mb-4">
                        <EditableEmbed
                          pageName="exhibit"
                          sectionName="cta"
                          contentKey="form-embed"
                          defaultSrc="https://disastersexpotexas.lpages.co/grab-go-register-interest/"
                          height="680px"
                          className="w-full"
                        />
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
  ], [showForm, statValues]);

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Why Exhibit" 
        description="Showcase your products and services at our expo. Connect with potential customers, generate leads, and grow your business."
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections
            pageName="exhibit"
            sections={sections}
          />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default WhyExhibit;
