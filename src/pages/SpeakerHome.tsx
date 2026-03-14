import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { calculateSpeakerCompletion } from "@/lib/exhibitorCompletionUtils";
import { useEventSettings } from "@/hooks/useEventSettings";
import { format } from "date-fns";

interface Speaker {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  title: string | null;
  company: string | null;
  company_logo_url: string | null;
  linkedin_url: string | null;
  seminar_title: string | null;
  seminar_description: string | null;
  speaker_submissions?: Array<{ approval_status: string }>;
}

export default function SpeakerHome() {
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [supabaseClient, setSupabaseClient] = useState(supabase);
  const [projectManagers, setProjectManagers] = useState<Array<{
    name: string;
    email: string;
    meetingUrl: string;
  }>>([]);
  const [clientRelationsManagers, setClientRelationsManagers] = useState<Array<{
    name: string;
    email: string;
    meetingUrl: string;
  }>>([]);
  const { data: eventSettings } = useEventSettings();

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
          .select("*, speaker_submissions(*)")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching speaker data:", error);
          return;
        }
        
        if (data) {
          setSpeaker(data);
        }
      }
    };

    initClient();
    loadProjectManagers();
    loadClientRelationsManagers();
  }, []);

  const loadProjectManagers = async () => {
    try {
      // First get users with project_manager role
      const { data: pmUsers, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "project_manager");

      if (rolesError || !pmUsers || pmUsers.length === 0) {
        return;
      }

      // Then get their profiles
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("display_name, meeting_url, email")
        .in("user_id", pmUsers.map(u => u.user_id));

      if (profileError) {
        console.error("Error loading project manager profiles:", profileError);
        return;
      }

      if (profiles && profiles.length > 0) {
        setProjectManagers(
          profiles.map((profile) => ({
            name: profile.display_name || "Project Manager",
            email: profile.email || "",
            meetingUrl: profile.meeting_url || "",
          }))
        );
      }
    } catch (error) {
      console.error("Unexpected error loading project managers:", error);
    }
  };

  const loadClientRelationsManagers = async () => {
    try {
      // First get users with customer_service role
      const { data: csUsers, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer_service");

      if (rolesError || !csUsers || csUsers.length === 0) {
        return;
      }

      // Then get their profiles
      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("display_name, meeting_url, email")
        .in("user_id", csUsers.map(u => u.user_id));

      if (profileError) {
        console.error("Error loading client relations manager profiles:", profileError);
        return;
      }

      if (profiles && profiles.length > 0) {
        setClientRelationsManagers(
          profiles.map((profile) => ({
            name: profile.display_name || "Client Relations Manager",
            email: profile.email || "",
            meetingUrl: profile.meeting_url || "",
          }))
        );
      }
    } catch (error) {
      console.error("Unexpected error loading client relations managers:", error);
    }
  };

  // Use the same completion calculation as Admin for consistency
  const profileCompletion = [
    { label: "Photo", completed: !!speaker?.photo_url },
    { label: "Bio (>50 chars)", completed: !!(speaker?.bio && speaker.bio.length > 50) },
    { label: "Title", completed: !!speaker?.title },
    { label: "Company", completed: !!speaker?.company },
    { label: "Company Logo", completed: !!speaker?.company_logo_url },
    { label: "LinkedIn", completed: !!speaker?.linkedin_url },
    { label: "Seminar Title", completed: !!speaker?.seminar_title },
    { label: "Seminar Description", completed: !!speaker?.seminar_description },
    { 
      label: "Speaker Form Uploaded & Approved", 
      completed: !!(
        (speaker?.speaker_submissions && speaker.speaker_submissions.some((sub) => sub.approval_status === 'approved')) ||
        // Consider form complete if speaker has both bio and seminar_title (bulk upload indicator)
        (speaker?.bio && speaker?.seminar_title)
      )
    },
  ];

  const { percentage: completionPercentage, completedCount, totalCount } = calculateSpeakerCompletion(speaker as unknown as Record<string, unknown>);

  return (
    <>
      <Helmet>
        <title>Speaker Portal - Home</title>
        <meta name="description" content="Welcome to your speaker portal" />
      </Helmet>

      <section className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mt-5 mb-2">
          Welcome, {speaker?.name || "Speaker"}
        </h1>
        <p className="text-muted-foreground">
          Manage your speaker profile and session information
        </p>
      </section>

      {/* Headshot Warning */}
      {!speaker?.photo_url && (
        <Card className="mb-8 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">Headshot Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Only profiles with a headshot are displayed on the website. Upload your headshot now to be featured on the speakers page.
            </p>
            <Button asChild>
              <a href="/speaker-portal/profile">Upload Headshot</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <section className="flex gap-4 mb-8 flex-col xl:flex-row">
        <Card className="flex-[0.7]">
          <CardHeader>
            <CardTitle>Manage Your Speaker Account</CardTitle>
            <CardDescription>
              This platform has been designed to help you manage your speaking session and profile information. Keep your profile up to date and submit your speaker form when ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectManagers && projectManagers.length > 0 && (
              <>
                <h3 className="font-semibold mb-3">
                  Your Project Manager{projectManagers.length > 1 ? 's' : ''} {projectManagers.length === 1 ? `is ${projectManagers[0].name}` : 'are:'}
                </h3>
                {projectManagers.length === 1 ? (
                  <div className="flex gap-2">
                    {projectManagers[0].meetingUrl && (
                      <Button asChild>
                        <a href={projectManagers[0].meetingUrl} target="_blank" rel="noopener noreferrer">
                          Book a Meeting
                        </a>
                      </Button>
                    )}
                    {projectManagers[0].email && (
                      <Button variant="outline" asChild>
                        <a href={`mailto:${projectManagers[0].email}`}>
                          Contact
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projectManagers.map((mgr, index) => (
                      <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{mgr.name}</p>
                          <p className="text-sm text-muted-foreground">{mgr.email}</p>
                        </div>
                        <div className="flex gap-2">
                          {mgr.meetingUrl && (
                            <Button size="sm" asChild>
                              <a href={mgr.meetingUrl} target="_blank" rel="noopener noreferrer">
                                Book Meeting
                              </a>
                            </Button>
                          )}
                          {mgr.email && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`mailto:${mgr.email}`}>
                                Contact
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {clientRelationsManagers && clientRelationsManagers.length > 0 && (
              <div className={projectManagers && projectManagers.length > 0 ? "mt-6 pt-6 border-t" : ""}>
                <h3 className="font-semibold mb-3">
                  Your Client Relations Manager{clientRelationsManagers.length > 1 ? 's' : ''} {clientRelationsManagers.length === 1 ? `is ${clientRelationsManagers[0].name}` : 'are:'}
                </h3>
                {clientRelationsManagers.length === 1 ? (
                  <div className="flex gap-2">
                    {clientRelationsManagers[0].meetingUrl && (
                      <Button asChild>
                        <a href={clientRelationsManagers[0].meetingUrl} target="_blank" rel="noopener noreferrer">
                          Book a Meeting
                        </a>
                      </Button>
                    )}
                    {clientRelationsManagers[0].email && (
                      <Button variant="outline" asChild>
                        <a href={`mailto:${clientRelationsManagers[0].email}`}>
                          Contact
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {clientRelationsManagers.map((mgr, index) => (
                      <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{mgr.name}</p>
                          <p className="text-sm text-muted-foreground">{mgr.email}</p>
                        </div>
                        <div className="flex gap-2">
                          {mgr.meetingUrl && (
                            <Button size="sm" asChild>
                              <a href={mgr.meetingUrl} target="_blank" rel="noopener noreferrer">
                                Book Meeting
                              </a>
                            </Button>
                          )}
                          {mgr.email && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`mailto:${mgr.email}`}>
                                Contact
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex-[0.3]" variant="black">
          <CardHeader>
            <CardTitle variant="black">Important Notice</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>Please keep your profile information up to date.</p>
            <p>Submit your speaker form as soon as possible to ensure your session can be scheduled.</p>
            <p>If you have any questions, please contact your project manager or client relations manager.</p>
          </CardContent>
        </Card>
      </section>

      {/* Upload Form Card */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upload Your Speaker Form</CardTitle>
              {speaker?.speaker_submissions && speaker.speaker_submissions.length > 0 && (
                <Badge variant="secondary">Pending</Badge>
              )}
            </div>
            <CardDescription>
              Submit your completed speaker form to finalize your session details
            </CardDescription>
            {eventSettings?.speaker_form_deadline && (
              <p className="text-red-600 font-semibold mt-2">
                Speaker Form + Headshot Submission Deadline: {format(new Date(eventSettings.speaker_form_deadline), "d MMMM yyyy")}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/speaker-portal/upload">Upload Form</a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Profile Completion */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profile Completion</CardTitle>
              <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
                {completionPercentage}%
              </Badge>
            </div>
            <CardDescription>
              Complete your profile to appear on the website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileCompletion.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className={item.completed ? "text-foreground" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            {completionPercentage < 100 && (
              <Button className="mt-6 w-full" asChild>
                <a href="/speaker-portal/profile">Complete Profile</a>
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}