import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Linkedin, Building2, Briefcase, Calendar, Clock, MapPin, Share2, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useEventSettingsContext } from "@/contexts/EventSettingsContext";
import { useEventSettings } from "@/hooks/useEventSettings";

interface Speaker {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  company_logo_url: string | null;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  seminar_title?: string | null;
  seminar_description?: string | null;
  is_active?: boolean | null;
}

interface SpeakerDetailDialogProps {
  speaker: Speaker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SpeakerDetailDialog = ({ speaker, open, onOpenChange }: SpeakerDetailDialogProps) => {
  const navigate = useNavigate();
  const { eventName, eventDate } = useEventSettingsContext();
  const { data: eventSettings } = useEventSettings();
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (!speaker) return;
    const domain = eventSettings?.event_domain 
      ? `https://${(eventSettings.event_domain as string).replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : window.location.origin;
    const slug = speaker.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const url = `${domain}/speakers/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Extract year from event date - try parsing or extract from string
  const eventYear = (() => {
    if (!eventDate) return new Date().getFullYear();
    // First try parsing as a date
    const parsed = new Date(eventDate);
    if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    // Otherwise try to extract a 4-digit year from the string
    const yearMatch = eventDate.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  })();

  // Lock body scroll and prevent navbar transform when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [open]);

  // Fetch sessions for this speaker
  const { data: speakerSessions } = useQuery({
    queryKey: ["speaker-sessions", speaker?.id],
    queryFn: async () => {
      if (!speaker?.id) return [];
      
      // Get session IDs for this speaker
      const { data: sessionSpeakers, error: ssError } = await supabase
        .from("session_speakers")
        .select("session_id")
        .eq("speaker_id", speaker.id);

      if (ssError) throw ssError;
      if (!sessionSpeakers || sessionSpeakers.length === 0) return [];

      const sessionIds = sessionSpeakers.map(ss => ss.session_id);

      // Get published sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("agenda_sessions")
        .select("*")
        .in("id", sessionIds)
        .eq("status", "published")
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (sessionsError) throw sessionsError;
      return sessions || [];
    },
    enabled: !!speaker?.id && open,
  });

  if (!speaker) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0 gap-0 bg-card max-md:max-w-[95vw] max-md:max-h-[90vh]">
        {/* Inner scrollable wrapper */}
        <div className="h-full overflow-y-auto rounded-lg">
          {/* Hero Section - Photo and Name */}
          <div className="relative py-12 px-6 bg-muted/20">
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="flex flex-row gap-6 items-start">
              {/* Speaker Photo */}
              <div className="flex-shrink-0">
                {speaker.photo_url ? (
                  <div className="relative w-40">
                    <div className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-border">
                      <img
                        src={speaker.photo_url}
                        alt={speaker.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-40 aspect-[3/4] rounded-lg bg-muted flex items-center justify-center border-2 border-border">
                    <span className="text-5xl font-bold text-muted-foreground/30">
                      {speaker.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Speaker Info */}
              <div className="flex-1 text-left">
                <h2 className="text-3xl font-bold mb-4 text-foreground">
                  {speaker.name}
                </h2>
                
                {speaker.title && (
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base text-muted-foreground">{speaker.title}</p>
                  </div>
                )}
                
                {speaker.company && (
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <p className="text-base text-muted-foreground">{speaker.company}</p>
                  </div>
                )}

                {/* Company Logo */}
                {speaker.company_logo_url && (
                  <div className="mb-4">
                    <div className="w-20 h-20 rounded-full border-2 border-border/60 flex items-center justify-center p-3 bg-background shadow-md overflow-hidden">
                      <img
                        src={speaker.company_logo_url}
                        alt={`${speaker.company} logo`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {speaker.linkedin_url && (
                  <div className="flex gap-2 mt-6">
                    <a
                      href={speaker.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-all duration-300 text-sm"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span className="font-medium">LinkedIn</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="p-6 md:px-8 pb-8 pt-3">
          <div className="max-w-xl mx-auto space-y-6">
            <div className="border border-border rounded-lg p-6 md:p-8">
              <h3 className="text-xl font-bold mb-4 text-foreground">
                About {speaker.name.split(' ')[0]}
              </h3>
              {speaker.bio ? (
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {speaker.bio}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground italic">
                    Biography coming soon. Check back later for more information about {speaker.name}.
                  </p>
                </div>
              )}
            </div>

            {/* Sessions Section */}
            {speakerSessions && speakerSessions.length > 0 && (
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">Speaking Sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {speakerSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <h5 className="font-semibold text-base mb-2 text-foreground">
                        {session.title}
                      </h5>
                      {session.session_type && (
                        <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full mb-2">
                          {session.session_type}
                        </span>
                      )}
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(session.session_date), "EEEE, MMM dd, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {session.venue}
                            {session.room && ` - ${session.room}`}
                          </span>
                        </div>
                      </div>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {session.description}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/agenda#${session.id}`);
                        }}
                      >
                        View on Agenda
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Share button */}
            <div className="pt-2">
              <Button onClick={handleShare} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? "Link copied!" : "Share speaker profile"}
              </Button>
            </div>

            {/* Call to Action */}
            <div className="border border-border rounded-lg p-6 text-center">
              <h4 className="text-lg font-bold mb-2 text-foreground">Want to learn from {speaker.name.split(' ')[0]}?</h4>
              <p className="text-muted-foreground mb-4 text-sm">Register now for {eventName} {eventYear}</p>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  navigate("/registration");
                }}
              >
                Register Now
              </Button>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpeakerDetailDialog;
