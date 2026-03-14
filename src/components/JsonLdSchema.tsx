import { Helmet } from "react-helmet-async";
import { useEventSettingsContext } from "@/contexts/EventSettingsContext";
import { useLocation } from "react-router-dom";

// Schema types supported
export type SchemaType = "Organization" | "Event" | "WebPage" | "BreadcrumbList" | "FAQPage" | "Article" | "Person";

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ArticleData {
  headline: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
}

interface PersonData {
  name: string;
  jobTitle?: string;
  image?: string;
  description?: string;
  worksFor?: string;
}

interface JsonLdSchemaProps {
  /** Schema type(s) to generate */
  type: SchemaType | SchemaType[];
  /** Page title for WebPage schema */
  pageTitle?: string;
  /** Page description for WebPage schema */
  pageDescription?: string;
  /** Breadcrumb items for BreadcrumbList schema */
  breadcrumbs?: BreadcrumbItem[];
  /** FAQ items for FAQPage schema */
  faqItems?: FAQItem[];
  /** Article data for Article schema */
  articleData?: ArticleData;
  /** Person data for Person schema */
  personData?: PersonData;
  /** Custom canonical URL override */
  canonicalUrl?: string;
}

/**
 * JsonLdSchema - Generates JSON-LD structured data for SEO
 * 
 * Usage:
 * - Organization: <JsonLdSchema type="Organization" />
 * - Event: <JsonLdSchema type="Event" />
 * - WebPage: <JsonLdSchema type="WebPage" pageTitle="About Us" />
 * - BreadcrumbList: <JsonLdSchema type="BreadcrumbList" breadcrumbs={[{name: "Home"}, {name: "Speakers"}]} />
 * - Multiple: <JsonLdSchema type={["Organization", "Event", "WebPage"]} pageTitle="Home" />
 */
export const JsonLdSchema = ({
  type,
  pageTitle,
  pageDescription,
  breadcrumbs,
  faqItems,
  articleData,
  personData,
  canonicalUrl,
}: JsonLdSchemaProps) => {
  const { eventName, eventDate, eventLocation, eventTagline } = useEventSettingsContext();
  const location = useLocation();

  // Null guard - handle undefined schemas gracefully
  const typeArray = Array.isArray(type) ? type : [type];
  const types = typeArray.filter((s): s is SchemaType => s !== undefined && s !== null);
  
  if (types.length === 0) {
    return null;
  }
  
  // Generate base URL - always use production domain for structured data
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const currentUrl = canonicalUrl || `${baseUrl}${location.pathname}`;

  const schemas: object[] = [];

  // Organization Schema
  if (types.includes("Organization")) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: eventName,
      url: baseUrl,
      logo: `${baseUrl}/favicon.png`,
      description: eventTagline || `${eventName} - Industry-leading trade show and exhibition`,
      sameAs: [
        // Social links can be added dynamically from event_settings if needed
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        url: `${baseUrl}/contact`,
      },
    });
  }

  // Event Schema
  if (types.includes("Event")) {
    // Parse event date for structured data
    let startDate = eventDate;
    let endDate = eventDate;
    
    // Try to parse date ranges like "September 9th & 10th 2026"
    const dateMatch = eventDate?.match(/(\w+)\s+(\d+)(?:st|nd|rd|th)?\s*(?:&|and|-)\s*(\d+)(?:st|nd|rd|th)?\s+(\d{4})/i);
    if (dateMatch) {
      const [, month, startDay, endDay, year] = dateMatch;
      const monthNum = new Date(`${month} 1, 2000`).getMonth() + 1;
      startDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
      endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    }

    schemas.push({
      "@context": "https://schema.org",
      "@type": "Event",
      name: eventName,
      description: eventTagline || pageDescription || `Join us at ${eventName}`,
      startDate,
      endDate,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: eventLocation,
        address: {
          "@type": "PostalAddress",
          addressLocality: eventLocation,
        },
      },
      organizer: {
        "@type": "Organization",
        name: eventName,
        url: baseUrl,
      },
      offers: {
        "@type": "Offer",
        url: `${baseUrl}/registration`,
        availability: "https://schema.org/InStock",
      },
      image: `${baseUrl}/favicon.png`,
    });
  }

  // WebPage Schema
  if (types.includes("WebPage")) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: pageTitle || eventName,
      description: pageDescription || eventTagline,
      url: currentUrl,
      isPartOf: {
        "@type": "WebSite",
        name: eventName,
        url: baseUrl,
      },
      publisher: {
        "@type": "Organization",
        name: eventName,
        url: baseUrl,
      },
    });
  }

  // BreadcrumbList Schema
  if (types.includes("BreadcrumbList") && breadcrumbs && breadcrumbs.length > 0) {
    const breadcrumbItems = [
      { name: "Home", url: baseUrl },
      ...breadcrumbs,
    ];

    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url || `${baseUrl}${location.pathname}`,
      })),
    });
  }

  // FAQPage Schema
  if (types.includes("FAQPage") && faqItems && faqItems.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  // Article Schema
  if (types.includes("Article") && articleData) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: articleData.headline,
      description: articleData.description,
      image: articleData.image,
      datePublished: articleData.datePublished,
      dateModified: articleData.dateModified || articleData.datePublished,
      author: {
        "@type": "Person",
        name: articleData.author || eventName,
      },
      publisher: {
        "@type": "Organization",
        name: eventName,
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${baseUrl}/favicon.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": currentUrl,
      },
    });
  }

  // Person Schema (for speakers)
  if (types.includes("Person") && personData) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Person",
      name: personData.name,
      jobTitle: personData.jobTitle,
      image: personData.image,
      description: personData.description,
      worksFor: personData.worksFor ? {
        "@type": "Organization",
        name: personData.worksFor,
      } : undefined,
    });
  }

  if (schemas.length === 0) return null;

  return (
    <Helmet>
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default JsonLdSchema;
