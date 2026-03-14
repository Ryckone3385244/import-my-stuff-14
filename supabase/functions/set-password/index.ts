import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SetPasswordRequest {
  token: string;
  password: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, password }: SetPasswordRequest = await req.json();

    // Validate input
    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: 'Token and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password strength (6+ characters to match frontend)
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up the token
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_setup_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) {
      console.error('Token lookup error:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Failed to validate token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tokenData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is already used
    if (tokenData.used_at) {
      return new Response(
        JSON.stringify({ error: 'This password setup link has already been used' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This password setup link has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to set password' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark token as used
    const { error: markUsedError } = await supabase
      .from('password_setup_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError);
      // Continue anyway - password was already set
    }

    // Get the user's login email for the success message
    let loginEmail = '';
    if (tokenData.user_type === 'exhibitor') {
      const { data: exhibitorContacts } = await supabase
        .from('exhibitor_contacts')
        .select('email')
        .eq('exhibitor_id', tokenData.entity_id)
        .eq('is_main_contact', true)
        .maybeSingle();
      loginEmail = exhibitorContacts?.email || '';
    } else if (tokenData.user_type === 'speaker') {
      const { data: speaker } = await supabase
        .from('speakers')
        .select('email')
        .eq('id', tokenData.entity_id)
        .maybeSingle();
      loginEmail = speaker?.email || '';
    }

    console.log(`Password set successfully for ${tokenData.user_type} user ${tokenData.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        userType: tokenData.user_type,
        loginEmail,
        message: 'Password set successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
