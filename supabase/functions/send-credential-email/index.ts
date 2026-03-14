import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CredentialEmailRequest {
  entityType: "exhibitor" | "speaker";
  entityName: string;
  email: string;
  password: string;
  portalUrl: string;
  isReset: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify caller is authenticated and authorized
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin/CS/PM
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "customer_service", "project_manager"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entityType, entityName, email, password, portalUrl, isReset }: CredentialEmailRequest = await req.json();

    console.log(`Sending credential email to ${email} for ${entityType}: ${entityName} (${isReset ? "reset" : "new"})`);

    // Validate required fields
    if (!email || !password || !entityName || !entityType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get email config (Resend API key + from domain)
    const { data: emailConfig } = await supabaseClient
      .from("email_config")
      .select("resend_api_key, from_domain, from_name")
      .limit(1)
      .maybeSingle();

    const RESEND_API_KEY = emailConfig?.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get event settings for branding
    const { data: eventSettings } = await supabaseClient
      .from("event_settings")
      .select("event_name, logo_url, resend_from_domain, resend_from_name")
      .limit(1)
      .maybeSingle();

    const fromDomain = emailConfig?.from_domain || eventSettings?.resend_from_domain || "fortemevents.com";
    const fromName = emailConfig?.from_name || eventSettings?.resend_from_name || "Event Portal";
    const eventName = eventSettings?.event_name || "Event";
    const logoUrl = eventSettings?.logo_url || "";

    const resend = new Resend(RESEND_API_KEY);

    const portalLabel = entityType === "exhibitor" ? "Exhibitor Portal" : "Speaker Portal";
    const actionText = isReset ? "Your password has been reset" : "Your portal account has been created";
    const subjectText = isReset
      ? `${eventName} - Password Reset for ${portalLabel}`
      : `${eventName} - Your ${portalLabel} Login Details`;

    // Escape HTML entities for security
    const escapeHtml = (str: string) =>
      str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const emailHtml = `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto;">
        ${logoUrl ? `<div style="text-align: center; padding: 20px 0;"><img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(eventName)}" style="max-height: 80px; max-width: 300px;" /></div>` : ""}
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 20px 0;">
          <h2 style="color: #333; margin-top: 0;">${actionText}</h2>
          <p style="color: #555; font-size: 16px;">Hello,</p>
          <p style="color: #555; font-size: 16px;">
            ${isReset ? "Your password for the" : "An account has been created for you on the"}
            <strong>${escapeHtml(eventName)} ${portalLabel}</strong>
            ${isReset ? "has been reset." : "."}
          </p>
          <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #333;"><strong>Company/Name:</strong> ${escapeHtml(entityName)}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p style="margin: 5px 0; color: #333;"><strong>Password:</strong> <code style="background: #f0f0f0; padding: 2px 8px; border-radius: 3px; font-size: 14px;">${escapeHtml(password)}</code></p>
          </div>
          ${portalUrl ? `<div style="text-align: center; margin: 25px 0;"><a href="${escapeHtml(portalUrl)}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Login to ${portalLabel}</a></div>` : ""}
          <p style="color: #888; font-size: 13px; margin-top: 20px;">
            For security, we recommend changing your password after your first login.
          </p>
        </div>
        <p style="color: #aaa; font-size: 12px; text-align: center;">
          This is an automated message from ${escapeHtml(eventName)}. Please do not reply to this email.
        </p>
      </div>
    `;

    const wrappedHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light only">
          <title>${escapeHtml(subjectText)}</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #F7F7F7; font-family: Arial, Helvetica, sans-serif; color: #111111;">
          ${emailHtml}
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: `${fromName} <noreply@${fromDomain}>`,
      to: [email],
      subject: subjectText,
      html: wrappedHtml,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ error: emailResponse.error.message || "Failed to send email", sent: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Credential email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, sent: true, messageId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending credential email:", error);
    return new Response(
      JSON.stringify({ error: error.message, sent: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
