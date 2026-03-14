import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, title, slug, customPrompt } = await req.json();
    console.log('Generating image for post:', postId, title, customPrompt ? 'with custom prompt' : 'auto-generate');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use custom prompt if provided, otherwise use default based on title
    const imagePrompt = customPrompt?.trim() 
      ? customPrompt.trim()
      : `Create an abstract, modern business-themed image related to: "${title}". Style: Layered collage with gradient backgrounds, incorporating elements like graphs, charts, data visualizations, geometric shapes, icons, and abstract patterns. Use a professional color palette with dynamic gradients. CRITICAL: No people, no faces, no text, no words, no titles - only abstract business imagery and design elements. High quality, 1920x1080 aspect ratio, suitable for a food industry trade show blog.`;

    // Try with primary model first, then fallback
    const models = ['google/gemini-2.5-flash-image', 'google/gemini-3-pro-image-preview'];
    let imageBase64: string | undefined;
    let lastError: string = '';

    for (const model of models) {
      console.log(`Trying model: ${model}`);
      
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{
            role: 'user',
            content: imagePrompt
          }],
          modalities: ['image', 'text']
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI API error with ${model}:`, errorText);
        lastError = `${model} error: ${aiResponse.status} - ${errorText}`;
        continue;
      }

      const aiData = await aiResponse.json();
      console.log(`Response from ${model}:`, JSON.stringify({
        hasChoices: !!aiData.choices,
        choicesLength: aiData.choices?.length,
        hasMessage: !!aiData.choices?.[0]?.message,
        hasImages: !!aiData.choices?.[0]?.message?.images,
        imagesLength: aiData.choices?.[0]?.message?.images?.length
      }));

      imageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (imageBase64) {
        console.log(`Successfully generated image with ${model}`);
        break;
      } else {
        console.log(`No image in response from ${model}, trying next...`);
        lastError = `${model} returned no image`;
      }
    }

    if (!imageBase64) {
      throw new Error(`No image generated after trying all models. Last error: ${lastError}`);
    }

    // Extract base64 data
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

    if (uploadError) {
      throw new Error(`Upload error: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('blog_images')
      .getPublicUrl(fileName);
    
    // Update blog post with image URL
    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ featured_image_url: publicUrl })
      .eq('id', postId);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    console.log('Image generated and saved:', publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: publicUrl
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error generating image:', error);
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
