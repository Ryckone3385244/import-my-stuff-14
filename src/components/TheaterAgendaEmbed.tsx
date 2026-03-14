import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Loader2, CalendarPlus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SpeakerDetailDialog from '@/components/SpeakerDetailDialog';

interface TheaterAgendaEmbedProps {
  theaterName: string;
  title?: string;
  showFullAgendaLink?: boolean;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  room: string | null;
  session_type: string | null;
  status: string;
}

interface Speaker {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  company_logo_url: string | null;
  is_active: boolean | null;
}

const TheaterAgendaEmbed = ({ theaterName, title, showFullAgendaLink = true }: TheaterAgendaEmbedProps) => {
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false);

  // Fetch all published sessions
  const { data: allSessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['theater-agenda-sessions', theaterName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenda_sessions')
        .select('*')
        .eq('status', 'published')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data || []).filter(
        (s: Session) => s.venue.trim().toLowerCase() === theaterName.trim().toLowerCase()
      );
    },
  });

  // Fetch speakers
  const { data: speakers = [] } = useQuery({
    queryKey: ['theater-agenda-speakers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speakers')
        .select('id, name, title, company, photo_url, bio, linkedin_url, company_logo_url, is_active')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch session-speaker links
  const { data: sessionSpeakers = [] } = useQuery({
    queryKey: ['theater-agenda-session-speakers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_speakers')
        .select('session_id, speaker_id, speaker_order')
        .order('speaker_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Group sessions by date
  const sessionsByDate = allSessions.reduce<Record<string, Session[]>>((acc, session) => {
    const date = session.session_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  const getSpeakersForSession = (sessionId: string) => {
    const speakerIds = sessionSpeakers
      .filter(ss => ss.session_id === sessionId)
      .map(ss => ss.speaker_id);
    return speakers.filter(s => speakerIds.includes(s.id));
  };

  const addToGoogleCalendar = (session: Session) => {
    const startDate = `${session.session_date.replace(/-/g, '')}T${session.start_time.replace(/:/g, '')}`;
    const endDate = `${session.session_date.replace(/-/g, '')}T${session.end_time.replace(/:/g, '')}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(session.description || '')}&location=${encodeURIComponent(session.venue + (session.room ? ' - ' + session.room : ''))}`;
    window.open(url, '_blank');
  };

  const downloadICS = (session: Session) => {
    const start = `${session.session_date.replace(/-/g, '')}T${session.start_time.replace(/:/g, '').slice(0, 6)}00`;
    const end = `${session.session_date.replace(/-/g, '')}T${session.end_time.replace(/:/g, '').slice(0, 6)}00`;
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${start}\nDTEND:${end}\nSUMMARY:${session.title}\nDESCRIPTION:${(session.description || '').replace(/\n/g, '\\n')}\nLOCATION:${session.venue}${session.room ? ' - ' + session.room : ''}\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '-')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sessionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No sessions scheduled for {theaterName}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {title && <h2 className="text-2xl font-bold">{title}</h2>}
      
      {Object.entries(sessionsByDate).map(([date, sessions]) => (
        <div key={date}>
          <h3 className="text-lg font-semibold mb-4 text-primary">
            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
          </h3>
          <div className="space-y-4">
            {sessions.map((session) => {
              const sessionSpeakersList = getSpeakersForSession(session.id);
              const isSolo = sessionSpeakersList.length === 1;

              return (
                <div key={session.id} className="border border-border rounded-lg p-4 md:p-6 bg-card">
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Session info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-lg">{session.title}</h4>
                        {session.session_type && (
                          <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full whitespace-nowrap">
                            {session.session_type}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
                        </div>
                        {session.room && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{session.room}</span>
                          </div>
                        )}
                      </div>

                      {session.description && (
                        <p className="text-sm text-muted-foreground mt-2">{session.description}</p>
                      )}

                      {/* Speakers */}
                      {sessionSpeakersList.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-3">
                          {sessionSpeakersList.map((spk) => (
                            <button
                              key={spk.id}
                              onClick={() => {
                                setSelectedSpeaker(spk as any);
                                setSpeakerDialogOpen(true);
                              }}
                              className="flex items-center gap-2 hover:bg-muted rounded-lg p-1 transition-colors"
                            >
                              {spk.photo_url ? (
                                <img
                                  src={spk.photo_url}
                                  alt={spk.name}
                                  className={`rounded-full object-cover ${isSolo ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10'}`}
                                />
                              ) : (
                                <div className={`rounded-full bg-muted flex items-center justify-center ${isSolo ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10'}`}>
                                  <User className={isSolo ? 'h-8 w-8' : 'h-5 w-5'} />
                                </div>
                              )}
                              <div className="text-left">
                                <p className={`font-medium ${isSolo ? 'text-base' : 'text-sm'}`}>{spk.name}</p>
                                {spk.title && <p className="text-xs text-muted-foreground">{spk.title}</p>}
                                {spk.company && <p className="text-xs text-muted-foreground">{spk.company}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add to Calendar */}
                    <div className="flex-shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1">
                            <CalendarPlus className="h-4 w-4" />
                            <span className="hidden md:inline">Add to Calendar</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => addToGoogleCalendar(session)}>Google Calendar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadICS(session)}>Outlook / ICS</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showFullAgendaLink && (
        <div className="text-center pt-4">
          <a href="/agenda" className="text-primary hover:underline font-medium">
            View Full Agenda →
          </a>
        </div>
      )}

      <SpeakerDetailDialog
        speaker={selectedSpeaker}
        open={speakerDialogOpen}
        onOpenChange={setSpeakerDialogOpen}
      />
    </div>
  );
};

export default TheaterAgendaEmbed;
