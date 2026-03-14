import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

import { PageWithDraggableSections, EditableText } from "@/components/editable";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface ExhibitorData {
  id?: string;
  name?: string; 
  booth_number?: string;
  stand_type?: string;
  booth_length?: number;
  booth_width?: number;
  open_sides?: number;
  logo_url?: string;
  _userId?: string;
  _email?: string;
}

const ExhibitorStandInfo = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: exhibitorData, isLoading, error, refetch } = useQuery<ExhibitorData>({
    queryKey: ["exhibitor-stand-info"],
    queryFn: async () => {
      // Check for impersonation tokens first
      const impToken = sessionStorage.getItem('impersonation_token');
      const impRefresh = sessionStorage.getItem('impersonation_refresh');
      
      let client = supabase;
      
      if (impToken && impRefresh) {
        // Create impersonation client
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
      }

      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        navigate("/exhibitor-portal/login");
        throw new Error("Not authenticated");
      }

      // First, let's check if there's an exhibitor with this user_id
      const { data: exhibitor, error } = await client
        .from("exhibitors")
        .select("id, name, booth_number, stand_type, booth_length, booth_width, open_sides, logo_url, user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // If no exhibitor found, let's check all exhibitors to debug
      if (!exhibitor) {
        const { data: allExhibitors } = await client
          .from("exhibitors")
          .select("id, name, user_id")
          .limit(5);
      }
      
      return exhibitor || { _userId: session.user.id, _email: session.user.email };
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Log when data changes
  useEffect(() => {
    // Exhibitor data loaded successfully
  }, [exhibitorData]);

  // Show error toast if query fails
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load stand information. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const sections = [
    {
      id: "booth-info-title",
      component: (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <EditableText 
              pageName="exhibitor-stand-info" 
              sectionName="title" 
              contentKey="heading" 
              defaultValue="Booth Information" 
              className="text-4xl font-bold mb-4 text-foreground" 
              as="h1" 
            />
            <EditableText 
              pageName="exhibitor-stand-info" 
              sectionName="title" 
              contentKey="description" 
              defaultValue="Everything you need to know about your exhibition booth, including setup times, specifications, and requirements." 
              className="text-lg text-muted-foreground max-w-3xl" 
              as="p" 
            />
          </div>
        </section>
      ),
    },
    {
      id: "booth-info-form",
      component: (
        <section className="pb-12">
          <div className="container mx-auto px-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Booth Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : exhibitorData?.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <Label className="text-muted-foreground text-sm">Booth Number</Label>
                        <p className="text-lg font-semibold mt-1">{exhibitorData?.booth_number || "Not assigned"}</p>
                      </div>

                      <div>
                        <Label className="text-muted-foreground text-sm">Stand Type</Label>
                        <p className="text-lg font-semibold mt-1">{exhibitorData?.stand_type || "Not specified"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <Label className="text-muted-foreground text-sm">Length</Label>
                        <p className="text-lg font-semibold mt-1">
                          {exhibitorData?.booth_length ? `${exhibitorData.booth_length}ft` : "Not specified"}
                        </p>
                      </div>

                      <div>
                        <Label className="text-muted-foreground text-sm">Width</Label>
                        <p className="text-lg font-semibold mt-1">
                          {exhibitorData?.booth_width ? `${exhibitorData.booth_width}ft` : "Not specified"}
                        </p>
                      </div>

                      <div>
                        <Label className="text-muted-foreground text-sm">Open Sides</Label>
                        <p className="text-lg font-semibold mt-1">
                          {exhibitorData?.open_sides !== undefined ? exhibitorData.open_sides : "Not specified"}
                        </p>
                      </div>
                    </div>

                    {exhibitorData?.booth_length && exhibitorData?.booth_width && (
                      <div className="pt-4 border-t">
                        <Label className="text-muted-foreground text-sm">Total Area</Label>
                        <p className="text-lg font-semibold mt-1">
                          {(exhibitorData.booth_length * exhibitorData.booth_width).toFixed(2)} ft²
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No booth information available yet.</p>
                    <p className="text-sm mt-2">Please contact the event organizers for your booth details.</p>
                  </div>
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
        <title>Booth Information | Exhibitor Portal</title>
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
                  pageName="exhibitor-stand-info"
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

export default ExhibitorStandInfo;