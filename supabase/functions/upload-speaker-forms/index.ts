import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Unauthorized - Authentication required");
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Client for auth & role checks
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Service role client for privileged DB + storage operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(jwt);

    if (authError || !user) {
      throw new Error("Unauthorized - Invalid token");
    }

    const { data: isAdminOrCSOrPM, error: roleError } = await supabaseAuth.rpc(
      "is_admin_or_cs_or_pm",
      { _user_id: user.id }
    );

    if (roleError || !isAdminOrCSOrPM) {
      throw new Error("Forbidden: Admin access required");
    }

    const formData = await req.formData();
    const zipFile = formData.get("file") as File;

    if (!zipFile) {
      throw new Error("No file provided");
    }

    console.log(`Processing ZIP file: ${zipFile.name}`);

    const arrayBuffer = await zipFile.arrayBuffer();
    
    // Import JSZip dynamically
    const JSZip = (await import('https://esm.sh/jszip@3.10.1')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);

    const results = {
      uploaded: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    // Helper to normalize speaker names for matching
    const normalize = (str: string) =>
      str.toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();

    // Load existing speakers once so we can reuse them instead of creating duplicates
    const { data: existingSpeakers, error: speakersFetchError } = await supabaseAdmin
      .from("speakers")
      .select("id, name");

    if (speakersFetchError) {
      console.error("Failed to load existing speakers:", speakersFetchError);
      throw new Error("Failed to load existing speakers");
    }

    // Process each file in the ZIP
    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      const lowerFilename = filename.toLowerCase();
      
      // Skip non-PDF files and system files
      if (!lowerFilename.endsWith(".pdf") || lowerFilename.includes("__macosx") || lowerFilename.startsWith(".")) {
        results.skipped.push(`${filename} (not a PDF)`);
        continue;
      }

      try {
        console.log(`Processing: ${filename}`);

        // Get file content
        const fileContent = await file.async("uint8array");
        
        // Validate file size (10MB limit)
        if (fileContent.length > 10 * 1024 * 1024) {
          results.errors.push(`${filename} (exceeds 10MB limit)`);
          continue;
        }

        // Extract speaker name from filename (remove path, extension, and clean up)
        const speakerName = filename
          .split('/').pop()!  // Remove path
          .replace(/\.[^/.]+$/, "")  // Remove extension
          .replace(/[-_]/g, " ")  // Replace dashes/underscores with spaces
          .trim();

        const normalizedName = normalize(speakerName);

        // Try to find an existing speaker with the same normalized name
        const matchingSpeaker = existingSpeakers?.find(
          (s) => normalize(s.name) === normalizedName
        );

        let speakerId: string;
        let speakerDisplayName: string;

        if (matchingSpeaker) {
          speakerId = matchingSpeaker.id;
          speakerDisplayName = matchingSpeaker.name;
          console.log(`Using existing speaker for ${filename}: ${speakerDisplayName} (${speakerId})`);
        } else {
          console.log(`Creating speaker: ${speakerName}`);

          // Create new speaker record
          const { data: newSpeaker, error: speakerError } = await supabaseAdmin
            .from("speakers")
            .insert({
              name: speakerName,
              is_active: true,
            })
            .select()
            .single();

          if (speakerError || !newSpeaker) {
            results.errors.push(`${filename} (failed to create speaker: ${speakerError?.message ?? "Unknown error"})`);
            continue;
          }

          speakerId = newSpeaker.id;
          speakerDisplayName = newSpeaker.name;
          console.log(`Created speaker: ${speakerDisplayName} (${speakerId})`);

          // Keep the in-memory list in sync so subsequent files can reuse this speaker
          if (existingSpeakers) {
            existingSpeakers.push({ id: newSpeaker.id, name: newSpeaker.name });
          }
        }

        // Upload PDF to storage
        const timestamp = Date.now();
        const storagePath = `${speakerId}/${timestamp}-${filename.split('/').pop()}`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("speaker-submissions")
          .upload(storagePath, fileContent, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          results.errors.push(`${filename} (upload failed: ${uploadError.message})`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from("speaker-submissions")
          .getPublicUrl(storagePath);

        // Create speaker_submissions record
        const { data: submission, error: submissionError } = await supabaseAdmin
          .from("speaker_submissions")
          .insert({
            speaker_id: speakerId,
            pdf_filename: filename,
            pdf_url: urlData.publicUrl,
            approval_status: "pending_approval",
          })
          .select()
          .single();

        if (submissionError) {
          results.errors.push(`${filename} (failed to create submission record: ${submissionError.message})`);
          continue;
        }

        console.log(`Created submission record for: ${filename}`);

        // Upload to Google Drive in speaker's folder
        try {
          // Convert file content to base64
          const base64Content = btoa(String.fromCharCode(...fileContent));
          
          const driveResponse = await supabaseAdmin.functions.invoke('upload-to-google-drive', {
            body: {
              fileContent: base64Content,
              fileName: filename.split('/').pop() || filename,
              mimeType: 'application/pdf',
              folderId: 'speaker-forms',
              speakerName: speakerDisplayName,
            },
          });

          if (driveResponse.error) {
            console.error(`Google Drive upload failed for ${filename}:`, driveResponse.error);
            // Don't fail the upload if Google Drive fails
          } else {
            console.log(`Uploaded ${filename} to Google Drive for speaker ${speakerDisplayName}`);
          }
        } catch (driveError) {
          console.error(`Google Drive upload error for ${filename}:`, driveError);
          // Don't fail the upload if Google Drive fails
        }

        // Invoke parse-speaker-submission function
        try {
          const { error: parseError } = await supabaseAdmin.functions.invoke(
            "parse-speaker-submission",
            {
                body: {
                  submissionId: submission.id,
                  pdfUrl: urlData.publicUrl,
                  speakerId,
                },
            }
          );

          if (parseError) {
            console.error(`Parse error for ${filename}:`, parseError);
            results.uploaded.push(`${filename} → ${speakerName} (uploaded but parsing failed)`);
          } else {
            results.uploaded.push(`${filename} → ${speakerName} (created & parsed)`);
          }
        } catch (parseErr) {
          console.error(`Parse invocation error for ${filename}:`, parseErr);
          results.uploaded.push(`${filename} → ${speakerName} (uploaded but parsing failed)`);
        }

      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push(`${filename} (${errorMessage})`);
      }
    }

    console.log("Bulk upload complete:", results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in upload-speaker-forms function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes("Unauthorized") ? 401 : 
             error.message.includes("Forbidden") ? 403 : 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
