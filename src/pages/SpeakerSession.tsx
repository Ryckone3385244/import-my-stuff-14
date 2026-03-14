import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, Clock, MapPin, FileText } from "lucide-react";

export default function SpeakerSession() {
  const [speaker, setSpeaker] = useState<{ id: string; seminar_title?: string | null; seminar_description?: string | null } | null>(null);
  const [supabaseClient, setSupabaseClient] = useState(supabase);

  useEffect(() => {
    const initClient = async () => {
      const impToken = sessionStorage.getItem('impersonation_token');
      const impRefresh = sessionStorage.getItem('impersonation_refresh');
      
      let client = supabase;
      
      if (impToken && impRefresh) {
        client = createClient(
          import.meta.env.VITE_SUPABASE_URL!,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              storage: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
              },
              persistSession: false,
              autoRefreshToken: true,
            },
          }
        );
        
        await client.auth.setSession({
          access_token: impToken,
          refresh_token: impRefresh,
        });
        
        setSupabaseClient(client);
      }

      const { data: { session } } = await client.auth.getSession();
      if (session) {
        const { data, error } = await client
          .from("speakers")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching speaker:", error);
        } else if (data) {
          setSpeaker(data);
        }
      }
    };

    initClient();
  }, []);

  const { data: draftSession, isLoading } = useQuery({
    queryKey: ["draft-session", speaker?.id],
    queryFn: async () => {
      if (!speaker?.id) return null;
      
      const { data, error } = await supabaseClient
        .from("draft_sessions")
        .select("*")
        .eq("speaker_id", speaker.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!speaker?.id,
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "To be confirmed";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "To be confirmed";
    return timeString.slice(0, 5); // HH:MM format
  };

  return (
    <>
      <Helmet>
        <title>Your Session - Speaker Portal</title>
        <meta name="description" content="View your session details" />
      </Helmet>

      <section className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mt-5 mb-2">
          Your Session
        </h1>
        <p className="text-muted-foreground">
          View your session details and schedule information
        </p>
      </section>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading session details...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Session Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Session Details</CardTitle>
                  {draftSession?.status && (
                    <Badge variant={draftSession.status === "approved" ? "default" : "secondary"} className="mt-2">
                      {draftSession.status.replace("_", " ")}
                    </Badge>
                  )}
                </div>
                <Button asChild variant="outline">
                  <a href="/speaker-portal/profile">Edit</a>
                </Button>
              </div>
              <CardDescription>
                Your seminar information and proposed content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Seminar Title</h3>
                    <p className="text-foreground">
                      {draftSession?.seminar_title || speaker?.seminar_title || "Not yet provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-start gap-2 mb-2">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Seminar Description</h3>
                    <p className="text-foreground whitespace-pre-wrap">
                      {draftSession?.seminar_description || speaker?.seminar_description || "Not yet provided"}
                    </p>
                  </div>
                </div>
              </div>

              {draftSession?.admin_notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Organizer Notes</h3>
                  <p className="text-sm text-muted-foreground">{draftSession.admin_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Location</CardTitle>
              <CardDescription>
                Session timing and venue details (set by organizers)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Date</h3>
                    <p className="text-foreground">{formatDate(draftSession?.session_date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Time</h3>
                    <p className="text-foreground">
                      {formatTime(draftSession?.start_time)} - {formatTime(draftSession?.end_time)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Venue</h3>
                    <p className="text-foreground">{draftSession?.venue || "To be confirmed"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm mb-1">Room</h3>
                    <p className="text-foreground">{draftSession?.room || "To be confirmed"}</p>
                  </div>
                </div>
              </div>

              {draftSession?.session_type && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-1">Session Type</h3>
                  <Badge variant="outline">{draftSession.session_type}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {!draftSession && (
            <Card variant="black">
              <CardHeader>
                <CardTitle variant="black">Session Not Yet Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Your session details are being processed by our team. Once confirmed, you'll see the schedule and venue information here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
