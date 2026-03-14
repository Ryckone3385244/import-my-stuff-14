import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ExhibitorCard from '@/components/ExhibitorCard';
import ExhibitorDetailDialog from '@/components/ExhibitorDetailDialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

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
  category: string | null;
}

interface Config {
  limit?: number;
  showSearch?: boolean;
  showTitle?: boolean;
  title?: string;
  columns?: number;
}

export const ExhibitorGridBlock = ({ config }: { config: Config }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: exhibitors, isLoading } = useQuery({
    queryKey: ['exhibitors-grid-block'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exhibitors')
        .select('*')
        .or('approval_status.eq.approved,approval_status.is.null')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as Exhibitor[];
    },
  });

  const filtered = (exhibitors || []).filter((ex) =>
    !searchQuery || ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const limited = config.limit ? filtered.slice(0, config.limit) : filtered;
  const cols = config.columns || 4;

  return (
    <div>
      {config.showTitle !== false && (
        <h2 className="text-3xl font-bold text-center mb-8">{config.title || 'Exhibitors'}</h2>
      )}
      {config.showSearch !== false && (
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search exhibitors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : limited.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No exhibitors found</p>
      ) : (
        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(cols, 6)} gap-4`}>
          {limited.map((ex) => (
            <ExhibitorCard
              key={ex.id}
              id={ex.id}
              name={ex.name}
              description={ex.short_description || ex.description || undefined}
              logoUrl={ex.logo_url || undefined}
              website={ex.website || undefined}
              boothNumber={ex.booth_number || undefined}
              onClick={() => { setSelectedExhibitor(ex); setDialogOpen(true); }}
            />
          ))}
        </div>
      )}
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
