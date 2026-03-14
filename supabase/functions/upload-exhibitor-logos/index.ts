import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin/CS/PM role
    const { data: isAdminOrCSOrPM } = await supabaseAuth.rpc('is_admin_or_cs_or_pm', {
      _user_id: user.id
    });

    if (!isAdminOrCSOrPM) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the uploaded file from form data
    const formData = await req.formData();
    const zipFile = formData.get('zipFile') as File;

    if (!zipFile) {
      return new Response(
        JSON.stringify({ error: 'No ZIP file provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Read ZIP file as ArrayBuffer
    const zipBuffer = await zipFile.arrayBuffer();
    
    // Import JSZip dynamically
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = await JSZip.loadAsync(zipBuffer);

    // Get all exhibitors from database
    const { data: exhibitors, error: fetchError } = await supabaseClient
      .from('exhibitors')
      .select('id, name, logo_url');

    if (fetchError) {
      throw new Error(`Failed to fetch exhibitors: ${fetchError.message}`);
    }

    // Normalize function to match filenames to company names
    const normalize = (str: string) => 
      str.toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
        .trim();

    // Process each file in the ZIP
    const results = {
      uploaded: [] as string[],
      skipped: [] as string[],
      errors: [] as { filename: string; error: string }[],
    };

    const uploadPromises: Promise<void>[] = [];

    for (const [filename, file] of Object.entries(zip.files)) {
      // Skip directories and hidden files
      if (file.dir || filename.startsWith('__MACOSX') || filename.startsWith('.')) {
        continue;
      }

      // Check if it's an image file
      const ext = filename.split('.').pop()?.toLowerCase();
      if (!ext || !['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg'].includes(ext)) {
        results.skipped.push(filename);
        continue;
      }
      
      // Get file content for MIME type validation
      const fileContent = await file.async('uint8array');
      
      // Basic file size check (5MB limit)
      if (fileContent.length > 5 * 1024 * 1024) {
        results.errors.push({
          filename,
          error: 'File exceeds 5MB size limit'
        });
        continue;
      }

      // Extract filename without extension and path
      const baseFilename = filename.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
      const normalizedFilename = normalize(baseFilename);

      // Find matching exhibitor
      const matchingExhibitor = exhibitors?.find(exhibitor => 
        normalize(exhibitor.name) === normalizedFilename
      );

      if (!matchingExhibitor) {
        results.skipped.push(`${filename} (no match found)`);
        continue;
      }

      // Process upload
      const uploadPromise = (async () => {
        try {
          console.log(`Processing ${filename} for exhibitor: ${matchingExhibitor.name}`);
          
          // Compress image if larger than 10MB (skip SVG)
          let bufferToUpload = fileContent;
          if (ext !== 'svg' && fileContent.length > 10 * 1024 * 1024) {
            console.log(`Compressing large logo for ${matchingExhibitor.name}`);
            try {
              const base64 = btoa(String.fromCharCode(...fileContent));
              const dataUrl = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${base64}`;
              
              const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash-image-preview',
                  messages: [{
                    role: 'user',
                    content: [{
                      type: 'text',
                      text: 'Compress this image to under 500KB for web use while maintaining quality.',
                    }, {
                      type: 'image_url',
                      image_url: { url: dataUrl },
                    }],
                  }],
                  modalities: ['image', 'text'],
                }),
              });

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                const compressedUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                if (compressedUrl) {
                  const compressedBase64 = compressedUrl.split(',')[1];
                  const compressedBinary = atob(compressedBase64);
                  bufferToUpload = new Uint8Array(compressedBinary.length);
                  for (let i = 0; i < compressedBinary.length; i++) {
                    bufferToUpload[i] = compressedBinary.charCodeAt(i);
                  }
                  console.log(`Compressed from ${(fileContent.length / 1024).toFixed(2)}KB to ${(bufferToUpload.length / 1024).toFixed(2)}KB`);
                }
              }
            } catch (compressionError) {
              console.error('Compression failed, using original:', compressionError);
            }
          }
          
          // Upload compressed version to Supabase storage
          const storagePath = `${matchingExhibitor.id}-${Date.now()}.${ext}`;
          
          // Determine correct content type
          let contentType = 'image/jpeg';
          if (ext === 'png') contentType = 'image/png';
          else if (ext === 'webp') contentType = 'image/webp';
          else if (ext === 'avif') contentType = 'image/avif';
          else if (ext === 'gif') contentType = 'image/gif';
          else if (ext === 'svg') contentType = 'image/svg+xml';
          
          const { error: uploadError } = await supabaseClient.storage
            .from('exhibitor-logos')
            .upload(storagePath, bufferToUpload as unknown as Blob, {
              contentType,
              upsert: true,
            });

          if (uploadError) {
            console.error(`Upload error for ${filename}:`, uploadError);
            throw uploadError;
          }

          console.log(`Successfully uploaded ${filename} to storage`);

          // Get public URL
          const { data: urlData } = supabaseClient.storage
            .from('exhibitor-logos')
            .getPublicUrl(storagePath);

          // Update exhibitor record
          const { error: updateError } = await supabaseClient
            .from('exhibitors')
            .update({ logo_url: urlData.publicUrl })
            .eq('id', matchingExhibitor.id);

          if (updateError) {
            console.error(`Database update error for ${filename}:`, updateError);
            throw updateError;
          }

          console.log(`Successfully updated database for ${matchingExhibitor.name}`);
          
          // Upload to Google Drive
          try {
            // Convert buffer to base64
            const base64Content = btoa(String.fromCharCode(...bufferToUpload));
            
            const driveResponse = await supabaseClient.functions.invoke('upload-to-google-drive', {
              body: {
                fileContent: base64Content,
                fileName: `${matchingExhibitor.name}_logo.${ext}`,
                mimeType: contentType,
                folderId: 'exhibitor-logos',
              },
            });

            if (driveResponse.error) {
              console.error(`Google Drive upload failed for ${filename}:`, driveResponse.error);
              // Don't fail the upload if Google Drive fails
            } else {
              console.log(`Uploaded ${filename} to Google Drive for exhibitor ${matchingExhibitor.name}`);
            }
          } catch (driveError) {
            console.error(`Google Drive upload error for ${filename}:`, driveError);
            // Don't fail the upload if Google Drive fails
          }
          
          results.uploaded.push(`${filename} → ${matchingExhibitor.name}`);
        } catch (error) {
          console.error(`Error processing ${filename}:`, error);
          const errorMessage = error instanceof Error 
            ? error.message 
            : (typeof error === 'object' && error !== null && 'message' in error)
              ? String((error as any).message)
              : JSON.stringify(error);
          results.errors.push({
            filename,
            error: errorMessage,
          });
        }
      })();

      uploadPromises.push(uploadPromise);
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.uploaded.length + results.skipped.length + results.errors.length,
          uploaded: results.uploaded.length,
          skipped: results.skipped.length,
          errors: results.errors.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing ZIP file:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
