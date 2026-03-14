import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  exhibitorId: string;
  exhibitorName: string;
  submissionType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exhibitorId, exhibitorName, submissionType }: NotificationRequest = await req.json();

    console.log("Processing admin notification for:", exhibitorName);

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

    // Get admin, customer service, and project manager users
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "customer_service", "project_manager"]);

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin emails
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    const adminEmails = users
      .filter(user => adminUserIds.includes(user.id))
      .map(user => user.email)
      .filter(email => email) as string[];

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending notifications to:", adminEmails);

    // Initialize Resend with the API key
    const resend = new Resend(apiKey);

    // Send email to admins
    const emailHtml = `
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
                      <h2 style="color: #ffffff !important; margin: 0; font-size: 22px;">New Exhibitor Submission for Approval</h2>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="background-color: #FAFAFA !important; padding: 30px;">
                      <p style="color: #111111 !important; margin: 0 0 20px 0; font-size: 16px;">An exhibitor has submitted changes that require your approval.</p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F0F0F0 !important; border-radius: 5px; margin: 20px 0;">
                        <tr>
                          <td style="padding: 15px; background-color: #F0F0F0 !important;">
                            <p style="color: #111111 !important; margin: 0 0 10px 0; font-size: 14px;"><strong style="color: #111111 !important;">Exhibitor:</strong> ${exhibitorName}</p>
                            <p style="color: #111111 !important; margin: 0 0 10px 0; font-size: 14px;"><strong style="color: #111111 !important;">Submission Type:</strong> ${submissionType}</p>
                            <p style="color: #111111 !important; margin: 0; font-size: 14px;"><strong style="color: #111111 !important;">Exhibitor ID:</strong> ${exhibitorId}</p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #111111 !important; margin: 0 0 25px 0; font-size: 16px;">Please review and approve/reject the changes in the admin dashboard.</p>
                      
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background-color: #10b981 !important; border: 1px solid #10b981 !important; border-radius: 5px;">
                            <a href="/admin/approvals" style="display: inline-block; padding: 12px 24px; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px;">Review Submission</a>
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
      subject: `New Exhibitor Submission: ${exhibitorName}`,
      html: emailHtml,
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

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, notifiedCount: adminEmails.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-submission:", error);
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
