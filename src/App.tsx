import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { EditModeProvider } from "./contexts/EditModeContext";
import { BuilderProvider } from "./contexts/BuilderContext";
import { EventSettingsProvider } from "./contexts/EventSettingsContext";
import { ScrollToTop } from "./components/ScrollToTop";
import { BackToTop } from "./components/BackToTop";

import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { useCustomCSS } from "@/hooks/useCustomCSS";
import { useGlobalHTMLSnippets } from "@/hooks/useGlobalHTMLSnippets";
import { useRealtimeAdminSync } from "@/hooks/useRealtimeAdminSync";
import { useAdminPageDetection } from "@/hooks/useAdminPageDetection";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";
import { useEventSettings } from "@/hooks/useEventSettings";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { AppLoadingScreen } from "./components/AppLoadingScreen";

// === EAGER IMPORTS: Catch-all and critical pages ===
import NotFound from "./pages/NotFound";
import DynamicPage from "./pages/DynamicPage";
import { FloatingSaveButton } from "./components/editable/FloatingSaveButton";
import { UnsavedChangesGuard } from "./components/editable/UnsavedChangesGuard";
import { BuilderShell } from "./components/builder/BuilderShell";

// === LAZY IMPORTS: Public data pages ===
const Exhibitors = lazy(() => import("./pages/Exhibitors"));
const ExhibitorDetail = lazy(() => import("./pages/ExhibitorDetail"));
const PartnerDetail = lazy(() => import("./pages/PartnerDetail"));
const Speakers = lazy(() => import("./pages/Speakers"));
const SpeakerDetail = lazy(() => import("./pages/SpeakerDetail"));
const News = lazy(() => import("./pages/News"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Sitemap = lazy(() => import("./pages/Sitemap"));

// === LAZY IMPORTS: Auth pages ===
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SetPassword = lazy(() => import("./pages/SetPassword"));

// === LAZY IMPORTS: Admin pages ===
const AdminAccess = lazy(() => import("./pages/AdminAccess"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminExhibitorEdit = lazy(() => import("./pages/AdminExhibitorEdit"));
const AdminSpeakerEdit = lazy(() => import("./pages/AdminSpeakerEdit"));
const AdminSpeakerBulkUpload = lazy(() => import("./pages/AdminSpeakerBulkUpload"));
const AdminMediaLibrary = lazy(() => import("./pages/AdminMediaLibrary"));
const AdminPages = lazy(() => import("./pages/AdminPages"));
const AdminMenu = lazy(() => import("./pages/AdminMenu"));
const AdminGlobalHTML = lazy(() => import("./pages/AdminGlobalHTML"));
const AdminStyles = lazy(() => import("./pages/AdminStyles"));
const AdminAgenda = lazy(() => import("./pages/AdminAgenda"));
const AdminCustomCSS = lazy(() => import("./pages/AdminCustomCSS"));
const AdminEventSettings = lazy(() => import("./pages/AdminEventSettings"));
const AdminGoogleDriveSettings = lazy(() => import("./pages/AdminGoogleDriveSettings"));
const AdminSitemapGenerator = lazy(() => import("./pages/AdminSitemapGenerator"));
const AdminOtherConfigs = lazy(() => import("./pages/AdminOtherConfigs"));

// === LAZY IMPORTS: Exhibitor Portal pages ===
const ExhibitorLogin = lazy(() => import("./pages/ExhibitorLogin"));
const ExhibitorPortal = lazy(() => import("./pages/ExhibitorPortal"));
const ExhibitorCompanyProfile = lazy(() => import("./pages/ExhibitorCompanyProfile"));
const ExhibitorStandInfo = lazy(() => import("./pages/ExhibitorStandInfo"));
const ExhibitorContacts = lazy(() => import("./pages/ExhibitorContacts"));
const ExhibitorMarketing = lazy(() => import("./pages/ExhibitorMarketing"));
const ExhibitorSuppliers = lazy(() => import("./pages/ExhibitorSuppliers"));
const ExhibitorDeadlines = lazy(() => import("./pages/ExhibitorDeadlines"));
const ExhibitorForms = lazy(() => import("./pages/ExhibitorForms"));
const ExhibitorActivities = lazy(() => import("./pages/ExhibitorActivities"));
const ExhibitorOnsite = lazy(() => import("./pages/ExhibitorOnsite"));
const ExhibitorSampling = lazy(() => import("./pages/ExhibitorSampling"));
const ExhibitorClaritiv = lazy(() => import("./pages/ExhibitorClaritiv"));
const ExhibitorDataCollection = lazy(() => import("./pages/ExhibitorDataCollection"));
const ExhibitorMarketingSupport = lazy(() => import("./pages/ExhibitorMarketingSupport"));
const ExhibitorHotel = lazy(() => import("./pages/ExhibitorHotel"));
const ExhibitorContact = lazy(() => import("./pages/ExhibitorContact"));
const ExhibitorInquiries = lazy(() => import("./pages/ExhibitorInquiries"));
const ExhibitorMyListing = lazy(() => import("./pages/ExhibitorMyListing"));

// === LAZY IMPORTS: Speaker Portal pages ===
const SpeakerLogin = lazy(() => import("./pages/SpeakerLogin"));
const SpeakerPortal = lazy(() => import("./pages/SpeakerPortal"));
const SpeakerHome = lazy(() => import("./pages/SpeakerHome"));
const SpeakerProfile = lazy(() => import("./pages/SpeakerProfile"));
const SpeakerUpload = lazy(() => import("./pages/SpeakerUpload"));
const SpeakerSession = lazy(() => import("./pages/SpeakerSession"));
const SpeakerContact = lazy(() => import("./pages/SpeakerContact"));



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Root layout component that includes global hooks and providers
const RootLayout = () => {
  const { stylesLoaded } = useTheme();
  const { data: eventSettings } = useEventSettings();
  useVisitorTracking();
  useCustomCSS();
  useGlobalHTMLSnippets();
  useRealtimeAdminSync();
  useAdminPageDetection();
  useDynamicFavicon(eventSettings?.event_name, (eventSettings as any)?.favicon_url);
  
  return (
    <>
      <AppLoadingScreen isLoading={!stylesLoaded} />
      <ScrollToTop />
      <BackToTop />
      
      <FloatingSaveButton />
      <UnsavedChangesGuard />
      <BuilderShell>
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </BuilderShell>
    </>
  );
};

// Create data router with all routes
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // === HOME (dynamic) ===
      { path: "/", element: <DynamicPage /> },

      // === DATA-DRIVEN LISTING PAGES ===
      { path: "/exhibitors", element: <Exhibitors /> },
      { path: "/exhibitors/:id", element: <ExhibitorDetail /> },
      { path: "/speakers", element: <Speakers /> },
      { path: "/speakers/:id", element: <SpeakerDetail /> },
      { path: "/news", element: <News /> },
      { path: "/news/:slug", element: <BlogPost /> },
      { path: "/blogs", element: <News /> },
      { path: "/blogs/:slug", element: <BlogPost /> },

      // === ADMIN ROUTES ===
      { path: "/admin", element: <Admin /> },
      { path: "/admin/exhibitor/:id", element: <AdminExhibitorEdit /> },
      { path: "/admin/speaker/:id", element: <AdminSpeakerEdit /> },
      { path: "/admin/speaker-bulk-upload", element: <AdminSpeakerBulkUpload /> },
      { path: "/admin/media-library", element: <AdminMediaLibrary /> },
      { path: "/admin/pages", element: <AdminPages /> },
      { path: "/admin/menu", element: <AdminMenu /> },
      { path: "/admin/global-html", element: <AdminGlobalHTML /> },
      { path: "/admin/styles", element: <AdminStyles /> },
      { path: "/admin/custom-css", element: <AdminCustomCSS /> },
      { path: "/admin/agenda", element: <AdminAgenda /> },
      { path: "/admin/event-settings", element: <AdminEventSettings /> },
      { path: "/admin/google-drive", element: <AdminGoogleDriveSettings /> },
      { path: "/admin/sitemap-generator", element: <AdminSitemapGenerator /> },
      { path: "/admin/other-configs", element: <AdminOtherConfigs /> },

      // === AUTH ROUTES ===
      { path: "/login", element: <Login /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/set-password", element: <SetPassword /> },

      // === EXHIBITOR PORTAL ===
      { path: "/exhibitor-portal/login", element: <ExhibitorLogin /> },
      { path: "/exhibitor-portal", element: <ExhibitorPortal /> },
      { path: "/exhibitor-portal/company-profile", element: <ExhibitorCompanyProfile /> },
      { path: "/exhibitor-portal/stand-info", element: <ExhibitorStandInfo /> },
      { path: "/exhibitor-portal/contacts", element: <ExhibitorContacts /> },
      { path: "/exhibitor-portal/marketing-materials", element: <ExhibitorMarketing /> },
      { path: "/exhibitor-portal/suppliers", element: <ExhibitorSuppliers /> },
      { path: "/exhibitor-portal/deadlines", element: <ExhibitorDeadlines /> },
      { path: "/exhibitor-portal/forms", element: <ExhibitorForms /> },
      { path: "/exhibitor-portal/activities", element: <ExhibitorActivities /> },
      { path: "/exhibitor-portal/onsite", element: <ExhibitorOnsite /> },
      { path: "/exhibitor-portal/sampling", element: <ExhibitorSampling /> },
      { path: "/exhibitor-portal/claritiv", element: <ExhibitorClaritiv /> },
      { path: "/exhibitor-portal/data-collection", element: <ExhibitorDataCollection /> },
      { path: "/exhibitor-portal/marketing", element: <ExhibitorMarketingSupport /> },
      { path: "/exhibitor-portal/hotel", element: <ExhibitorHotel /> },
      { path: "/exhibitor-portal/contact", element: <ExhibitorContact /> },
      { path: "/exhibitor-portal/contact-customer-service", element: <ExhibitorContact /> },
      { path: "/exhibitor-portal/inquiries", element: <ExhibitorInquiries /> },
      { path: "/exhibitor-portal/my-listing", element: <ExhibitorMyListing /> },
      { path: "/exhibitor-portal/*", element: <DynamicPage /> },

      // === SPEAKER PORTAL ===
      { path: "/speaker-portal/login", element: <SpeakerLogin /> },
      {
        path: "/speaker-portal",
        element: <SpeakerPortal />,
        children: [
          { index: true, element: <SpeakerHome /> },
          { path: "profile", element: <SpeakerProfile /> },
          { path: "upload", element: <SpeakerUpload /> },
          { path: "session", element: <SpeakerSession /> },
          { path: "contact", element: <SpeakerContact /> },
        ],
      },

      // === PARTNER DETAIL ===
      { path: "/partners/:slug", element: <PartnerDetail /> },

      // === SPECIAL PAGES ===
      { path: "/sitemap", element: <Sitemap /> },
      { path: "/agenda", element: <Agenda /> },
      { path: "/404", element: <NotFound /> },

      // === CATCH-ALL: DynamicPage handles all other routes ===
      { path: "*", element: <DynamicPage /> },
    ],
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <EditModeProvider>
        <BuilderProvider>
          <EventSettingsProvider>
            <ThemeProvider>
              <Toaster />
              <Sonner />
              <RouterProvider router={router} />
            </ThemeProvider>
          </EventSettingsProvider>
        </BuilderProvider>
      </EditModeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
