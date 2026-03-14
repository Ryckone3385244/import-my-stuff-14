import { DynamicHelmet } from "@/components/DynamicHelmet";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { z } from "zod";
import { checkIsAdminOrCSOrPM } from "@/lib/supabaseQueries";

const authSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be less than 100 characters"),
});

const resetEmailSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
});

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const getRedirectPath = async (userId: string) => {
    // Check for redirect parameter in URL
    const redirect = searchParams.get('redirect');
    if (redirect) return redirect;
    
    // Check if user is admin, CS, or PM - redirect to admin
    const isAdminOrCSOrPM = await checkIsAdminOrCSOrPM(userId);
    if (isAdminOrCSOrPM) return '/admin';
    
    // Check if user came from admin page
    if (document.referrer.includes('/admin')) return '/admin';
    
    // Default to home
    return '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validationResult = authSchema.safeParse(formData);
      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error) throw error;
      
      toast.success("Logged in successfully!");
      const redirectPath = await getRedirectPath(data.user.id);
      navigate(redirectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      const validationResult = resetEmailSchema.safeParse({ email: formData.email });
      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success("Password reset email sent! Check your inbox.");
      setIsResetPassword(false);
      setFormData({ email: "", password: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DynamicHelmet 
        titlePrefix="Login" 
        description="Login to access admin features and manage exhibitors"
        noIndex
      />

      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-20 flex justify-center">
          <Card className="w-full max-w-md shadow-card-hover border-2">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                {isResetPassword ? "Reset Password" : "Welcome Back"}
              </CardTitle>
              <CardDescription className="text-center">
                {isResetPassword
                  ? "Enter your email to receive a password reset link"
                  : "Enter your credentials to access your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isResetPassword ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary-glow" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
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
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
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
                  <Button type="submit" className="w-full bg-primary hover:bg-primary-glow" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Please wait...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              )}

              {isResetPassword && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(false);
                      setFormData({ email: "", password: "" });
                    }}
                    className="text-sm text-primary hover:text-primary-glow font-medium"
                  >
                    Back to login
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Login;
