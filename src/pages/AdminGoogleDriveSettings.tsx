import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AdminGoogleDriveSettings as GoogleDriveSettingsComponent } from "@/components/AdminGoogleDriveSettings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const AdminGoogleDriveSettings = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
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
      console.error("Error fetching user roles:", roleError);
    }

    const allowedRoles = ["admin", "customer_service", "project_manager"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));

    if (hasAccess) {
      setIsAdmin(true);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Google Drive Settings - Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <div className="flex-1 bg-muted/30 pt-[168px] pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Google Drive Integration</h1>
                <p className="text-muted-foreground">
                  Configure automatic backup of exhibitor submissions to Google Drive
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="flex-shrink-0"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </div>

            <GoogleDriveSettingsComponent />
          </div>
        </div>
        
        <Footer />
      </div>
    </>
  );
};

export default AdminGoogleDriveSettings;
