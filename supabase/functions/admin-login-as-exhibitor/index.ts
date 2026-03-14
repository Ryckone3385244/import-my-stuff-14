import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const authToken = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(authToken)
    
    if (authError || !requestingUser) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin, customer service, or project manager
    const { data: roles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .in('role', ['admin', 'customer_service', 'project_manager'])

    if (roleError || !roles || roles.length === 0) {
      throw new Error('User does not have admin privileges')
    }

    const { exhibitor_id } = await req.json()

    if (!exhibitor_id) {
      throw new Error('Exhibitor ID is required')
    }

    // Get the exhibitor's user_id
    const { data: exhibitor, error: exhibitorError } = await supabaseClient
      .from('exhibitors')
      .select('user_id, name')
      .eq('id', exhibitor_id)
      .single()

    if (exhibitorError || !exhibitor || !exhibitor.user_id) {
      throw new Error('Exhibitor not found or has no associated user')
    }

    console.log('Found exhibitor:', exhibitor.name, 'with user_id:', exhibitor.user_id)

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(exhibitor.user_id)
    
    if (userError || !userData?.user?.email) {
      console.error('Failed to get user email:', userError)
      throw new Error('Failed to get exhibitor email')
    }

    // Generate magic link
    const { data: magicLink, error: linkError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    })

    if (linkError || !magicLink?.properties?.hashed_token) {
      console.error('Failed to generate magic link:', linkError)
      throw new Error('Failed to generate auth token')
    }

    // Create a regular client to verify the OTP
    const regularClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify OTP to create session
    const { data: verified, error: verifyError } = await regularClient.auth.verifyOtp({
      token_hash: magicLink.properties.hashed_token,
      type: 'email',
    })

    if (verifyError || !verified?.session) {
      console.error('Failed to verify OTP:', verifyError)
      throw new Error('Failed to create session')
    }

    console.log('Session created successfully for:', exhibitor.name)

    return new Response(
      JSON.stringify({
        success: true,
        access_token: verified.session.access_token,
        refresh_token: verified.session.refresh_token,
        exhibitor_name: exhibitor.name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
