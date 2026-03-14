import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";

const ExhibitorSuppliers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exhibitorData, setExhibitorData] = useState<{ name?: string; booth_number?: string }>({});

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    if (roleError) {
      console.error("Error fetching roles:", roleError);
      navigate("/");
      return;
    }

    // Allow admins, customer service, project managers, and exhibitors
    const allowedRoles = ["admin", "customer_service", "project_manager", "exhibitor"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      navigate("/");
      return;
    }

    // Only fetch exhibitor data if user is an exhibitor
    if (roleData?.some(r => r.role === "exhibitor")) {
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
    }

    setLoading(false);
  };

  // Use suppliers_directory view which doesn't expose contact information
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers_directory")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !loading,
  });

  // Fetch supplier files
  const { data: supplierFiles } = useQuery({
    queryKey: ["supplier-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_files")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !loading,
  });

  if (loading || suppliersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const groupedSuppliers = {}; // No grouping by category anymore

  return (
    <>
      <Helmet>
        <title>Show Suppliers - Exhibitor Portal</title>
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
                <div className="mb-8">
                  <h1 className="text-4xl font-bold mb-2 text-foreground">Show Suppliers</h1>
                  <p className="text-muted-foreground">
                    Approved third-party suppliers for logistics, catering, and event services
                  </p>
                </div>

                {!suppliers || suppliers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">No suppliers available at this time.</p>
                    </CardContent>
                  </Card>
                ) : (
                    <div className="space-y-8">
                      {suppliers.map((supplier) => {
                        const files = supplierFiles?.filter((f) => f.supplier_id === supplier.id) || [];
                        
                        return (
                          <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                            <div className="flex flex-col md:flex-row">
                              {/* Logo Section - 35% width */}
                              {supplier.logo_url && (
                                <div className="md:w-[35%] p-6 flex items-center justify-center bg-muted/30">
                                  <img
                                    src={supplier.logo_url}
                                    alt={supplier.name}
                                    className="max-h-32 w-full object-contain"
                                  />
                                </div>
                              )}
                              
                              {/* Content Section - 65% width */}
                              <div className={supplier.logo_url ? "md:w-[65%] flex flex-col" : "w-full flex flex-col"}>
                                <CardHeader>
                                  <CardTitle>{supplier.name}</CardTitle>
                                  {supplier.description && (
                                    <CardDescription>{supplier.description}</CardDescription>
                                  )}
                                </CardHeader>
                                <CardContent className="space-y-3 mt-auto">
                                  {supplier.button_text && supplier.button_url && (
                                    <Button asChild variant="default">
                                      <a href={supplier.button_url} target="_blank" rel="noopener noreferrer">
                                        {supplier.button_text}
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  {files.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t">
                                      <p className="text-sm font-medium">Downloads:</p>
                                      {files.map((file) => (
                                        <Button
                                          key={file.id}
                                          asChild
                                          variant="outline"
                                          size="sm"
                                          className="w-full justify-start"
                                        >
                                          <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" />
                                            {file.file_name}
                                          </a>
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ExhibitorSuppliers;