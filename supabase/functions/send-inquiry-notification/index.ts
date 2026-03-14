import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InquiryNotificationRequest {
  inquiryId: string;
  exhibitorId: string;
  visitorName: string;
  visitorEmail: string;
  visitorCompany?: string;
  visitorPhone?: string;
  message: string;
}

// Convert HSL string (e.g., "142 86% 28%") to hex color
function hslToHex(hslString: string): string {
  if (!hslString) return '#26cc5f'; // fallback
  
  const parts = hslString.trim().split(/\s+/);
  if (parts.length < 3) return '#26cc5f';
  
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1].replace('%', '')) / 100;
  const l = parseFloat(parts[2].replace('%', '')) / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      inquiryId,
      exhibitorId,
      visitorName,
      visitorEmail,
      visitorCompany,
      visitorPhone,
      message,
    }: InquiryNotificationRequest = await req.json();

    console.log("Processing inquiry notification:", inquiryId);

    // Create Supabase client to fetch exhibitor details
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch exhibitor details
    const { data: exhibitor, error: exhibitorError } = await supabase
      .from("exhibitors")
      .select("name, booth_number")
      .eq("id", exhibitorId)
      .single();

    if (exhibitorError) throw exhibitorError;

    // Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from("exhibitor_contacts")
      .select("email, full_name")
      .eq("exhibitor_id", exhibitorId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (contactError) throw contactError;

    if (!contact?.email) {
      throw new Error("No active contact email found for exhibitor");
    }

    // Fetch website styles for dynamic colors
    const { data: websiteStyles } = await supabase
      .from("website_styles")
      .select("primary_color, button_color, gradient_start_color, gradient_end_color")
      .limit(1)
      .maybeSingle();

    // Fetch email config for sender settings and API key
    const { data: emailConfig } = await supabase
      .from("email_config")
      .select("from_name, from_domain, resend_api_key")
      .limit(1)
      .maybeSingle();

    // Fetch event settings for event name and logo
    const { data: eventSettings } = await supabase
      .from("event_settings")
      .select("logo_url, event_name")
      .limit(1)
      .maybeSingle();

    const eventName = eventSettings?.event_name || "Expo";
    const fromName = emailConfig?.from_name || eventName;
    const fromDomain = emailConfig?.from_domain || "fortemevents.com";

    // Get API key from database first, fallback to environment variable
    const apiKey = emailConfig?.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("Resend API key not configured");
    }

    const resend = new Resend(apiKey);

    // Convert HSL colors to hex for email compatibility
    const accentColor = hslToHex(websiteStyles?.button_color || websiteStyles?.primary_color || '142 86% 28%');

    console.log("Using accent color:", accentColor);
    console.log("Using sender domain:", fromDomain);

    // Send email to exhibitor
    const exhibitorEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
        </head>
        <body style="margin: 0; padding: 0; background-color: #F7F7F7 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important;">
            <tr>
              <td align="center" style="padding: 20px; background-color: #F7F7F7 !important;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FAFAFA !important; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #000000 !important; padding: 40px 30px; text-align: center;">
                      ${eventSettings?.logo_url ? `<img src="${eventSettings.logo_url}" alt="${eventName}" style="max-width: 180px; height: auto; margin-bottom: 15px;" />` : ''}
                      <h1 style="margin: 0; font-size: 24px; color: #ffffff !important;">New Inquiry Received</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #FAFAFA !important; padding: 30px;">
                      <p style="color: #111111 !important; margin: 0 0 15px 0; font-size: 16px;">Hello ${contact.full_name || 'there'},</p>
                      <p style="color: #111111 !important; margin: 0 0 20px 0; font-size: 16px;">You've received a new inquiry through the expo website for <strong style="color: #111111 !important;">${exhibitor.name}</strong>${exhibitor.booth_number ? ` (Booth ${exhibitor.booth_number})` : ''}.</p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-left: 4px solid ${accentColor}; border-radius: 4px; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px; background-color: #F0F0F0 !important;">
                            <p style="color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0;">From</p>
                            <p style="color: #111111 !important; font-size: 16px; font-weight: 500; margin: 0 0 15px 0;">${visitorName}</p>
                            
                            <p style="color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0;">Email</p>
                            <p style="margin: 0 0 15px 0; font-size: 16px;"><a href="mailto:${visitorEmail}" style="color: #0066cc !important; text-decoration: underline;">${visitorEmail}</a></p>
                            
                            ${visitorCompany ? `
                            <p style="color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0;">Company</p>
                            <p style="color: #111111 !important; font-size: 16px; font-weight: 500; margin: 0 0 15px 0;">${visitorCompany}</p>
                            ` : ''}
                            
                            ${visitorPhone ? `
                            <p style="color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0;">Phone</p>
                            <p style="margin: 0; font-size: 16px;"><a href="tel:${visitorPhone}" style="color: #0066cc !important; text-decoration: underline;">${visitorPhone}</a></p>
                            ` : ''}
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 5px 0;">Message</p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-radius: 8px; margin: 10px 0 20px 0; border: 1px solid #e0e0e0;">
                        <tr>
                          <td style="padding: 20px; background-color: #F0F0F0 !important;">
                            <p style="color: #111111 !important; margin: 0; font-size: 15px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                          </td>
                        </tr>
                      </table>

                      <p style="margin-top: 30px; color: #111111 !important; font-size: 16px;">You can reply directly to ${visitorEmail} or view this inquiry in your exhibitor portal.</p>
                      
                      <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 20px;">
                        <tr>
                          <td style="background-color: ${accentColor} !important; border: 1px solid ${accentColor} !important; border-radius: 5px;">
                            <a href="/exhibitor/inquiries" style="display: inline-block; padding: 12px 24px; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px;">View in Portal →</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #F0F0F0 !important; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #333333 !important; font-size: 13px;">This is an automated notification from ${eventName}.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email to exhibitor
    const exhibitorEmailResult = await resend.emails.send({
      from: `${fromName} <info@${fromDomain}>`,
      to: [contact.email],
      replyTo: visitorEmail,
      subject: `New Inquiry from ${visitorName}`,
      html: exhibitorEmailHtml,
    });

    if (exhibitorEmailResult.error) {
      console.error("Resend error (exhibitor email):", exhibitorEmailResult.error);
      return new Response(
        JSON.stringify({ error: exhibitorEmailResult.error.message || "Failed to send exhibitor email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Exhibitor email sent:", exhibitorEmailResult);

    // Send confirmation email to visitor
    const visitorEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
        </head>
        <body style="margin: 0; padding: 0; background-color: #F7F7F7 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important;">
            <tr>
              <td align="center" style="padding: 20px; background-color: #F7F7F7 !important;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FAFAFA !important; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #000000 !important; padding: 40px 30px; text-align: center;">
                      ${eventSettings?.logo_url ? `<img src="${eventSettings.logo_url}" alt="${eventName}" style="max-width: 180px; height: auto; margin-bottom: 15px;" />` : ''}
                      <h1 style="margin: 0; font-size: 24px; color: #ffffff !important;">Message Sent Successfully</h1>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #FAFAFA !important; padding: 30px;">
                      <p style="color: #111111 !important; margin: 0 0 15px 0; font-size: 16px;">Dear ${visitorName},</p>
                      <p style="color: #111111 !important; margin: 0 0 15px 0; font-size: 16px;">Thank you for your interest in <strong style="color: #111111 !important;">${exhibitor.name}</strong>. Your inquiry has been successfully sent and the exhibitor will be in touch with you shortly.</p>
                      <p style="color: #111111 !important; margin: 0 0 15px 0; font-size: 16px;">A copy of your message:</p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-radius: 8px; margin: 20px 0; border: 1px solid #e0e0e0;">
                        <tr>
                          <td style="padding: 20px; background-color: #F0F0F0 !important;">
                            <p style="color: #111111 !important; margin: 0; font-size: 15px; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #111111 !important; margin: 0; font-size: 16px;">If you have any urgent questions, please feel free to reach out directly to the exhibitor.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #F0F0F0 !important; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                      <p style="margin: 0; color: #333333 !important; font-size: 13px;">Thank you for using ${eventName}.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const visitorEmailResult = await resend.emails.send({
      from: `${fromName} <info@${fromDomain}>`,
      to: [visitorEmail],
      subject: `Your inquiry to ${exhibitor.name}`,
      html: visitorEmailHtml,
    });

    if (visitorEmailResult.error) {
      console.error("Resend error (visitor email):", visitorEmailResult.error);
      // Don't fail the whole request if visitor email fails, exhibitor email was sent
      console.log("Warning: Failed to send confirmation email to visitor");
    } else {
      console.log("Visitor confirmation email sent:", visitorEmailResult);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Notification emails sent successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending inquiry notification:", error);
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
