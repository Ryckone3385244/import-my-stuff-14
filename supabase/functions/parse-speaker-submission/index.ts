import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  submissionId: string;
  pdfUrl: string;
  speakerId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, pdfUrl, speakerId }: ParseRequest = await req.json();

    console.log("Parsing speaker submission:", { submissionId, pdfUrl, speakerId });

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Determine which table this submission is from
    const isExhibitorSubmission = !speakerId;
    const submissionsTable = isExhibitorSubmission 
      ? "exhibitor_speaker_submissions" 
      : "speaker_submissions";
    
    const bucketName = isExhibitorSubmission
      ? "exhibitor-speaker-submissions"
      : "speaker-submissions";

    console.log(`Processing ${isExhibitorSubmission ? 'exhibitor' : 'speaker'} submission from table: ${submissionsTable}, bucket: ${bucketName}`);

    // Extract the storage path from the public URL
    const urlParts = pdfUrl.split(`/${bucketName}/`);
    if (urlParts.length !== 2) {
      throw new Error(`Invalid PDF URL format - expected bucket name: ${bucketName}`);
    }
    const storagePath = urlParts[1];

    // Download the PDF from storage using service role
    const { data: pdfData, error: downloadError } = await supabaseAdmin.storage
      .from(bucketName)
      .download(storagePath);

    if (downloadError || !pdfData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download PDF from storage");
    }

    const pdfBuffer = await pdfData.arrayBuffer();

    // Use Lovable AI to extract information from the PDF
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert PDF buffer to base64 for AI processing
    const base64Pdf = btoa(
      new Uint8Array(pdfBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Call Lovable AI to extract speaker form data - Include the PDF as an inline data part
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a document parser specialized in extracting speaker information from PDF forms. Analyze the provided document carefully and extract all available speaker information. Return only the data found in the document - do not make up or infer information that isn't explicitly stated.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please carefully extract ALL information from this speaker submission PDF form. All PDFs follow the EXACT SAME LAYOUT with these specific field labels:\n\n**CRITICAL REQUIRED FIELDS - YOU MUST EXTRACT THESE:**\n1. **SPEAKER NAME** - The person's full name\n2. **JOB TITLE** - Their position/role\n3. **COMPANY** - Their organization\n4. **EMAIL** - Contact email address\n5. **PHONE** - Contact phone number\n6. **SPEAKER BIOGRAPHY** - This is labeled exactly as 'Speaker biography' or 'Biography' in the form. This is typically a longer text field (multiple sentences or paragraphs) describing the speaker's professional background, experience, expertise, and credentials. YOU MUST EXTRACT THE COMPLETE TEXT from this field. This field is MANDATORY - it ALWAYS exists in these forms.\n7. **SEMINAR TITLE** - The title/name of their presentation\n8. **SHORT DESCRIPTION OF SEMINAR** - This is labeled exactly as 'Short description of seminar' or 'Seminar Description' in the form. This is typically a longer text field (multiple sentences or paragraphs) explaining what the seminar is about, its objectives, and key topics. YOU MUST EXTRACT THE COMPLETE TEXT from this field. This field is MANDATORY - it ALWAYS exists in these forms.\n9. **SPEAKER NOTES** - Any additional notes or requirements\n\n**IMPORTANT INSTRUCTIONS:**\n- These forms have a CONSISTENT layout - the biography and seminar description fields are ALWAYS present\n- Look for text blocks/paragraphs that appear after the labels mentioned above\n- Extract the FULL text content from these fields - do not truncate or summarize\n- If the text appears blurry or hard to read, try your best to extract it - it IS there\n- Return the complete text exactly as it appears in the PDF\n- Biography and seminar description are REQUIRED fields - they must NEVER be empty unless the form field itself is truly blank"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_speaker_data",
              description: "Extract structured speaker form data from the document",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Full name of the speaker as written in the form" },
                  title: { type: "string", description: "Speaker's job title or position" },
                  company: { type: "string", description: "Speaker's company or organization" },
                  email: { type: "string", description: "Speaker's email address" },
                  phone: { type: "string", description: "Speaker's phone number" },
                  bio: { 
                    type: "string", 
                    description: "REQUIRED: Complete speaker biography text from the 'Speaker biography' field in the form. This is a longer text (multiple sentences or paragraphs) describing the speaker's professional background, experience, expertise, and credentials. Extract the FULL text exactly as it appears - this field is MANDATORY and always exists in these forms."
                  },
                  seminar_title: { type: "string", description: "Title or name of the seminar/presentation" },
                  seminar_description: { 
                    type: "string", 
                    description: "REQUIRED: Complete seminar description text from the 'Short description of seminar' field in the form. This is a longer text (multiple sentences or paragraphs) explaining what the seminar is about, its objectives, and key topics to be covered. Extract the FULL text exactly as it appears - this field is MANDATORY and always exists in these forms."
                  },
                  speaker_notes: { type: "string", description: "Additional notes or special requirements from speaker" },
                },
                required: ["bio", "seminar_description"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_speaker_data" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI extraction error:", errorText);
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData, null, 2));

    // Extract the parsed data from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const extractedData = toolCall?.function?.arguments
      ? JSON.parse(toolCall.function.arguments)
      : {};

    console.log("Extracted data:", extractedData);

    // Update the submission with extracted data in the appropriate table
    const { error: updateError } = await supabaseAdmin
      .from(submissionsTable)
      .update({
        extracted_data: extractedData,
      })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Error updating submission:", updateError);
      throw updateError;
    }

    // Store extracted data in submission only - do NOT update speaker profile until approved
    console.log("Extracted data stored in submission record. Speaker profile will be updated upon approval.");

    // Create draft session if we have seminar data and a speaker ID
    // This ensures the session appears in the admin agenda for scheduling
    const seminarTitle = extractedData.seminar_title || extractedData.session_title;
    if (speakerId && seminarTitle) {
      // Check if a draft session already exists for this speaker
      const { data: existingDraft } = await supabaseAdmin
        .from("draft_sessions")
        .select("id")
        .eq("speaker_id", speakerId)
        .maybeSingle();

      if (existingDraft) {
        // Update existing draft session with new data
        const { error: draftUpdateError } = await supabaseAdmin
          .from("draft_sessions")
          .update({
            seminar_title: seminarTitle,
            seminar_description: extractedData.seminar_description || extractedData.session_description || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDraft.id);

        if (draftUpdateError) {
          console.error("Error updating draft session:", draftUpdateError);
          // Don't throw - draft session update is not critical
        } else {
          console.log(`Updated existing draft session ${existingDraft.id} for speaker ${speakerId}`);
        }
      } else {
        // Create new draft session
        const { data: newDraft, error: draftError } = await supabaseAdmin
          .from("draft_sessions")
          .insert({
            speaker_id: speakerId,
            seminar_title: seminarTitle,
            seminar_description: extractedData.seminar_description || extractedData.session_description || null,
            status: "draft",
          })
          .select("id")
          .single();

        if (draftError) {
          console.error("Error creating draft session:", draftError);
          // Don't throw - draft session creation is not critical for the parsing flow
        } else {
          console.log(`Created draft session ${newDraft?.id} for speaker ${speakerId} with title: ${seminarTitle}`);
        }
      }
    } else {
      console.log("No seminar title found or no speaker ID provided - skipping draft session creation");
    }

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in parse-speaker-submission function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);