import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ExhibitorDetailDialog from "./ExhibitorDetailDialog";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { EditableText } from "./editable/EditableText";

interface Exhibitor {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website: string | null;
  booth_number: string | null;
  company_profile: string | null;
  show_contact_button: boolean;
}

const ExhibitorCarousel = () => {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);
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
    const fetchExhibitors = async () => {
      const { data, error } = await supabase
        .from("exhibitors")
        .select("*")
        .eq("is_active", true)
        .not("logo_url", "is", null)
        .order("name");

      if (error) {
        console.error("Error fetching exhibitors:", error);
        return;
      }

      if (data) {
        setExhibitors(data);
      }
    };

    fetchExhibitors();
  }, []);

  if (exhibitors.length === 0) return null;

  return (
    <div className="py-20 bg-background overflow-hidden relative">
      <div className="container mx-auto px-4 mb-12 relative z-10">
        <div className="text-center">
          <EditableText 
            pageName="home" 
            sectionName="exhibitors" 
            contentKey="title" 
            defaultValue="Meet Our Exhibitors" 
            className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title"
            as="h2"
          />
          <EditableText 
            pageName="home" 
            sectionName="exhibitors" 
            contentKey="description" 
            defaultValue="Discover innovative brands and suppliers showcasing the latest products and solutions for the food-to-go industry." 
            className="text-xl text-muted-foreground"
            as="p"
          />
        </div>
      </div>
      
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {exhibitors.map((exhibitor, index) => (
              <div 
                key={`${exhibitor.id}-${index}`} 
                className="flex-shrink-0 mx-[5px] md:mx-4 w-[66.67vw] md:w-64 min-w-0"
              >
                <div 
                  onClick={() => {
                    setSelectedExhibitor(exhibitor);
                    setDialogOpen(true);
                  }} 
                  className="group cursor-pointer bg-card rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg h-full border border-border"
                >
                  <div className="relative aspect-square overflow-hidden bg-card p-4 flex items-center justify-center">
                    {exhibitor.logo_url ? (
                      <img 
                        src={exhibitor.logo_url} 
                        alt={`${exhibitor.name} logo`} 
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                        <span className="text-4xl font-bold text-muted-foreground/30">
                          {exhibitor.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {exhibitor.name}
                    </h3>
                    {exhibitor.booth_number && (
                      <p className="text-sm text-primary font-medium">
                        Booth {exhibitor.booth_number}
                      </p>
                    )}
                    {exhibitor.short_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {exhibitor.short_description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <ExhibitorDetailDialog 
        exhibitor={selectedExhibitor} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </div>
  );
};

export default ExhibitorCarousel;
