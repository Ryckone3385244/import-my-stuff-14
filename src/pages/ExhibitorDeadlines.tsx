import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";

import { PageWithDraggableSections, EditableText } from "@/components/editable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { QUERY_KEYS } from "@/lib/constants";
import { fetchEventSettings } from "@/lib/supabaseQueries";

const ExhibitorDeadlines = () => {
  const navigate = useNavigate();
  const [exhibitorData, setExhibitorData] = useState<{ name?: string; booth_number?: string }>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/exhibitor-portal/login");
        return;
      }

      const { data: exhibitor, error: exhibitorError } = await supabase
        .from("exhibitors")
        .select("name, booth_number")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (exhibitorError) {
        console.error("Error fetching exhibitor:", exhibitorError);
        return;
      }

      if (exhibitor) {
        setExhibitorData(exhibitor);
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: eventSettings, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.EVENT_SETTINGS],
    queryFn: async () => {
      const data = await fetchEventSettings();
      if (!data) throw new Error("Event settings not found");
      return data;
    },
    refetchInterval: 30000,
  });

  const formatDeadline = (date: string | null) => {
    if (!date) {
      return {
        date: "TBA",
        daysRemaining: 0,
        isPast: false,
        isToday: false,
        isTBA: true,
      };
    }
    
    const deadlineDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      date: deadlineDate.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      daysRemaining: diffDays,
      isPast: diffDays < 0,
      isToday: diffDays === 0,
      isTBA: false,
    };
  };

  const deadlines = eventSettings ? [
    {
      id: "showguide",
      label: "Showguide Listing Deadline",
      date: eventSettings.showguide_listing_deadline,
      description: "Submit your showguide entry details",
    },
    {
      id: "space_only",
      label: "Space Only Stand Deadline",
      date: eventSettings.space_only_deadline,
      description: "Complete space only stand requirements",
    },
    {
      id: "speaker",
      label: "Speaker Form Deadline",
      date: eventSettings.speaker_form_deadline,
      description: "Submit speaker form and presentation details",
    },
    {
      id: "advert",
      label: "Advertisement Submission Deadline",
      date: eventSettings.advert_submission_deadline,
      description: "Submit your advertisement materials",
    },
  ].filter(d => d.date) : [];

  const sections = [
    {
      id: "deadlines-title",
      component: (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <EditableText 
              pageName="exhibitor-deadlines" 
              sectionName="title" 
              contentKey="heading" 
              defaultValue="Important Deadlines" 
              className="text-4xl font-bold mb-4 text-foreground" 
              as="h1" 
            />
            <EditableText 
              pageName="exhibitor-deadlines" 
              sectionName="title" 
              contentKey="description" 
              defaultValue="Stay on track with all key dates and deadlines for your exhibition participation." 
              className="text-lg text-muted-foreground max-w-3xl" 
              as="p" 
            />
          </div>
        </section>
      ),
    },
    {
      id: "deadlines-table",
      component: (
        <section className="pb-12">
          <div className="container mx-auto px-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : deadlines.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deadlines.map((deadline) => {
                        const formatted = formatDeadline(deadline.date);
                        return (
                          <TableRow key={deadline.id}>
                            <TableCell className="font-medium">{deadline.label}</TableCell>
                            <TableCell className="text-muted-foreground">{deadline.description}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {formatted.date}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatted.isTBA ? (
                                <span className="text-muted-foreground">TBA</span>
                              ) : formatted.isPast ? (
                                <span className="text-red-600 font-medium">Passed</span>
                              ) : formatted.isToday ? (
                                <span className="text-orange-600 font-medium flex items-center justify-end gap-1">
                                  <Clock className="h-4 w-4" />
                                  Today
                                </span>
                              ) : (
                                <span className="text-green-600 font-medium flex items-center justify-end gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatted.daysRemaining} {formatted.daysRemaining === 1 ? 'day' : 'days'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No deadlines have been set yet.
                  </p>
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
        <title>Important Deadlines | Exhibitor Portal</title>
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
                  renderTrigger={false}
                  alwaysVisible={true}
                />
              </aside>

              {/* Mobile menu trigger */}
              <div className="lg:hidden fixed top-20 left-4 z-50">
                <ExhibitorSidebar 
                  exhibitorName={exhibitorData?.name}
                  standNumber={exhibitorData?.booth_number}
                  renderTrigger={true}
                />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <PageWithDraggableSections
                  pageName="exhibitor-deadlines"
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

export default ExhibitorDeadlines;