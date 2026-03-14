import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { escapeHtml } from '../_shared/htmlEscape.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Export escapeHtml for use in email templates that include passwords
export { escapeHtml };

interface EmailRequest {
  to: string[];
  subject: string;
  html: string;
  ccEmail: string;
  replyToEmail: string;
  fromName: string;
  fromEmail: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated and authorized
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.log("Unauthorized: No user found");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin, CS, or PM
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'customer_service', 'project_manager']);

    if (roleError || !roleData || roleData.length === 0) {
      console.log("Forbidden: User does not have required role", { userId: user.id, roleError });
      return new Response(JSON.stringify({ error: 'Forbidden - Admin/CS/PM access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, subject, html, ccEmail, replyToEmail, fromName, fromEmail }: EmailRequest = await req.json();

    console.log("Sending email to:", to);
    console.log("CC:", ccEmail);
    console.log("Reply-To:", replyToEmail);
    console.log("Authorized user:", user.id);

    // Validate required fields
    if (!to || !Array.isArray(to) || to.length === 0) {
      throw new Error("Recipient email(s) required");
    }
    
    if (!subject || subject.length === 0) {
      throw new Error("Subject is required");
    }
    
    if (subject.length > 500) {
      throw new Error("Subject must be less than 500 characters");
    }
    
    if (!html || html.length === 0) {
      throw new Error("Email content is required");
    }
    
    if (html.length > 100000) {
      throw new Error("Email content must be less than 100000 characters");
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of to) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid recipient email: ${email}`);
      }
    }
    
    if (ccEmail && !emailRegex.test(ccEmail)) {
      throw new Error(`Invalid CC email: ${ccEmail}`);
    }
    
    if (replyToEmail && !emailRegex.test(replyToEmail)) {
      throw new Error(`Invalid reply-to email: ${replyToEmail}`);
    }

    // Get email config for API key
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: emailConfig } = await supabaseServiceClient
      .from('email_config')
      .select('resend_api_key')
      .limit(1)
      .maybeSingle();

    // Get API key from database first, fallback to environment variable
    const RESEND_API_KEY = emailConfig?.resend_api_key || Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const resend = new Resend(RESEND_API_KEY);

    // Wrap user-provided HTML in dark-mode-safe wrapper
    // Forces light-mode rendering using off-white backgrounds, explicit text colors, and stricter style locks
    const wrappedHtml = `
      <!DOCTYPE html>
      <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <meta name="supported-color-schemes" content="light only">
          <title>Email</title>
          <!--[if mso]>
          <style type="text/css">
            table, td, div, h1, h2, h3, h4, h5, h6, p, span, a { font-family: Arial, sans-serif !important; }
          </style>
          <![endif]-->
          <style type="text/css">
            /* Force light mode - but allow inline color overrides for dark headers */
            :root { color-scheme: light only; supported-color-schemes: light only; }
            /* No global text color override - rely on inline styles to preserve white text on dark backgrounds */
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F7F7F7 !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: Arial, Helvetica, sans-serif; color: #111111 !important;">
          <!-- Outer wrapper table for full-page background -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F7F7F7 !important; min-height: 100%;">
            <tr>
              <td align="center" valign="top" style="background-color: #F7F7F7 !important; padding: 20px;">
                <!-- Inner content table -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FAFAFA !important; border-radius: 0; color: #111111 !important;">
                  <tr>
                    <td style="background-color: #FAFAFA !important; color: #111111 !important; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5;">
                      ${html}
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
      from: `${fromName} <${fromEmail}>`,
      to: to,
      cc: ccEmail ? [ccEmail] : undefined,
      replyTo: replyToEmail,
      subject: subject,
      html: wrappedHtml,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: emailResponse.error.message || "Failed to send email" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
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
