import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Facebook, Instagram, Linkedin, Image as ImageIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/lib/downloadUtils";

export const ExhibitorMarketingMaterials = () => {
  const { data: marketingTools } = useQuery({
    queryKey: ["marketing-tools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_tools")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const pdfGuides = marketingTools?.filter(t => t.tool_type === "pdf") || [];
  const socialMedia = marketingTools?.filter(t => t.tool_type === "social_media" || t.tool_type === "social") || [];
  const logos = marketingTools?.filter(t => t.tool_type === "logo") || [];
  const graphics = marketingTools?.filter(t => t.tool_type === "graphic") || [];

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case "facebook": return <Facebook className="h-5 w-5" />;
      case "instagram": return <Instagram className="h-5 w-5" />;
      case "linkedin": return <Linkedin className="h-5 w-5" />;
      default: return null;
    }
  };

  const hasMaterials = pdfGuides.length > 0 || socialMedia.length > 0 || logos.length > 0 || graphics.length > 0;

  return (
    <Card>
      <CardHeader>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasMaterials ? (
          <p className="text-center text-muted-foreground py-8">
            No marketing materials available yet. Check back soon!
          </p>
        ) : (
          <>
            {/* PDF Guides */}
            {pdfGuides.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Quick Guide to Exhibiting
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pdfGuides.map((pdf) => (
                    <div key={pdf.id} className="border rounded-lg p-4 space-y-3 bg-muted/50">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-8 w-8 text-primary" />
                        <p className="font-medium text-sm">{pdf.title}</p>
                      </div>
                      {pdf.file_name && (
                        <p className="text-xs text-muted-foreground">{pdf.file_name}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => downloadFile(pdf.file_url || "", pdf.file_name || pdf.title || "guide.pdf")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Media */}
            {socialMedia.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Tag Us on Social Media</h3>
                <p className="text-sm text-muted-foreground mb-3">Don't forget to tag the show's social account when sharing these materials!</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {socialMedia.map((social) => (
                    <div
                      key={social.id}
                      className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                    >
                      <a
                        href={social.social_url || ""}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 hover:underline flex-1"
                      >
                        {getSocialIcon(social.social_platform || "")}
                        <span className="font-medium capitalize">{social.social_platform}</span>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(social.social_url || "");
                          toast.success("URL copied to clipboard!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show Logos */}
            {logos.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Show Logos
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {logos.map((logo) => (
                    <div key={logo.id} className="border rounded-lg p-4 space-y-3 bg-muted/50">
                      {logo.thumbnail_url ? (
                        <img
                          src={logo.thumbnail_url}
                          alt={logo.title || "Logo"}
                          className="w-full h-24 object-contain"
                        />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center bg-muted rounded">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-medium text-sm text-center">{logo.title}</p>
                      {logo.file_name && (
                        <p className="text-xs text-muted-foreground text-center">{logo.file_name}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => downloadFile(logo.file_url || "", logo.file_name || logo.title || "logo")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Exhibitor Graphics */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Exhibitor Graphics
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Download branded graphics to promote your participation
              </p>
              {graphics.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {graphics.map((graphic) => (
                    <div key={graphic.id} className="border rounded-lg p-4 space-y-3 bg-muted/50">
                      {graphic.thumbnail_url ? (
                        <img
                          src={graphic.thumbnail_url}
                          alt={graphic.title || "Graphic"}
                          className="w-full h-24 object-contain"
                        />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center bg-muted rounded">
                          <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <p className="font-medium text-sm text-center">{graphic.title}</p>
                      {graphic.file_name && (
                        <p className="text-xs text-muted-foreground text-center">{graphic.file_name}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => downloadFile(graphic.file_url || "", graphic.file_name || graphic.title || "graphic")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-8 text-center bg-muted/50">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Graphics will be available soon
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
