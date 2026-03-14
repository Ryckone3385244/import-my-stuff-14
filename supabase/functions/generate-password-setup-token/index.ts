import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GenerateTokenRequest {
  userId: string;
  userType: 'exhibitor' | 'speaker';
  entityId: string;
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

    // Verify caller is admin/CS/PM
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin, CS, or PM
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'customer_service', 'project_manager'])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin, CS, or PM role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, userType, entityId }: GenerateTokenRequest = await req.json();

    // Validate input
    if (!userId || !userType || !entityId) {
      return new Response(
        JSON.stringify({ error: 'userId, userType, and entityId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['exhibitor', 'speaker'].includes(userType)) {
      return new Response(
        JSON.stringify({ error: 'userType must be "exhibitor" or "speaker"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate cryptographically secure 64-character hex token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const tokenValue = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

    // Delete any existing unused tokens for this user
    const { error: deleteError } = await supabase
      .from('password_setup_tokens')
      .delete()
      .eq('user_id', userId)
      .is('used_at', null);

    if (deleteError) {
      console.error('Error deleting existing tokens:', deleteError);
      // Continue anyway - not critical
    }

    // Calculate 7-day expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert new token
    const { data: tokenData, error: insertError } = await supabase
      .from('password_setup_tokens')
      .insert({
        user_id: userId,
        token: tokenValue,
        user_type: userType,
        entity_id: entityId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting token:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated password setup token for ${userType} user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        token: tokenValue,
        expiresAt: expiresAt.toISOString(),
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
