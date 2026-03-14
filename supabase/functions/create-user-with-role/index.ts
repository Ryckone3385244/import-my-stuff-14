import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is an admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'customer_service' && roleData.role !== 'project_manager')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the request body
    const { email, password, role, name, meetingUrl } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let userId: string;
    let isExistingUser = false;

    // Try to create new user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: name || '',
        meeting_url: meetingUrl || '',
      }
    });

    // Check if user already exists
    if (authError && authError.message.includes("already registered")) {
      console.log('User already exists, finding their ID...');
      isExistingUser = true;
      
      // Find existing user
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.find((u: any) => u.email === email);
      
      if (!existingUser) {
        return new Response(JSON.stringify({ error: 'Could not find existing user' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = existingUser.id;
    } else if (authError) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (!authData.user) {
      return new Response(JSON.stringify({ error: 'User creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      userId = authData.user.id;
    }

    // Handle role assignment
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      // Update existing role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (roleError) throw roleError;
    } else {
      // Insert new role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([{ user_id: userId, role }]);
      if (roleError) throw roleError;
    }

    // Handle user profile
    if (name || meetingUrl || email) {
      const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            display_name: name || existingProfile.display_name,
            meeting_url: meetingUrl || existingProfile.meeting_url,
            email: email || existingProfile.email
          })
          .eq('user_id', userId);
        if (profileError) throw profileError;
      } else {
        // Insert new profile
        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .insert([{ 
            user_id: userId, 
            display_name: name || '',
            meeting_url: meetingUrl || '',
            email: email
          }]);
        if (profileError) throw profileError;
      }
    }

    return new Response(JSON.stringify({ success: true, userId, isExistingUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
