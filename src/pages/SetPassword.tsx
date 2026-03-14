import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Check, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";

// Password validation schema
const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordRequirement = {
  label: string;
  test: (password: string) => boolean;
};

const passwordRequirements: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
];

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError("No password setup token provided");
        setValidatingToken(false);
        return;
      }

      try {
        // Check if token exists and is valid (we'll use a simple check - the server validates fully)
        const { data, error } = await supabase
          .from("password_setup_tokens")
          .select("id, expires_at, used_at, user_type")
          .eq("token", token)
          .maybeSingle();

        if (error) {
          console.error("Token validation error:", error);
          setTokenError("Failed to validate token");
          setValidatingToken(false);
          return;
        }

        if (!data) {
          setTokenError("Invalid or expired password setup link");
          setValidatingToken(false);
          return;
        }

        if (data.used_at) {
          setTokenError("This password setup link has already been used");
          setValidatingToken(false);
          return;
        }

        const expiresAt = new Date(data.expires_at);
        if (expiresAt < new Date()) {
          setTokenError("This password setup link has expired");
          setValidatingToken(false);
          return;
        }

        setUserType(data.user_type);
        setValidatingToken(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setTokenError("An unexpected error occurred");
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const validateForm = (): boolean => {
    try {
      passwordSchema.parse({ password, confirmPassword });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { password?: string; confirmPassword?: string } = {};
        err.errors.forEach((e) => {
          if (e.path[0] === "password") {
            fieldErrors.password = e.message;
          } else if (e.path[0] === "confirmPassword") {
            fieldErrors.confirmPassword = e.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("set-password", {
        body: { token, password },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      setUserType(data.userType);
      setLoginEmail(data.loginEmail);
      toast({
        title: "Password Set Successfully",
        description: "You can now log in with your new password",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set password";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLoginPath = () => {
    return userType === "speaker" ? "/speaker-portal/login" : "/exhibitor-portal/login";
  };

  // Loading state
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating your link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Invalid Link</CardTitle>
            </div>
            <CardDescription>{tokenError}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Please contact your event administrator to request a new password setup link.
            </p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Password Set Successfully!</CardTitle>
            </div>
            <CardDescription>
              Your password has been set. You can now log in to your portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loginEmail && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Your login email:</p>
                <p className="font-medium">{loginEmail}</p>
              </div>
            )}
            <Button onClick={() => navigate(getLoginPath())} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            Create a secure password for your {userType === "speaker" ? "speaker" : "exhibitor"} portal account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="Enter your password"
                  className={errors.password ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Password requirements */}
            <div className="space-y-2 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Password requirements:</p>
              <ul className="space-y-1">
                {passwordRequirements.map((req, idx) => {
                  const met = req.test(password);
                  return (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      {met ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={met ? "text-green-600" : "text-muted-foreground"}>
                        {req.label}
                      </span>
                    </li>
                  );
                })}
                <li className="flex items-center gap-2 text-sm">
                  {password && confirmPassword && password === confirmPassword ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span
                    className={
                      password && confirmPassword && password === confirmPassword
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }
                  >
                    Passwords match
                  </span>
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Password...
                </>
              ) : (
                "Set Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
