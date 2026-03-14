import { DynamicHelmet } from "@/components/DynamicHelmet";
import { JsonLdSchema } from "@/components/JsonLdSchema";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SpeakerCarousel from "@/components/SpeakerCarousel";
import ExhibitorCarousel from "@/components/ExhibitorCarousel";
import Footer from "@/components/Footer";
import { Link } from "react-router-dom";
import { StyledButton } from "@/components/ui/styled-button";
import { Users, Award, Calendar, Building2, TrendingUp, Lightbulb, Package } from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { EditableText } from "@/components/editable/EditableText";
import { EditableImage } from "@/components/editable/EditableImage";
import { EditableIcon } from "@/components/editable/EditableIcon";
import { EditableEmbed } from "@/components/editable/EditableEmbed";
import { X } from "lucide-react";
import { PageWithDraggableSections, SectionWithDraggableColumns } from "@/components/editable";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";

import { supabase } from "@/integrations/supabase/client";
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_STATS } from "@/lib/constants";
import HTEButton from "@/assets/HTE_button.webp";
import RTIEButton from "@/assets/RTIE_button.webp";
import HRIEButton from "@/assets/HRIE_button.webp";
import TDEButton from "@/assets/TDE_button.webp";
import CBEButton from "@/assets/CBE_button.webp";
import SFBButton from "@/assets/SFB_button.webp";
import RPEButton from "@/assets/RPE_button.webp";
import InfluencersImage from "@/assets/influencers-card.jpg";
const Index = () => {
  const { data: eventSettings } = useEventSettings();
  const [isMobile, setIsMobile] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  useEffect(() => {
    if (!carouselApi) return;
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);
  const audienceContent = {
    buyers: {
      title: 'Buyers',
      iconName: 'Users',
      description: 'Discover the latest products and connect with innovative brands in the grab-and-go sector. Source new products, compare suppliers, and negotiate deals all in one place.',
      image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=800&auto=format&fit=crop'
    },
    brands: {
      title: 'Brands',
      iconName: 'Building2',
      description: 'Showcase your products to thousands of qualified buyers and decision-makers. Launch new products, build brand awareness, and generate leads at the UK\'s premier grab-and-go event.',
      image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&auto=format&fit=crop'
    },
    suppliers: {
      title: 'Suppliers',
      iconName: 'Package',
      description: 'Connect with brands looking for packaging, ingredients, and manufacturing solutions. Network with key players and stay ahead of industry trends.',
      image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&auto=format&fit=crop'
    },
    influencers: {
      title: 'Influencers',
      iconName: 'TrendingUp',
      description: 'Experience the latest food trends, discover emerging brands, and create engaging content. Network with industry leaders and gain exclusive insights into the grab-and-go market.',
      image: InfluencersImage
    }
  };

  const draggableSections = useMemo(() => [
    {
      id: "stats-cards",
      component: (
        <SectionWithDraggableColumns
          pageName="home"
          sectionId="stats-cards"
          containerClassName="container mx-auto px-4 py-16"
          className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16"
          columns={[
            {
              id: "stats-left",
              component: (
                <div className="space-y-6">
                  {/* Stats Title */}
                  <EditableText 
                    pageName="home" 
                    sectionName="stats" 
                    contentKey="title" 
                    defaultValue="Our Success In Numbers" 
                    className="text-3xl md:text-4xl font-bold text-primary" 
                    as="h2" 
                  />
                  
                  {/* 2x2 Stats Grid with dividers */}
                  <div className="grid grid-cols-2 gap-0">
                    {/* Top Left */}
                    <div className="p-4 border-r border-b border-primary/30 group cursor-default">
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="attendees-number" 
                        defaultValue={DEFAULT_STATS.ATTENDEES}
                        className="text-3xl md:text-4xl font-bold mb-1 transition-transform group-hover:scale-110 duration-300 text-primary block"
                        as="div"
                      />
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="attendees-label" 
                        defaultValue="Attendees"
                        className="text-xs md:text-sm text-white uppercase tracking-wide font-semibold"
                        as="div"
                      />
                    </div>
                    {/* Top Right */}
                    <div className="p-4 border-b border-primary/30 group cursor-default">
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="exhibitors-number" 
                        defaultValue={DEFAULT_STATS.EXHIBITORS}
                        className="text-3xl md:text-4xl font-bold mb-1 transition-transform group-hover:scale-110 duration-300 text-primary block"
                        as="div"
                      />
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="exhibitors-label" 
                        defaultValue="Exhibitors"
                        className="text-xs md:text-sm text-white uppercase tracking-wide font-semibold"
                        as="div"
                      />
                    </div>
                    {/* Bottom Left */}
                    <div className="p-4 border-r border-primary/30 group cursor-default">
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="speakers-number" 
                        defaultValue={DEFAULT_STATS.SPEAKERS}
                        className="text-3xl md:text-4xl font-bold mb-1 transition-transform group-hover:scale-110 duration-300 text-primary block"
                        as="div"
                      />
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="speakers-label" 
                        defaultValue="Speakers"
                        className="text-xs md:text-sm text-white uppercase tracking-wide font-semibold"
                        as="div"
                      />
                    </div>
                    {/* Bottom Right */}
                    <div className="p-4 group cursor-default">
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="sessions-number" 
                        defaultValue={DEFAULT_STATS.SESSIONS}
                        className="text-3xl md:text-4xl font-bold mb-1 transition-transform group-hover:scale-110 duration-300 text-primary block"
                        as="div"
                      />
                      <EditableText 
                        pageName="home" 
                        sectionName="stats" 
                        contentKey="sessions-label" 
                        defaultValue="Sessions"
                        className="text-xs md:text-sm text-white uppercase tracking-wide font-semibold"
                        as="div"
                      />
                    </div>
                  </div>
                </div>
              )
            },
            {
              id: "welcome-right",
              component: (
                <div className="space-y-4">
                  <EditableText 
                    pageName="home" 
                    sectionName="stats" 
                    contentKey="welcome-title" 
                    defaultValue="Welcome to Customer Connect Expo" 
                    className="text-3xl md:text-4xl font-bold text-primary" 
                    as="h3"
                  />
                  <EditableText 
                    pageName="home" 
                    sectionName="stats" 
                    contentKey="welcome-text" 
                    defaultValue="Customer experience is the cornerstone of modern business success. In today's competitive landscape, delivering seamless, personalized interactions is no longer optional, it's essential. As industries evolve, the demand for innovative CX strategies and technologies has never been greater. Customer Connect Expo is the ultimate destination for navigating the evolving landscape of customer experience."
                    className="text-white leading-relaxed" 
                    as="p" 
                  />
                </div>
              )
            }
          ]}
        />
      )
    },
    {
      id: "audience-cards",
      component: (
        <section className="relative py-20 pb-16 md:pb-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 animate-fade-up pb-8 md:sticky md:bg-gradient-to-b md:from-card md:via-card md:to-transparent" style={isMobile ? {} : {
              top: '100px',
              zIndex: 5
            }}>
              <EditableText pageName="home" sectionName="why-attend" contentKey="title" defaultValue="Why Attend?" className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title pt-10" as="h2" />
              <EditableText pageName="home" sectionName="why-attend" contentKey="subtitle" defaultValue="Whether you're a buyer, brand, supplier, or influencer, Grab & Go expo offers unique opportunities for everyone" className="text-xl text-muted-foreground w-full mx-auto" as="p" />
            </div>

            <div className="space-y-[42px] relative" style={{
              zIndex: 10
            }}>
                {(Object.keys(audienceContent) as Array<keyof typeof audienceContent>).map((key, index) => {
                const content = audienceContent[key];
                const totalCards = Object.keys(audienceContent).length;
                const isLastCard = index === totalCards - 1;

                const cardColors = ['bg-green-card',
                'bg-accent',
                'bg-green-card',
                'bg-accent'
                ];
                const card = <div key={key} className={`sticky ${cardColors[index]} rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.2)] transition-all duration-500`} style={{
                  top: isMobile ? '110px' : '320px',
                  zIndex: 15 + index
                }}>
                      <div className="grid lg:grid-cols-2 gap-0 items-center min-h-[400px]">
                        <div className="order-2 lg:order-1 p-8 lg:p-12">
                          <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 rounded-full bg-card/20 backdrop-blur-md border border-card/30">
                            <EditableIcon 
                              pageName="home" 
                              sectionName="audience" 
                              contentKey={`${key}-icon`} 
                              defaultIcon={content.iconName} 
                              className="h-6 w-6 text-green-card-foreground" 
                            />
                            <EditableText 
                              pageName="home" 
                              sectionName="audience" 
                              contentKey={`${key}-category`} 
                              defaultValue={content.title} 
                              className="text-sm font-semibold text-green-card-foreground uppercase tracking-wide" 
                              as="span"
                            />
                          </div>
                           <EditableText pageName="home" sectionName="audience" contentKey={`${key}-title`} defaultValue={`Perfect for ${content.title}`} className="text-3xl md:text-4xl font-bold text-green-card-foreground mb-4" as="h3" />
                          <EditableText pageName="home" sectionName="audience" contentKey={`${key}-description`} defaultValue={content.description} className="text-lg text-green-card-foreground/90 leading-relaxed" as="p" />
                        </div>
                        <div className="order-1 lg:order-2 relative h-full min-h-[160px] lg:min-h-[360px] p-5">
                          <div className="relative w-full h-full overflow-hidden rounded-xl">
                            <EditableImage 
                              pageName="home" 
                              sectionName="audience" 
                              contentKey={`${key}-image`} 
                              defaultSrc={content.image} 
                              alt={content.title} 
                              className={`w-full h-full object-cover transition-transform duration-700 ${key === 'buyers' ? 'scale-[1.35] -translate-y-[70px] hover:scale-[1.42]' : 'hover:scale-105'}`}
                            />
                          </div>
                          <div className="absolute inset-5 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"></div>
                        </div>
                      </div>
                    </div>;

                if (isLastCard) {
                  return <div key={key} style={{
                    minHeight: '70vh'
                  }}>
                        {card}
                      </div>;
                }
                return card;
              })}
            </div>
          </div>
        </section>
      )
    },
    {
      id: "exhibitors-carousel",
      component: (
        <section className="pt-10 pb-20 bg-card">
          <ExhibitorCarousel />
        </section>
      )
    },
    {
      id: "speakers-carousel",
      component: (
        <section className="pt-10 pb-20 bg-card">
          <SpeakerCarousel />
        </section>
      )
    },
    {
      id: "running-alongside",
      component: (
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <EditableText pageName="home" sectionName="running-alongside" contentKey="title" defaultValue="Running Alongside" className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title pt-5" as="h2" />
              <EditableText pageName="home" sectionName="running-alongside" contentKey="subtitle" defaultValue="The Grab And Go Expo is co-located with our seven food industry events" className="text-xl text-secondary-foreground/80 w-full" as="p" />
            </div>
            <div className="container mx-auto px-4">
              <Carousel setApi={setCarouselApi} opts={{
                align: "start",
                loop: true
              }} plugins={[Autoplay({
                delay: 3000
              })]} className="w-full">
                <CarouselContent>
                  <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/4">
                    <a href="https://www.hospitalitytechexpo.co.uk/" target="_blank" rel="noopener noreferrer" className="group block p-2">
                      <EditableImage 
                        pageName="home" 
                        sectionName="running-alongside" 
                        contentKey="hte-button" 
                        defaultSrc={HTEButton} 
                        alt="Hospitality Tech Expo" 
                        className="w-full rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl" 
                      />
                    </a>
                  </CarouselItem>
                  <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/4">
                    <a href="https://www.takeawayexpo.co.uk/" target="_blank" rel="noopener noreferrer" className="group block p-2">
                      <EditableImage 
                        pageName="home" 
                        sectionName="running-alongside" 
                        contentKey="rtie-button" 
                        defaultSrc={RTIEButton} 
                        alt="Restaurant & Takeaway Innovation Expo" 
                        className="w-full rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl" 
                      />
                    </a>
                  </CarouselItem>
                  <CarouselItem className="basis-full md:basis-1/2 lg:basis-1/4">
                    <a href="https://www.hotelinnovationexpo.co.uk/" target="_blank" rel="noopener noreferrer" className="group block p-2">
                      <EditableImage 
                        pageName="home" 
                        sectionName="running-alongside" 
                        contentKey="hrie-button" 
                        defaultSrc={HRIEButton} 
                        alt="Hotel & Resort Innovation Expo" 
                        className="w-full rounded-lg shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-xl" 
                      />
                    </a>
                  </CarouselItem>
                </CarouselContent>
                
                <div className="flex justify-center gap-2 mt-8">
                  {[0, 1, 2, 3, 4, 5, 6].map(index => <button key={index} onClick={() => carouselApi?.scrollTo(index)} className={`w-2 h-2 rounded-full transition-all duration-300 ${currentSlide === index ? 'bg-secondary-foreground w-8' : 'bg-secondary-foreground/30 hover:bg-secondary-foreground/60'}`} aria-label={`Go to slide ${index + 1}`} />)}
                </div>
              </Carousel>
            </div>
          </div>
        </section>
      )
    },
    {
      id: "register-cta",
      component: (
        <section className="py-20 text-primary-foreground relative overflow-hidden" style={{
          background: 'var(--gradient-title)'
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary-foreground) / 0.2) 0%, transparent 70%)'
          }}></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <EditableText pageName="home" sectionName="cta" contentKey="title" defaultValue="Register Today" className="text-4xl md:text-5xl font-bold mb-6 pt-5" as="h2" />
                {!showForm && (
                  <>
                    <EditableText pageName="home" sectionName="cta" contentKey="description" defaultValue="Don't miss out on the UK's premier grab-and-go event. Register now for early bird pricing!" className="text-xl text-primary-foreground/80 mb-8" as="p" />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="font-bold px-12 py-6 text-lg"
                    >
                      <EditableText 
                        pageName="home" 
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
                    <button onClick={() => setShowForm(false)} className="text-primary-foreground hover:text-primary-foreground/80 transition-colors flex items-center gap-2 bg-secondary/40 backdrop-blur-md px-4 py-2 rounded-lg">
                      <X className="h-5 w-5" />
                      <span>Close</span>
                    </button>
                  </div>
                  
                  <div className="bg-secondary rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
                    <div className="p-8 md:p-12">
                      <h2 className="text-3xl font-bold mb-4 text-center text-secondary-foreground">Register Your Interest</h2>
                      <p className="text-secondary-foreground/80 text-center mx-auto">
                        Complete the form below to secure your spot at {eventSettings?.event_name || "Grab & Go Expo"}. Early registration receives exclusive benefits!
                      </p>
                    </div>

                    <div className="w-full bg-secondary -mb-4">
                      <EditableEmbed
                        pageName="home"
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
  ], [isMobile, carouselApi, currentSlide, showForm]);

  return <>
      <DynamicHelmet 
        customTitle="{eventName} - {eventTagline}"
        description="Join {eventName} at {eventLocation}. {eventTagline}, co-located within the Foodservice Industry Expo. {eventDate}."
        keywords="{eventName}, customer experience, CX strategy, trade show, exhibition, networking event, industry conference, Georgia World Congress Center, 2026, {eventLocation}"
      />
      <JsonLdSchema 
        type={["Organization", "Event", "WebPage"]} 
        pageTitle="Home"
        pageDescription="The premier event for customer experience professionals. Transform your CX strategy with industry leaders."
      />

      <AnnouncementPopup />

      <div className="min-h-screen flex flex-col bg-background pt-page-home">
        <Navbar />
        <main className="flex-1">
          <Hero />
          
          <PageWithDraggableSections
            pageName="home"
            sections={draggableSections}
          />
        </main>

        <Footer />
      </div>
    </>;
};
export default Index;