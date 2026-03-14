import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import ExhibitorDetailDialog from '@/components/ExhibitorDetailDialog';

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

interface Config {
  limit?: number;
  showTitle?: boolean;
  title?: string;
}

export const ExhibitorCarouselBlock = ({ config }: { config: Config }) => {
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true, containScroll: 'trimSnaps' },
    [Autoplay({ delay: 2000, stopOnInteraction: false })]
  );

  useEffect(() => {
    const fetch = async () => {
      const query = supabase
        .from('exhibitors')
        .select('*')
        .eq('is_active', true)
        .not('logo_url', 'is', null)
        .order('name');

      if (config.limit) query.limit(config.limit);

      const { data } = await query;
      if (data) setExhibitors(data);
    };
    fetch();
  }, [config.limit]);

  if (exhibitors.length === 0) return <p className="text-center text-muted-foreground py-8">No exhibitors to display</p>;

  return (
    <div>
      {config.showTitle !== false && (
        <h2 className="text-3xl font-bold text-center mb-8">{config.title || 'Our Exhibitors'}</h2>
      )}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {exhibitors.map((ex) => (
            <div
              key={ex.id}
              className="flex-none w-[200px] px-3 cursor-pointer"
              onClick={() => { setSelectedExhibitor(ex); setDialogOpen(true); }}
            >
              <div className="bg-card rounded-lg shadow-sm p-4 flex items-center justify-center h-28 border border-border/50">
                {ex.logo_url ? (
                  <img src={ex.logo_url} alt={ex.name} className="max-h-20 max-w-full object-contain" />
                ) : (
                  <span className="text-sm text-muted-foreground">{ex.name}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedExhibitor && (
        <ExhibitorDetailDialog
          exhibitor={selectedExhibitor}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
};
