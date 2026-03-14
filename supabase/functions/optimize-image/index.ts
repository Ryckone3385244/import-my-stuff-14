import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizeImageRequest {
  bucket: string;
  path: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting image optimization');

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Verify user authentication
    const jwt = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Image optimization requested by user: ${user.id}`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { bucket, path }: OptimizeImageRequest = await req.json();
    console.log(`Optimizing image: ${bucket}/${path}`);

    const lowerPath = path.toLowerCase();

    // Skip SVG files as they're vector graphics and don't need optimization
    if (lowerPath.endsWith('.svg')) {
      console.log('Skipping SVG file optimization');
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'SVG files do not require optimization',
          url: publicUrl,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Skip PNG files to preserve transparency
    if (lowerPath.endsWith('.png')) {
      console.log('Skipping PNG file optimization to preserve transparency');
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'PNG optimization skipped to preserve transparency',
          url: publicUrl,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Download the original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      console.error('Error downloading image:', downloadError);
      throw downloadError;
    }

    console.log('Image downloaded successfully');

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Process in chunks to avoid stack overflow
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binaryString += String.fromCharCode(...chunk);
    }
    
    const base64 = btoa(binaryString);
    const mimeType = fileData.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    console.log('Converting image to base64 complete');

    // Use Lovable AI to optimize the image for web use (target < 500KB)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Optimize this image for web use. Compress it to be under 500KB while maintaining good visual quality. Reduce dimensions if needed (max 1920px). Output as JPEG with appropriate quality.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI optimization error:', errorText);
      throw new Error(`AI optimization failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI optimization complete');

    // Extract the optimized image
    const optimizedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!optimizedImageUrl) {
      throw new Error('No optimized image returned from AI');
    }

    // Convert base64 back to blob
    const base64Data = optimizedImageUrl.split(',')[1];
    const binaryData = atob(base64Data);
    const optimizedBytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      optimizedBytes[i] = binaryData.charCodeAt(i);
    }
    const optimizedBlob = new Blob([optimizedBytes], { type: mimeType });

    console.log('Converted optimized image back to blob');

    // Upload the optimized image (replace the original)
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .update(path, optimizedBlob, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading optimized image:', uploadError);
      throw uploadError;
    }

    console.log('Optimized image uploaded successfully');

    // Get the public URL of the optimized image
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Image optimized successfully',
        url: publicUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error optimizing image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
