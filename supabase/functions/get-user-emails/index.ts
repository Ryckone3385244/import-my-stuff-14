import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create client with anon key to verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Extract JWT token from Bearer header
    const jwt = authHeader.replace('Bearer ', '')

    // Use service role key to validate JWT - more reliable than anon key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify the user is authenticated by passing JWT directly
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt)

    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user is admin, customer service, or project manager using security definer function
    const { data: isAdminOrCSOrPM, error: roleError } = await supabaseAdmin
      .rpc('is_admin_or_cs_or_pm', {
        _user_id: user.id
      })

    console.log('Role check result:', { isAdminOrCSOrPM, roleError, userId: user.id })

    if (roleError || !isAdminOrCSOrPM) {
      console.log('Role check failed - user is not admin, customer service, or project manager')
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // supabaseAdmin already declared above - reuse for admin operations

    // Fetch all users using admin API
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) {
      throw error
    }

    // Return user ID to email mapping
    const userEmails = users.reduce((acc: Record<string, string>, user) => {
      if (user.id && user.email) {
        acc[user.id] = user.email
      }
      return acc
    }, {})

    return new Response(
      JSON.stringify({ userEmails }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
