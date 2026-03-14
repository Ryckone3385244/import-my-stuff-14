import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

const generateSlug = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const PartnerDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Fetch all partner content from page_content for the partners page
  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner-detail", slug],
    queryFn: async () => {
      // Get all partners-grid content for the partners page
      const { data, error } = await supabase
        .from("page_content")
        .select("content_key, content_value")
        .eq("page_name", "partners")
        .eq("section_name", "partners-grid");

      if (error) throw error;
      if (!data) return null;

      // Group content by partner ID
      const contentMap = new Map<string, Record<string, string>>();
      for (const row of data) {
        // Extract partner base key (e.g. "partner-1" from "partner-1-title")
        const match = row.content_key.match(/^(partner-\d+(?:-dup-\d+)?)/);
        if (!match) continue;
        const baseKey = match[1];
        if (!contentMap.has(baseKey)) contentMap.set(baseKey, {});
        contentMap.get(baseKey)![row.content_key] = row.content_value;
      }

      // Find the partner whose title slug matches
      for (const [baseKey, content] of contentMap) {
        const title = content[`${baseKey}-title`];
        if (title && generateSlug(title) === slug) {
          return {
            id: baseKey,
            title,
            description: content[`${baseKey}-description`] || "",
            url: content[`${baseKey}-url`] || "",
            image: content[baseKey] || "",
          };
        }
      }

      return null;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    );
  }

  if (!partner) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
          <h1 className="text-2xl font-bold">Partner not found</h1>
          <Button onClick={() => navigate("/partners")} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Partners
          </Button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <DynamicHelmet titlePrefix={partner.title} />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <div className="container mx-auto px-4 py-8 max-w-3xl">
            {/* Back button */}
            <Button
              onClick={() => navigate("/partners")}
              variant="outline"
              className="gap-2 mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Partners
            </Button>

            <div className="border border-border rounded-xl p-8 bg-card shadow-sm">
              {/* Partner image */}
              {partner.image && (
                <div className="mb-6">
                  <img
                    src={partner.image}
                    alt={partner.title}
                    className="max-h-48 object-contain"
                  />
                </div>
              )}

              {/* Partner name */}
              <h1 className="text-2xl md:text-3xl font-bold mb-4">
                {partner.title}
              </h1>

              {/* Description */}
              {partner.description && (
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  {partner.description}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-col items-start gap-4">
                {partner.url && partner.url !== "https://example.com" && (
                  <Button asChild variant="outline" className="gap-2">
                    <a href={partner.url} target="_blank" rel="noopener noreferrer">
                      Visit Website
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default PartnerDetail;
