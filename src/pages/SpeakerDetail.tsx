import { DynamicHelmet } from "@/components/DynamicHelmet";
import { JsonLdSchema } from "@/components/JsonLdSchema";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Linkedin, Building2, Briefcase, Share2, Check, Calendar, Clock, MapPin } from "lucide-react";
import { useEventSettings } from "@/hooks/useEventSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useState } from "react";
import { useEventSettingsContext } from "@/contexts/EventSettingsContext";
import { generateSlug } from "./ExhibitorDetail";

const SpeakerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: eventSettings } = useEventSettings();
  const { eventName, eventDate } = useEventSettingsContext();
  const [copied, setCopied] = useState(false);

  const eventYear = (() => {
    if (!eventDate) return new Date().getFullYear();
    const parsed = new Date(eventDate);
    if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    const yearMatch = eventDate.match(/\b(20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
  })();

  const { data: speaker, isLoading } = useQuery({
    queryKey: ["speaker-detail", id],
    queryFn: async () => {
      // Try by ID first
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || '');
      
      if (isUuid) {
        const { data, error } = await supabase
          .from("speakers_public")
          .select("*")
          .eq("id", id)
          .eq("is_active", true)
          .maybeSingle();
        if (error) throw error;
        if (data) return data;
      }

      // Fallback: match by name slug
      const { data: allSpeakers, error: allError } = await supabase
        .from("speakers_public")
        .select("*")
        .eq("is_active", true);
      if (allError) throw allError;

      const match = allSpeakers?.find(s => generateSlug(s.name) === id);
      return match || null;
    },
  });

  // Fetch sessions
  const { data: speakerSessions } = useQuery({
    queryKey: ["speaker-sessions-detail", speaker?.id],
    queryFn: async () => {
      if (!speaker?.id) return [];
      const { data: sessionSpeakers } = await supabase
        .from("session_speakers")
        .select("session_id")
        .eq("speaker_id", speaker.id);
      if (!sessionSpeakers?.length) return [];
      
      const { data: sessions } = await supabase
        .from("agenda_sessions")
        .select("*")
        .in("id", sessionSpeakers.map(ss => ss.session_id))
        .eq("status", "published")
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });
      return sessions || [];
    },
    enabled: !!speaker?.id,
  });

  const handleShare = () => {
    const domain = eventSettings?.event_domain 
      ? `https://${(eventSettings.event_domain as string).replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : window.location.origin;
    const slug = speaker?.name ? generateSlug(speaker.name) : speaker?.id || '';
    const url = `${domain}/speakers/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="container mx-auto px-4 py-20 text-center">
            <h1 className="text-4xl font-bold mb-4">Speaker Not Found</h1>
            <p className="text-muted-foreground mb-8">The speaker you're looking for doesn't exist or has been removed.</p>
            <Button variant="outline" onClick={() => navigate("/speakers")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Speakers
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <DynamicHelmet
        customTitle={`${speaker.name} - Speaker | {eventName}`}
        description={`Learn more about ${speaker.name}, ${speaker.title || 'speaker'} at {eventName}. {eventDate} at {eventLocation}.`}
        keywords={`${speaker.name}, {eventName}, speaker, {eventLocation}`}
        ogImage={speaker.photo_url || undefined}
        ogType="profile"
      />
      <JsonLdSchema 
        type={["Person", "BreadcrumbList"]} 
        personData={{
          name: speaker.name,
          jobTitle: speaker.title || undefined,
          image: speaker.photo_url || undefined,
          description: speaker.bio || undefined,
          worksFor: speaker.company || undefined,
        }}
        breadcrumbs={[{ name: "Speakers", url: "/speakers" }, { name: speaker.name }]}
      />

      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="relative py-16 overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
              <Button 
                variant="outline" 
                onClick={() => navigate("/speakers")}
                className="mb-8"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Speakers
              </Button>

              <div className="max-w-[700px] mx-auto">
                {/* Hero card */}
                <div className="bg-muted/20 rounded-t-lg border border-border border-b-0 p-8">
                  <div className="flex flex-row gap-6 items-start">
                    {/* Speaker Photo */}
                    <div className="flex-shrink-0">
                      {speaker.photo_url ? (
                        <div className="w-40 aspect-[3/4] rounded-lg overflow-hidden border-2 border-border">
                          <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-40 aspect-[3/4] rounded-lg bg-muted flex items-center justify-center border-2 border-border">
                          <span className="text-5xl font-bold text-muted-foreground/30">{speaker.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Speaker Info */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-4">{speaker.name}</h1>
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
                      {speaker.company_logo_url && (
                        <div className="mb-4">
                          <div className="w-20 h-20 rounded-full border-2 border-border/60 flex items-center justify-center p-3 bg-background shadow-md overflow-hidden">
                            <img src={speaker.company_logo_url} alt={`${speaker.company} logo`} className="w-full h-full object-contain" />
                          </div>
                        </div>
                      )}
                      {speaker.linkedin_url && (
                        <div className="flex gap-2 mt-4">
                          <a href={speaker.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted transition-all text-sm">
                            <Linkedin className="h-4 w-4" />
                            <span className="font-medium">LinkedIn</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content card */}
                <div className="border border-border rounded-b-lg p-6 md:p-8 space-y-6">
                  {/* Bio */}
                  <div className="border border-border rounded-lg p-6">
                    <h3 className="text-xl font-bold mb-4">About {speaker.name.split(' ')[0]}</h3>
                    {speaker.bio ? (
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{speaker.bio}</p>
                    ) : (
                      <p className="text-muted-foreground italic text-center py-8">Biography coming soon.</p>
                    )}
                  </div>

                  {/* Sessions */}
                  {speakerSessions && speakerSessions.length > 0 && (
                    <Card className="border border-border">
                      <CardHeader>
                        <CardTitle className="text-xl">Speaking Sessions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {speakerSessions.map((session) => (
                          <div key={session.id} className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                            <h5 className="font-semibold text-base mb-2">{session.title}</h5>
                            {session.session_type && (
                              <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full mb-2">{session.session_type}</span>
                            )}
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(session.session_date), "EEEE, MMM dd, yyyy")}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{session.venue}{session.room && ` - ${session.room}`}</span>
                              </div>
                            </div>
                            {session.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{session.description}</p>
                            )}
                            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate(`/agenda#${session.id}`)}>
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

                  {/* CTA */}
                  <div className="border border-border rounded-lg p-6 text-center bg-card">
                    <h4 className="text-lg font-bold mb-2">Want to learn from {speaker.name.split(' ')[0]}?</h4>
                    <p className="text-muted-foreground mb-4 text-sm">Register now for {eventName} {eventYear}</p>
                    <Button onClick={() => navigate("/registration")}>
                      Register Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SpeakerDetail;
