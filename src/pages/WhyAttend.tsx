import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Users, TrendingUp, Lightbulb, ShoppingBag, Handshake, BookOpen, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EditableText } from "@/components/editable/EditableText";
import { EditableIcon } from "@/components/editable/EditableIcon";
import { SectionWithDraggableColumns } from '@/components/editable';
import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { PageWithDraggableSections } from '@/components/editable';
import { useEventSettings } from "@/hooks/useEventSettings";
import { ARIA_LABELS } from "@/lib/constants";
import { ImageCarouselBlock } from "@/components/editable/ImageCarouselBlock";
import { supabase } from "@/integrations/supabase/client";
import { usePageName } from "@/hooks/usePageName";

const DEFAULT_CAROUSEL_IMAGES = [
  "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=1200&auto=format&fit=crop"
];

const DEFAULT_CAROUSEL_CONFIG = {
  desktop: 1,
  tablet: 1,
  mobile: 1,
  aspectRatio: '16:9' as const,
  objectFit: 'contain' as const,
  showArrows: true,
  showPagination: true
};

const WhyAttend = () => {
  const pageName = usePageName();
  const { data: eventSettings } = useEventSettings();
  const [carouselImages, setCarouselImages] = useState<string[]>(DEFAULT_CAROUSEL_IMAGES);
  const [carouselConfig, setCarouselConfig] = useState(DEFAULT_CAROUSEL_CONFIG);

  // Load carousel data from database
  useEffect(() => {
    const loadCarouselData = async () => {
      const { data, error } = await supabase
        .from('page_content')
        .select('content_value')
        .eq('page_name', pageName)
        .eq('section_name', 'carousel')
        .eq('content_key', 'carousel-data')
        .maybeSingle();

      if (data?.content_value) {
        try {
          const parsed = JSON.parse(data.content_value);
          if (parsed.images && Array.isArray(parsed.images)) {
            setCarouselImages(parsed.images);
          }
          if (parsed.config) {
            setCarouselConfig({ ...DEFAULT_CAROUSEL_CONFIG, ...parsed.config });
          }
        } catch (e) {
          console.error('Error parsing carousel data:', e);
        }
      }
    };
    loadCarouselData();
  }, [pageName]);

  // Save carousel images to database
  const handleCarouselUpdate = useCallback(async (images: string[]) => {
    setCarouselImages(images);
    const dataToSave = JSON.stringify({ images, config: carouselConfig });
    
    await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: 'carousel',
        content_key: 'carousel-data',
        content_type: 'json',
        content_value: dataToSave
      }, { onConflict: 'page_name,section_name,content_key' });
  }, [pageName, carouselConfig]);

  // Save carousel config to database
  const handleCarouselConfigUpdate = useCallback(async (config: typeof DEFAULT_CAROUSEL_CONFIG) => {
    setCarouselConfig(config);
    const dataToSave = JSON.stringify({ images: carouselImages, config });
    
    await supabase
      .from('page_content')
      .upsert({
        page_name: pageName,
        section_name: 'carousel',
        content_key: 'carousel-data',
        content_type: 'json',
        content_value: dataToSave
      }, { onConflict: 'page_name,section_name,content_key' });
  }, [pageName, carouselImages]);

  const sections = useMemo(() => [
    {
      id: 'carousel',
      component: (
        <section className="py-4">
          <div className="rounded-2xl overflow-hidden max-w-full">
            <ImageCarouselBlock
              images={carouselImages}
              config={carouselConfig}
              onUpdate={handleCarouselUpdate}
              onConfigUpdate={handleCarouselConfigUpdate}
            />
          </div>
        </section>
      )
    },
    {
      id: 'cards-row-1',
      component: (
        <section className="py-4">
          <SectionWithDraggableColumns
            pageName={pageName}
            sectionId="cards-row-1"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 equal-height-grid"
            columns={[
              {
                id: 'exhibitors-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl backdrop-blur-md border border-white/20 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 backdrop-blur-md border border-white/20 group-hover:bg-black/30 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="cards"
                          contentKey="exhibitors-icon"
                          defaultIcon="ShoppingBag"
                          className="w-6 h-6 text-white"
                        />
                      </div>
                      <EditableText 
                        pageName={pageName} 
                        sectionName="cards"
                        contentKey="exhibitors-title" 
                        defaultValue="500+ Exhibitors" 
                        className="text-2xl font-semibold text-primary"
                        as="div"
                      />
                    </div>
                    <EditableText 
                      pageName={pageName} 
                      sectionName="cards"
                      contentKey="exhibitors-description" 
                      defaultValue="Discover innovative food-to-go solutions, packaging innovations, and quick service equipment from leading suppliers and emerging brands." 
                      className="text-white"
                      as="p"
                    />
                  </div>
                )
              },
              {
                id: 'networking-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl backdrop-blur-md border border-white/20 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 backdrop-blur-md border border-white/20 group-hover:bg-black/30 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="cards"
                          contentKey="networking-icon"
                          defaultIcon="Users"
                          className="w-6 h-6 text-white"
                        />
                      </div>
                      <EditableText 
                        pageName={pageName} 
                        sectionName="cards"
                        contentKey="attendees-title" 
                        defaultValue="15,000 Attendees" 
                        className="text-2xl font-semibold text-primary"
                        as="div"
                      />
                    </div>
                    <EditableText 
                      pageName={pageName} 
                      sectionName="cards"
                      contentKey="attendees-description" 
                      defaultValue="Network with retailers, QSR operators, cafe owners, wholesalers, and industry decision-makers all under one roof." 
                      className="text-white"
                      as="p"
                    />
                  </div>
                )
              },
              {
                id: 'trends-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl backdrop-blur-md border border-white/20 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 backdrop-blur-md border border-white/20 group-hover:bg-black/30 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="cards"
                          contentKey="trends-icon"
                          defaultIcon="TrendingUp"
                          className="w-6 h-6 text-white"
                        />
                      </div>
                      <EditableText 
                        pageName={pageName} 
                        sectionName="cards"
                        contentKey="trends-title" 
                        defaultValue="Latest Trends" 
                        className="text-2xl font-semibold"
                        as="h2"
                      />
                    </div>
                    <EditableText 
                      pageName={pageName} 
                      sectionName="cards"
                      contentKey="trends-description" 
                      defaultValue="Stay ahead of the curve with insights into consumer preferences, sustainability solutions, and emerging food-to-go concepts." 
                      className="text-white"
                      as="p"
                    />
                  </div>
                )
              }
            ]}
          />
        </section>
      )
    },
    {
      id: 'cards-row-2',
      component: (
        <section className="py-4">
          <SectionWithDraggableColumns
            pageName={pageName}
            sectionId="cards-row-2"
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 equal-height-grid"
            columns={[
              {
                id: 'partnerships-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-primary backdrop-blur-md border border-primary-foreground/20 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 backdrop-blur-md border border-white/20 group-hover:bg-black/30 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="cards"
                          contentKey="partnerships-icon"
                          defaultIcon="Handshake"
                          className="w-6 h-6 text-white"
                        />
                      </div>
                      <EditableText 
                        pageName={pageName} 
                        sectionName="cards"
                        contentKey="partnerships-title" 
                        defaultValue="Build Partnerships" 
                        className="text-2xl font-semibold"
                        as="h2"
                      />
                    </div>
                    <EditableText 
                      pageName={pageName} 
                      sectionName="cards"
                      contentKey="partnerships-description" 
                      defaultValue="Connect directly with suppliers, forge new business relationships, and discover collaboration opportunities to grow your business." 
                      className="text-white"
                      as="p"
                    />
                  </div>
                )
              },
              {
                id: 'innovation-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-primary backdrop-blur-md border border-primary-foreground/20 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 backdrop-blur-md border border-white/20 group-hover:bg-black/30 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="cards"
                          contentKey="inspiration-icon"
                          defaultIcon="Lightbulb"
                          className="w-6 h-6 text-white"
                        />
                      </div>
                      <EditableText 
                        pageName={pageName} 
                        sectionName="cards"
                        contentKey="innovation-title" 
                        defaultValue="Product Innovation" 
                        className="text-2xl font-semibold"
                        as="h2"
                      />
                    </div>
                    <EditableText 
                      pageName={pageName} 
                      sectionName="cards"
                      contentKey="innovation-description" 
                      defaultValue="Explore cutting-edge food products, smart packaging, and technology solutions that will transform your grab-and-go offerings." 
                      className="text-white"
                      as="p"
                    />
                  </div>
                )
              },
              {
                id: 'knowledge-card',
                component: (
                  <div className="h-full flex flex-col justify-center p-8 rounded-xl bg-primary backdrop-blur-md border border-primary-foreground/20 hover:border-primary/50 transition-all duration-300 shadow-card hover:shadow-card-hover group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-black/20 backdrop-blur-md border border-white/20 group-hover:bg-black/30 transition-colors">
                        <EditableIcon
                          pageName={pageName}
                          sectionName="cards"
                          contentKey="education-icon"
                          defaultIcon="BookOpen"
                          className="w-6 h-6 text-white"
                        />
                      </div>
                      <EditableText 
                        pageName={pageName} 
                        sectionName="cards"
                        contentKey="knowledge-title" 
                        defaultValue="Expert Knowledge" 
                        className="text-2xl font-semibold"
                        as="h2"
                      />
                    </div>
                    <EditableText 
                      pageName={pageName} 
                      sectionName="cards"
                      contentKey="knowledge-description" 
                      defaultValue="Learn from industry experts through seminars, live demonstrations, and workshops covering everything from menu innovation to operational efficiency." 
                      className="text-white"
                      as="p"
                    />
                  </div>
                )
              }
            ]}
          />
        </section>
      )
    },
    {
      id: 'what-youll-gain',
      component: (
        <section className="py-4">
          <div className="bg-black p-10 rounded-2xl border border-white/10 shadow-glow-strong">
          <EditableText
            pageName={pageName}
            sectionName="what-youll-gain"
            contentKey="title"
            defaultValue="What You'll Gain"
            className="text-3xl font-bold mb-6 text-center text-white"
            as="h2"
          />
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold text-xl">✓</span>
              <EditableText
                pageName={pageName}
                sectionName="what-youll-gain"
                contentKey="item-1"
                defaultValue="Taste and sample the latest food-to-go products from hundreds of suppliers"
                className="text-white"
                as="span"
              />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold text-xl">✓</span>
              <EditableText
                pageName={pageName}
                sectionName="what-youll-gain"
                contentKey="item-2"
                defaultValue="Discover innovative packaging solutions and sustainable options for your business"
                className="text-white"
                as="span"
              />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold text-xl">✓</span>
              <EditableText
                pageName={pageName}
                sectionName="what-youll-gain"
                contentKey="item-3"
                defaultValue="Learn about menu trends, consumer insights, and profitability strategies"
                className="text-white"
                as="span"
              />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold text-xl">✓</span>
              <EditableText
                pageName={pageName}
                sectionName="what-youll-gain"
                contentKey="item-4"
                defaultValue="Connect directly with manufacturers, distributors, and service providers"
                className="text-white"
                as="span"
              />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold text-xl">✓</span>
              <EditableText
                pageName={pageName}
                sectionName="what-youll-gain"
                contentKey="item-5"
                defaultValue="Access exclusive show offers and negotiate deals on the spot"
                className="text-white"
                as="span"
              />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold text-xl">✓</span>
              <EditableText
                pageName={pageName}
                sectionName="what-youll-gain"
                contentKey="item-6"
                defaultValue="Compare products side-by-side and make informed purchasing decisions"
                className="text-white"
                as="span"
              />
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold text-xl">✓</span>
              <EditableText
                pageName={pageName}
                sectionName="what-youll-gain"
                contentKey="item-7"
                defaultValue="Get inspired by new concepts and ideas to differentiate your offerings"
                className="text-white"
                as="span"
              />
            </div>
          </div>
        </div>
        </section>
      )
    }
  ], [pageName, carouselImages, carouselConfig, handleCarouselUpdate, handleCarouselConfigUpdate]);

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Why Attend"
        description="Discover the benefits of attending {eventName} - network with industry leaders, explore innovative products, and gain valuable insights from experts."
      />
      
      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 pt-page pb-12">
          <EditableText 
            pageName={pageName} 
            sectionName="hero"
            contentKey="title" 
            defaultValue="Why Attend Customer Connect Expo 2026" 
            className="text-4xl md:text-5xl font-bold mb-6 text-center text-gradient-title pt-5"
            as="h1"
          />
          
          <EditableText 
            pageName={pageName} 
            sectionName="hero"
            contentKey="subtitle" 
            defaultValue="The UK's leading food-to-go and quick service food event, bringing together 15,000 professionals and 500+ exhibitors showcasing the latest innovations in grab-and-go cuisine." 
            className="text-xl text-muted-foreground text-center mb-12 w-full mx-auto"
            as="p"
          />

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

export default WhyAttend;
