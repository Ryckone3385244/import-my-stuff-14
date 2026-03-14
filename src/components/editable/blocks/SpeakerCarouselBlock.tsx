import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SpeakerDetailDialog from '@/components/SpeakerDetailDialog';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface Speaker {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  company_logo_url: string | null;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
}

interface Config {
  limit?: number;
  showTitle?: boolean;
  title?: string;
}

export const SpeakerCarouselBlock = ({ config }: { config: Config }) => {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [emblaRef] = useEmblaCarousel(
    { loop: true, dragFree: true, containScroll: 'trimSnaps' },
    [Autoplay({ delay: 2000, stopOnInteraction: false })]
  );

  useEffect(() => {
    const fetch = async () => {
      const query = supabase
        .from('speakers_public')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (config.limit) query.limit(config.limit);

      const { data } = await query;
      if (data) setSpeakers(data.filter((s: any) => s.photo_url));
    };
    fetch();
  }, [config.limit]);

  if (speakers.length === 0) return <p className="text-center text-muted-foreground py-8">No speakers to display</p>;

  return (
    <div>
      {config.showTitle !== false && (
        <h2 className="text-3xl font-bold text-center mb-8">{config.title || 'Our Speakers'}</h2>
      )}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {speakers.map((sp) => (
            <div
              key={sp.id}
              className="flex-none w-[220px] px-3 cursor-pointer"
              onClick={() => { setSelectedSpeaker(sp); setDialogOpen(true); }}
            >
              <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border/50">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={sp.photo_url || '/placeholder.svg'}
                    alt={sp.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm truncate">{sp.name}</h3>
                  {sp.title && <p className="text-xs text-muted-foreground truncate">{sp.title}</p>}
                  {sp.company && <p className="text-xs text-muted-foreground truncate">{sp.company}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedSpeaker && (
        <SpeakerDetailDialog
          speaker={selectedSpeaker}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
};
