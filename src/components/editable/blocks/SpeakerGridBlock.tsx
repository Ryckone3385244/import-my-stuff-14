import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SpeakerCard from '@/components/SpeakerCard';
import SpeakerDetailDialog from '@/components/SpeakerDetailDialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
}

interface Config {
  limit?: number;
  showSearch?: boolean;
  showTitle?: boolean;
  title?: string;
  columns?: number;
}

export const SpeakerGridBlock = ({ config }: { config: Config }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: speakers, isLoading } = useQuery({
    queryKey: ['speakers-grid-block'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speakers_public')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Speaker[];
    },
  });

  const filtered = (speakers || []).filter((sp) =>
    !searchQuery || sp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const limited = config.limit ? filtered.slice(0, config.limit) : filtered;
  const cols = config.columns || 4;

  return (
    <div>
      {config.showTitle !== false && (
        <h2 className="text-3xl font-bold text-center mb-8">{config.title || 'Speakers'}</h2>
      )}
      {config.showSearch !== false && (
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search speakers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : limited.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No speakers found</p>
      ) : (
        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(cols, 6)} gap-6`}>
          {limited.map((sp) => (
            <SpeakerCard
              key={sp.id}
              id={sp.id}
              name={sp.name}
              bio={sp.bio || undefined}
              photoUrl={sp.photo_url || undefined}
              title={sp.title || undefined}
              company={sp.company || undefined}
              companyLogoUrl={sp.company_logo_url || undefined}
              linkedinUrl={sp.linkedin_url || undefined}
              onClick={() => { setSelectedSpeaker(sp); setDialogOpen(true); }}
            />
          ))}
        </div>
      )}
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
