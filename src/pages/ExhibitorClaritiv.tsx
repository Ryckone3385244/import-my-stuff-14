import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";
import { PageWithDraggableSections, EditableText } from "@/components/editable";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const ExhibitorClaritiv = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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
        toast({
          title: "Error",
          description: "Failed to load exhibitor data",
          variant: "destructive",
        });
        return;
      }

      if (exhibitor) {
        setExhibitorData(exhibitor);
      }
    };

    checkAuth();
  }, [navigate]);

  const sections = [
    {
      id: "claritiv-content",
      component: (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <EditableText 
              pageName="exhibitor-claritiv" 
              sectionName="content" 
              contentKey="description" 
              defaultValue="Transform your exhibition conversations into valuable business opportunities with Claritiv's advanced lead capture and management tools." 
              className="text-lg text-muted-foreground max-w-3xl" 
              as="p" 
            />
          </div>
        </section>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Claritiv – Turn Booth Chats into Business | Exhibitor Portal</title>
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
                  <EditableText 
                    pageName="exhibitor-claritiv" 
                    sectionName="header" 
                    contentKey="title" 
                    defaultValue="Claritiv – Turn Booth Chats into Business" 
                    className="text-4xl font-bold text-foreground" 
                    as="h1" 
                  />
                </div>
                <PageWithDraggableSections
                  pageName="exhibitor-claritiv"
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

export default ExhibitorClaritiv;