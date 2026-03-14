import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";
import { PageWithDraggableSections, EditableText } from "@/components/editable";
import { ContactsManager } from "@/components/ContactsManager";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useNavigate, useSearchParams } from "react-router-dom";

const ExhibitorContacts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isModal = searchParams.get('modal') === 'true';
  const [exhibitorData, setExhibitorData] = useState<{ id?: string; name?: string; booth_number?: string; logo_url?: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for impersonation tokens first
      const impersonationToken = sessionStorage.getItem('impersonation_token');
      const impersonationRefresh = sessionStorage.getItem('impersonation_refresh');
      
      let supabaseClient = supabase;
      
      // If we have impersonation tokens, create a new client with those tokens
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
        
        // Set the session with impersonation tokens
        await supabaseClient.auth.setSession({
          access_token: impersonationToken,
          refresh_token: impersonationRefresh,
        });
      }

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        navigate("/exhibitor-portal/login");
        return;
      }

      const { data: exhibitor } = await supabaseClient
        .from("exhibitors")
        .select("id, name, booth_number, logo_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (exhibitor) {
        setExhibitorData(exhibitor);
      }
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const sections = [
    {
      id: "contacts-title",
      component: (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <EditableText 
              pageName="exhibitor-contacts" 
              sectionName="title" 
              contentKey="heading" 
              defaultValue="Manage Contacts" 
              className="text-4xl font-bold mb-4 text-foreground" 
              as="h1" 
            />
            <EditableText 
              pageName="exhibitor-contacts" 
              sectionName="title" 
              contentKey="description" 
              defaultValue="Manage your team contacts and key personnel for the exhibition." 
              className="text-lg text-muted-foreground max-w-3xl" 
              as="p" 
            />
          </div>
        </section>
      ),
    },
    {
      id: "contacts-manager",
      component: (
        <section className="pb-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : exhibitorData.id ? (
              <ContactsManager exhibitorId={exhibitorData.id} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No exhibitor profile found. Please contact support.</p>
              </div>
            )}
          </div>
        </section>
      ),
    },
  ];

  return (
    <>
      <Helmet>
        <title>Manage Contacts | Exhibitor Portal</title>
      </Helmet>

      <div className="min-h-screen flex flex-col">
        {!isModal && <Navbar />}
        
        <main className={`flex-1 pb-12 ${isModal ? 'pt-6' : 'pt-page'}`}>
          <div className="container mx-auto px-6">
            <div className={isModal ? '' : 'flex gap-8 mt-[60px]'}>
              {/* Always-visible Sidebar */}
              {!isModal && (
                <aside className="w-64 flex-shrink-0 sticky top-24 h-fit hidden lg:block">
                  <ExhibitorSidebar 
                    exhibitorName={exhibitorData?.name}
                    standNumber={exhibitorData?.booth_number}
                    logoUrl={exhibitorData?.logo_url}
                    renderTrigger={false}
                    alwaysVisible={true}
                  />
                </aside>
              )}

              {/* Mobile menu trigger */}
              {!isModal && (
                <div className="lg:hidden fixed top-20 left-4 z-50">
                  <ExhibitorSidebar 
                    exhibitorName={exhibitorData?.name}
                    standNumber={exhibitorData?.booth_number}
                    logoUrl={exhibitorData?.logo_url}
                    renderTrigger={true}
                  />
                </div>
              )}

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <PageWithDraggableSections
                  pageName="exhibitor-contacts"
                  sections={sections}
                />
              </div>
            </div>
          </div>
        </main>
        
        {!isModal && <Footer />}
      </div>
    </>
  );
};

export default ExhibitorContacts;