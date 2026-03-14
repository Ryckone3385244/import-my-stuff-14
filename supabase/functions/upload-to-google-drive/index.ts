import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  file: File;
  fileName: string;
  folderId: 'exhibitor-headshots' | 'speaker-headshots' | 'exhibitor-logos' | 'speaker-forms' | 'exhibitor-adverts';
  exhibitorId?: string;
  speakerId?: string;
  speakerName?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const userJwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse as JSON first (for function invocations), fallback to FormData
    const contentType = req.headers.get('Content-Type') || '';
    let fileName: string;
    let folderId: string;
    let speakerName: string | null = null;
    let fileBytes: Uint8Array;
    let mimeType: string;

    if (contentType.includes('application/json')) {
      // JSON format (from internal function calls)
      const body = await req.json();
      fileName = body.fileName;
      folderId = body.folderId;
      speakerName = body.speakerName || null;
      mimeType = body.mimeType || 'application/octet-stream';
      
      // Decode base64 file content
      const base64Content = body.fileContent;
      if (!base64Content) {
        return new Response(
          JSON.stringify({ error: 'Missing file content' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const binaryString = atob(base64Content);
      fileBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        fileBytes[i] = binaryString.charCodeAt(i);
      }
    } else {
      // FormData format (from direct HTTP uploads)
      const formData = await req.formData();
      const file = formData.get('file') as File;
      fileName = formData.get('fileName') as string;
      folderId = formData.get('folderId') as string;
      speakerName = formData.get('speakerName') as string | null;
      
      if (!file) {
        return new Response(
          JSON.stringify({ error: 'Missing file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      mimeType = file.type;
      fileBytes = new Uint8Array(await file.arrayBuffer());
    }
    
    if (!fileName || !folderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccountJson = Deno.env.get('GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      console.error('Google Drive service account not configured');
      return new Response(
        JSON.stringify({ error: 'Google Drive not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // Get folder ID based on type
    let targetFolderId: string;
    switch (folderId) {
      case 'exhibitor-headshots':
        targetFolderId = Deno.env.get('GOOGLE_DRIVE_EXHIBITOR_FOLDER_ID') || '';
        break;
      case 'speaker-headshots':
      case 'speaker-forms':
        targetFolderId = Deno.env.get('GOOGLE_DRIVE_SPEAKER_FOLDER_ID') || '';
        break;
      case 'exhibitor-logos':
      case 'exhibitor-adverts':
        targetFolderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID') || '';
        break;
      default:
        targetFolderId = '';
    }

    if (!targetFolderId) {
      console.error(`Folder ID not configured for ${folderId}`);
      return new Response(
        JSON.stringify({ error: 'Folder not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OAuth token
    const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const jwtClaimSet = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }));

    const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
    
    // Import private key
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = serviceAccount.private_key
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');
    
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      new TextEncoder().encode(signatureInput)
    );

    const jwtSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const googleJwt = `${jwtHeader}.${jwtClaimSet}.${jwtSignature}`;

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${googleJwt}`,
    });

    const { access_token } = await tokenResponse.json();

    // If speakerName is provided, create or find a subfolder with the speaker's name
    let uploadFolderId = targetFolderId;
    if (speakerName && (folderId === 'speaker-headshots' || folderId === 'speaker-forms')) {
      // Search for existing folder with speaker name
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(speakerName)}' and '${targetFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );

      const searchResult = await searchResponse.json();
      
      if (searchResult.files && searchResult.files.length > 0) {
        // Use existing folder
        uploadFolderId = searchResult.files[0].id;
        console.log(`Using existing speaker folder: ${speakerName} (${uploadFolderId})`);
      } else {
        // Create new folder
        const folderMetadata = {
          name: speakerName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [targetFolderId],
        };

        const createFolderResponse = await fetch(
          'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(folderMetadata),
          }
        );

        if (createFolderResponse.ok) {
          const folderResult = await createFolderResponse.json();
          uploadFolderId = folderResult.id;
          console.log(`Created new speaker folder: ${speakerName} (${uploadFolderId})`);
        } else {
          const error = await createFolderResponse.text();
          console.error('Failed to create speaker folder:', error);
          // Fall back to parent folder
        }
      }
    }

    // Upload file to Google Drive
    const metadata = {
      name: fileName,
      parents: [uploadFolderId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      new TextDecoder().decode(fileBytes) +
      closeDelim;

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('Google Drive upload error:', error);
      throw new Error('Failed to upload to Google Drive');
    }

    const result = await uploadResponse.json();
    console.log(`Successfully uploaded ${fileName} to Google Drive:`, result.id);

    return new Response(
      JSON.stringify({ success: true, fileId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
