import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizeRequest {
  bucket: string;
  path: string;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bucket, path, maxWidth = 1920, maxHeight = 1920, quality = 92 }: OptimizeRequest = await req.json();

    console.log(`Optimizing image: ${bucket}/${path}`);

    // Skip SVG files - they're already optimized vector graphics
    if (path.toLowerCase().endsWith('.svg')) {
      console.log('Skipping SVG file');
      return new Response(
        JSON.stringify({ message: 'SVG files are not optimized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download image: ${downloadError?.message}`);
    }

    // Convert to base64 for AI processing (chunked to avoid stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid "Maximum call stack size exceeded"
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);
    
    const mimeType = fileData.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Use Lovable AI to optimize the image
    console.log('Sending to Lovable AI for optimization...');
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Optimize this image for web use. Resize to fit within ${maxWidth}x${maxHeight} pixels while maintaining aspect ratio. Apply ${quality}% quality compression. Convert to WebP format for optimal file size.`
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        modalities: ["image"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI optimization failed: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const optimizedImageUrl = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!optimizedImageUrl) {
      throw new Error('No optimized image returned from AI');
    }

    // Convert base64 back to blob
    const base64Data = optimizedImageUrl.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const optimizedBlob = new Blob([binaryData], { type: 'image/webp' });

    // Generate optimized filename
    const pathParts = path.split('.');
    pathParts.pop(); // Remove original extension
    const optimizedPath = `${pathParts.join('.')}-optimized.webp`;

    // Upload optimized version
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(optimizedPath, optimizedBlob, {
        contentType: 'image/webp',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload optimized image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(optimizedPath);

    console.log(`Successfully optimized: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        optimizedUrl: publicUrl,
        originalPath: path,
        optimizedPath: optimizedPath,
        format: 'webp'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Optimization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
