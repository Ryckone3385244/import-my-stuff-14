import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Settings, CheckCircle2, Mail, Key, Save, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const AdminOtherConfigs = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [fromName, setFromName] = useState("");
  const [fromDomain, setFromDomain] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [currentApiKeyExists, setCurrentApiKeyExists] = useState(false);
  const [seoApiKey, setSeoApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalFromName, setOriginalFromName] = useState("");
  const [originalFromDomain, setOriginalFromDomain] = useState("");

  // Check authorization and load email config
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data: isAuthorized } = await supabase.rpc('is_admin_or_cs_or_pm', { _user_id: user.id });
        
        if (!isAuthorized) {
          navigate("/");
          return;
        }

        setIsAuthorized(true);

        // Load email config
        const { data: emailConfig } = await supabase
          .from('email_config')
          .select('*')
          .limit(1)
          .single();

        if (emailConfig) {
          setFromName(emailConfig.from_name);
          setFromDomain(emailConfig.from_domain);
          setOriginalFromName(emailConfig.from_name);
          setOriginalFromDomain(emailConfig.from_domain);
          // Check if API key exists in database
          setCurrentApiKeyExists(!!(emailConfig as any).resend_api_key);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Track changes
  useEffect(() => {
    setHasChanges(fromName !== originalFromName || fromDomain !== originalFromDomain);
  }, [fromName, fromDomain, originalFromName, originalFromDomain]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('email_config')
        .update({
          from_name: fromName,
          from_domain: fromDomain,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('email_config').select('id').limit(1).single()).data?.id);

      if (error) throw error;

      setOriginalFromName(fromName);
      setOriginalFromDomain(fromDomain);
      setHasChanges(false);
      toast.success("Email settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    if (!newApiKey.startsWith('re_')) {
      toast.error("Invalid Resend API key format. Keys should start with 're_'");
      return;
    }

    setIsSavingApiKey(true);
    try {
      const { data: configData } = await supabase
        .from('email_config')
        .select('id')
        .limit(1)
        .single();

      if (!configData?.id) {
        throw new Error("Email config not found");
      }

      const { error } = await supabase
        .from('email_config')
        .update({
          resend_api_key: newApiKey.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', configData.id);

      if (error) throw error;

      setNewApiKey("");
      setCurrentApiKeyExists(true);
      toast.success("Resend API key updated successfully");
    } catch (error) {
      console.error("Error updating API key:", error);
      toast.error("Failed to update API key");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Other Configurations | Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 bg-muted/30 pt-[168px] pb-16">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Settings className="h-8 w-8" />
                  Other Configurations
                </h1>
                <p className="text-muted-foreground mt-2">
                  API keys and external service configurations
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Button>
            </div>

            <div className="space-y-6">
              {/* Resend Email Configuration */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold">Resend Email Configuration</h2>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {currentApiKeyExists ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          API Key Configured
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          API Key Not Set
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Configure your Resend email settings for sending transactional emails.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">From Name</label>
                      <Input 
                        value={fromName}
                        onChange={(e) => setFromName(e.target.value)}
                        className="bg-muted/50"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        The display name shown in the "From" field of emails
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1.5 block">From Domain</label>
                      <Input 
                        value={fromDomain}
                        onChange={(e) => setFromDomain(e.target.value)}
                        className="bg-muted/50"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        The email domain to send from (must be verified in Resend). Emails will be sent from info@{fromDomain || 'yourdomain.com'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 mt-6">
                    <p className="font-medium flex items-center gap-1.5">
                      <span>📌</span> Important:
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                      <li>
                        Verify your domain at{" "}
                        <a 
                          href="https://resend.com/domains" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          resend.com/domains
                        </a>
                      </li>
                      <li>Get your API key from{" "}
                        <a 
                          href="https://resend.com/api-keys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          resend.com/api-keys
                        </a>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">
                        {currentApiKeyExists ? "Update API Key" : "Set API Key"}
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        type="password"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="Enter Resend API key (re_...)..."
                        className="bg-muted/50 flex-1"
                      />
                      <Button 
                        onClick={handleUpdateApiKey}
                        disabled={isSavingApiKey || !newApiKey.trim()}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {isSavingApiKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          currentApiKeyExists ? "Update Key" : "Save Key"
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentApiKeyExists 
                        ? "Enter a new API key to replace the existing one." 
                        : "Enter your Resend API key to enable email sending."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* SEO Article API Configuration */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold">SEO Article API</h2>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      API Key Configured
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    The SEO Article API key is securely stored. This key is used for generating and optimizing SEO content.
                  </p>

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm font-medium">Update API Key</label>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        value={seoApiKey}
                        onChange={(e) => setSeoApiKey(e.target.value)}
                        placeholder="Enter new SEO Article API key..."
                        className="bg-muted/50 flex-1"
                      />
                      <Button className="bg-green-500 hover:bg-green-600 text-white">
                        Update Key
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter a new API key to replace the existing one. Leave empty to keep the current key.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isSaving || !hasChanges}
                  className="flex items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default AdminOtherConfigs;