import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileCode, ArrowLeft, Copy, Check, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const AdminSitemapGenerator = () => {
  const navigate = useNavigate();
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [copied, setCopied] = useState(false);
  const [sitemapContent, setSitemapContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [urlCount, setUrlCount] = useState(0);

  const fetchSitemap = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sitemap-xml', {
        body: {},
      });

      if (error) {
        // If invoke returns error, try direct fetch
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap-xml?baseUrl=${encodeURIComponent(baseUrl)}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch sitemap');
        }
        
        const xmlContent = await response.text();
        setSitemapContent(xmlContent);
        
        // Count URLs in sitemap
        const urlMatches = xmlContent.match(/<url>/g);
        setUrlCount(urlMatches ? urlMatches.length : 0);
      } else {
        // Handle if data is returned as string
        const xmlContent = typeof data === 'string' ? data : JSON.stringify(data);
        setSitemapContent(xmlContent);
        
        const urlMatches = xmlContent.match(/<url>/g);
        setUrlCount(urlMatches ? urlMatches.length : 0);
      }
      
      toast.success("Sitemap fetched successfully!");
    } catch (error) {
      console.error('Error fetching sitemap:', error);
      toast.error("Failed to fetch sitemap. Trying direct URL...");
      
      // Fallback: try direct fetch to the edge function
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap-xml?baseUrl=${encodeURIComponent(baseUrl)}`
        );
        
        if (response.ok) {
          const xmlContent = await response.text();
          setSitemapContent(xmlContent);
          
          const urlMatches = xmlContent.match(/<url>/g);
          setUrlCount(urlMatches ? urlMatches.length : 0);
          toast.success("Sitemap fetched successfully!");
        } else {
          throw new Error('Fallback fetch failed');
        }
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        toast.error("Could not fetch sitemap from edge function");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSitemap();
  }, []);

  const handleRefresh = () => {
    fetchSitemap();
  };

  const handleDownload = () => {
    if (!sitemapContent) {
      toast.error("No sitemap content to download");
      return;
    }
    
    const blob = new Blob([sitemapContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap.xml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Sitemap downloaded successfully!");
  };

  const handleCopy = () => {
    if (!sitemapContent) {
      toast.error("No sitemap content to copy");
      return;
    }
    
    navigator.clipboard.writeText(sitemapContent);
    setCopied(true);
    toast.success("Sitemap copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const sitemapUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sitemap-xml?baseUrl=${encodeURIComponent(baseUrl)}`;

  return (
    <>
      <Helmet>
        <title>Sitemap Generator - Admin</title>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin')}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>

            <h1 className="text-4xl font-bold mb-2">Dynamic Sitemap</h1>
            <p className="text-muted-foreground mb-8">
              Live XML sitemap generated from your database (speakers, exhibitors, blog posts, pages)
            </p>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    Configuration
                  </CardTitle>
                  <CardDescription>
                    The sitemap is dynamically generated from your database
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="base-url">Base URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="base-url"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://yoursite.com"
                      />
                      <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Change the base URL and refresh to regenerate the sitemap
                    </p>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Live Sitemap URL</h3>
                      <span className="text-sm text-muted-foreground">
                        {urlCount} URLs included
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={sitemapUrl}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(sitemapUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This URL is referenced in robots.txt for search engine crawlers
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✓ Dynamic Content Included</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• Static pages (home, registration, exhibit, etc.)</li>
                      <li>• Active speakers with individual detail pages</li>
                      <li>• Active exhibitors with individual detail pages</li>
                      <li>• Published blog posts</li>
                      <li>• Published dynamic website pages</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sitemap Preview</CardTitle>
                  <CardDescription>
                    Current sitemap content fetched from the edge function
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="h-96 flex items-center justify-center bg-muted rounded-lg">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Loading sitemap...
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      value={sitemapContent}
                      readOnly
                      className="font-mono text-xs h-96"
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={handleDownload} className="flex-1" disabled={!sitemapContent || isLoading}>
                      <Download className="h-4 w-4 mr-2" />
                      Download sitemap.xml
                    </Button>
                    <Button onClick={handleCopy} variant="outline" disabled={!sitemapContent || isLoading}>
                      {copied ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  <div className="bg-muted p-4 rounded-lg text-sm">
                    <h4 className="font-semibold mb-2">📝 SEO Notes:</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>The sitemap is automatically served at <code>/api/sitemap.xml</code></li>
                      <li>robots.txt already points to this sitemap URL</li>
                      <li>Content updates automatically when database changes</li>
                      <li>Submit the sitemap URL to Google Search Console for indexing</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AdminSitemapGenerator;
