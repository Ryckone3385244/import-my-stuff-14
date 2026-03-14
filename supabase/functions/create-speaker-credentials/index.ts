import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { escapeHtml } from '../_shared/htmlEscape.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Verify the request is from an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'customer_service' && roleData.role !== 'project_manager')) {
      console.error('User does not have admin privileges')
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { speakerId, speakerName, resetPassword } = await req.json()

    if (!speakerId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: speakerId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch event domain for portal URL
    const { data: eventSettingsData } = await supabaseClient
      .from('event_settings')
      .select('event_domain')
      .limit(1)
      .maybeSingle()
    const portalBaseUrl = eventSettingsData?.event_domain
      ? `https://${eventSettingsData.event_domain}`
      : ''

    // Check if speaker already has credentials
    const { data: existingSpeaker, error: speakerCheckError } = await supabaseClient
      .from('speakers')
      .select('user_id, name, email')
      .eq('id', speakerId)
      .single()

    if (speakerCheckError) {
      return new Response(
        JSON.stringify({ error: 'Speaker not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If resetting password, get the existing user
    if (resetPassword) {
      console.log('Resetting password for speaker:', speakerId)

      if (!existingSpeaker?.user_id) {
        return new Response(
          JSON.stringify({ error: 'Speaker has no user account to reset' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user profile to get email
      const { data: profileData } = await supabaseClient
        .from('user_profiles')
        .select('email')
        .eq('user_id', existingSpeaker.user_id)
        .single()

      const newPassword = generateSecurePassword()

      // Update the user's password
      const { error: updatePasswordError } = await supabaseClient.auth.admin.updateUserById(
        existingSpeaker.user_id,
        { password: newPassword }
      )

      if (updatePasswordError) {
        console.error('Error updating password:', updatePasswordError)
        return new Response(
          JSON.stringify({ error: `Failed to reset password: ${updatePasswordError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate username from speaker name
      const username = existingSpeaker.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)

      console.log('Password reset successful')

      // Get the real email from auth user as final fallback
      let displayEmail = profileData?.email
      if (!displayEmail) {
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(existingSpeaker.user_id)
        displayEmail = authUser?.user?.email || 'unknown'
      }

      // Log credential reset to credentials_log
      await supabaseClient.from('credentials_log').insert({
        entity_type: 'speaker',
        entity_id: speakerId,
        entity_name: existingSpeaker.name,
        email: displayEmail,
        password_plain: newPassword,
        generated_by: user.id,
        generation_type: 'reset',
      })

      // Auto-send credential email
      let emailSent = false
      try {
        const emailRes = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-credential-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify({
              entityType: 'speaker',
              entityName: existingSpeaker.name,
              email: displayEmail,
              password: newPassword,
              portalUrl: portalBaseUrl ? `${portalBaseUrl}/speaker-portal/login` : '',
              isReset: true,
            }),
          }
        )
        const emailResult = await emailRes.json()
        emailSent = emailResult?.sent === true
        console.log('Credential email result:', emailResult)
      } catch (emailError) {
        console.error('Failed to send credential email:', emailError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          emailSent,
          credentials: {
            username: username,
            email: displayEmail,
            password: newPassword,
            userId: existingSpeaker.user_id
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if speaker already has a user_id (credentials exist)
    if (existingSpeaker?.user_id) {
      console.log('Speaker already has credentials, skipping creation')
      
      // Get existing profile data
      const { data: profileData } = await supabaseClient
        .from('user_profiles')
        .select('email')
        .eq('user_id', existingSpeaker.user_id)
        .single()

      const username = existingSpeaker.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)

      // Get the real auth email
      let displayEmail = profileData?.email
      if (!displayEmail) {
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(existingSpeaker.user_id)
        displayEmail = authUser?.user?.email || 'unknown'
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Credentials already exist for this speaker',
          credentials: {
            username: username,
            email: displayEmail,
            userId: existingSpeaker.user_id,
            alreadyExists: true
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new credentials flow
    const effectiveSpeakerName = speakerName || existingSpeaker.name

    if (!effectiveSpeakerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: speakerName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // RULE: Never use placeholder emails - always real contact emails
    const contactEmail = existingSpeaker.email?.toLowerCase().trim()
    
    if (!contactEmail) {
      return new Response(
        JSON.stringify({ error: 'No email found for this speaker. Please add a valid email address first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reject placeholder email patterns
    if (contactEmail.includes('@exhibitor.') || contactEmail.includes('@speaker.') || 
        contactEmail.includes('@portal.') || contactEmail.includes('@disastersexpo.com') ||
        contactEmail.includes('@grabandgoexpo.com')) {
      console.error('Rejected placeholder email:', contactEmail)
      return new Response(
        JSON.stringify({ error: 'Placeholder emails are not allowed. Use real contact email addresses only.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate username from speaker name (lowercase, replace spaces with hyphens, remove special chars)
    const username = effectiveSpeakerName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) // Limit length

    // Generate a secure random password
    const password = generateSecurePassword()

    // Use real contact email for auth
    const email = contactEmail

    console.log('Creating speaker credentials:', { username, email, speakerId })

    // Create the auth user
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        speaker_id: speakerId,
        speaker_name: effectiveSpeakerName
      }
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Auth user created:', authData.user.id)

    // Create user profile with email
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: email,
        display_name: effectiveSpeakerName
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    // Assign speaker role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'speaker'
      })

    if (roleError) {
      console.error('Error assigning role:', roleError)
      // Clean up - delete the created user
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update speaker record with user_id
    const { error: updateError } = await supabaseClient
      .from('speakers')
      .update({ user_id: authData.user.id })
      .eq('id', speakerId)

    if (updateError) {
      console.error('Error updating speaker:', updateError)
      // Clean up
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to update speaker: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully created speaker credentials')

    // Log credential creation to credentials_log
    await supabaseClient.from('credentials_log').insert({
      entity_type: 'speaker',
      entity_id: speakerId,
      entity_name: effectiveSpeakerName,
      email: email,
      password_plain: password,
      generated_by: user.id,
      generation_type: 'create',
    })

    // Auto-send credential email
    let emailSent = false
    try {
      const emailRes = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-credential-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({
            entityType: 'speaker',
            entityName: effectiveSpeakerName,
            email: email,
            password: password,
            portalUrl: portalBaseUrl ? `${portalBaseUrl}/speaker-portal/login` : '',
            isReset: false,
          }),
        }
      )
      const emailResult = await emailRes.json()
      emailSent = emailResult?.sent === true
      console.log('Credential email result:', emailResult)
    } catch (emailError) {
      console.error('Failed to send credential email:', emailError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        credentials: {
          username: username,
          email: email,
          password: password,
          userId: authData.user.id
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateSecurePassword(): string {
  // Generate a secure 16-character password with uppercase, lowercase, numbers, and special chars
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*'
  
  const all = uppercase + lowercase + numbers + special
  let password = ''
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = 4; i < 16; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}