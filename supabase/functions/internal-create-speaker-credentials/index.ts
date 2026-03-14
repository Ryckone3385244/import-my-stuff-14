import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Internal edge function for auto-creating speaker credentials.
 * Called by database triggers when a speaker's email is set.
 * Also handles email sync when credentials already exist but email changed.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify internal call via service role key
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
      console.log('Unauthorized internal call attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - internal only' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { speakerId } = await req.json()

    if (!speakerId) {
      return new Response(
        JSON.stringify({ error: 'Missing speakerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auto-creating/syncing credentials for speaker:', speakerId);

    // Get speaker data
    const { data: speaker, error: speakerError } = await supabaseClient
      .from('speakers')
      .select('user_id, name, email')
      .eq('id', speakerId)
      .single()

    if (speakerError) {
      console.error('Speaker not found:', speakerError);
      return new Response(
        JSON.stringify({ error: 'Speaker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contactEmail = speaker.email?.toLowerCase().trim()
    
    if (!contactEmail) {
      console.log('No email found for speaker');
      return new Response(
        JSON.stringify({ error: 'No email found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reject placeholder email patterns
    if (contactEmail.includes('@exhibitor.') || contactEmail.includes('@speaker.') || 
        contactEmail.includes('@portal.') || contactEmail.includes('@disastersexpo.com') ||
        contactEmail.includes('@grabandgoexpo.com')) {
      console.error('Rejected placeholder email:', contactEmail);
      return new Response(
        JSON.stringify({ error: 'Placeholder emails not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CASE 1: Speaker already has credentials - check if email sync needed
    if (speaker?.user_id) {
      console.log('Speaker already has credentials, checking email sync...');
      
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(speaker.user_id)
      const currentAuthEmail = authUser?.user?.email?.toLowerCase().trim()

      // If emails match, nothing to do
      if (currentAuthEmail === contactEmail) {
        console.log('Email already synced, skipping');
        return new Response(
          JSON.stringify({ success: true, message: 'Email already synced', skipped: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check for conflicts with other users
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers()
      const conflictingUser = existingUsers?.users?.find(
        u => u.email?.toLowerCase() === contactEmail && u.id !== speaker.user_id
      )

      if (conflictingUser) {
        console.error('Email conflict - another user already has this email:', contactEmail);
        return new Response(
          JSON.stringify({ error: `Email ${contactEmail} is already used by another account` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update auth email to match speaker email
      console.log(`Syncing email from ${currentAuthEmail} to ${contactEmail}`);
      const { error: updateEmailError } = await supabaseClient.auth.admin.updateUserById(
        speaker.user_id,
        { email: contactEmail, email_confirm: true }
      )

      if (updateEmailError) {
        console.error('Failed to sync auth email:', updateEmailError);
        return new Response(
          JSON.stringify({ error: `Failed to sync email: ${updateEmailError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Also update user_profiles email
      await supabaseClient
        .from('user_profiles')
        .update({ email: contactEmail })
        .eq('user_id', speaker.user_id)

      console.log('Email sync completed successfully');
      return new Response(
        JSON.stringify({ success: true, message: 'Email synced', userId: speaker.user_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CASE 2: No credentials yet - create new user with real email
    console.log('Creating new credentials with real email:', contactEmail);

    const password = generateSecurePassword()

    // Create auth user with real email - NO placeholder fallback
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: contactEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        speaker_id: speakerId,
        speaker_name: speaker.name
      }
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user profile
    await supabaseClient
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: contactEmail,
        display_name: speaker.name
      })

    // Assign speaker role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'speaker'
      })

    if (roleError) {
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update speaker with user_id
    const { error: updateError } = await supabaseClient
      .from('speakers')
      .update({ user_id: authData.user.id })
      .eq('id', speakerId)

    if (updateError) {
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to update speaker: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auto-created speaker credentials successfully');

    // Log credential creation to credentials_log (auto-triggered, no admin user)
    await supabaseClient.from('credentials_log').insert({
      entity_type: 'speaker',
      entity_id: speakerId,
      entity_name: speaker.name,
      email: contactEmail,
      password_plain: password,
      generated_by: null,
      generation_type: 'create',
    })

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  
  const all = uppercase + lowercase + numbers + special
  let password = ''
  
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  for (let i = 4; i < 16; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('')
}