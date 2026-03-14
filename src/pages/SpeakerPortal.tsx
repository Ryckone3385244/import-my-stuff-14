import { useState, useEffect } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SpeakerProvider } from "@/contexts/SpeakerContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LogOut } from "lucide-react";
import { SpeakerSidebar } from "@/components/SpeakerSidebar";

interface Speaker {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  title: string | null;
  company: string | null;
}

const SpeakerPortal = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [impersonationClient, setImpersonationClient] = useState<typeof supabase | null>(null);

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
        window.history.replaceState({}, '', '/speaker-portal');
      }
      
      // Now load data
      await loadSpeakerData();
    };

    initializeAuth();
  }, []);

  const loadSpeakerData = async () => {
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
      await loadSpeakerDataWithClient(client);
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/speaker-portal/login");
      return;
    }

    await loadSpeakerDataWithClient(supabase);
  };

  const loadSpeakerDataWithClient = async (client: typeof supabase) => {
    try {
      const { data: { session } } = await client.auth.getSession();
      
      if (!session) {
        navigate("/speaker-portal/login");
        return;
      }

      // Check if user has speaker role
      const { data: roleData, error: roleError } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'speaker')
        .maybeSingle();

      if (roleError || !roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have speaker access",
          variant: "destructive",
        });
        await client.auth.signOut();
        navigate("/speaker-portal/login");
        return;
      }

      // Load speaker data
      const { data: speakerData, error: speakerError } = await client
        .from('speakers')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (speakerError || !speakerData) throw speakerError || new Error('Speaker not found');
      setSpeaker(speakerData);
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load speaker data';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Clear impersonation tokens if present
    sessionStorage.removeItem('impersonation_token');
    sessionStorage.removeItem('impersonation_refresh');
    
    const client = impersonationClient || supabase;
    await client.auth.signOut();
    navigate("/speaker-portal/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SpeakerProvider value={{ speaker, reloadSpeaker: loadSpeakerData }}>
      <DynamicHelmet 
        titlePrefix="Speaker Portal" 
        description="Manage your speaker profile and sessions"
        noIndex
      />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        
        <main className="flex-1 pt-page pb-12">
          <div className="container mx-auto px-6">
            <div className="flex gap-8 mt-[60px]">
              {/* Always-visible Sidebar */}
              <aside className="w-64 flex-shrink-0 sticky top-24 h-fit hidden lg:block">
                <SpeakerSidebar 
                  speakerName={speaker?.name}
                  photoUrl={speaker?.photo_url || undefined}
                  renderTrigger={false}
                  alwaysVisible={true}
                />
              </aside>

              {/* Mobile menu trigger */}
              <div className="lg:hidden fixed top-20 left-4 z-50">
                <SpeakerSidebar 
                  speakerName={speaker?.name}
                  photoUrl={speaker?.photo_url || undefined}
                  renderTrigger={true}
                />
              </div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </SpeakerProvider>
  );
};

export default SpeakerPortal;