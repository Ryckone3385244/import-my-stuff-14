import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml; charset=utf-8",
};

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get base URL from request or event_domain setting
    const url = new URL(req.url);
    const { data: eventSettings } = await supabase.from("event_settings").select("event_domain").limit(1).maybeSingle();
    const domainFromDb = eventSettings?.event_domain ? `https://${eventSettings.event_domain}` : null;
    const baseUrl = url.searchParams.get("baseUrl") || domainFromDb || url.origin;

    console.log("Generating sitemap for:", baseUrl);

    const urls: UrlEntry[] = [];
    const now = new Date().toISOString().split("T")[0];

    // Static pages with priorities
    const staticPages = [
      { path: "/", priority: "1.0", changefreq: "daily" },
      { path: "/registration", priority: "0.9", changefreq: "weekly" },
      { path: "/exhibit", priority: "0.9", changefreq: "weekly" },
      { path: "/speakers", priority: "0.8", changefreq: "weekly" },
      { path: "/exhibitors", priority: "0.8", changefreq: "weekly" },
      { path: "/agenda", priority: "0.8", changefreq: "weekly" },
      { path: "/why-attend", priority: "0.7", changefreq: "monthly" },
      { path: "/who-attends", priority: "0.7", changefreq: "monthly" },
      { path: "/why-exhibit", priority: "0.7", changefreq: "monthly" },
      { path: "/become-a-sponsor", priority: "0.7", changefreq: "monthly" },
      { path: "/floorplan", priority: "0.6", changefreq: "weekly" },
      { path: "/news", priority: "0.7", changefreq: "daily" },
      { path: "/about-us", priority: "0.5", changefreq: "monthly" },
      { path: "/travel-accommodation", priority: "0.5", changefreq: "monthly" },
      { path: "/photo-gallery", priority: "0.5", changefreq: "monthly" },
      { path: "/press-opportunities", priority: "0.5", changefreq: "monthly" },
      { path: "/media-partners", priority: "0.5", changefreq: "monthly" },
      { path: "/showguide", priority: "0.5", changefreq: "monthly" },
      { path: "/sitemap", priority: "0.3", changefreq: "monthly" },
      { path: "/privacy-policy", priority: "0.2", changefreq: "yearly" },
      { path: "/terms-conditions", priority: "0.2", changefreq: "yearly" },
      { path: "/cookie-policy", priority: "0.2", changefreq: "yearly" },
    ];

    // Add static pages
    for (const page of staticPages) {
      urls.push({
        loc: `${baseUrl}${page.path}`,
        lastmod: now,
        changefreq: page.changefreq,
        priority: page.priority,
      });
    }

    // Fetch active speakers - using public view to exclude sensitive data
    const { data: speakers, error: speakersError } = await supabase
      .from("speakers_public")
      .select("id, name, updated_at")
      .eq("is_active", true);

    if (speakersError) {
      console.error("Error fetching speakers:", speakersError);
    } else if (speakers) {
      console.log(`Found ${speakers.length} active speakers`);
      for (const speaker of speakers) {
        urls.push({
          loc: `${baseUrl}/speakers/${speaker.id}`,
          lastmod: speaker.updated_at?.split("T")[0] || now,
          changefreq: "weekly",
          priority: "0.6",
        });
      }
    }

    // Fetch active exhibitors
    const { data: exhibitors, error: exhibitorsError } = await supabase
      .from("exhibitors")
      .select("id, name, updated_at")
      .eq("is_active", true);

    if (exhibitorsError) {
      console.error("Error fetching exhibitors:", exhibitorsError);
    } else if (exhibitors) {
      console.log(`Found ${exhibitors.length} active exhibitors`);
      for (const exhibitor of exhibitors) {
        urls.push({
          loc: `${baseUrl}/exhibitors/${exhibitor.id}`,
          lastmod: exhibitor.updated_at?.split("T")[0] || now,
          changefreq: "weekly",
          priority: "0.6",
        });
      }
    }

    // Fetch published blog posts
    const { data: posts, error: postsError } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published");

    if (postsError) {
      console.error("Error fetching blog posts:", postsError);
    } else if (posts) {
      console.log(`Found ${posts.length} published blog posts`);
      for (const post of posts) {
        urls.push({
          loc: `${baseUrl}/news/${post.slug}`,
          lastmod: post.updated_at?.split("T")[0] || post.published_at?.split("T")[0] || now,
          changefreq: "monthly",
          priority: "0.5",
        });
      }
    }

    // Fetch published dynamic pages
    const { data: pages, error: pagesError } = await supabase
      .from("website_pages")
      .select("page_url, updated_at")
      .eq("status", "published")
      .eq("is_active", true);

    if (pagesError) {
      console.error("Error fetching website pages:", pagesError);
    } else if (pages) {
      console.log(`Found ${pages.length} published website pages`);
      for (const page of pages) {
        // Skip pages that match static routes or admin/portal pages
        const skipPatterns = ["/admin", "/exhibitor-portal", "/speaker-portal", "/login", "/reset-password"];
        const pageUrl = page.page_url.startsWith("/") ? page.page_url : `/${page.page_url}`;
        
        if (!skipPatterns.some(pattern => pageUrl.startsWith(pattern))) {
          urls.push({
            loc: `${baseUrl}${pageUrl}`,
            lastmod: page.updated_at?.split("T")[0] || now,
            changefreq: "weekly",
            priority: "0.5",
          });
        }
      }
    }

    // Fetch agenda sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("agenda_sessions")
      .select("id, updated_at")
      .eq("status", "published");

    if (sessionsError) {
      console.error("Error fetching agenda sessions:", sessionsError);
    } else if (sessions) {
      console.log(`Found ${sessions.length} published agenda sessions`);
      // Agenda sessions are typically displayed on the agenda page, not individual pages
      // But if you have individual session pages, uncomment below:
      // for (const session of sessions) {
      //   urls.push({
      //     loc: `${baseUrl}/agenda/${session.id}`,
      //     lastmod: session.updated_at?.split("T")[0] || now,
      //     changefreq: "weekly",
      //     priority: "0.5",
      //   });
      // }
    }

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    console.log(`Generated sitemap with ${urls.length} URLs`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
