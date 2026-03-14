import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportTicketRequest {
  ticketNumber: string;
  exhibitorId: string;
  subject: string;
  message: string;
  attachmentUrls: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketNumber, exhibitorId, subject, message, attachmentUrls }: SupportTicketRequest = await req.json();

    console.log("Processing support ticket email:", ticketNumber);

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

    const eventName = eventSettings?.event_name || "Expo";
    const fromName = emailConfig?.from_name || eventName;
    const fromDomain = emailConfig?.from_domain || "fortemevents.com";

    // Get API key from database first, fallback to environment variable
    const apiKey = emailConfig?.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("Resend API key not configured");
    }

    console.log("Using sender domain:", fromDomain);

    // Initialize Resend with the API key
    const resend = new Resend(apiKey);

    // Get exhibitor details
    const { data: exhibitor, error: exhibitorError } = await supabase
      .from("exhibitors")
      .select("name, booth_number")
      .eq("id", exhibitorId)
      .single();

    if (exhibitorError) {
      console.error("Error fetching exhibitor:", exhibitorError);
      throw new Error("Could not fetch exhibitor details");
    }

    // Get exhibitor contacts
    const { data: contacts, error: contactsError } = await supabase
      .from("exhibitor_contacts")
      .select("email, is_main_contact")
      .eq("exhibitor_id", exhibitorId)
      .eq("is_active", true);

    if (contactsError) {
      console.error("Error fetching exhibitor contacts:", contactsError);
    }

    // Get active CRM managers shown in portal from customer_managers table
    const { data: activeManagers, error: managersError } = await supabase
      .from("customer_managers")
      .select("email")
      .eq("is_active", true);

    if (managersError) {
      console.error("Error fetching customer managers:", managersError);
      throw new Error("Could not fetch customer service managers");
    }

    const managerEmails = activeManagers?.map(m => m.email).filter(email => email !== null && email !== '') || [];
    const contactEmails = contacts?.map(c => c.email) || [];
    const mainContactEmail = contacts?.find(c => c.is_main_contact)?.email || contactEmails[0];

    if (managerEmails.length === 0) {
      throw new Error("No customer service manager emails found");
    }

    console.log("Sending to CS managers:", managerEmails);
    console.log("Main contact for reply-to:", mainContactEmail);
    console.log("CC to exhibitor contacts:", contactEmails);

    // Get file names from URLs
    const getFileNameFromUrl = (url: string) => {
      try {
        const urlParts = url.split('/');
        const fileNameWithParams = urlParts[urlParts.length - 1];
        const fileName = fileNameWithParams.split('?')[0];
        return decodeURIComponent(fileName);
      } catch (e) {
        return url;
      }
    };

    // Prepare attachment links for email
    const attachmentLinks = attachmentUrls.length > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0; background-color: #F0F0F0 !important; border-radius: 8px;">
          <tr>
            <td style="padding: 15px; background-color: #F0F0F0 !important;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #111111 !important; font-size: 14px;">Attachments:</p>
              ${attachmentUrls.map((url) => `
                <p style="margin: 5px 0;">
                  <a href="${url}" style="color: #10b981 !important; text-decoration: underline;">${getFileNameFromUrl(url)}</a>
                </p>
              `).join('')}
            </td>
          </tr>
        </table>`
      : '';

    // Get event logo for header
    const logoUrl = eventSettings?.logo_url || '';

    // Create email HTML for CS managers
    const csEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
        </head>
        <body style="margin: 0; padding: 0; background-color: #F7F7F7 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important;">
            <tr>
              <td align="center" style="padding: 20px; background-color: #F7F7F7 !important;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FAFAFA !important; border-radius: 0; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #000000 !important; padding: 40px 30px; text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="${eventName}" style="max-width: 200px; height: auto; margin-bottom: 20px;">` : ''}
                      <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #ffffff !important;">${eventName}</h1>
                      <p style="margin: 0; font-size: 16px; color: #ffffff !important;">${eventSettings?.event_date || ''}</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; color: #ffffff !important;">${eventSettings?.location || ''}</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px; background-color: #FAFAFA !important;">
                      <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 600; color: #111111 !important;">Support Ticket</h2>
                      <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 500; color: #111111 !important;">${subject}</h3>
                      <p style="margin: 0 0 25px 0; font-size: 16px; color: #111111 !important;">Please reference ticket #${ticketNumber} in all correspondence</p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 5px 0; color: #333333 !important; font-size: 14px;">Exhibitor:</p>
                            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #111111 !important;">${exhibitor.name}</p>
                            ${exhibitor.booth_number ? `<p style="margin: 5px 0 0 0; color: #333333 !important; font-size: 14px;">Stand #${exhibitor.booth_number}</p>` : ''}
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 10px 0; color: #333333 !important; font-size: 14px;">Message:</p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-left: 4px solid #10b981; border-radius: 6px;">
                        <tr>
                          <td style="padding: 15px; background-color: #F0F0F0 !important;">
                            <p style="margin: 0; white-space: pre-wrap; color: #111111 !important; font-size: 15px; line-height: 1.6;">${message}</p>
                          </td>
                        </tr>
                      </table>

                      ${attachmentLinks}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #000000 !important; padding: 20px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; font-size: 14px; color: #ffffff !important;">Need help? Reply to this email or contact your Client Relations Manager.</p>
                      <p style="margin: 0; font-size: 12px; color: #cccccc !important;">${eventName} | ${eventSettings?.location || ''} | ${eventSettings?.event_date || ''}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Create email HTML for exhibitor (simplified confirmation)
    const exhibitorEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
        </head>
        <body style="margin: 0; padding: 0; background-color: #F7F7F7 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important;">
            <tr>
              <td align="center" style="padding: 20px; background-color: #F7F7F7 !important;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #FAFAFA !important; border-radius: 0; overflow: hidden;">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #000000 !important; padding: 40px 30px; text-align: center;">
                      ${logoUrl ? `<img src="${logoUrl}" alt="${eventName}" style="max-width: 200px; height: auto; margin-bottom: 20px;">` : ''}
                      <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 600; color: #ffffff !important;">${eventName}</h1>
                      <p style="margin: 0; font-size: 16px; color: #ffffff !important;">${eventSettings?.event_date || ''}</p>
                      <p style="margin: 5px 0 0 0; font-size: 16px; color: #ffffff !important;">${eventSettings?.location || ''}</p>
                    </td>
                  </tr>
                  
                  <!-- Banner -->
                  <tr>
                    <td style="background-color: #10b981 !important; padding: 30px; text-align: center;">
                      <h2 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff !important;">Support Ticket Received</h2>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px; background-color: #FAFAFA !important;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; color: #111111 !important; text-align: center;">Please reference ticket #${ticketNumber} in all correspondence</p>
                      <p style="margin: 0 0 30px 0; font-size: 16px; color: #111111 !important; text-align: center;">Thank you for contacting us. We have received your support ticket and our customer service team will respond shortly.</p>
                      
                      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 0 0 20px 0;" />
                      
                      <p style="margin: 0 0 5px 0; font-size: 16px; color: #111111 !important;"><strong style="color: #111111 !important;">Subject:</strong> ${subject}</p>
                      
                      <p style="margin: 20px 0 5px 0; font-size: 16px; color: #111111 !important;"><strong style="color: #111111 !important;">Your Message:</strong></p>
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-left: 4px solid #10b981; border-radius: 6px;">
                        <tr>
                          <td style="padding: 15px; background-color: #F0F0F0 !important;">
                            <p style="margin: 0; white-space: pre-wrap; font-size: 16px; color: #111111 !important; line-height: 1.6;">${message}</p>
                          </td>
                        </tr>
                      </table>

                      ${attachmentLinks}
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #000000 !important; padding: 20px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; font-size: 14px; color: #ffffff !important;">Need help? Reply to this email or contact your Client Relations Manager.</p>
                      <p style="margin: 0; font-size: 12px; color: #cccccc !important;">${eventName} | ${eventSettings?.location || ''} | ${eventSettings?.event_date || ''}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email to customer service managers with reply-to set to exhibitor main contact
    const csEmailResponse = await resend.emails.send({
      from: `${fromName} <info@${fromDomain}>`,
      to: managerEmails,
      replyTo: mainContactEmail,
      subject: `Support Ticket #${ticketNumber} - ${subject}`,
      html: csEmailHtml,
    });

    if (csEmailResponse.error) {
      console.error("Resend error (CS email):", csEmailResponse.error);
      return new Response(
        JSON.stringify({ error: csEmailResponse.error.message || "Failed to send email to customer service" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("CS email sent successfully:", csEmailResponse);

    // Send confirmation email to exhibitor contacts with reply-to set to CS managers
    if (contactEmails.length > 0) {
      const exhibitorEmailResponse = await resend.emails.send({
        from: `${fromName} <info@${fromDomain}>`,
        to: contactEmails,
        replyTo: managerEmails,
        subject: `Support Ticket #${ticketNumber} - ${subject}`,
        html: exhibitorEmailHtml,
      });

      if (exhibitorEmailResponse.error) {
        console.error("Resend error (exhibitor confirmation):", exhibitorEmailResponse.error);
        // Don't fail the whole request, CS email was sent
        console.log("Warning: Failed to send confirmation email to exhibitor");
      } else {
        console.log("Exhibitor confirmation email sent successfully:", exhibitorEmailResponse);
      }
    }

    console.log("Support ticket emails sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticketNumber 
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
    console.error("Error sending support ticket email:", error);
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
