import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";

import { PageWithDraggableSections, EditableText } from "@/components/editable";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SupportTicketForm } from "@/components/SupportTicketForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const ExhibitorContact = () => {
  const navigate = useNavigate();
  const [exhibitorData, setExhibitorData] = useState<{ id?: string; name?: string; booth_number?: string; logo_url?: string }>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [exhibitors, setExhibitors] = useState<Array<{ id: string; name: string; booth_number: string | null }>>([]);
  const [selectedExhibitorId, setSelectedExhibitorId] = useState<string>("");
  const [clientRelationsManagers, setClientRelationsManagers] = useState<Array<{
    name: string;
    email: string;
    meetingUrl: string;
  }>>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const impersonationToken = sessionStorage.getItem("impersonation_token");
      const impersonationRefresh = sessionStorage.getItem("impersonation_refresh");

      let supabaseClient = supabase;

      // If we are impersonating an exhibitor from the admin area, use the
      // impersonation tokens to create a dedicated client for portal pages.
      if (impersonationToken && impersonationRefresh) {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: {
            storage: {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        await supabaseClient.auth.setSession({
          access_token: impersonationToken,
          refresh_token: impersonationRefresh,
        });
      }

      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session) {
        navigate("/exhibitor-portal/login");
        return;
      }

      // Only treat as admin when not in impersonation mode
      if (!impersonationToken || !impersonationRefresh) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .in("role", ["admin", "customer_service", "project_manager"]);

        const userIsAdmin = !!(roleData && roleData.length > 0);
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          // Fetch all exhibitors for admin
          const { data: allExhibitors, error: exhibitorsError } = await supabase
            .from("exhibitors")
            .select("id, name, booth_number")
            .eq("is_active", true)
            .order("name");

          if (!exhibitorsError && allExhibitors) {
            setExhibitors(allExhibitors);
            if (allExhibitors.length > 0) {
              setSelectedExhibitorId(allExhibitors[0].id);
            }
          }

          // Admins don't need exhibitor-specific data here
          return;
        }
      } else {
        // In impersonation mode we always behave like an exhibitor
        setIsAdmin(false);
      }

      // Fetch exhibitor data for a real or impersonated exhibitor
      const { data: exhibitor, error } = await supabaseClient
        .from("exhibitors")
        .select("id, name, booth_number, logo_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching exhibitor:", error);
      }

        if (exhibitor) {
          setExhibitorData(exhibitor);
        } else {
          setExhibitorData({ id: undefined, name: undefined, booth_number: undefined, logo_url: undefined });
        }
    };

    checkAuth();
    loadClientRelationsManagers();
  }, [navigate]);

  const loadClientRelationsManagers = async () => {
    try {
      const { data: csUsers, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer_service");

      if (rolesError || !csUsers || csUsers.length === 0) {
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from("user_profiles")
        .select("display_name, meeting_url, email")
        .in("user_id", csUsers.map(u => u.user_id));

      if (profileError) {
        return;
      }

      if (profiles && profiles.length > 0) {
        setClientRelationsManagers(profiles.map(profile => ({
          name: profile.display_name || "Client Relations Manager",
          email: profile.email || "",
          meetingUrl: profile.meeting_url || "",
        })));
      }
    } catch (error) {
      console.error("Exception in loadClientRelationsManagers:", error);
    }
  };

  const sections = [
    {
      id: "contact-title",
      component: (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <EditableText 
              pageName="exhibitor-contact" 
              sectionName="title" 
              contentKey="heading" 
              defaultValue="Contact Client Relations" 
              className="text-4xl font-bold mb-4 text-foreground" 
              as="h1" 
            />
            <EditableText 
              pageName="exhibitor-contact" 
              sectionName="title" 
              contentKey="description" 
              defaultValue="Submit a support ticket and our client relations team will get back to you as soon as possible." 
              className="text-lg text-muted-foreground max-w-3xl" 
              as="p" 
            />
          </div>
        </section>
      ),
    },
    {
      id: "contact-form",
      component: (
        <section className="pb-12">
          <div className="container mx-auto px-4">
            <Card className="max-w-3xl">
              <CardHeader>
                <CardTitle>Submit a Support Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                {isAdmin ? (
                  <>
                    {exhibitors.length > 0 ? (
                      <>
                        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-3">
                            <strong>Admin Mode:</strong> Select an exhibitor to submit a ticket on their behalf
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="exhibitor-select">Select Exhibitor</Label>
                            <Select value={selectedExhibitorId} onValueChange={setSelectedExhibitorId}>
                              <SelectTrigger id="exhibitor-select" className="bg-background">
                                <SelectValue placeholder="Choose an exhibitor" />
                              </SelectTrigger>
                              <SelectContent>
                                {exhibitors.map((exhibitor) => (
                                  <SelectItem key={exhibitor.id} value={exhibitor.id}>
                                    {exhibitor.name} {exhibitor.booth_number ? `(Stand #${exhibitor.booth_number})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {selectedExhibitorId && (
                          <SupportTicketForm exhibitorId={selectedExhibitorId} />
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground">No active exhibitors found</p>
                    )}
                  </>
                ) : exhibitorData.id ? (
                  <SupportTicketForm exhibitorId={exhibitorData.id} />
                ) : (
                  <p className="text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Contact the Team | Exhibitor Portal</title>
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-1 pt-page pb-12">
          <div className="container mx-auto px-6">
            <div className="flex gap-8 mt-[60px]">
              {/* Always-visible Sidebar */}
              <aside className="w-64 flex-shrink-0 sticky top-24 h-fit hidden lg:block">
                <ExhibitorSidebar 
                  exhibitorName={exhibitorData?.name}
                  standNumber={exhibitorData?.booth_number}
                  logoUrl={exhibitorData?.logo_url}
                  renderTrigger={false}
                  alwaysVisible={true}
                />
              </aside>

              {/* Mobile menu trigger */}
              <div className="lg:hidden fixed top-20 left-4 z-50">
                <ExhibitorSidebar 
                  exhibitorName={exhibitorData?.name}
                  standNumber={exhibitorData?.booth_number}
                  logoUrl={exhibitorData?.logo_url}
                  renderTrigger={true}
                />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <PageWithDraggableSections
                  pageName="exhibitor-contact"
                  sections={sections}
                />
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default ExhibitorContact;