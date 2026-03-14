import { useState, useEffect } from "react";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Info, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const AdminGlobalHTML = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [snippetId, setSnippetId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    before_head_end: "",
    after_body_start: "",
    before_body_end: "",
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Error checking user roles:', roleError);
      toast({
        title: "Error",
        description: "Failed to verify admin status",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    const allowedRoles = ["admin", "customer_service", "project_manager"];
    const hasAccess = roleData?.some(r => allowedRoles.includes(r.role));
    if (!hasAccess) {
      toast({
        title: "Access denied",
        description: "You must be an admin to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadSnippets();
  };

  const loadSnippets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('global_html_snippets')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading snippets:', error);
      toast({
        title: "Error",
        description: "Failed to load HTML snippets",
        variant: "destructive",
      });
    } else if (data) {
      setSnippetId(data.id);
      setFormData({
        before_head_end: data.before_head_end || "",
        after_body_start: data.after_body_start || "",
        before_body_end: data.before_body_end || "",
      });
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!snippetId) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('global_html_snippets')
      .update({
        before_head_end: formData.before_head_end,
        after_body_start: formData.after_body_start,
        before_body_end: formData.before_body_end,
      })
      .eq('id', snippetId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Global HTML snippets updated successfully",
      });
    }
    setIsSaving(false);
  };

  return (
    <>
      <DynamicHelmet titlePrefix="Global HTML & Scripts - Admin" noIndex />

      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 py-12 pt-[168px] md:pt-[152px]">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-2">Global HTML Snippets</h1>
                <p className="text-muted-foreground">
                  Add custom HTML, scripts, or tracking codes to all pages
                </p>
              </div>
              <Button onClick={() => navigate('/admin')} variant="outline" className="flex-shrink-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Admin
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Incorrect html/scripts entered here can break the website - be sure to check the site after making any changes
                  </AlertDescription>
                </Alert>

                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        View Examples & Supported HTML Tags
                      </span>
                      <span className="text-xs text-muted-foreground">Click to expand</span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4 space-y-4">
                    <Alert className="bg-blue-50 border-blue-200">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        <strong>You can paste raw HTML directly!</strong> The system supports meta tags, scripts, link tags, and more.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid gap-4 text-sm">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium mb-2">SEO Meta Tags:</p>
                        <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto whitespace-pre">{`<meta name="description" content="Your page description here">
<meta name="keywords" content="keyword1, keyword2, keyword3">
<meta name="author" content="Your Name">`}</code>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium mb-2">Open Graph (Social Media Previews):</p>
                        <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto whitespace-pre">{`<meta property="og:title" content="Your Title">
<meta property="og:description" content="Your Description">
<meta property="og:image" content="https://example.com/image.jpg">
<meta property="og:url" content="https://example.com">`}</code>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium mb-2">Google Analytics / GTM:</p>
                        <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto whitespace-pre">{`<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXX');
</script>`}</code>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium mb-2">Facebook Pixel:</p>
                        <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto whitespace-pre">{`<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){...};
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>`}</code>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium mb-2">Custom Fonts / Stylesheets:</p>
                        <code className="block bg-gray-100 p-2 rounded text-xs overflow-x-auto whitespace-pre">{`<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">`}</code>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="space-y-2">
                  <Label htmlFor="before_head_end" className="text-black text-base">
                    Before Head End (Meta Tags, Scripts, Styles):
                  </Label>
                  <Textarea
                    id="before_head_end"
                    value={formData.before_head_end}
                    onChange={(e) => setFormData({ ...formData, before_head_end: e.target.value })}
                    placeholder={`Paste your HTML here. Examples:

<meta name="description" content="Your SEO description">
<meta property="og:image" content="https://example.com/image.jpg">

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>`}
                    rows={8}
                    className="bg-white text-gray-700 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Best for: Meta tags (SEO, Open Graph), tracking scripts, custom fonts, stylesheets. Code will be inserted before the closing &lt;/head&gt; tag.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="after_body_start" className="text-black text-base">
                    After Body Start (Noscript Fallbacks):
                  </Label>
                  <Textarea
                    id="after_body_start"
                    value={formData.after_body_start}
                    onChange={(e) => setFormData({ ...formData, after_body_start: e.target.value })}
                    placeholder={`Paste your HTML here. Example:

<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`}
                    rows={6}
                    className="bg-white text-gray-700 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Best for: Noscript fallbacks for tracking pixels. Code will be inserted right after the opening &lt;body&gt; tag.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="before_body_end" className="text-black text-base">
                    Before Body End (Footer Scripts):
                  </Label>
                  <Textarea
                    id="before_body_end"
                    value={formData.before_body_end}
                    onChange={(e) => setFormData({ ...formData, before_body_end: e.target.value })}
                    placeholder={`Paste your HTML here. Example:

<!-- Chat widget or other scripts that should load last -->
<script src="https://example.com/chat-widget.js"></script>`}
                    rows={6}
                    className="bg-white text-gray-700 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Best for: Chat widgets, analytics that don't need to load early, other footer scripts. Code will be inserted before the closing &lt;/body&gt; tag.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-gray-800 hover:bg-gray-700"
                  >
                    {isSaving ? "Saving..." : "Save Global HTML"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminGlobalHTML;
