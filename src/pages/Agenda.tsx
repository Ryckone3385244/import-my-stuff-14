import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { Clock, MapPin, User, Calendar, Theater, CalendarPlus, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SpeakerDetailDialog from "@/components/SpeakerDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";

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
  capacity: number | null;
  status: string;
}

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

interface SessionSpeaker {
  session_id: string;
  speaker_id: string;
  speaker_order: number;
}

const Agenda = () => {
  const { toast } = useToast();
  const { data: eventSettings } = useEventSettings();
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"date" | "theater">("date");
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [interestFormData, setInterestFormData] = useState({
    name: "",
    email: "",
    company: "",
  });

  // Fetch sessions (only published)
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["agenda-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_sessions")
        .select("*")
        .eq("status", "published")
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;
      return data as Session[];
    },
  });

  // Fetch speakers (only active ones) - using public view to exclude sensitive data
  const { data: speakers } = useQuery({
    queryKey: ["speakers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speakers_public")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Speaker[];
    },
  });

  // Fetch session speakers
  const { data: sessionSpeakers } = useQuery({
    queryKey: ["session-speakers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_speakers")
        .select("*");

      if (error) throw error;
      return data as SessionSpeaker[];
    },
  });

  const getSpeakersForSession = (sessionId: string) => {
    const speakerIds = sessionSpeakers
      ?.filter((ss) => ss.session_id === sessionId)
      .sort((a, b) => a.speaker_order - b.speaker_order)
      .map((ss) => ss.speaker_id) || [];

    return speakers?.filter((s) => speakerIds.includes(s.id)) || [];
  };

  // Calendar functions
  const generateICS = (session: Session) => {
    const startDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const endDateTime = new Date(`${session.session_date}T${session.end_time}`);
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Grab & Go Expo//Conference Agenda//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(startDateTime)}`,
      `DTEND:${formatICSDate(endDateTime)}`,
      `SUMMARY:${session.title}`,
      `DESCRIPTION:${session.description || ''}`,
      `LOCATION:${session.venue}${session.room ? ' - ' + session.room : ''}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    return icsContent;
  };

  const downloadICS = (session: Session) => {
    const icsContent = generateICS(session);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addToGoogleCalendar = (session: Session) => {
    const startDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const endDateTime = new Date(`${session.session_date}T${session.end_time}`);
    
    const formatGoogleDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: session.title,
      details: session.description || '',
      location: `${session.venue}${session.room ? ' - ' + session.room : ''}`,
      dates: `${formatGoogleDate(startDateTime)}/${formatGoogleDate(endDateTime)}`
    });

    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const addToOutlook = (session: Session) => {
    const startDateTime = new Date(`${session.session_date}T${session.start_time}`);
    const endDateTime = new Date(`${session.session_date}T${session.end_time}`);
    
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: session.title,
      body: session.description || '',
      location: `${session.venue}${session.room ? ' - ' + session.room : ''}`,
      startdt: startDateTime.toISOString(),
      enddt: endDateTime.toISOString()
    });

    window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank');
  };

  // Register interest mutation
  const registerInterestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("registrations")
        .insert({
          name: interestFormData.name,
          email: interestFormData.email,
          company: interestFormData.company,
          role: "Interested - Agenda",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Thank you for registering your interest. We'll notify you when the agenda is available.",
      });
      setInterestFormData({ name: "", email: "", company: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    return sessions?.reduce((acc, session) => {
      const date = session.session_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(session);
      return acc;
    }, {} as Record<string, Session[]>);
  }, [sessions]);

  // Group sessions by theater/venue
  const sessionsByTheater = useMemo(() => {
    return sessions?.reduce((acc, session) => {
      const venue = session.venue;
      if (!acc[venue]) {
        acc[venue] = [];
      }
      acc[venue].push(session);
      return acc;
    }, {} as Record<string, Session[]>);
  }, [sessions]);

  const dates = useMemo(() => Object.keys(sessionsByDate || {}).sort(), [sessionsByDate]);
  const theaters = useMemo(() => Object.keys(sessionsByTheater || {}).sort(), [sessionsByTheater]);

  // Set initial tab when data loads or view mode changes
  React.useEffect(() => {
    if (viewMode === "date" && dates.length > 0 && !selectedTab) {
      setSelectedTab(dates[0]);
    } else if (viewMode === "theater" && theaters.length > 0 && !selectedTab) {
      setSelectedTab(theaters[0]);
    }
  }, [viewMode, dates, theaters, selectedTab]);

  // Reset tab when switching view modes
  React.useEffect(() => {
    if (viewMode === "date" && dates.length > 0) {
      setSelectedTab(dates[0]);
    } else if (viewMode === "theater" && theaters.length > 0) {
      setSelectedTab(theaters[0]);
    }
  }, [viewMode]);

  // Deep-link: scroll to session by URL hash (e.g. /agenda#session-id)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash || !sessions || sessions.length === 0) return;

    const targetSession = sessions.find(s => s.id === hash);
    if (!targetSession) return;

    // Switch to the correct tab so the session card is rendered
    if (viewMode === "date") {
      setSelectedTab(targetSession.session_date);
    } else {
      setSelectedTab(targetSession.venue);
    }

    // Wait for render, then scroll
    requestAnimationFrame(() => {
      setTimeout(() => {
        const el = document.getElementById(`session-${hash}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 3000);
        }
      }, 150);
    });
  }, [sessions, viewMode]);

  return (
    <>
      <Helmet>
        <title>Conference Agenda - {eventSettings?.event_name || DEFAULT_EVENT.NAME}</title>
        <meta
          name="description"
          content={`View the complete conference agenda for ${eventSettings?.event_name || DEFAULT_EVENT.NAME}. Explore sessions, workshops, and speaker presentations organized by date and venue.`}
        />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-1 pt-32">
          {/* Hero Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
                Conference Agenda
              </h1>
              <p className="text-xl text-muted-foreground text-center w-full mx-auto">
                Explore our comprehensive schedule of sessions, workshops, and presentations
              </p>
            </div>
          </section>

          {/* Agenda Content */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              {/* Filter Toggle - Stacked on mobile, inline on desktop */}
              <div className="flex flex-col sm:flex-row justify-center gap-2 mb-8">
                <Button
                  variant={viewMode === "date" ? "default" : "outline"}
                  onClick={() => setViewMode("date")}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Calendar className="h-4 w-4" />
                  By Date
                </Button>
                <Button
                  variant={viewMode === "theater" ? "default" : "outline"}
                  onClick={() => setViewMode("theater")}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Theater className="h-4 w-4" />
                  By Theater
                </Button>
              </div>

              {sessionsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading agenda...</p>
                </div>
              ) : dates.length === 0 ? (
                <div className="max-w-2xl mx-auto">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl text-center">Agenda Coming Soon</CardTitle>
                      <CardDescription className="text-center">
                        The conference agenda is being finalized. Register your interest and we'll notify you when it's available.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          registerInterestMutation.mutate();
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="interest-name">Name *</Label>
                          <Input
                            id="interest-name"
                            value={interestFormData.name}
                            onChange={(e) =>
                              setInterestFormData({ ...interestFormData, name: e.target.value })
                            }
                            placeholder="Your name"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="interest-email">Email *</Label>
                          <Input
                            id="interest-email"
                            type="email"
                            value={interestFormData.email}
                            onChange={(e) =>
                              setInterestFormData({ ...interestFormData, email: e.target.value })
                            }
                            placeholder="your.email@example.com"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="interest-company">Company *</Label>
                          <Input
                            id="interest-company"
                            value={interestFormData.company}
                            onChange={(e) =>
                              setInterestFormData({ ...interestFormData, company: e.target.value })
                            }
                            placeholder="Your company"
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={registerInterestMutation.isPending}
                        >
                          {registerInterestMutation.isPending ? "Submitting..." : "Register Interest"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              ) : viewMode === "date" ? (
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                  <TabsList className="flex flex-wrap justify-center mx-auto mb-8 h-auto w-auto">
                    {dates.map((date) => (
                      <TabsTrigger key={date} value={date} className="text-base px-6 py-3">
                        {format(new Date(date), "EEEE, MMM dd")}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {dates.map((date) => (
                    <TabsContent key={date} value={date} className="space-y-6">
                      {sessionsByDate[date]?.map((session) => {
                        const sessionSpeakersList = getSpeakersForSession(session.id);
                        
                        return (
                          <Card key={session.id} id={`session-${session.id}`} className="overflow-hidden hover:shadow-lg transition-shadow transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row gap-6">
                                {/* Main Content - Left Side */}
                                <div className="flex-1 flex flex-col">
                                  <div>
                                    <CardTitle className="text-2xl mb-3">
                                      {session.title}
                                    </CardTitle>
                                    {session.session_type && (
                                      <span className="inline-block px-3 py-1 text-sm bg-primary/10 text-primary rounded-full mb-4">
                                        {session.session_type}
                                      </span>
                                    )}
                                  
                                    <div className="flex flex-col gap-3 mb-4">
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-base font-bold">
                                          {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                                        </span>
                                      </div>
                      <div className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-base font-bold">
                                          {session.venue.trim()}
                                          {session.room && ` - ${session.room.trim()}`}
                                        </span>
                                      </div>
                                    </div>

                                    {session.description && (
                                      <CardDescription className="text-base mb-4">
                                        {session.description}
                                      </CardDescription>
                                    )}
                                  </div>

                                  <div className="mt-auto">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <CalendarPlus className="h-4 w-4 mr-2" />
                                          Add to Calendar
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => addToGoogleCalendar(session)}>
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Google Calendar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => addToOutlook(session)}>
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Outlook
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => downloadICS(session)}>
                                          <Download className="h-4 w-4 mr-2" />
                                          Download ICS
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* Speakers - Right Side Column */}
                                {sessionSpeakersList.length > 0 && (
                                  <div className={`flex-shrink-0 ${sessionSpeakersList.length === 1 ? 'lg:w-[40%]' : 'lg:w-[60%]'}`}>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Speaker{sessionSpeakersList.length > 1 ? "s" : ""}
                                    </h4>
                                    {sessionSpeakersList.length === 1 ? (
                                      /* Single speaker - bigger centered headshot */
                                      <div
                                        onClick={() => {
                                          setSelectedSpeaker(sessionSpeakersList[0]);
                                          setIsDialogOpen(true);
                                        }}
                                        className="flex flex-col items-center gap-3 p-4 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                                      >
                                        <div className="relative w-44 h-44 flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                                          {sessionSpeakersList[0].photo_url ? (
                                            <img
                                              src={sessionSpeakersList[0].photo_url}
                                              alt={sessionSpeakersList[0].name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                                              <span className="text-3xl font-bold text-muted-foreground/30">
                                                {sessionSpeakersList[0].name.charAt(0)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-center">
                                          <h5 className="font-medium text-base text-foreground">
                                            {sessionSpeakersList[0].name}
                                          </h5>
                                          {sessionSpeakersList[0].title && (
                                            <p className="text-sm text-muted-foreground">
                                              {sessionSpeakersList[0].title}
                                            </p>
                                          )}
                                          {sessionSpeakersList[0].company && (
                                            <p className="text-sm text-muted-foreground">
                                              {sessionSpeakersList[0].company}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      /* Multiple speakers - grid layout */
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {sessionSpeakersList.map((speaker) => (
                                          <div
                                            key={speaker.id}
                                            onClick={() => {
                                              setSelectedSpeaker(speaker);
                                              setIsDialogOpen(true);
                                            }}
                                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                                          >
                                            <div className="relative w-36 h-36 flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                                              {speaker.photo_url ? (
                                                <img
                                                  src={speaker.photo_url}
                                                  alt={speaker.name}
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                                                  <span className="text-2xl font-bold text-muted-foreground/30">
                                                    {speaker.name.charAt(0)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                              <h5 className="font-medium text-base text-foreground line-clamp-1">
                                                {speaker.name}
                                              </h5>
                                              {speaker.title && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                  {speaker.title}
                                                </p>
                                              )}
                                              {speaker.company && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                  {speaker.company}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                  <TabsList className="flex flex-wrap justify-center mx-auto mb-8 h-auto w-auto">
                    {theaters.map((theater) => (
                      <TabsTrigger key={theater} value={theater} className="text-base px-6 py-3">
                        {theater.trim()}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {theaters.map((theater) => (
                    <TabsContent key={theater} value={theater} className="space-y-6">
                      {sessionsByTheater[theater]?.sort((a, b) => {
                        const dateCompare = a.session_date.localeCompare(b.session_date);
                        if (dateCompare !== 0) return dateCompare;
                        return a.start_time.localeCompare(b.start_time);
                      }).map((session) => {
                        const sessionSpeakersList = getSpeakersForSession(session.id);
                        
                        return (
                          <Card key={session.id} id={`session-${session.id}`} className="overflow-hidden hover:shadow-lg transition-shadow transition-all duration-300">
                            <CardContent className="p-6">
                              <div className="flex flex-col lg:flex-row gap-6">
                                {/* Main Content - Left Side */}
                                <div className="flex-1 flex flex-col">
                                  <div>
                                    <CardTitle className="text-2xl mb-3">
                                      {session.title}
                                    </CardTitle>
                                    {session.session_type && (
                                      <span className="inline-block px-3 py-1 text-sm bg-primary/10 text-primary rounded-full mb-4">
                                        {session.session_type}
                                      </span>
                                    )}
                                  
                                    <div className="flex flex-col gap-3 mb-4">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-base font-bold">
                                          {format(new Date(session.session_date), "EEEE, MMM dd")}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-base font-bold">
                                          {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                                        </span>
                                      </div>
                                      {session.room && (
                                        <div className="flex items-center gap-2">
                                          <MapPin className="h-5 w-5 text-muted-foreground" />
                                          <span className="text-base font-bold">{session.room.trim()}</span>
                                        </div>
                                      )}
                                    </div>

                                    {session.description && (
                                      <CardDescription className="text-base mb-4">
                                        {session.description}
                                      </CardDescription>
                                    )}
                                  </div>

                                  <div className="mt-auto">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <CalendarPlus className="h-4 w-4 mr-2" />
                                          Add to Calendar
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        <DropdownMenuItem onClick={() => addToGoogleCalendar(session)}>
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Google Calendar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => addToOutlook(session)}>
                                          <Calendar className="h-4 w-4 mr-2" />
                                          Outlook
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => downloadICS(session)}>
                                          <Download className="h-4 w-4 mr-2" />
                                          Download ICS
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* Speakers - Right Side Column */}
                                {sessionSpeakersList.length > 0 && (
                                  <div className={`flex-shrink-0 ${sessionSpeakersList.length === 1 ? 'lg:w-[40%]' : 'lg:w-[60%]'}`}>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                                      <User className="h-4 w-4" />
                                      Speaker{sessionSpeakersList.length > 1 ? "s" : ""}
                                    </h4>
                                    {sessionSpeakersList.length === 1 ? (
                                      <div
                                        onClick={() => {
                                          setSelectedSpeaker(sessionSpeakersList[0]);
                                          setIsDialogOpen(true);
                                        }}
                                        className="flex flex-col items-center gap-3 p-4 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                                      >
                                        <div className="relative w-44 h-44 flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                                          {sessionSpeakersList[0].photo_url ? (
                                            <img
                                              src={sessionSpeakersList[0].photo_url}
                                              alt={sessionSpeakersList[0].name}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                                              <span className="text-3xl font-bold text-muted-foreground/30">
                                                {sessionSpeakersList[0].name.charAt(0)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-center">
                                          <h5 className="font-medium text-base text-foreground">
                                            {sessionSpeakersList[0].name}
                                          </h5>
                                          {sessionSpeakersList[0].title && (
                                            <p className="text-sm text-muted-foreground">
                                              {sessionSpeakersList[0].title}
                                            </p>
                                          )}
                                          {sessionSpeakersList[0].company && (
                                            <p className="text-sm text-muted-foreground">
                                              {sessionSpeakersList[0].company}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {sessionSpeakersList.map((speaker) => (
                                          <div
                                            key={speaker.id}
                                            onClick={() => {
                                              setSelectedSpeaker(speaker);
                                              setIsDialogOpen(true);
                                            }}
                                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                                          >
                                            <div className="relative w-36 h-36 flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                                              {speaker.photo_url ? (
                                                <img
                                                  src={speaker.photo_url}
                                                  alt={speaker.name}
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                                                  <span className="text-2xl font-bold text-muted-foreground/30">
                                                    {speaker.name.charAt(0)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0">
                                              <h5 className="font-medium text-base text-foreground line-clamp-1">
                                                {speaker.name}
                                              </h5>
                                              {speaker.title && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                  {speaker.title}
                                                </p>
                                              )}
                                              {speaker.company && (
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                  {speaker.company}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>
          </section>
        </main>

        <Footer />
      </div>

      <SpeakerDetailDialog
        speaker={selectedSpeaker}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
};

export default Agenda;
