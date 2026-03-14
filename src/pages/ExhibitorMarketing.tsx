import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExhibitorMarketingMaterials } from "@/components/ExhibitorMarketingMaterials";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";
import { PageWithDraggableSections, EditableText } from "@/components/editable";

const ExhibitorMarketing = () => {
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

  const sections = [
    {
      id: "marketing-title",
      component: (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <EditableText 
              pageName="exhibitor-marketing" 
              sectionName="title" 
              contentKey="heading" 
              defaultValue="Marketing Materials" 
              className="text-4xl font-bold mb-4 text-foreground" 
              as="h1" 
            />
            <EditableText 
              pageName="exhibitor-marketing" 
              sectionName="title" 
              contentKey="description" 
              defaultValue="Download marketing materials, logos, and promotional content to help promote your participation at the event." 
              className="text-lg text-muted-foreground max-w-3xl" 
              as="p" 
            />
          </div>
        </section>
      ),
    },
    {
      id: "marketing-materials",
      component: (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <ExhibitorMarketingMaterials />
          </div>
        </section>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Marketing Materials - Exhibitor Portal</title>
        <meta name="description" content="Download marketing materials and promotional content" />
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
                  pageName="exhibitor-marketing"
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

export default ExhibitorMarketing;
