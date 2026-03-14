import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SpeakerDetailDialog from "./SpeakerDetailDialog";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { EditableText } from "./editable/EditableText";
interface Speaker {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  company_logo_url: string | null;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  created_at?: string;
}
const FEATURED_SPEAKERS_CUTOFF_DATE = "2026-02-24";

const SpeakerCarousel = () => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emblaRef] = useEmblaCarousel({
    loop: true,
    dragFree: true,
    containScroll: "trimSnaps"
  }, [Autoplay({
    delay: 2000,
    stopOnInteraction: false
  })]);

  useEffect(() => {
    const fetchSpeakers = async () => {
      const {
        data,
        error
      } = await supabase
        .from("speakers_public")
        .select("*")
        .eq("is_active", true)
        .gte("created_at", FEATURED_SPEAKERS_CUTOFF_DATE)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching speakers:", error);
        return;
      }
      if (data) {
        setSpeakers(data.filter(speaker => speaker.photo_url));
      }
    };
    fetchSpeakers();
  }, []);
  if (speakers.length === 0) return null;
  return <div className="py-20 bg-background overflow-hidden relative">
      <div className="container mx-auto px-4 mb-12 relative z-10">
        <div className="text-center">
          <EditableText 
            pageName="home" 
            sectionName="speakers" 
            contentKey="title" 
            defaultValue="Learn from Industry Leaders" 
            className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title"
            as="h2"
          />
          <EditableText 
            pageName="home" 
            sectionName="speakers" 
            contentKey="description" 
            defaultValue="Gain insights from experts sharing their knowledge on market trends, innovation, and business growth. Here are some of the speakers from our past events:" 
            className="text-xl text-muted-foreground"
            as="p"
          />
        </div>
      </div>
      
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {speakers.map((speaker, index) => <div key={`${speaker.id}-${index}`} className="flex-shrink-0 mx-[5px] md:mx-4 w-[66.67vw] md:w-[calc(33.333%-2rem)] min-w-0">
                <div onClick={() => {
              setSelectedSpeaker(speaker);
              setDialogOpen(true);
            }} className="group cursor-pointer bg-card rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg h-full border border-border">
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {speaker.photo_url ? <img src={speaker.photo_url} alt={`${speaker.name} photo`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <span className="text-4xl font-bold text-muted-foreground/30">
                          {speaker.name.charAt(0)}
                        </span>
                      </div>}
                    {speaker.company_logo_url && (
                      <div className="absolute bottom-2 right-2 w-[109px] h-[109px] rounded-full border-2 border-border/60 flex items-center justify-center p-2 bg-background shadow-sm overflow-hidden">
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
                    {speaker.title && <p className="text-sm text-muted-foreground line-clamp-1">
                        {speaker.title}
                      </p>}
                    {speaker.company && <p className="text-sm text-muted-foreground">
                        {speaker.company}
                      </p>}
                  </div>
                </div>
              </div>)}
          </div>
        </div>
      </div>
      
      <SpeakerDetailDialog speaker={selectedSpeaker} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>;
};
export default SpeakerCarousel;