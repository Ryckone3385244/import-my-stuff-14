import { supabase } from "@/integrations/supabase/client";

export type MediaUrlMapping = { oldUrl: string; newUrl: string };

export type MediaUrlRemapResults = {
  updated: Record<string, number>;
  errors: string[];
  urlsProcessed: number;
};

const buildUrlMap = (urlMappings: MediaUrlMapping[]) => {
  const map = new Map<string, string>();
  for (const m of urlMappings) {
    if (!m?.oldUrl || !m?.newUrl) continue;
    map.set(m.oldUrl, m.newUrl);
    map.set(m.oldUrl.split("?")[0], m.newUrl.split("?")[0]);
  }
  return map;
};

const replaceUrls = (input: string, urlMap: Map<string, string>) => {
  let out = input;
  for (const [oldUrl, newUrl] of urlMap.entries()) {
    out = out.split(oldUrl).join(newUrl);
    out = out.split(encodeURIComponent(oldUrl)).join(encodeURIComponent(newUrl));
  }
  return out;
};

export async function remapMediaUrlsClient(urlMappings: MediaUrlMapping[]): Promise<MediaUrlRemapResults> {
  const urlMap = buildUrlMap(urlMappings);

  const results: MediaUrlRemapResults = {
    updated: {
      page_content: 0,
      blog_posts: 0,
      exhibitors: 0,
      speakers: 0,
      event_settings: 0,
      email_templates: 0,
      marketing_tools: 0,
      gallery_photos: 0,
      show_suppliers: 0,
    },
    errors: [],
    urlsProcessed: urlMappings.length,
  };

  // 1) page_content
  try {
    const { data, error } = await supabase.from("page_content").select("id, content_value");
    if (error) throw error;
    for (const row of data ?? []) {
      const next = replaceUrls(row.content_value ?? "", urlMap);
      if (next !== row.content_value) {
        const { error: updateError } = await supabase
          .from("page_content")
          .update({ content_value: next })
          .eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.page_content += 1;
      }
    }
  } catch (e) {
    results.errors.push(`page_content: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 2) blog_posts
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, content, featured_image_url");
    if (error) throw error;
    for (const row of data ?? []) {
      const nextContent = replaceUrls(row.content ?? "", urlMap);
      const nextFeatured = row.featured_image_url ? replaceUrls(row.featured_image_url, urlMap) : null;
      if (nextContent !== row.content || nextFeatured !== row.featured_image_url) {
        const { error: updateError } = await supabase
          .from("blog_posts")
          .update({ content: nextContent, featured_image_url: nextFeatured })
          .eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.blog_posts += 1;
      }
    }
  } catch (e) {
    results.errors.push(`blog_posts: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 3) exhibitors
  try {
    const { data, error } = await supabase
      .from("exhibitors")
      .select("id, logo_url, banner_url, description, company_profile");
    if (error) throw error;
    for (const row of data ?? []) {
      const updates: Record<string, any> = {};
      const nextLogo = row.logo_url ? replaceUrls(row.logo_url, urlMap) : null;
      const nextBanner = row.banner_url ? replaceUrls(row.banner_url, urlMap) : null;
      const nextDesc = row.description ? replaceUrls(row.description, urlMap) : null;
      const nextProfile = row.company_profile ? replaceUrls(row.company_profile, urlMap) : null;

      if (nextLogo !== row.logo_url) updates.logo_url = nextLogo;
      if (nextBanner !== row.banner_url) updates.banner_url = nextBanner;
      if (nextDesc !== row.description) updates.description = nextDesc;
      if (nextProfile !== row.company_profile) updates.company_profile = nextProfile;

      if (Object.keys(updates).length) {
        const { error: updateError } = await supabase.from("exhibitors").update(updates).eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.exhibitors += 1;
      }
    }
  } catch (e) {
    results.errors.push(`exhibitors: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 4) speakers
  try {
    const { data, error } = await supabase
      .from("speakers")
      .select("id, photo_url, company_logo_url, bio");
    if (error) throw error;
    for (const row of data ?? []) {
      const updates: Record<string, any> = {};
      const nextPhoto = row.photo_url ? replaceUrls(row.photo_url, urlMap) : null;
      const nextCompanyLogo = row.company_logo_url ? replaceUrls(row.company_logo_url, urlMap) : null;
      const nextBio = row.bio ? replaceUrls(row.bio, urlMap) : null;

      if (nextPhoto !== row.photo_url) updates.photo_url = nextPhoto;
      if (nextCompanyLogo !== row.company_logo_url) updates.company_logo_url = nextCompanyLogo;
      if (nextBio !== row.bio) updates.bio = nextBio;

      if (Object.keys(updates).length) {
        const { error: updateError } = await supabase.from("speakers").update(updates).eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.speakers += 1;
      }
    }
  } catch (e) {
    results.errors.push(`speakers: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 5) event_settings (single row)
  try {
    const { data, error } = await supabase
      .from("event_settings")
      .select("id, logo_url, thumbnail_url")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = data?.[0];
    if (row) {
      const updates: Record<string, any> = {};
      const nextLogo = row.logo_url ? replaceUrls(row.logo_url, urlMap) : null;
      const nextThumb = row.thumbnail_url ? replaceUrls(row.thumbnail_url, urlMap) : null;
      if (nextLogo !== row.logo_url) updates.logo_url = nextLogo;
      if (nextThumb !== row.thumbnail_url) updates.thumbnail_url = nextThumb;
      if (Object.keys(updates).length) {
        const { error: updateError } = await supabase.from("event_settings").update(updates).eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.event_settings = 1;
      }
    }
  } catch (e) {
    results.errors.push(`event_settings: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 6) email_templates
  try {
    const { data, error } = await supabase.from("email_templates").select("id, banner_image_url");
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.banner_image_url) continue;
      const next = replaceUrls(row.banner_image_url, urlMap);
      if (next !== row.banner_image_url) {
        const { error: updateError } = await supabase
          .from("email_templates")
          .update({ banner_image_url: next })
          .eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.email_templates += 1;
      }
    }
  } catch (e) {
    results.errors.push(`email_templates: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 7) marketing_tools
  try {
    const { data, error } = await supabase.from("marketing_tools").select("id, file_url, thumbnail_url");
    if (error) throw error;
    for (const row of data ?? []) {
      const updates: Record<string, any> = {};
      const nextFile = row.file_url ? replaceUrls(row.file_url, urlMap) : null;
      const nextThumb = row.thumbnail_url ? replaceUrls(row.thumbnail_url, urlMap) : null;
      if (nextFile !== row.file_url) updates.file_url = nextFile;
      if (nextThumb !== row.thumbnail_url) updates.thumbnail_url = nextThumb;
      if (Object.keys(updates).length) {
        const { error: updateError } = await supabase.from("marketing_tools").update(updates).eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.marketing_tools += 1;
      }
    }
  } catch (e) {
    results.errors.push(`marketing_tools: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 8) gallery_photos
  try {
    const { data, error } = await supabase.from("gallery_photos").select("id, photo_url");
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.photo_url) continue;
      const next = replaceUrls(row.photo_url, urlMap);
      if (next !== row.photo_url) {
        const { error: updateError } = await supabase
          .from("gallery_photos")
          .update({ photo_url: next })
          .eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.gallery_photos += 1;
      }
    }
  } catch (e) {
    results.errors.push(`gallery_photos: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  // 9) show_suppliers
  try {
    const { data, error } = await supabase.from("show_suppliers").select("id, logo_url");
    if (error) throw error;
    for (const row of data ?? []) {
      if (!row.logo_url) continue;
      const next = replaceUrls(row.logo_url, urlMap);
      if (next !== row.logo_url) {
        const { error: updateError } = await supabase
          .from("show_suppliers")
          .update({ logo_url: next })
          .eq("id", row.id);
        if (updateError) throw updateError;
        results.updated.show_suppliers += 1;
      }
    }
  } catch (e) {
    results.errors.push(`show_suppliers: ${e instanceof Error ? e.message : "Unknown error"}`);
  }

  return results;
}
