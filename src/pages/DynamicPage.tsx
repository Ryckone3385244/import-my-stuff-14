import { useEffect, useState, Suspense } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEventSettingsContext } from "@/contexts/EventSettingsContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PartialRenderer } from "@/components/layout/PartialRenderer";
import { ExhibitorSidebar } from "@/components/ExhibitorSidebar";
import { PageWithDraggableSections } from "@/components/editable";
import { supabase } from "@/integrations/supabase/client";
import { getRenderer, getAvailableRenderers } from "@/lib/templateRegistry";
import { toPageKey } from "@/lib/pageMigration";
import { useContentIntegrityCheck } from "@/hooks/useContentIntegrityCheck";

interface PageData {
  id: string;
  page_name: string;
  page_url: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  thumbnail_url: string | null;
  status: 'published' | 'draft';
  is_active: boolean;
}

/**
 * Generic dynamic page layout — used when no template renderer is found.
 * Fetches page metadata from website_pages and renders a title + CTA.
 */
const GenericDynamicPage = () => {
  const location = useLocation();
  const { eventName, replacePlaceholders } = useEventSettingsContext();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { verifyPageNotFound } = useContentIntegrityCheck();

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setNotFound(false);
      setPageData(null); // Reset page data to force fresh load

      // Helper to fetch page data
      const normalizedPath = location.pathname.toLowerCase();
      const fetchPage = async () => {
        const { data, error } = await supabase
          .from('website_pages')
          .select('*')
          .eq('page_url', normalizedPath)
          .eq('status', 'published')
          .eq('is_active', true)
          .maybeSingle();
        return { data, error };
      };

      // Retry with exponential backoff for newly created pages
      const maxRetries = 4;
      const delays = [0, 200, 500, 1000];
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (delays[attempt] > 0) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
        
        const { data, error } = await fetchPage();
        
        if (error) {
          console.error(`Error loading page (attempt ${attempt + 1}):`, location.pathname, error);
          if (attempt === maxRetries - 1) {
            // Before declaring 404 on error, run integrity check
            const integrity = await verifyPageNotFound(location.pathname);
            if (integrity.shouldRetry) {
              console.warn(
                `[DynamicPage] Integrity check suggests retry for "${location.pathname}" ` +
                `(reason: ${integrity.reason}). Attempting one more load...`
              );
              const { data: recoveredData } = await fetchPage();
              if (recoveredData) {
                setPageData(recoveredData);
                setLoading(false);
                return;
              }
            }
            setNotFound(true);
          }
          continue;
        }
        
        if (data) {
          setPageData(data);
          setLoading(false);
          return;
        }
        
        if (attempt === maxRetries - 1) {
          // Before declaring 404, run integrity check
          const integrity = await verifyPageNotFound(location.pathname);
          if (integrity.shouldRetry) {
            console.warn(
              `[DynamicPage] Integrity check suggests retry for "${location.pathname}" ` +
              `(reason: ${integrity.reason}). Attempting one more load...`
            );
            const { data: recoveredData } = await fetchPage();
            if (recoveredData) {
              setPageData(recoveredData);
              setLoading(false);
              return;
            }
          }
          console.error('Page not found after all retries:', location.pathname);
          setNotFound(true);
        }
      }
      setLoading(false);
    };

    loadPage();
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <PartialRenderer type="navbar" pageUrl={location.pathname} />
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
        </main>
        <PartialRenderer type="footer" pageUrl={location.pathname} />
      </div>
    );
  }

  if (notFound || !pageData) {
    return <Navigate to="/404" replace />;
  }

  const pageName = toPageKey(pageData.page_url);
  const isPortalPage = location.pathname.startsWith('/exhibitor-portal') || location.pathname.startsWith('/exhibitor/');
  
  return (
    <>
      <Helmet>
        <title>{replacePlaceholders(pageData.seo_title) || `${pageData.page_name} | ${eventName}`}</title>
        {pageData.seo_description && (
          <meta name="description" content={replacePlaceholders(pageData.seo_description)} />
        )}
        {pageData.seo_keywords && (
          <meta name="keywords" content={replacePlaceholders(pageData.seo_keywords)} />
        )}
        {pageData.thumbnail_url && (
          <>
            <meta property="og:image" content={pageData.thumbnail_url} />
            <meta name="twitter:image" content={pageData.thumbnail_url} />
          </>
        )}
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <PartialRenderer type="navbar" pageUrl={location.pathname} />
        <main className="flex-1 pt-page">
          <div className="container mx-auto px-4">
            {isPortalPage ? (
              <div className="flex gap-8">
                <aside className="w-64 flex-shrink-0 sticky top-24 h-fit hidden lg:block">
                  <ExhibitorSidebar 
                    renderTrigger={false}
                    alwaysVisible={true}
                  />
                </aside>
                <div className="lg:hidden fixed top-20 left-4 z-50">
                  <ExhibitorSidebar 
                    renderTrigger={true}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <PageWithDraggableSections
                    key={pageName}
                    pageName={pageName}
                    sections={[]}
                  />
                </div>
              </div>
            ) : (
              <PageWithDraggableSections
                key={pageName}
                pageName={pageName}
                sections={[]}
              />
            )}
          </div>
        </main>
        <PartialRenderer type="footer" pageUrl={location.pathname} />
      </div>
    </>
  );
};

/**
 * DynamicPage - Route resolver
 * 
 * Checks the template registry for a matching renderer based on the URL path.
 * If a template component exists (e.g., TravelAccommodation, WhyAttend), it renders that.
 * Falls back to slug-based inference (e.g. "why-exhibit" matches "exhibit" template).
 * Otherwise, falls back to the generic database-driven layout (GenericDynamicPage).
 */

// Auto-infer renderer from URL slug when no exact match exists
const inferRenderer = (slug: string): string | null => {
  const TemplateMap = getAvailableRenderers();
  // Exact match already checked by getRenderer
  // Try matching renderer keys by suffix: e.g. "why-exhibit" ends with "-exhibit"
  // Sort by key length descending to prefer longer (more specific) matches
  const sorted = [...TemplateMap].sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (slug === key || slug.endsWith(`-${key}`)) return key;
  }
  return null;
};

const DynamicPage = () => {
  const location = useLocation();

  // Derive template key from URL path
  const rendererKey = toPageKey(location.pathname);
  
  // Try exact match first, then slug-based inference
  let TemplateComponent = getRenderer(rendererKey);
  let resolvedKey = rendererKey;
  
  if (!TemplateComponent) {
    const inferredKey = inferRenderer(rendererKey);
    if (inferredKey) {
      TemplateComponent = getRenderer(inferredKey);
      resolvedKey = inferredKey;
    }
  }

  // If a template component exists, render it directly
  if (TemplateComponent) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex flex-col bg-background">
          <Navbar />
          <main className="flex-1 pt-page">
            <div className="container mx-auto px-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      }>
        <TemplateComponent key={resolvedKey} pageName={resolvedKey} />
      </Suspense>
    );
  }

  // No template found — use generic dynamic page layout
  return <GenericDynamicPage />;
};

export default DynamicPage;
