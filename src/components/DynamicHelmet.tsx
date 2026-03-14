import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useEventSettingsContext } from "@/contexts/EventSettingsContext";

// Production domain for canonical URLs
const PRODUCTION_DOMAIN = typeof window !== 'undefined' ? window.location.origin : '';

interface DynamicHelmetProps {
  titlePrefix?: string;
  titleSuffix?: string;
  description?: string;
  noIndex?: boolean;
  keywords?: string;
  customTitle?: string;
  /** Override the auto-generated canonical URL */
  canonicalUrl?: string;
  /** Set to true to disable canonical tag (e.g., for admin pages) */
  noCanonical?: boolean;
  /** Open Graph image URL */
  ogImage?: string;
  /** Open Graph type (website, article, profile) */
  ogType?: "website" | "article" | "profile";
  /** Article published time (ISO 8601) */
  articlePublishedTime?: string;
  /** Article modified time (ISO 8601) */
  articleModifiedTime?: string;
}

/**
 * DynamicHelmet component that automatically pulls the event name from database.
 * 
 * Usage:
 * - <DynamicHelmet titlePrefix="Page Name" /> → "Page Name | Customer Connect Expo"
 * - <DynamicHelmet titlePrefix="Page Name" description="Description with {eventName} placeholder." />
 * - <DynamicHelmet customTitle="Full Custom Title" /> → Uses exact title provided
 * - <DynamicHelmet titlePrefix="Admin Page" noIndex /> → Adds noindex, nofollow
 * - <DynamicHelmet ogImage="/path/to/image.jpg" ogType="article" /> → Article OG tags
 * 
 * Supported placeholders in title and description:
 * - {eventName} - Event name from settings
 * - {eventDate} - Event date from settings
 * - {eventLocation} - Event location from settings
 * - {eventTagline} - Event tagline from settings
 */
export const DynamicHelmet = ({
  titlePrefix,
  titleSuffix,
  description,
  noIndex = false,
  keywords,
  customTitle,
  canonicalUrl,
  noCanonical = false,
  ogImage,
  ogType = "website",
  articlePublishedTime,
  articleModifiedTime,
}: DynamicHelmetProps) => {
  const { eventName, replacePlaceholders } = useEventSettingsContext();
  const location = useLocation();

  // Build the title
  let title: string;
  if (customTitle) {
    title = replacePlaceholders(customTitle);
  } else if (titlePrefix && titleSuffix) {
    title = `${replacePlaceholders(titlePrefix)} | ${eventName} ${replacePlaceholders(titleSuffix)}`;
  } else if (titlePrefix) {
    title = `${replacePlaceholders(titlePrefix)} | ${eventName}`;
  } else if (titleSuffix) {
    title = `${eventName} ${replacePlaceholders(titleSuffix)}`;
  } else {
    title = eventName;
  }

  // Replace placeholders in description
  const processedDescription = description ? replacePlaceholders(description) : undefined;
  
  // Replace placeholders in keywords
  const processedKeywords = keywords ? replacePlaceholders(keywords) : undefined;

  // Generate canonical URL - always use production domain
  const generateCanonicalUrl = (): string | undefined => {
    if (noCanonical || noIndex) return undefined;
    
    if (canonicalUrl) {
      // If custom canonical provided, use it (replace placeholders if needed)
      return replacePlaceholders(canonicalUrl);
    }
    
    // Always use production domain for canonical URLs
    const pathname = location.pathname;
    // Remove trailing slash for consistency (except for root)
    const cleanPath = pathname === '/' ? '' : pathname.replace(/\/$/, '');
    return `${PRODUCTION_DOMAIN}${cleanPath}`;
  };

  const canonical = generateCanonicalUrl();
  
  // Generate OG image URL - ensure it uses production domain
  const getOgImageUrl = (): string => {
    if (ogImage) {
      // If it's a relative URL, prepend production domain
      if (ogImage.startsWith('/')) {
        return `${PRODUCTION_DOMAIN}${ogImage}`;
      }
      // If it's already absolute, use as-is
      return ogImage;
    }
    // Default OG image
    return `${PRODUCTION_DOMAIN}/og-image.png`;
  };

  const ogImageUrl = getOgImageUrl();

  return (
    <Helmet>
      <title>{title}</title>
      {processedDescription && <meta name="description" content={processedDescription} />}
      {processedKeywords && <meta name="keywords" content={processedKeywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      {processedDescription && <meta property="og:description" content={processedDescription} />}
      <meta property="og:type" content={ogType} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:site_name" content={eventName} />
      <meta property="og:locale" content="en_US" />
      
      {/* Article-specific OG tags */}
      {ogType === "article" && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === "article" && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {processedDescription && <meta name="twitter:description" content={processedDescription} />}
      <meta name="twitter:image" content={ogImageUrl} />
      {canonical && <meta name="twitter:url" content={canonical} />}
    </Helmet>
  );
};

export default DynamicHelmet;
