import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  name: string;
  email: string;
  company: string;
  phone?: string;
  interestType: string;
}

const INTEREST_LABELS: Record<string, string> = {
  floorplan: "Floorplan Access",
  exhibitor_enquiry: "Exhibitor Enquiry",
  event_registration: "Event Registration",
  general: "General Interest",
  agenda: "Agenda Registration",
  sponsor: "Sponsorship Interest",
  media_press: "Media / Press",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, company, phone, interestType }: NotificationRequest = await req.json();

    console.log("Processing registration notification:", { name, email, interestType });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get email config
    const { data: emailConfig } = await supabase
      .from("email_config")
      .select("from_name, from_domain, resend_api_key")
      .limit(1)
      .maybeSingle();

    const { data: eventSettings } = await supabase
      .from("event_settings")
      .select("event_name, contact_email")
      .single();

    const eventName = eventSettings?.event_name || "Customer Connect Expo";
    const fromName = emailConfig?.from_name || eventName;
    const fromDomain = emailConfig?.from_domain || "fortemevents.com";

    const apiKey = emailConfig?.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("Resend API key not configured");
    }

    // Only send to event contact email and Monty
    const FIXED_RECIPIENT = "monty.moss@fortemexpo.com";
    const adminEmails: string[] = [FIXED_RECIPIENT];

    if (eventSettings?.contact_email && eventSettings.contact_email !== FIXED_RECIPIENT) {
      adminEmails.push(eventSettings.contact_email);
    }

    if (adminEmails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recipient emails configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending registration notifications to:", adminEmails);

    const resend = new Resend(apiKey);
    const typeLabel = INTEREST_LABELS[interestType] || interestType;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #F7F7F7; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FAFAFA; border-radius: 8px; overflow: hidden;">
                  <tr>
                    <td style="background-color: #000000; padding: 30px; text-align: center;">
                      <h2 style="color: #ffffff; margin: 0; font-size: 22px;">New Registration: ${typeLabel}</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #FAFAFA; padding: 30px;">
                      <p style="color: #111111; margin: 0 0 20px 0; font-size: 16px;">A new form submission has been received.</p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0; border-radius: 5px; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="color: #111111; margin: 0 0 10px 0; font-size: 14px;"><strong>Type:</strong> ${typeLabel}</p>
                            <p style="color: #111111; margin: 0 0 10px 0; font-size: 14px;"><strong>Name:</strong> ${name}</p>
                            <p style="color: #111111; margin: 0 0 10px 0; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                            <p style="color: #111111; margin: 0 0 10px 0; font-size: 14px;"><strong>Company:</strong> ${company}</p>
                            ${phone ? `<p style="color: #111111; margin: 0; font-size: 14px;"><strong>Phone:</strong> ${phone}</p>` : ""}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: `${fromName} <info@${fromDomain}>`,
      to: adminEmails,
      subject: `New ${typeLabel} Registration: ${name}`,
      html: emailHtml,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: emailResponse.error.message || "Failed to send notification" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Registration notification sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, notifiedCount: adminEmails.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-registration:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
