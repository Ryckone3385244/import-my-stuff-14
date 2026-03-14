import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const SpeakerLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        navigate("/speaker-portal");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Check if user has speaker role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'speaker')
        .maybeSingle();
      
      if (roleError) {
        console.error("Error fetching speaker role:", roleError);
      }

      if (roleData) {
        navigate("/speaker-portal");
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationResult = loginSchema.safeParse({
        email: formData.email,
        password: formData.password,
      });

      if (!validationResult.success) {
        toast({
          title: "Validation Error",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check if user has speaker role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'speaker')
        .maybeSingle();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        throw new Error("You don't have speaker access. Please contact the administrator.");
      }

      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      navigate("/speaker-portal");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred during login";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <DynamicHelmet 
        titlePrefix="Speaker Login" 
        description="Sign in to your speaker portal"
        noIndex
      />
      <div className="min-h-screen flex flex-col pt-page">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Speaker Portal Login</CardTitle>
              <CardDescription>
                Sign in to manage your submissions and sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="speaker@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : "Sign In"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account? Contact the administrator.
                </p>
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SpeakerLogin;
