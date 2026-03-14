import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SpeakerContactRequest {
  speakerName: string;
  speakerEmail: string;
  subject: string;
  message: string;
  projectManagers: Array<{ name: string; email: string }>;
  fileUrl?: string | null;
  fileName?: string | null;
  speakerId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      speakerName, 
      speakerEmail, 
      subject, 
      message, 
      projectManagers,
      fileUrl,
      fileName,
      speakerId
    }: SpeakerContactRequest = await req.json();

    console.log("Sending speaker contact email:", {
      speakerName,
      speakerEmail,
      subject,
      projectManagerCount: projectManagers.length,
      hasAttachment: !!fileUrl,
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email config for sender settings and API key
    const { data: emailConfig } = await supabase
      .from("email_config")
      .select("from_name, from_domain, resend_api_key")
      .limit(1)
      .maybeSingle();

    // Get event settings
    const { data: eventSettings, error: settingsError } = await supabase
      .from("event_settings")
      .select("event_name, logo_url, event_date, location")
      .single();

    if (settingsError) {
      console.error("Error fetching event settings:", settingsError);
      throw new Error("Failed to fetch event settings");
    }

    const eventName = eventSettings?.event_name || "Customer Connect Expo";
    const fromName = emailConfig?.from_name || eventName;
    const fromDomain = emailConfig?.from_domain || "fortemevents.com";
    const logoUrl = eventSettings?.logo_url || '';

    // Get API key from database first, fallback to environment variable
    const RESEND_API_KEY = emailConfig?.resend_api_key || Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    console.log("Using sender domain:", fromDomain);

    // Add attachment section to email if file exists
    const attachmentSection = fileUrl && fileName ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">Attachment:</p>
        <a href="${fileUrl}" style="color: #2563eb; text-decoration: none; font-size: 14px; word-break: break-all;">${fileName}</a>
      </div>
    ` : '';

    // Prepare recipient list
    const recipients = projectManagers
      .filter((pm) => pm.email)
      .map((pm) => pm.email);

    if (recipients.length === 0) {
      throw new Error("No valid project manager emails found");
    }

    // Email HTML for project managers - Dark mode hardened
    const pmEmailHtml = `
      <!DOCTYPE html>
      <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
          <title>Speaker Contact</title>
          <style type="text/css">
            :root { color-scheme: light only; supported-color-schemes: light only; }
            body, table, td, div, p, span, h1, h2, h3 { color: #111111 !important; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #F7F7F7 !important; color: #111111 !important;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important;">
            <tr>
              <td align="center" style="padding: 20px; background-color: #F7F7F7 !important;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FAFAFA !important; border-radius: 0; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #2d3748 !important; padding: 40px 30px; text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="${eventName}" style="max-width: 200px; height: auto; margin-bottom: 20px;">` : ''}
                      <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #ffffff !important;">${eventName}</h1>
                      ${eventSettings?.event_date ? `<p style="margin: 0; font-size: 16px; color: #ffffff !important;">${eventSettings.event_date}</p>` : ''}
                      ${eventSettings?.location ? `<p style="margin: 5px 0 0 0; font-size: 16px; color: #ffffff !important;">${eventSettings.location}</p>` : ''}
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px; background-color: #FAFAFA !important;">
                      <h2 style="margin: 0 0 20px 0; font-size: 22px; font-weight: 600; color: #111111 !important;">Speaker Contact</h2>
                      
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
                        <tr>
                          <td style="background-color: #FAFAFA !important;">
                            <p style="margin: 0 0 5px 0; color: #333333 !important; font-size: 14px;">From:</p>
                            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #111111 !important;">${speakerName}</p>
                            <p style="margin: 5px 0 0 0;"><a href="mailto:${speakerEmail}" style="color: #0066cc !important; text-decoration: underline;">${speakerEmail}</a></p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 10px 0; color: #333333 !important; font-size: 14px;">Subject:</p>
                      <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #111111 !important;">${subject}</p>
                      
                      <p style="margin: 0 0 10px 0; color: #333333 !important; font-size: 14px;">Message:</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-left: 4px solid #10b981; border-radius: 6px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 15px; background-color: #F0F0F0 !important;">
                            <p style="margin: 0; white-space: pre-wrap; color: #111111 !important; font-size: 15px; line-height: 1.6;">${message}</p>
                          </td>
                        </tr>
                      </table>
                      
                      ${attachmentSection}
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #2d3748 !important; padding: 20px 30px; text-align: center;">
                      <p style="margin: 0; font-size: 14px; color: #ffffff !important;">Reply directly to this email to respond to the speaker.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Email HTML for speaker confirmation - Dark mode hardened
    const speakerEmailHtml = `
      <!DOCTYPE html>
      <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
          <title>Message Received</title>
          <style type="text/css">
            :root { color-scheme: light only; supported-color-schemes: light only; }
            body, table, td, div, p, span, h1, h2, h3 { color: #111111 !important; }
          </style>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #F7F7F7 !important; color: #111111 !important;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important;">
            <tr>
              <td align="center" style="padding: 20px; background-color: #F7F7F7 !important;">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FAFAFA !important; border-radius: 0; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #2d3748 !important; padding: 40px 30px; text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="${eventName}" style="max-width: 200px; height: auto; margin-bottom: 20px;">` : ''}
                      <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #ffffff !important;">${eventName}</h1>
                      ${eventSettings?.event_date ? `<p style="margin: 0; font-size: 16px; color: #ffffff !important;">${eventSettings.event_date}</p>` : ''}
                      ${eventSettings?.location ? `<p style="margin: 5px 0 0 0; font-size: 16px; color: #ffffff !important;">${eventSettings.location}</p>` : ''}
                    </td>
                  </tr>
                  <!-- Banner -->
                  <tr>
                    <td style="background-color: #10b981 !important; padding: 30px; text-align: center;">
                      <h2 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff !important;">Message Received</h2>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px; background-color: #FAFAFA !important;">
                      <p style="margin: 0 0 30px 0; font-size: 16px; color: #111111 !important; text-align: center;">Thank you for contacting us. We have received your message and our project management team will respond shortly.</p>
                      
                      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 20px 0;" />
                      
                      <p style="margin: 0 0 5px 0; font-size: 16px; color: #111111 !important;"><strong style="color: #111111 !important;">Subject:</strong></p>
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111111 !important;">${subject}</p>
                      
                      <p style="margin: 0 0 5px 0; font-size: 16px; color: #111111 !important;"><strong style="color: #111111 !important;">Your Message:</strong></p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-left: 4px solid #10b981; border-radius: 6px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding: 15px; background-color: #F0F0F0 !important;">
                            <p style="margin: 0; white-space: pre-wrap; font-size: 16px; color: #111111 !important; line-height: 1.6;">${message}</p>
                          </td>
                        </tr>
                      </table>
                      
                      ${attachmentSection}
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #2d3748 !important; padding: 20px 30px; text-align: center;">
                      <p style="margin: 0; font-size: 14px; color: #ffffff !important;">Reply to this email if you have any additional questions.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email to project managers with reply-to set to speaker
    const pmEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <info@${fromDomain}>`,
        to: recipients,
        reply_to: speakerEmail,
        subject: `Speaker Contact: ${subject}`,
        html: pmEmailHtml,
      }),
    });

    if (!pmEmailResponse.ok) {
      const error = await pmEmailResponse.text();
      console.error("Resend API error (PM email):", error);
      return new Response(
        JSON.stringify({ error: `Failed to send email to project managers: ${error}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const pmEmailData = await pmEmailResponse.json();
    console.log("PM email sent successfully:", pmEmailData);

    // Send confirmation email to speaker with reply-to set to project managers
    const speakerEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <info@${fromDomain}>`,
        to: [speakerEmail],
        reply_to: recipients,
        subject: `Message Received: ${subject}`,
        html: speakerEmailHtml,
      }),
    });

    if (!speakerEmailResponse.ok) {
      const error = await speakerEmailResponse.text();
      console.error("Resend API error (speaker confirmation):", error);
      // Don't throw here, PM email was sent successfully
      console.log("Warning: Failed to send confirmation email to speaker");
    } else {
    const speakerEmailData = await speakerEmailResponse.json();
      console.log("Speaker confirmation email sent successfully:", speakerEmailData);
    }


    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-speaker-contact function:", error);
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