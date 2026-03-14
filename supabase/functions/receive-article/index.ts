import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { marked } from 'https://esm.sh/marked@11.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation function for article data
function validateArticle(article: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!article.title || typeof article.title !== 'string' || article.title.length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }
  if (article.title && article.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!article.content || typeof article.content !== 'string' || article.content.length === 0) {
    errors.push('Content is required and must be a non-empty string');
  }
  if (article.content && article.content.length > 50000) {
    errors.push('Content must be less than 50000 characters');
  }
  
  if (article.meta_description && typeof article.meta_description !== 'string') {
    errors.push('Meta description must be a string');
  }
  if (article.meta_description && article.meta_description.length > 500) {
    errors.push('Meta description must be less than 500 characters');
  }
  
  if (article.keywords && !Array.isArray(article.keywords)) {
    errors.push('Keywords must be an array');
  }
  
  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received article webhook');
    
    // Validate API key - supports both X-API-Key header and Authorization Bearer
    const xApiKey = req.headers.get('X-API-Key');
    const authHeader = req.headers.get('Authorization');
    const expectedApiKey = Deno.env.get('SEO_ARTICLE_API_KEY');
    
    // Extract API key from either header format
    let providedApiKey: string | null = null;
    if (xApiKey) {
      providedApiKey = xApiKey;
    } else if (authHeader?.startsWith('Bearer ')) {
      providedApiKey = authHeader.replace('Bearer ', '');
    }
    
    if (!providedApiKey) {
      console.error('Missing API key - no X-API-Key or Authorization header found');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (providedApiKey !== expectedApiKey) {
      console.error('Invalid API key provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const article = await req.json();
    console.log('Article data:', article);

    // Validate input
    const validation = validateArticle(article);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, errors: validation.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate slug from title
    const slug = article.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Convert markdown to HTML
    const htmlContent = await marked.parse(article.content);

    // Generate featured image using Lovable AI
    console.log('Generating featured image for article:', article.title);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let featuredImageUrl = article.featured_image_url;

    if (LOVABLE_API_KEY) {
      try {
        const imagePrompt = `Create a professional, photographic image related to the topic: "${article.title}". The image should be suitable for a trade show and food industry blog. Style: clean, professional, modern photographic image. IMPORTANT: Do not include any text, titles, words, or overlays in the image - only visual imagery. High quality, 1920x1080 aspect ratio.`;
        
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [{
              role: 'user',
              content: imagePrompt
            }],
            modalities: ['image', 'text']
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (imageBase64) {
            // Extract base64 data (remove data:image/png;base64, prefix)
            const base64Data = imageBase64.split(',')[1];
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            // Upload to storage
            const fileName = `${slug}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
              .from('blog_images')
              .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                cacheControl: '3600'
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('blog_images')
                .getPublicUrl(fileName);
              
              featuredImageUrl = publicUrl;
              console.log('Featured image generated and uploaded:', publicUrl);
            } else {
              console.error('Error uploading image:', uploadError);
            }
          }
        }
      } catch (imageError) {
        console.error('Error generating image:', imageError);
        // Continue without image if generation fails
      }
    }

    // Insert the article into blog_posts table
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        title: article.title,
        slug: slug,
        content: htmlContent,
        seo_description: article.meta_description,
        seo_title: article.title,
        tags: article.keywords || [],
        status: 'published',
        published_at: new Date().toISOString(),
        excerpt: article.meta_description?.substring(0, 200),
        featured_image_url: featuredImageUrl,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Article saved successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        articleId: data.id,
        message: 'Article received and saved as draft'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
