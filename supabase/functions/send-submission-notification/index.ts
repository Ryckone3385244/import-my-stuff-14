import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmissionNotificationRequest {
  to: string;
  managerName: string;
  exhibitorName: string;
  submissionType: "speaker" | "advert";
  fileName: string;
  fileUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, managerName, exhibitorName, submissionType, fileName, fileUrl }: SubmissionNotificationRequest = await req.json();

    console.log("Sending submission notification:", { to, submissionType, exhibitorName });

    // Initialize Supabase client to fetch email config
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email config for sender settings and API key
    const { data: emailConfig } = await supabase
      .from("email_config")
      .select("from_name, from_domain, resend_api_key")
      .limit(1)
      .maybeSingle();

    // Get event settings for event name
    const { data: eventSettings, error: settingsError } = await supabase
      .from("event_settings")
      .select("event_name")
      .single();

    if (settingsError) {
      console.error("Error fetching event settings:", settingsError);
    }

    const eventName = eventSettings?.event_name || "Customer Connect Expo";
    const fromName = emailConfig?.from_name || eventName;
    const fromDomain = emailConfig?.from_domain || "fortemevents.com";

    // Get API key from database first, fallback to environment variable
    const apiKey = emailConfig?.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("Resend API key not configured");
    }

    console.log("Using sender domain:", fromDomain);

    const resend = new Resend(apiKey);

    const submissionTypeLabel = submissionType === "speaker" ? "Speaker Form & Headshot" : "Advertisement";

    const emailResponse = await resend.emails.send({
      from: `${fromName} <info@${fromDomain}>`,
      to: [to],
      subject: `New ${submissionTypeLabel} Submission from ${exhibitorName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="color-scheme" content="light only">
            <meta name="supported-color-schemes" content="light only">
          </head>
          <body style="margin: 0; padding: 0; background-color: #F7F7F7 !important; font-family: Arial, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important;">
              <tr>
                <td align="center" style="padding: 20px; background-color: #F7F7F7 !important;">
                  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FAFAFA !important; border-radius: 8px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background-color: #000000 !important; padding: 30px; text-align: center;">
                        <h2 style="color: #ffffff !important; margin: 0; font-size: 22px;">New ${submissionTypeLabel} Submission</h2>
                      </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                      <td style="background-color: #FAFAFA !important; padding: 30px;">
                        <p style="color: #111111 !important; margin: 0 0 15px 0; font-size: 16px;">Dear ${managerName},</p>
                        <p style="color: #111111 !important; margin: 0 0 20px 0; font-size: 16px;"><strong style="color: #111111 !important;">${exhibitorName}</strong> has submitted their ${submissionTypeLabel.toLowerCase()}.</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; padding: 15px; border-radius: 5px; margin: 20px 0;">
                          <tr>
                            <td style="padding: 15px; background-color: #F0F0F0 !important;">
                              <p style="margin: 0 0 10px 0; color: #111111 !important; font-size: 14px;"><strong style="color: #111111 !important;">File Name:</strong> ${fileName}</p>
                              <p style="margin: 0; color: #111111 !important; font-size: 14px;"><strong style="color: #111111 !important;">Submission Type:</strong> ${submissionTypeLabel}</p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="color: #111111 !important; margin: 0 0 20px 0; font-size: 16px;">You can download the file from the admin panel or access it directly:</p>
                        
                        <table cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="background-color: #10b981 !important; border: 1px solid #10b981 !important; border-radius: 5px;">
                              <a href="${fileUrl}" style="display: inline-block; padding: 12px 24px; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px;">Download File</a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin-top: 30px; color: #333333 !important; font-size: 14px;">Best regards,<br>${eventName} Team</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: emailResponse.error.message || "Failed to send notification email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Submission notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending submission notification:", error);
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
