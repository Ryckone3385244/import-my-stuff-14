import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Building2, Calendar, Eye, CheckCircle2, Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ITEMS_PER_PAGE = 10;

const ExhibitorInquiries = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [exhibitorData, setExhibitorData] = useState<{ id?: string; name?: string; booth_number?: string; logo_url?: string }>({});
  const [supabaseClient, setSupabaseClient] = useState(supabase);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  useEffect(() => {
    const checkAuth = async () => {
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
        
        setSupabaseClient(client);
      }
      
      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        navigate("/exhibitor-portal/login");
        return;
      }

      const { data: exhibitor, error: exhibitorError } = await client
        .from("exhibitors")
        .select("id, name, booth_number, logo_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (exhibitorError) {
        console.error("Error fetching exhibitor:", exhibitorError);
        toast({
          title: "Error",
          description: "Failed to load exhibitor data",
          variant: "destructive",
        });
        return;
      }

      if (!exhibitor) {
        console.error("No exhibitor found for user:", session.user.id);
        toast({
          title: "Error",
          description: "No exhibitor profile found. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      setExhibitorData(exhibitor);
    };

    checkAuth();
  }, [navigate]);

  const { data: allInquiries = [], isLoading } = useQuery({
    queryKey: ["exhibitor-inquiries", exhibitorData.id],
    queryFn: async () => {
      if (!exhibitorData.id) return [];
      
      const { data, error } = await supabaseClient
        .from("exhibitor_inquiries")
        .select("*")
        .eq("exhibitor_id", exhibitorData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!exhibitorData.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabaseClient
        .from("exhibitor_inquiries")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exhibitor-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["exhibitor-new-inquiries"] });
      toast({
        title: "Status Updated",
        description: "Inquiry status has been updated",
      });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to update status";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="default">New</Badge>;
      case "read":
        return <Badge variant="secondary">Read</Badge>;
      case "responded":
        return <Badge variant="outline" className="border-green-600 text-green-600">Responded</Badge>;
      case "archived":
        return <Badge variant="outline" className="border-muted-foreground text-muted-foreground">Archived</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const activeInquiries = allInquiries.filter(i => i.status !== "archived");
  const newInquiriesCount = activeInquiries.filter(i => i.status === "new").length;
  const totalActiveInquiries = activeInquiries.length;
  const archivedInquiriesCount = allInquiries.filter(i => i.status === "archived").length;

  // Pagination
  const displayedInquiries = activeTab === "active" ? activeInquiries : allInquiries.filter(i => i.status === "archived");
  const totalPages = Math.ceil(displayedInquiries.length / ITEMS_PER_PAGE);
  const paginatedInquiries = displayedInquiries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const renderInquiriesList = () => {
    if (isLoading) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading inquiries...
          </CardContent>
        </Card>
      );
    }

    if (displayedInquiries.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              {activeTab === "archived" ? "No Archived Inquiries" : "No Active Inquiries"}
            </h3>
            <p className="text-muted-foreground">
              {activeTab === "archived" 
                ? "Archived inquiries will appear here" 
                : "When visitors contact you through your exhibitor listing, inquiries will appear here"}
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className="space-y-4">
          {paginatedInquiries.map((inquiry) => (
            <Card key={inquiry.id} className={inquiry.status === "new" ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{inquiry.visitor_name}</CardTitle>
                    <CardDescription className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${inquiry.visitor_email}`} className="hover:underline">
                          {inquiry.visitor_email}
                        </a>
                      </span>
                      {inquiry.visitor_company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {inquiry.visitor_company}
                        </span>
                      )}
                      {inquiry.visitor_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${inquiry.visitor_phone}`} className="hover:underline">
                            {inquiry.visitor_phone}
                          </a>
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(inquiry.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Message:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {inquiry.message}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Received {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {activeTab === "active" && (
                      <>
                        {inquiry.status === "new" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: "read" })}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Mark as Read
                          </Button>
                        )}
                        {inquiry.status !== "responded" && (
                          <Button
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: "responded" })}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Responded
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: "archived" })}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                      </>
                    )}
                    {activeTab === "archived" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: inquiry.id, status: "read" })}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Unarchive
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      asChild
                    >
                      <a href={`mailto:${inquiry.visitor_email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Reply
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, displayedInquiries.length)} of {displayedInquiries.length} inquiries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <Helmet>
        <title>Inquiries - Exhibitor Portal</title>
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
              <div className="flex-1 min-w-0 space-y-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Contact Inquiries</h1>
                  <p className="text-muted-foreground">
                    Manage and respond to inquiries from visitors interested in your products
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{totalActiveInquiries}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{newInquiriesCount}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Archived</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-muted-foreground">{archivedInquiriesCount}</div>
                    </CardContent>
                  </Card>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "archived")} className="w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="active">
                      Active ({totalActiveInquiries})
                    </TabsTrigger>
                    <TabsTrigger value="archived">
                      Archived ({archivedInquiriesCount})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-6">
                    {renderInquiriesList()}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default ExhibitorInquiries;
