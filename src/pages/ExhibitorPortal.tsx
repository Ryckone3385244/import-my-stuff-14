import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { downloadFile } from "@/lib/downloadUtils";
import { useQuery } from "@tanstack/react-query";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";
import { PageWithDraggableSections, EditableText } from "@/components/editable";
import { ExhibitorProgressTracker } from "@/components/ExhibitorProgressTracker";
import { ExhibitorLogoUpload } from "@/components/ExhibitorLogoUpload";
import { EventCountdown } from "@/components/EventCountdown";
import { format } from "date-fns";
import { useExhibitorSessionTimeout } from "@/hooks/useExhibitorSessionTimeout";
import { fetchExhibitorForUser, fetchAllExhibitorsForUser, setSelectedExhibitorId } from "@/lib/exhibitorSession";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

interface ExhibitorData {
  id: string;
  name: string;
  logo_url: string | null;
  booth_number: string | null;
  user_id: string | null;
}

const ExhibitorPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [exhibitorData, setExhibitorData] = useState<ExhibitorData | null>(null);
  const [allExhibitors, setAllExhibitors] = useState<ExhibitorData[]>([]);
  const [showExhibitorSelector, setShowExhibitorSelector] = useState(false);
  
  // Enable session timeout tracking
  useExhibitorSessionTimeout();
  const [clientRelationsManagers, setClientRelationsManagers] = useState<Array<{
    name: string;
    email: string;
    meetingUrl: string;
    showEmail: boolean;
    showCalendly: boolean;
  }>>([]);
  const [impersonationClient, setImpersonationClient] = useState<SupabaseClient<Database> | null>(null);

  // Fetch PDF guides for Quick Guide section
  const { data: pdfGuides } = useQuery({
    queryKey: ["marketing-tools-pdf"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_tools")
        .select("*")
        .eq("tool_type", "pdf")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for session transfer from admin modal FIRST
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const refresh = urlParams.get('refresh');
      
      if (token && refresh) {
        // Store impersonation tokens in sessionStorage for other portal pages
        sessionStorage.setItem('impersonation_token', decodeURIComponent(token));
        sessionStorage.setItem('impersonation_refresh', decodeURIComponent(refresh));
        // Clean up URL
        window.history.replaceState({}, '', '/exhibitor-portal');
      }
      
      // Now load data
      await loadExhibitorData();
      loadClientRelationsManager();
    };

    initializeAuth();
  }, []);

  const loadExhibitorData = async () => {
    // Check for impersonation tokens first
    const impToken = sessionStorage.getItem('impersonation_token');
    const impRefresh = sessionStorage.getItem('impersonation_refresh');
    
    if (impToken && impRefresh) {
      // Create impersonation client
      const client = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
      
      setImpersonationClient(client);
      await loadExhibitorDataWithClient(client);
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/exhibitor-portal/login");
      return;
    }

    try {
      // Check if user has multiple exhibitors
      const exhibitors = await fetchAllExhibitorsForUser(session.user.id);
      
      if (exhibitors.length === 0) {
        toast({
          title: "No Exhibitor Profile",
          description: "Your exhibitor profile has not been set up yet. Please contact the admin.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (exhibitors.length > 1) {
        setAllExhibitors(exhibitors as ExhibitorData[]);
        // Try to use stored selection
        const selected = await fetchExhibitorForUser(session.user.id);
        if (selected) {
          setExhibitorData(selected);
        } else {
          setShowExhibitorSelector(true);
        }
      } else {
        // Single exhibitor - use it directly
        const exhibitor = await fetchExhibitorForUser(session.user.id);
        setExhibitorData(exhibitor);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load exhibitor data",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const loadExhibitorDataWithClient = async (client: SupabaseClient<Database>) => {
    const { data: { session } } = await client.auth.getSession();
    
    if (!session) {
      toast({
        title: "Error",
        description: "No session available",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: exhibitor, error } = await client
      .from("exhibitors")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load exhibitor data",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!exhibitor) {
      toast({
        title: "No Exhibitor Profile",
        description: "Your exhibitor profile has not been set up yet. Please contact the admin.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setExhibitorData(exhibitor);
    setLoading(false);
  };


  const loadClientRelationsManager = async () => {
    try {
      // Use customer_managers table with is_active filter
      const { data: managers, error } = await supabase
        .from("customer_managers")
        .select("name, email, meeting_url, is_active, show_email, show_calendly")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error || !managers || managers.length === 0) {
        return;
      }

      setClientRelationsManagers(managers.map(mgr => ({
        name: mgr.name || "Client Relations Manager",
        email: mgr.email || "",
        meetingUrl: mgr.meeting_url || "",
        showEmail: mgr.show_email ?? true,
        showCalendly: mgr.show_calendly ?? true,
      })));
    } catch {
      // Silently handle error
    }
  };

  const handleSelectExhibitor = (exhibitor: ExhibitorData) => {
    setSelectedExhibitorId(exhibitor.id);
    setExhibitorData(exhibitor);
    setShowExhibitorSelector(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Multi-exhibitor selection screen
  if (showExhibitorSelector || (!exhibitorData && allExhibitors.length > 1)) {
    return (
      <>
        <DynamicHelmet 
          titlePrefix="Select Company - Exhibitor Portal" 
          description="Select which company to manage"
          noIndex
        />
        <Navbar />
        <main className="flex-1 pt-page pb-12">
          <div className="container mx-auto px-6 max-w-2xl mt-16">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Select Company</h1>
            <p className="text-muted-foreground mb-8">You have access to multiple exhibitor profiles. Select which one to manage.</p>
            <div className="space-y-4">
              {allExhibitors.map((ex) => (
                <Card
                  key={ex.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectExhibitor(ex)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    {ex.logo_url ? (
                      <img src={ex.logo_url} alt={ex.name} className="w-16 h-16 object-contain rounded" />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xl font-bold">
                        {ex.name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{ex.name}</p>
                      {ex.booth_number && (
                        <p className="text-sm text-muted-foreground">Stand: {ex.booth_number}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (exhibitorData && (!exhibitorData.logo_url || exhibitorData.logo_url.trim() === '')) {
    return (
      <>
        <DynamicHelmet 
          titlePrefix="Upload Logo - Exhibitor Portal" 
          description="Upload your company logo"
          noIndex
        />
        <Navbar />
        <ExhibitorLogoUpload 
          exhibitorId={exhibitorData.id}
          exhibitorName={exhibitorData.name}
          onUploadSuccess={loadExhibitorData}
        />
        <Footer />
      </>
    );
  }

  const sections = [
    {
      id: "welcome-section",
      component: (
        <section className="mb-8">
          <EditableText
            pageName="exhibitor-portal"
            sectionName="welcome"
            contentKey="title"
            defaultValue={`Welcome, ${exhibitorData?.name || "Exhibitor"}`}
            className="text-4xl font-bold text-foreground mt-5"
            as="h1"
          />
          <EditableText
            pageName="exhibitor-portal"
            sectionName="welcome"
            contentKey="subtitle"
            defaultValue="Your one-stop hub for managing your exhibition experience"
            className="text-lg text-muted-foreground mt-2"
            as="p"
          />
          <EventCountdown />
        </section>
      ),
    },
    {
      id: "progress-section",
      component: exhibitorData?.id ? (
        <section className="mb-8">
          <ExhibitorProgressTracker exhibitorId={exhibitorData.id} />
        </section>
      ) : null,
    },
    {
      id: "info-cards-section",
      component: (
        <section className="flex gap-4 mb-8 flex-col xl:flex-row">
          <Card className="flex-[0.7]">
            <CardHeader>
              <CardTitle>
                <EditableText
                  pageName="exhibitor-portal"
                  sectionName="info-card"
                  contentKey="title"
                  defaultValue="Manage your exhibitor account"
                  className="text-xl font-semibold"
                  as="span"
                />
              </CardTitle>
              <CardDescription>
                <EditableText
                  pageName="exhibitor-portal"
                  sectionName="info-card"
                  contentKey="description"
                  defaultValue="This platform has been designed to be a step-by-step guide to exhibiting, providing information on everything from show contractors and submission deadlines to marketing tools, FAQs and more! This portal will be your point of reference for anything exhibition-related."
                  className="text-sm text-muted-foreground"
                  as="p"
                />
                <br /><br />
                <EditableText
                  pageName="exhibitor-portal"
                  sectionName="info-card"
                  contentKey="description-2"
                  defaultValue="Now you have submitted your Company Logo, please have a read through the exhibitor manual. We strongly encourage prioritizing your company profile, as once this is completed, and all the necessities within are completed, you will be listed as an exhibitor on the website."
                  className="text-sm text-muted-foreground"
                  as="p"
                />
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientRelationsManagers && clientRelationsManagers.length > 0 && (
                <div className="space-y-3">
                  {clientRelationsManagers.map((mgr, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{mgr.name}</p>
                        {mgr.showEmail && mgr.email && (
                          <p className="text-sm text-muted-foreground">{mgr.email}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {mgr.showCalendly && mgr.meetingUrl && (
                          <Button size="sm" asChild>
                            <a href={mgr.meetingUrl} target="_blank" rel="noopener noreferrer">
                              Book Meeting
                            </a>
                          </Button>
                        )}
                        {mgr.showEmail && mgr.email && (
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
            </CardContent>
          </Card>

          <Card className="flex-[0.3]" variant="black">
            <CardHeader>
              <CardTitle variant="black">
                <EditableText
                  pageName="exhibitor-portal"
                  sectionName="warning-card"
                  contentKey="title"
                  defaultValue="Scam Warning"
                  className="text-xl font-semibold"
                  as="span"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <EditableText
                pageName="exhibitor-portal"
                sectionName="warning-card"
                contentKey="paragraph-1"
                defaultValue="Please be aware that you will likely be contacted by people who claim to have access to our attendee data, or claiming to be our official hotel partner."
                className="text-sm"
                as="p"
              />
              <EditableText
                pageName="exhibitor-portal"
                sectionName="warning-card"
                contentKey="paragraph-2"
                defaultValue="If you have any queries about an inbound inquiry regarding anything to do with the exhibition, please contact your Client Relations Manager who will verify their legitimacy."
                className="text-sm"
                as="p"
              />
              <EditableText
                pageName="exhibitor-portal"
                sectionName="warning-card"
                contentKey="paragraph-3"
                defaultValue="Please be assured that we do not sell or distribute your data."
                className="text-sm"
                as="p"
              />
              <EditableText
                pageName="exhibitor-portal"
                sectionName="warning-card"
                contentKey="paragraph-4"
                defaultValue="Please understand that we are doing everything in our power to prevent situations like these from occurring."
                className="text-sm"
                as="p"
              />
            </CardContent>
          </Card>
        </section>
      ),
    },
    {
      id: "quick-guide-section",
      component: pdfGuides && pdfGuides.length > 0 ? (
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <EditableText
                  pageName="exhibitor-portal"
                  sectionName="quick-guide"
                  contentKey="title"
                  defaultValue="Quick Guide to Exhibiting"
                  className="text-xl font-semibold"
                  as="span"
                />
              </CardTitle>
              <CardDescription>
                <EditableText
                  pageName="exhibitor-portal"
                  sectionName="quick-guide"
                  contentKey="description"
                  defaultValue="Download our comprehensive guide to help you prepare for the exhibition."
                  className="text-sm text-muted-foreground"
                  as="p"
                />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pdfGuides.map((pdf) => (
                  <div key={pdf.id} className="border rounded-lg p-4 space-y-3 bg-muted/50">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-8 w-8 text-primary" />
                      <p className="font-medium text-sm">{pdf.title}</p>
                    </div>
                    {pdf.file_name && (
                      <p className="text-xs text-muted-foreground">{pdf.file_name}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => downloadFile(pdf.file_url || "", pdf.file_name || pdf.title || "guide.pdf")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null,
    },
  ];

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Exhibitor Portal" 
        description="Manage your exhibitor profile"
        noIndex
      />
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
                  pageName="exhibitor-portal"
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

export default ExhibitorPortal;
