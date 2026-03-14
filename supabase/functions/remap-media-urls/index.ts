import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verify user is authenticated and is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdminOrCSOrPM } = await supabaseClient.rpc('is_admin_or_cs_or_pm', { _user_id: user.id });
    if (!isAdminOrCSOrPM) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { urlMappings } = await req.json();

    if (!urlMappings || !Array.isArray(urlMappings)) {
      return new Response(JSON.stringify({ error: 'urlMappings array required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('=== MEDIA URL REMAPPING STARTING ===');
    console.log(`Processing ${urlMappings.length} URL mappings`);

    const results = {
      updated: {
        page_content: 0,
        blog_posts: 0,
        exhibitors: 0,
        speakers: 0,
        media_library: 0,
        website_styles: 0,
        event_settings: 0,
        email_templates: 0,
        marketing_tools: 0,
        gallery_photos: 0,
        show_suppliers: 0
      },
      errors: [] as string[],
      urlsProcessed: urlMappings.length
    };

    // Build URL replacement map: oldUrl -> newUrl
    const urlMap = new Map<string, string>();
    for (const mapping of urlMappings) {
      if (mapping.oldUrl && mapping.newUrl) {
        urlMap.set(mapping.oldUrl, mapping.newUrl);
        // Also map without query params
        const oldClean = mapping.oldUrl.split('?')[0];
        const newClean = mapping.newUrl.split('?')[0];
        urlMap.set(oldClean, newClean);
      }
    }

    console.log(`Built URL map with ${urlMap.size} entries`);

    // Helper to replace URLs in a string
    const replaceUrls = (str: string): string => {
      let result = str;
      for (const [oldUrl, newUrl] of urlMap) {
        // Replace both encoded and unencoded versions
        result = result.split(oldUrl).join(newUrl);
        result = result.split(encodeURIComponent(oldUrl)).join(encodeURIComponent(newUrl));
      }
      return result;
    };

    // Helper to replace URLs in an object (recursively)
    const replaceUrlsInObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return replaceUrls(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(item => replaceUrlsInObject(item));
      }
      if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const key of Object.keys(obj)) {
          newObj[key] = replaceUrlsInObject(obj[key]);
        }
        return newObj;
      }
      return obj;
    };

    // 1. Update page_content
    try {
      const { data: pageContent } = await supabaseAdmin.from('page_content').select('*');
      if (pageContent?.length) {
        for (const content of pageContent) {
          const updatedValue = replaceUrls(content.content_value);
          if (updatedValue !== content.content_value) {
            await supabaseAdmin
              .from('page_content')
              .update({ content_value: updatedValue })
              .eq('id', content.id);
            results.updated.page_content++;
          }
        }
      }
      console.log(`✓ Updated ${results.updated.page_content} page_content records`);
    } catch (e) {
      results.errors.push(`page_content: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 2. Update blog_posts
    try {
      const { data: blogPosts } = await supabaseAdmin.from('blog_posts').select('*');
      if (blogPosts?.length) {
        for (const post of blogPosts) {
          const updatedContent = replaceUrls(post.content);
          const updatedImage = post.featured_image_url ? replaceUrls(post.featured_image_url) : null;
          if (updatedContent !== post.content || updatedImage !== post.featured_image_url) {
            await supabaseAdmin
              .from('blog_posts')
              .update({ 
                content: updatedContent,
                featured_image_url: updatedImage
              })
              .eq('id', post.id);
            results.updated.blog_posts++;
          }
        }
      }
      console.log(`✓ Updated ${results.updated.blog_posts} blog_posts records`);
    } catch (e) {
      results.errors.push(`blog_posts: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 3. Update exhibitors
    try {
      const { data: exhibitors } = await supabaseAdmin.from('exhibitors').select('*');
      if (exhibitors?.length) {
        for (const ex of exhibitors) {
          const updates: any = {};
          let hasChanges = false;
          
          if (ex.logo_url) {
            const newUrl = replaceUrls(ex.logo_url);
            if (newUrl !== ex.logo_url) { updates.logo_url = newUrl; hasChanges = true; }
          }
          if (ex.banner_url) {
            const newUrl = replaceUrls(ex.banner_url);
            if (newUrl !== ex.banner_url) { updates.banner_url = newUrl; hasChanges = true; }
          }
          if (ex.description) {
            const newDesc = replaceUrls(ex.description);
            if (newDesc !== ex.description) { updates.description = newDesc; hasChanges = true; }
          }
          if (ex.company_profile) {
            const newProfile = replaceUrls(ex.company_profile);
            if (newProfile !== ex.company_profile) { updates.company_profile = newProfile; hasChanges = true; }
          }
          
          if (hasChanges) {
            await supabaseAdmin.from('exhibitors').update(updates).eq('id', ex.id);
            results.updated.exhibitors++;
          }
        }
      }
      console.log(`✓ Updated ${results.updated.exhibitors} exhibitors records`);
    } catch (e) {
      results.errors.push(`exhibitors: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 4. Update speakers
    try {
      const { data: speakers } = await supabaseAdmin.from('speakers').select('*');
      if (speakers?.length) {
        for (const speaker of speakers) {
          const updates: any = {};
          let hasChanges = false;
          
          if (speaker.photo_url) {
            const newUrl = replaceUrls(speaker.photo_url);
            if (newUrl !== speaker.photo_url) { updates.photo_url = newUrl; hasChanges = true; }
          }
          if (speaker.company_logo_url) {
            const newUrl = replaceUrls(speaker.company_logo_url);
            if (newUrl !== speaker.company_logo_url) { updates.company_logo_url = newUrl; hasChanges = true; }
          }
          if (speaker.bio) {
            const newBio = replaceUrls(speaker.bio);
            if (newBio !== speaker.bio) { updates.bio = newBio; hasChanges = true; }
          }
          
          if (hasChanges) {
            await supabaseAdmin.from('speakers').update(updates).eq('id', speaker.id);
            results.updated.speakers++;
          }
        }
      }
      console.log(`✓ Updated ${results.updated.speakers} speakers records`);
    } catch (e) {
      results.errors.push(`speakers: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 5. Update event_settings
    try {
      const { data: settings } = await supabaseAdmin.from('event_settings').select('*').limit(1).single();
      if (settings) {
        const updates: any = {};
        let hasChanges = false;
        
        if (settings.logo_url) {
          const newUrl = replaceUrls(settings.logo_url);
          if (newUrl !== settings.logo_url) { updates.logo_url = newUrl; hasChanges = true; }
        }
        if (settings.thumbnail_url) {
          const newUrl = replaceUrls(settings.thumbnail_url);
          if (newUrl !== settings.thumbnail_url) { updates.thumbnail_url = newUrl; hasChanges = true; }
        }
        
        if (hasChanges) {
          await supabaseAdmin.from('event_settings').update(updates).eq('id', settings.id);
          results.updated.event_settings = 1;
        }
      }
      console.log(`✓ Updated ${results.updated.event_settings} event_settings records`);
    } catch (e) {
      results.errors.push(`event_settings: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 6. Update email_templates
    try {
      const { data: templates } = await supabaseAdmin.from('email_templates').select('*');
      if (templates?.length) {
        for (const template of templates) {
          if (template.banner_image_url) {
            const newUrl = replaceUrls(template.banner_image_url);
            if (newUrl !== template.banner_image_url) {
              await supabaseAdmin
                .from('email_templates')
                .update({ banner_image_url: newUrl })
                .eq('id', template.id);
              results.updated.email_templates++;
            }
          }
        }
      }
      console.log(`✓ Updated ${results.updated.email_templates} email_templates records`);
    } catch (e) {
      results.errors.push(`email_templates: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 7. Update marketing_tools
    try {
      const { data: tools } = await supabaseAdmin.from('marketing_tools').select('*');
      if (tools?.length) {
        for (const tool of tools) {
          const updates: any = {};
          let hasChanges = false;
          
          if (tool.file_url) {
            const newUrl = replaceUrls(tool.file_url);
            if (newUrl !== tool.file_url) { updates.file_url = newUrl; hasChanges = true; }
          }
          if (tool.thumbnail_url) {
            const newUrl = replaceUrls(tool.thumbnail_url);
            if (newUrl !== tool.thumbnail_url) { updates.thumbnail_url = newUrl; hasChanges = true; }
          }
          
          if (hasChanges) {
            await supabaseAdmin.from('marketing_tools').update(updates).eq('id', tool.id);
            results.updated.marketing_tools++;
          }
        }
      }
      console.log(`✓ Updated ${results.updated.marketing_tools} marketing_tools records`);
    } catch (e) {
      results.errors.push(`marketing_tools: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 8. Update gallery_photos
    try {
      const { data: photos } = await supabaseAdmin.from('gallery_photos').select('*');
      if (photos?.length) {
        for (const photo of photos) {
          if (photo.photo_url) {
            const newUrl = replaceUrls(photo.photo_url);
            if (newUrl !== photo.photo_url) {
              await supabaseAdmin
                .from('gallery_photos')
                .update({ photo_url: newUrl })
                .eq('id', photo.id);
              results.updated.gallery_photos++;
            }
          }
        }
      }
      console.log(`✓ Updated ${results.updated.gallery_photos} gallery_photos records`);
    } catch (e) {
      results.errors.push(`gallery_photos: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    // 9. Update show_suppliers
    try {
      const { data: suppliers } = await supabaseAdmin.from('show_suppliers').select('*');
      if (suppliers?.length) {
        for (const supplier of suppliers) {
          if (supplier.logo_url) {
            const newUrl = replaceUrls(supplier.logo_url);
            if (newUrl !== supplier.logo_url) {
              await supabaseAdmin
                .from('show_suppliers')
                .update({ logo_url: newUrl })
                .eq('id', supplier.id);
              results.updated.show_suppliers++;
            }
          }
        }
      }
      console.log(`✓ Updated ${results.updated.show_suppliers} show_suppliers records`);
    } catch (e) {
      results.errors.push(`show_suppliers: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }

    console.log('=== MEDIA URL REMAPPING COMPLETE ===');

    return new Response(JSON.stringify({
      success: true,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Remap error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
