import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText } from "@/components/editable/EditableText";
import { EditableImage } from "@/components/editable/EditableImage";
import { PageWithDraggableSections, SectionWithDraggableColumns, HoverOverlayImageCard } from '@/components/editable';
import { Button } from "@/components/ui/button";
import { StyledButton } from "@/components/ui/styled-button";
import { Input } from "@/components/ui/input";
import { useMemo, useState, useEffect } from 'react';
import { X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEditMode } from "@/contexts/EditModeContext";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const ShowButton = ({ showId }: { showId: string }) => {
  const { isEditMode } = useEditMode();
  const [url, setUrl] = useState("");
  const [buttonText, setButtonText] = useState("");

  useEffect(() => {
    const loadButtonData = async () => {
      const [urlData, textData] = await Promise.all([
        supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', 'food-service-industry-expo')
          .eq('section_name', 'seven-shows')
          .eq('content_key', `${showId}-button-url`)
          .maybeSingle(),
        supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', 'food-service-industry-expo')
          .eq('section_name', 'seven-shows')
          .eq('content_key', `${showId}-button-text`)
          .maybeSingle()
      ]);

      if (urlData.data?.content_value) {
        setUrl(urlData.data.content_value);
      }
      if (textData.data?.content_value) {
        setButtonText(textData.data.content_value);
      }
    };

    loadButtonData();

    const channel = supabase
      .channel(`show-button-${showId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_content',
          filter: `page_name=eq.food-service-industry-expo,section_name=eq.seven-shows`
        },
        () => {
          loadButtonData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showId]);

  const saveField = async (field: 'button-url' | 'button-text', value: string) => {
    const contentKey = `${showId}-${field}`;

    if (field === 'button-url') {
      setUrl(value);
    } else {
      setButtonText(value);
    }

    const { error } = await supabase
      .from('page_content')
      .upsert(
        {
          page_name: 'food-service-industry-expo',
          section_name: 'seven-shows',
          content_key: contentKey,
          content_value: value,
          content_type: 'text',
        },
        { onConflict: 'page_name,section_name,content_key' }
      );

    if (error) {
      console.error('Failed to save button field', error);
    }
  };

  // Don't show button if URL is empty or doesn't start with http
  if (!isEditMode && (!url || !url.startsWith('http'))) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
      {isEditMode && (
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Button Text</div>
            <Input
              value={buttonText}
              placeholder="Learn More"
              onChange={(e) => setButtonText(e.target.value)}
              onBlur={(e) => saveField('button-text', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Button URL (must start with http:// or https://)</div>
            <Input
              value={url}
              placeholder="https://example.com"
              onChange={(e) => setUrl(e.target.value)}
              onBlur={(e) => saveField('button-url', e.target.value)}
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
      )}
      {url && url.startsWith('http') && (
        <StyledButton 
          asChild 
          styleType="button1"
          className="gap-2 w-auto"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            {buttonText || "Learn More"}
            <ExternalLink className="h-4 w-4" />
          </a>
        </StyledButton>
      )}
    </div>
  );
};

const FoodServiceIndustryExpo = () => {
  const [showForm, setShowForm] = useState(false);
  const [statValues, setStatValues] = useState({
    stat1: '15,000+',
    stat2: '400+',
    stat3: '150+',
    stat4: '50+'
  });

  useEffect(() => {
    const loadStats = async () => {
      const [stat1Data, stat2Data, stat3Data, stat4Data] = await Promise.all([
        supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', 'food-service-industry-expo')
          .eq('section_name', 'stats')
          .eq('content_key', 'stat1')
          .maybeSingle(),
        supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', 'food-service-industry-expo')
          .eq('section_name', 'stats')
          .eq('content_key', 'stat2')
          .maybeSingle(),
        supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', 'food-service-industry-expo')
          .eq('section_name', 'stats')
          .eq('content_key', 'stat3')
          .maybeSingle(),
        supabase
          .from('page_content')
          .select('content_value')
          .eq('page_name', 'food-service-industry-expo')
          .eq('section_name', 'stats')
          .eq('content_key', 'stat4')
          .maybeSingle()
      ]);

      const newStatValues = {
        stat1: stat1Data.data?.content_value || '15,000+',
        stat2: stat2Data.data?.content_value || '400+',
        stat3: stat3Data.data?.content_value || '150+',
        stat4: stat4Data.data?.content_value || '50+'
      };
      
      setStatValues(newStatValues);
    };

    loadStats();

    const channel = supabase
      .channel('fsi-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_content',
          filter: 'page_name=eq.food-service-industry-expo,section_name=eq.stats'
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  const sections = useMemo(() => [
    {
      id: 'hero',
      component: (
        <section className="pt-page pb-5 bg-background">
          <div className="container mx-auto px-4 text-center">
            <EditableImage
              pageName="food-service-industry-expo"
              sectionName="hero"
              contentKey="logo"
              defaultSrc="/placeholder.svg"
              alt="Food Service Industry Expo"
              className="w-64 h-32 object-contain mx-auto mb-8"
            />
            <EditableText
              pageName="food-service-industry-expo"
              sectionName="hero"
              contentKey="title"
              defaultValue="Food Service Industry Expo"
              className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title"
              as="h1"
            />
            <EditableText
              pageName="food-service-industry-expo"
              sectionName="hero"
              contentKey="subtitle"
              defaultValue="Be Part of the Ultimate B2B Event for the Growth of the Hospitality Industry"
              className="text-xl text-muted-foreground w-full mx-auto"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: "stats-cards",
      component: (
        <section className="py-20 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <EditableText pageName="food-service-industry-expo" sectionName="stats" contentKey="title" defaultValue="Part of the Food Service Industry Expo" className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title pt-5" as="h2" />
              <EditableText pageName="food-service-industry-expo" sectionName="stats" contentKey="subtitle" defaultValue="Join thousands of industry professionals at the UK's largest food service event" className="text-xl text-white" as="p" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="animate-fade-in group cursor-default">
                <AnimatedCounter 
                  value={statValues.stat1}
                  className="text-5xl md:text-6xl font-bold mb-2 transition-transform group-hover:scale-110 duration-300 text-primary"
                />
                <div className="text-sm md:text-base text-white uppercase tracking-wide font-semibold">Attendees</div>
              </div>
              <div className="animate-fade-in [animation-delay:100ms] group cursor-default">
                <AnimatedCounter 
                  value={statValues.stat2}
                  className="text-5xl md:text-6xl font-bold mb-2 transition-transform group-hover:scale-110 duration-300 text-primary"
                />
                <div className="text-sm md:text-base text-white uppercase tracking-wide font-semibold">Exhibitors</div>
              </div>
              <div className="animate-fade-in [animation-delay:200ms] group cursor-default">
                <AnimatedCounter 
                  value={statValues.stat3}
                  className="text-5xl md:text-6xl font-bold mb-2 transition-transform group-hover:scale-110 duration-300 text-primary"
                />
                <div className="text-sm md:text-base text-white uppercase tracking-wide font-semibold">Speakers</div>
              </div>
              <div className="animate-fade-in [animation-delay:300ms] group cursor-default">
                <AnimatedCounter 
                  value={statValues.stat4}
                  className="text-5xl md:text-6xl font-bold mb-2 transition-transform group-hover:scale-110 duration-300 text-primary"
                />
                <div className="text-sm md:text-base text-white uppercase tracking-wide font-semibold">Sessions</div>
              </div>
            </div>
          </div>
        </section>
      )
    },
    {
      id: 'seven-shows',
      component: (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <EditableText
              pageName="food-service-industry-expo"
              sectionName="seven-shows"
              contentKey="section-title"
              defaultValue="Seven Shows Under One Roof"
              className="text-3xl font-bold text-center mb-12"
              as="h2"
            />
            <SectionWithDraggableColumns
              pageName="food-service-industry-expo"
              sectionId="seven-shows"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              columns={Array.from({ length: 8 }, (_, i) => ({
                id: `show-${i + 1}`,
                component: (
                <div className="h-full flex flex-col justify-center rounded-xl bg-card border border-border hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="p-5">
                    <div className="mb-4">
                      <HoverOverlayImageCard
                        pageName="food-service-industry-expo"
                        sectionName="seven-shows"
                        cardId={`show-${i + 1}`}
                        defaultImageSrc="/placeholder.svg"
                        imageAlt={`Show ${i + 1}`}
                      />
                    </div>
                      <EditableText
                        pageName="food-service-industry-expo"
                        sectionName="seven-shows"
                        contentKey={`show-${i + 1}-title`}
                        defaultValue={`Show ${i + 1} Title`}
                        className="text-xl font-bold mb-2"
                        as="h3"
                      />
                      <EditableText
                        pageName="food-service-industry-expo"
                        sectionName="seven-shows"
                        contentKey={`show-${i + 1}-desc`}
                        defaultValue={`Description for show ${i + 1}`}
                        className="text-muted-foreground"
                        as="p"
                      />
                      <ShowButton showId={`show-${i + 1}`} />
                    </div>
                  </div>
                )
              }))}
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
                <EditableText 
                  pageName="food-service-industry-expo" 
                  sectionName="cta" 
                  contentKey="title" 
                  defaultValue="Register Today" 
                  className="text-4xl md:text-5xl font-bold mb-6 pt-5" 
                  as="h2" 
                />
                {!showForm && (
                  <>
                    <EditableText 
                      pageName="food-service-industry-expo" 
                      sectionName="cta" 
                      contentKey="description" 
                      defaultValue="Don't miss out on the UK's premier food service industry event. Register now for early bird pricing!" 
                      className="text-xl text-white/80 mb-8" 
                      as="p" 
                    />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="px-12 py-6 text-lg shadow-glow-strong"
                    >
                      <EditableText 
                        pageName="food-service-industry-expo" 
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
                      <button 
                        onClick={() => setShowForm(false)} 
                        className="text-white hover:text-white/80 transition-colors flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                        <span>Close</span>
                      </button>
                    </div>
                    
                    <div className="bg-black rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
                      <div className="p-8 md:p-12">
                        <h2 className="text-3xl font-bold mb-4 text-center text-white">Register Your Interest</h2>
                        <p className="text-white/80 text-center mx-auto">
                          Complete the form below to secure your spot at the Food Service Industry Expo. Early registration receives exclusive benefits!
                        </p>
                      </div>

                      <div className="w-full bg-black -mb-4">
                        <iframe 
                          src="https://disastersexpotexas.lpages.co/grab-go-register-interest/" 
                          className="w-full border-0" 
                          style={{
                            height: "680px",
                            display: "block"
                          }} 
                          title="Registration Form" 
                          loading="lazy" 
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
        titlePrefix="Food Service Industry Expo" 
        description="Seven shows under one roof - the ultimate B2B event for hospitality industry growth."
      />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections
            pageName="food-service-industry-expo"
            sections={sections}
          />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default FoodServiceIndustryExpo;
