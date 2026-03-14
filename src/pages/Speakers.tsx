import { DynamicHelmet } from "@/components/DynamicHelmet";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import SpeakerCard from "@/components/SpeakerCard";
import Footer from "@/components/Footer";
import SpeakerDetailDialog from "@/components/SpeakerDetailDialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditableText } from "@/components/editable/EditableText";
import { PageWithDraggableSections } from '@/components/editable';
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";

interface Speaker {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  title: string | null;
  company: string | null;
  company_logo_url: string | null;
  linkedin_url: string | null;
  seminar_title: string | null;
  seminar_description: string | null;
  is_active: boolean;
  created_at?: string;
}

const FEATURED_SPEAKERS_CUTOFF_DATE = "2026-02-24";

const SpeakersCarouselSection = ({ 
  speakers, 
  isLoading, 
  onSpeakerClick 
}: { 
  speakers: Speaker[] | undefined; 
  isLoading: boolean; 
  onSpeakerClick: (speaker: Speaker) => void;
}) => {
  const [emblaRef] = useEmblaCarousel({
    loop: true,
    dragFree: true,
    containScroll: "trimSnaps"
  }, [Autoplay({
    delay: 2000,
    stopOnInteraction: false
  })]);

  return (
    <section className="py-4 overflow-hidden">
      <div className="mb-8 text-center">
        <EditableText
          pageName="speakers"
          sectionName="speakers-list-2"
          contentKey="title"
          defaultValue="All Speakers"
          className="text-3xl font-bold tracking-tight"
          as="h2"
        />
        <EditableText
          pageName="speakers"
          sectionName="speakers-list-2"
          contentKey="description"
          defaultValue="Browse our full lineup of speakers and industry experts."
          className="text-muted-foreground mt-2"
          as="p"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : speakers && speakers.length > 0 ? (
        <div className="relative overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {speakers.map((speaker) => (
              <div key={speaker.id} className="flex-shrink-0 mx-[5px] md:mx-4 w-[66.67vw] md:w-64 min-w-0">
                <div
                  onClick={() => onSpeakerClick(speaker)}
                  className="group cursor-pointer bg-card rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg h-full border border-border"
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {speaker.photo_url ? (
                      <img
                        src={speaker.photo_url}
                        alt={`${speaker.name} photo`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <span className="text-4xl font-bold text-muted-foreground/30">
                          {speaker.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {speaker.company_logo_url && (
                      <div className="absolute bottom-2 right-2 w-16 h-16 rounded-full border-2 border-border/60 flex items-center justify-center p-2 bg-background shadow-sm overflow-hidden">
                        <img
                          src={speaker.company_logo_url}
                          alt={`${speaker.company} logo`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {speaker.name}
                    </h3>
                    {speaker.title && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{speaker.title}</p>
                    )}
                    {speaker.company && (
                      <p className="text-sm text-muted-foreground">{speaker.company}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground">Speaker lineup coming soon. Stay tuned!</p>
        </div>
      )}
    </section>
  );
};

const Speakers = () => {
  const { data: eventSettings } = useEventSettings();
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const itemsPerPage = 10;

  const { data: speakers, isLoading } = useQuery({
    queryKey: ["speakers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speakers_public")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data?.filter(speaker => speaker.photo_url) || [];
    },
  });

  const { data: featuredSpeakers, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ["featured-speakers", FEATURED_SPEAKERS_CUTOFF_DATE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speakers_public")
        .select("*")
        .eq("is_active", true)
        .gte("created_at", FEATURED_SPEAKERS_CUTOFF_DATE)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data?.filter(speaker => speaker.photo_url) || [];
    },
  });

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const filteredSpeakers = useMemo(() => {
    if (!speakers) return [];
    
    let filtered = speakers;
    
    // Apply letter filter
    if (selectedLetter) {
      filtered = filtered.filter(speaker => 
        speaker.name.toUpperCase().startsWith(selectedLetter)
      );
    }
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(speaker => 
        speaker.name.toLowerCase().includes(query) ||
        speaker.title?.toLowerCase().includes(query) ||
        speaker.company?.toLowerCase().includes(query) ||
        speaker.bio?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [speakers, selectedLetter, searchQuery]);

  const totalPages = Math.ceil(filteredSpeakers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSpeakers = filteredSpeakers.slice(startIndex, endIndex);

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(selectedLetter === letter ? null : letter);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sections = useMemo(() => [
    {
      id: 'speakers-hero',
      component: (
        <section className="py-4 md:pt-0">
          <div className="text-center mb-4 animate-fade-up">
            <EditableText 
              pageName="speakers" 
              sectionName="hero" 
              contentKey="title" 
              defaultValue="Featured Speakers" 
              className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title pt-5"
              as="h1"
            />
            <EditableText
              pageName="speakers" 
              sectionName="hero" 
              contentKey="subtitle" 
              defaultValue="Learn from industry leaders and innovators shaping the future" 
              className="text-xl text-muted-foreground w-full mx-auto"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'speakers-list',
      component: (
        <section className="py-4">
          {isFeaturedLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
      ) : featuredSpeakers && featuredSpeakers.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[10px] lg:gap-10 animate-fade-in mb-8 items-stretch">
              {(() => {
                const pinnedKeys = ['mohammed siddiqui', 'tianjiao (tina) zhao'];
                const sidneyKey = 'sidney madison prescott';
                const normalize = (name: string) => name.toLowerCase();

                const pinnedSpeakers = pinnedKeys
                  .map((key) => featuredSpeakers.find((speaker) => normalize(speaker.name).includes(key)))
                  .filter((speaker): speaker is typeof featuredSpeakers[number] => Boolean(speaker));

                const sidneySpeaker = featuredSpeakers.find((speaker) =>
                  normalize(speaker.name).includes(sidneyKey)
                );

                const nonPinnedSpeakers = featuredSpeakers.filter((speaker) => {
                  const normalizedName = normalize(speaker.name);
                  return (
                    !pinnedKeys.some((key) => normalizedName.includes(key)) &&
                    !normalizedName.includes(sidneyKey)
                  );
                });

                const orderedSpeakers = [
                  ...pinnedSpeakers,
                  ...nonPinnedSpeakers.slice(0, 1),
                  ...(sidneySpeaker ? [sidneySpeaker] : []),
                  ...nonPinnedSpeakers.slice(1),
                ];

                return orderedSpeakers;
              })().map((speaker) => (
                <SpeakerCard
                  key={speaker.id}
                  id={speaker.id}
                  name={speaker.name}
                  bio={speaker.bio || undefined}
                  photoUrl={speaker.photo_url || undefined}
                  title={speaker.title || undefined}
                  company={speaker.company || undefined}
                  companyLogoUrl={speaker.company_logo_url || undefined}
                  linkedinUrl={speaker.linkedin_url || undefined}
                  onClick={() => {
                    setSelectedSpeaker(speaker);
                    setDialogOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                No new featured speakers yet. Check back soon!
              </p>
            </div>
          )}
        </section>
      )
    },
    {
      id: 'speakers-list-2',
      component: (
        <SpeakersCarouselSection
          speakers={speakers?.filter(s => s.created_at && s.created_at < FEATURED_SPEAKERS_CUTOFF_DATE)}
          isLoading={isLoading}
          onSpeakerClick={(speaker) => {
            setSelectedSpeaker(speaker);
            setDialogOpen(true);
          }}
        />
      )
    }
  ], [speakers, selectedLetter, searchQuery, currentPage, filteredSpeakers, currentSpeakers, totalPages, isLoading, isFeaturedLoading, featuredSpeakers, alphabet, eventSettings]);

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Speakers"
        description="Meet our lineup of industry-leading speakers at {eventName}. Learn from food-to-go experts and thought leaders. {eventDate} at {eventLocation}."
        keywords="{eventName}, speakers, industry leaders, food-to-go experts, seminars, foodservice conference, {eventLocation}"
      />

      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 pt-page pb-12">
          <PageWithDraggableSections
            pageName="speakers"
            sections={sections}
          />
        </main>
        
        <SpeakerDetailDialog
          speaker={selectedSpeaker}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
        
        <Footer />
      </div>
    </>
  );
};

export default Speakers;
