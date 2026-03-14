import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";
import { FileDown } from "lucide-react";

const ViewFloorplan = () => {
  const { data: eventSettings } = useEventSettings();
  const viewerUrl = (eventSettings as any)?.floorplan_url || "";

  return (
    <>
      <Helmet>
        <title>View Floorplan | {eventSettings?.event_name || DEFAULT_EVENT.NAME}</title>
        <meta
          name="description"
          content={`View the interactive floorplan for ${eventSettings?.event_name || DEFAULT_EVENT.NAME} at ${eventSettings?.location || DEFAULT_EVENT.LOCATION}.`}
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <section className="pt-page pb-5 bg-background">
            <div className="container mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title">
                Event Floorplan
              </h1>
              <p className="text-xl text-muted-foreground w-full mx-auto">
                Explore the venue layout and locate exhibitor booths
              </p>
            </div>
          </section>

          <section className="py-8">
            {viewerUrl ? (
              <div className="container mx-auto px-4">
                <div
                  className="relative w-full bg-card rounded-lg border border-border shadow-lg overflow-hidden"
                  style={{ paddingBottom: "56.25%" }}
                >
                  <object
                    data={viewerUrl}
                    type="application/pdf"
                    className="absolute inset-0 w-full h-full"
                    title="Document Viewer"
                  >
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(viewerUrl)}&embedded=true`}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen
                      title="Document Viewer Fallback"
                    />
                  </object>
                </div>
                <div className="mt-6 text-center">
                  <Button asChild>
                    <a href={viewerUrl} target="_blank" rel="noopener noreferrer">
                      <FileDown className="w-4 h-4 mr-2" />
                      Download / Open in new tab
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="container mx-auto px-4">
                <div className="bg-muted rounded-lg border border-border p-12 text-center">
                  <p className="text-muted-foreground">Coming soon</p>
                </div>
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ViewFloorplan;
