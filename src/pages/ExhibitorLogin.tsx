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

const resetEmailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const ExhibitorLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        // Defer role check to avoid deadlock
        setTimeout(() => verifyExhibitorRole(session.user.id), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const hasRole = await verifyExhibitorRole(session.user.id);
      if (hasRole) {
        navigate("/exhibitor-portal");
      }
    }
  };

  const verifyExhibitorRole = async (userId: string): Promise<boolean> => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'exhibitor')
      .maybeSingle();
    return !!roleData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationResult = loginSchema.safeParse(formData);
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

      // Verify user has exhibitor role
      const hasRole = await verifyExhibitorRole(data.user.id);
      if (!hasRole) {
        await supabase.auth.signOut();
        throw new Error("You don't have exhibitor access. Please contact the administrator.");
      }

      // Set session timestamps for timeout tracking
      const now = Date.now().toString();
      localStorage.setItem('exhibitor_login_time', now);
      localStorage.setItem('exhibitor_last_activity', now);

      toast({
        title: "Success",
        description: "Logged in successfully",
      });

      navigate("/exhibitor-portal");
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validationResult = resetEmailSchema.safeParse({ email: formData.email });
      if (!validationResult.success) {
        toast({
          title: "Validation Error",
          description: validationResult.error.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "If an account exists with that email, you'll receive a password reset link.",
      });
      setIsResetPassword(false);
      setFormData({ email: "", password: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Exhibitor Login" 
        description="Sign in to access your exhibitor portal"
        noIndex
      />
      <div className="min-h-screen flex flex-col pt-page">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{isResetPassword ? "Reset Password" : "Exhibitor Portal Login"}</CardTitle>
              <CardDescription>
                {isResetPassword 
                  ? "Enter your email to receive a password reset link"
                  : "Sign in to manage your exhibitor listing and access show resources"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={isResetPassword ? handleResetPassword : handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                {!isResetPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
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
                )}
                {!isResetPassword && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetPassword(true);
                        setFormData({ email: "", password: "" });
                      }}
                      className="text-sm text-primary hover:text-primary-glow font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait..." : isResetPassword ? "Send Reset Link" : "Sign In"}
                </Button>
                
                {isResetPassword && (
                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetPassword(false);
                        setFormData({ email: "", password: "" });
                      }}
                      className="text-primary hover:text-primary-glow font-medium"
                    >
                      Back to login
                    </button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ExhibitorLogin;
