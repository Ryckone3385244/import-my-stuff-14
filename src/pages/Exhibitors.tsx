import { DynamicHelmet } from "@/components/DynamicHelmet";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import ExhibitorCard from "@/components/ExhibitorCard";
import ExhibitorDetailDialog from "@/components/ExhibitorDetailDialog";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StyledButton } from "@/components/ui/styled-button";
import { Input } from "@/components/ui/input";
import { EditableText } from "@/components/editable/EditableText";
import { EditableEmbed } from "@/components/editable/EditableEmbed";
import { PageWithDraggableSections } from '@/components/editable';
import { useEventSettings } from "@/hooks/useEventSettings";
import { DEFAULT_EVENT } from "@/lib/constants";

interface Exhibitor {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  booth_number: string | null;
  is_active: boolean;
  category: string | null;
  short_description: string | null;
  banner_url: string | null;
  company_profile: string | null;
  show_contact_button: boolean;
}

const Exhibitors = () => {
  const { data: eventSettings } = useEventSettings();
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const itemsPerPage = 10;

  const {
    data: exhibitors,
    isLoading
  } = useQuery({
    queryKey: ["exhibitors"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase
        .from("exhibitors")
        .select("*")
        .or('approval_status.eq.approved,approval_status.is.null')
        .eq('is_active', true);
      if (error) throw error;
      // Filter out exhibitors without logos
      return data?.filter(exhibitor => exhibitor.logo_url) || [];
    }
  });

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const filteredExhibitors = useMemo(() => {
    if (!exhibitors) return [];
    
    let filtered = exhibitors;
    
    // Apply letter filter
    if (selectedLetter) {
      filtered = filtered.filter(exhibitor => 
        exhibitor.name.toUpperCase().startsWith(selectedLetter)
      );
    }
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(exhibitor => 
        exhibitor.name.toLowerCase().includes(query) ||
        exhibitor.description?.toLowerCase().includes(query) ||
        exhibitor.booth_number?.toLowerCase().includes(query)
      );
    }
    
    // Sort alphabetically by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [exhibitors, selectedLetter, searchQuery]);

  const totalPages = Math.ceil(filteredExhibitors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExhibitors = filteredExhibitors.slice(startIndex, endIndex);

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(selectedLetter === letter ? null : letter);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sections = useMemo(() => [
    {
      id: 'exhibitors-hero',
      component: (
        <section className="py-4 md:pt-0">
          <div className="text-center mb-4 animate-fade-up">
            <EditableText 
              pageName="exhibitors" 
              sectionName="hero" 
              contentKey="title" 
              defaultValue="Our Exhibitors" 
              className="text-4xl md:text-5xl font-bold mb-4 text-gradient-title pt-5"
              as="h1"
            />
            <EditableText
              pageName="exhibitors" 
              sectionName="hero" 
              contentKey="subtitle" 
              defaultValue="Explore innovative companies and discover the latest food-to-go trends" 
              className="text-xl text-muted-foreground w-full mx-auto"
              as="p"
            />
          </div>
        </section>
      )
    },
    {
      id: 'exhibitors-list',
      component: (
        <section className="py-4">
          {/* Filter Icons Row */}
          <div className="mb-8 min-h-[48px] relative">
            {/* Search Bar (when open) */}
            {searchOpen && (
              <div className="absolute top-0 right-[108px] left-0 animate-slide-in-right">
                <div className="relative max-w-xl ml-auto mr-3">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, category, booth number..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-12 pr-12 h-12 text-base border-2 border-muted focus:border-muted rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                    aria-label="Search exhibitors by name, category, or booth number"
                  />
                  <button
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}

            {/* A-Z Filter (when open) */}
            {filterOpen && (
              <div className="absolute top-0 right-[108px] left-0 animate-slide-in-right flex items-center h-12">
                <div className="flex flex-wrap gap-1 md:gap-2 justify-end mr-3 w-full">
                  {alphabet.map(letter => (
                    <Button
                      key={letter}
                      variant={selectedLetter === letter ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleLetterClick(letter)}
                      className={`h-9 w-9 p-0 text-sm ${selectedLetter === letter ? "bg-foreground text-background" : "hover:bg-muted"}`}
                    >
                      {letter}
                    </Button>
                  ))}
                  {selectedLetter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedLetter(null);
                        setCurrentPage(1);
                      }}
                      className="text-primary hover:text-primary-glow h-9 text-sm"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Fixed position icons */}
            <div className="absolute right-0 top-0 flex items-center gap-3">
              {/* Search Toggle */}
              <button
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  if (filterOpen) setFilterOpen(false);
                }}
                className={`p-3 rounded-full transition-all duration-300 group shrink-0 ${
                  searchOpen ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
                aria-label="Toggle search"
              >
                <Search className={`h-5 w-5 group-hover:scale-110 transition-transform ${
                  searchOpen ? 'text-primary-foreground' : 'text-muted-foreground'
                }`} />
              </button>

              {/* A-Z Filter Toggle */}
              <button
                onClick={() => {
                  setFilterOpen(!filterOpen);
                  if (searchOpen) setSearchOpen(false);
                }}
                className={`p-3 rounded-full transition-all duration-300 group shrink-0 ${
                  filterOpen ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
                aria-label="Toggle A-Z filter"
              >
                <SlidersHorizontal className={`h-5 w-5 group-hover:scale-110 transition-transform ${
                  filterOpen ? 'text-primary-foreground' : 'text-muted-foreground'
                }`} />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : currentExhibitors && currentExhibitors.length > 0 ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-[10px] lg:gap-10 animate-fade-in mb-8 items-stretch">
                {currentExhibitors.map(exhibitor => (
                  <ExhibitorCard 
                    key={exhibitor.id} 
                    id={exhibitor.id} 
                    name={exhibitor.name} 
                    description={exhibitor.description || undefined} 
                    logoUrl={exhibitor.logo_url || undefined} 
                    website={exhibitor.website || undefined} 
                    boothNumber={exhibitor.booth_number || undefined}
                    onClick={() => {
                      setSelectedExhibitor(exhibitor);
                      setDialogOpen(true);
                    }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-end items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="disabled:opacity-50 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      currentPage === page ? (
                        <StyledButton
                          key={page}
                          styleType="button1"
                          onClick={() => handlePageChange(page)}
                          aria-label={`Page ${page}`}
                          aria-current="page"
                        >
                          {page}
                        </StyledButton>
                      ) : (
                        <Button
                          key={page}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          aria-label={`Go to page ${page}`}
                        >
                          {page}
                        </Button>
                      )
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="disabled:opacity-50 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-xl text-muted-foreground">
                {selectedLetter 
                  ? `No exhibitors found starting with "${selectedLetter}"`
                  : "No exhibitors available yet. Check back soon!"
                }
              </p>
            </div>
          )}
        </section>
      )
    },
    {
      id: 'exhibitor-cta',
      component: (
        <section className="py-20 text-white relative overflow-hidden" style={{
          background: 'var(--gradient-title)'
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.2) 0%, transparent 70%)'
          }}></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <EditableText 
                  pageName="exhibitors" 
                  sectionName="cta" 
                  contentKey="title" 
                  defaultValue="Want to Exhibit?" 
                  className="text-4xl md:text-5xl font-bold mb-6 pt-5" 
                  as="h2" 
                />
                {!showForm && (
                  <>
                    <EditableText 
                      pageName="exhibitors" 
                      sectionName="cta" 
                      contentKey="description" 
                      defaultValue="Join these innovative companies and showcase your products to thousands of qualified buyers" 
                      className="text-xl text-white/80 mb-8" 
                      as="p" 
                    />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="px-12 py-6 text-lg shadow-glow-strong"
                    >
                      <EditableText
                        pageName="exhibitors"
                        sectionName="cta"
                        contentKey="button_text"
                        defaultValue="Book Your Booth"
                        as="span"
                      />
                    </StyledButton>
                  </>
                )}
              </div>
              
              {showForm && (
                <div className="overflow-hidden animate-stretch-in">
                  <div className="opacity-0 animate-form-appear">
                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={() => setShowForm(false)} 
                        className="text-white hover:text-white/80 transition-colors flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                        <span>Close</span>
                      </button>
                    </div>
                    
                    <div className="bg-black rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
                      <div className="p-8 md:p-12">
                        <h2 className="text-3xl font-bold mb-4 text-center text-white">Exhibitor Inquiry Form</h2>
                        <p className="text-white/80 text-center mx-auto">
                          Complete the form below to book your booth at {eventSettings?.event_name || DEFAULT_EVENT.NAME}
                        </p>
                      </div>

                      <div className="w-full bg-black -mb-4">
                        <EditableEmbed
                          pageName="exhibitors"
                          sectionName="cta"
                          contentKey="form_embed"
                          defaultSrc="/grab-go-exhibit-enquiry.html"
                          height="880px"
                          className="w-full border-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )
    }
  ], [exhibitors, selectedLetter, searchQuery, currentPage, filteredExhibitors, currentExhibitors, totalPages, isLoading, alphabet, showForm, eventSettings]);
  return <>
      <DynamicHelmet 
        titlePrefix="Exhibitors"
        description="Browse 500+ exhibitors at {eventName}. Discover innovative food-to-go products, packaging solutions, and foodservice equipment. {eventDate} at {eventLocation}."
        keywords="{eventName}, exhibitors, food-to-go suppliers, foodservice vendors, product showcase, {eventLocation}"
      />

      <div className="min-h-screen flex flex-col bg-background pt-page">
        <Navbar />
        
        <main className="flex-1 container mx-auto px-4 pt-page pb-12">
          <PageWithDraggableSections
            pageName="exhibitors"
            sections={sections.filter(s => s.id !== 'exhibitor-cta')}
          />
        </main>
        
        {/* Full Width CTA Section */}
        <section className="mt-10 py-20 text-white relative overflow-hidden" style={{
          background: 'var(--gradient-title)'
        }}>
          <div className="absolute inset-0 opacity-20" style={{
            background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.2) 0%, transparent 70%)'
          }}></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <EditableText 
                  pageName="exhibitors" 
                  sectionName="cta" 
                  contentKey="title" 
                  defaultValue="Want to Exhibit?" 
                  className="text-4xl md:text-5xl font-bold mb-6 pt-5" 
                  as="h2" 
                />
                {!showForm && (
                  <>
                    <EditableText 
                      pageName="exhibitors" 
                      sectionName="cta" 
                      contentKey="description" 
                      defaultValue="Join these innovative companies and showcase your products to thousands of qualified buyers" 
                      className="text-xl text-white/80 mb-8" 
                      as="p" 
                    />
                    <StyledButton 
                      onClick={() => setShowForm(true)} 
                      styleType="button2"
                      className="px-12 py-6 text-lg shadow-glow-strong"
                    >
                      <EditableText
                        pageName="exhibitors"
                        sectionName="cta"
                        contentKey="button_text"
                        defaultValue="Book Your Booth"
                        as="span"
                      />
                    </StyledButton>
                  </>
                )}
              </div>
              
              {showForm && (
                <div className="overflow-hidden animate-stretch-in">
                  <div className="opacity-0 animate-form-appear">
                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={() => setShowForm(false)} 
                        className="text-white hover:text-white/80 transition-colors flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                        <span>Close</span>
                      </button>
                    </div>
                    
                    <div className="bg-black rounded-2xl border border-primary/20 shadow-glow-strong overflow-hidden">
                      <div className="p-8 md:p-12">
                        <h2 className="text-3xl font-bold mb-4 text-center text-white">Exhibitor Inquiry Form</h2>
                        <p className="text-white/80 text-center mx-auto">
                          Complete the form below to book your booth at {eventSettings?.event_name || DEFAULT_EVENT.NAME}
                        </p>
                      </div>

                      <div className="w-full bg-black -mb-4">
                        <EditableEmbed
                          pageName="exhibitors"
                          sectionName="cta"
                          contentKey="form_embed"
                          defaultSrc="/grab-go-exhibit-enquiry.html"
                          height="880px"
                          className="w-full border-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
        
        <ExhibitorDetailDialog
          exhibitor={selectedExhibitor}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
        
        <Footer />
      </div>
    </>;
};
export default Exhibitors;