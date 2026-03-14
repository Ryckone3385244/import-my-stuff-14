import { DynamicHelmet } from "@/components/DynamicHelmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EditableText, PageWithDraggableSections, SectionWithDraggableColumns, EditableImage } from "@/components/editable";
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface GalleryPhoto {
  id: string;
  photo_url: string;
  photo_order: number;
}

const PhotoGallery = () => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .order('photo_order', { ascending: true });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const goToPrevious = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const goToNext = () => {
    if (lightboxIndex !== null && lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') closeLightbox();
  };

  return (
    <>
      <DynamicHelmet titlePrefix="Photo Gallery" />
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-page">
          <PageWithDraggableSections
            pageName="photo-gallery"
            sections={[
              {
                id: 'hero',
                component: (
                  <section className="pt-page pb-5">
                    <div className="container mx-auto px-4 text-center">
                      <EditableText 
                        pageName="photo-gallery" 
                        sectionName="hero" 
                        contentKey="title" 
                        defaultValue="Show Photo Gallery" 
                        className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title" 
                        as="h1" 
                      />
                      <EditableText 
                        pageName="photo-gallery" 
                        sectionName="hero" 
                        contentKey="subtitle" 
                        defaultValue="Explore our collection of event photos" 
                        className="text-xl text-muted-foreground w-full" 
                        as="p" 
                      />
                    </div>
                  </section>
                )
              },
              {
                id: 'gallery',
                component: (
                  <section className="py-16">
                    <div className="container mx-auto px-4">
                      {loading ? (
                        <div className="text-center py-12 text-muted-foreground">Loading photos...</div>
                      ) : photos.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">No photos available</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {photos.map((photo, index) => (
                            <div 
                              key={photo.id} 
                              className="aspect-[4/3] bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openLightbox(index)}
                            >
                              <img 
                                src={photo.photo_url} 
                                alt={`Gallery photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )
              }
            ]}
          />
        </main>
        <Footer />
      </div>

      <Dialog open={lightboxIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent 
          className="max-w-[95vw] w-full h-[95vh] p-0 bg-black/95 border-0 [&>button]:hidden overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20 bg-black/50 z-50 h-10 w-10 rounded-full"
                onClick={closeLightbox}
              >
                <X className="h-6 w-6" />
              </Button>

              {lightboxIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 h-12 w-12 z-50 rounded-full"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              )}

              <img 
                src={photos[lightboxIndex].photo_url} 
                alt={`Gallery photo ${lightboxIndex + 1}`}
                className="max-w-[calc(100%-8rem)] max-h-[calc(100%-4rem)] w-auto h-auto object-contain"
              />

              {lightboxIndex < photos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 bg-black/50 h-12 w-12 z-50 rounded-full"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              )}

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {lightboxIndex + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGallery;
