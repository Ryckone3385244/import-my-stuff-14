import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormRequest {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
}

const createEmailTemplate = (data: ContactFormRequest, eventName: string, accentColor: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
        <title>New Contact Form Submission</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F7F7F7 !important;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important; padding: 20px 0;">
          <tr>
            <td align="center" style="background-color: #F7F7F7 !important;">
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FAFAFA !important; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000 !important; padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff !important; font-size: 28px; font-weight: 600;">New Contact Form Submission</h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px; background-color: #FAFAFA !important;">
                    <p style="margin: 0 0 20px 0; color: #111111 !important; font-size: 16px; line-height: 1.5;">
                      You have received a new inquiry from your website contact form.
                    </p>
                    
                    <!-- Contact Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                      <tr>
                        <td style="padding: 15px; background-color: #F0F0F0 !important; border-left: 4px solid ${accentColor};">
                          <p style="margin: 0 0 5px 0; color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Name</p>
                          <p style="margin: 0; color: #111111 !important; font-size: 16px; font-weight: 500;">${data.name}</p>
                        </td>
                      </tr>
                      <tr><td style="height: 10px;"></td></tr>
                      <tr>
                        <td style="padding: 15px; background-color: #F0F0F0 !important; border-left: 4px solid ${accentColor};">
                          <p style="margin: 0 0 5px 0; color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                          <p style="margin: 0; color: #111111 !important; font-size: 16px; font-weight: 500;">
                            <a href="mailto:${data.email}" style="color: #0066cc !important; text-decoration: underline;">${data.email}</a>
                          </p>
                        </td>
                      </tr>
                      ${data.company ? `
                      <tr><td style="height: 10px;"></td></tr>
                      <tr>
                        <td style="padding: 15px; background-color: #F0F0F0 !important; border-left: 4px solid ${accentColor};">
                          <p style="margin: 0 0 5px 0; color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Company</p>
                          <p style="margin: 0; color: #111111 !important; font-size: 16px; font-weight: 500;">${data.company}</p>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.phone ? `
                      <tr><td style="height: 10px;"></td></tr>
                      <tr>
                        <td style="padding: 15px; background-color: #F0F0F0 !important; border-left: 4px solid ${accentColor};">
                          <p style="margin: 0 0 5px 0; color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</p>
                          <p style="margin: 0; color: #111111 !important; font-size: 16px; font-weight: 500;">
                            <a href="tel:${data.phone}" style="color: #0066cc !important; text-decoration: underline;">${data.phone}</a>
                          </p>
                        </td>
                      </tr>
                      ` : ''}
                      <tr><td style="height: 10px;"></td></tr>
                      <tr>
                        <td style="padding: 15px; background-color: #F0F0F0 !important; border-left: 4px solid ${accentColor};">
                          <p style="margin: 0 0 10px 0; color: #333333 !important; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Message</p>
                          <p style="margin: 0; color: #111111 !important; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0 0; color: #333333 !important; font-size: 14px; line-height: 1.5;">
                      This email was sent from your website's contact form on ${new Date().toLocaleDateString('en-GB', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 30px; background-color: #F0F0F0 !important; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0; color: #333333 !important; font-size: 13px;">
                      ${eventName}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: ContactFormRequest = await req.json();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name, email, and message are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate field lengths
    if (formData.name.length > 100) {
      return new Response(
        JSON.stringify({ error: "Name must be less than 100 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (formData.email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Email must be less than 255 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (formData.message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Message must be less than 5000 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (formData.company && formData.company.length > 200) {
      return new Response(
        JSON.stringify({ error: "Company name must be less than 200 characters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client to fetch event settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get event settings including Resend configuration
    const { data: eventSettings, error: settingsError } = await supabase
      .from("event_settings")
      .select("event_name, resend_from_name, resend_from_domain")
      .single();

    if (settingsError) {
      console.error("Error fetching event settings:", settingsError);
    }

    // Fetch website styles for dynamic colors
    const { data: websiteStyles } = await supabase
      .from("website_styles")
      .select("primary_color, button_color")
      .limit(1)
      .maybeSingle();

    // Convert HSL to hex for email
    const hslToHex = (hslString: string): string => {
      if (!hslString) return '#10b981';
      const parts = hslString.trim().split(/\s+/);
      if (parts.length < 3) return '#10b981';
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
    };

    const accentColor = hslToHex(websiteStyles?.button_color || websiteStyles?.primary_color || '142 86% 28%');

    const eventName = eventSettings?.event_name || "Customer Connect Expo";
    const fromName = eventSettings?.resend_from_name || eventName;
    const fromDomain = eventSettings?.resend_from_domain || "fortemevents.com";

    // Get contact email from event_settings (dynamically synced)
    const { data: contactSettings } = await supabase
      .from("event_settings")
      .select("contact_email")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let recipientEmails: string[] = [];
    if (contactSettings?.contact_email) {
      recipientEmails = [contactSettings.contact_email];
    }

    // Fallback: if no contact_email configured, use from domain
    if (recipientEmails.length === 0) {
      console.log("No contact_email in event_settings, using fallback");
      recipientEmails = [`info@${fromDomain}`];
    }

    console.log("Sending contact form email for:", formData.name);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Send email to customer service manager
    const emailResponse = await resend.emails.send({
      from: `Contact Form <noreply@${fromDomain}>`,
      to: recipientEmails,
      replyTo: formData.email,
      subject: `New Contact Form Submission from ${formData.name}`,
      html: createEmailTemplate(formData, eventName, accentColor),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Your message has been sent successfully!"
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
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
