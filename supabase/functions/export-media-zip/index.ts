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
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

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

    const body = await req.json();
    const bucketName: string | undefined = body.bucketName;
    const offset: number = typeof body.offset === 'number' && body.offset >= 0 ? body.offset : 0;
    const limit: number =
      typeof body.limit === 'number' && body.limit > 0 && body.limit <= 200 ? body.limit : 20;

    if (!bucketName) {
      return new Response(JSON.stringify({ error: 'Bucket name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Exporting files from bucket: ${bucketName} (offset: ${offset}, limit: ${limit})`);

    // List all files in the bucket (names only)
    const { data: allFiles, error: listError } = await supabaseAdmin.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (listError) {
      console.error('Error listing files:', listError);
      return new Response(
        JSON.stringify({ error: `Failed to list files: ${listError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!allFiles || allFiles.length === 0) {
      return new Response(
        JSON.stringify({
          files: [],
          bucketName,
          totalFiles: 0,
          offset,
          limit,
          hasMore: false,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Filter out directories and apply pagination
    const validFiles = allFiles.filter((f) => !f.name.endsWith('/'));
    const totalFiles = validFiles.length;
    const pageFiles = validFiles.slice(offset, offset + limit);
    const hasMore = offset + limit < totalFiles;

    console.log(
      `Found ${totalFiles} total files, returning ${pageFiles.length} files (offset: ${offset})`
    );

    if (pageFiles.length === 0) {
      return new Response(
        JSON.stringify({ files: [], bucketName, totalFiles, offset, limit, hasMore }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate signed URLs so the client can download files directly from storage
    const paths = pageFiles.map((f) => f.name);

    const { data: signedUrls, error: signedError } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrls(paths, 60 * 60); // 1 hour expiry

    if (signedError) {
      console.error('Error creating signed URLs:', signedError);
      return new Response(
        JSON.stringify({ error: `Failed to create signed URLs: ${signedError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const filesWithUrls = pageFiles.map((file, index) => ({
      name: file.name,
      signedUrl: signedUrls?.[index]?.signedUrl ?? null,
    }));

    return new Response(
      JSON.stringify({ files: filesWithUrls, bucketName, totalFiles, offset, limit, hasMore }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
