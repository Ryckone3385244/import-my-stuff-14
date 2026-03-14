import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminAccess = () => {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }
      } catch (error) {
        console.error("[AdminAccess] Failed to check session:", error);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DynamicHelmet titlePrefix="Admin Login" description="Sign in to access the admin dashboard" noIndex />

      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Login Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in with your admin account to continue.
            </p>
            <Button className="w-full" onClick={() => navigate("/login?redirect=/admin/dashboard")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminAccess;
