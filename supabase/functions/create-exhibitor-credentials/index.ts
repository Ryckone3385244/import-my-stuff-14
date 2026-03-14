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

    const { exhibitorId, companyName, resetPassword } = await req.json()

    if (!exhibitorId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: exhibitorId' }),
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

    // If resetting password, get the existing user
    if (resetPassword) {
      console.log('Resetting password for exhibitor:', exhibitorId)
      
      const { data: exhibitorData, error: exhibitorError } = await supabaseClient
        .from('exhibitors')
        .select('user_id, name')
        .eq('id', exhibitorId)
        .single()

      if (exhibitorError || !exhibitorData?.user_id) {
        return new Response(
          JSON.stringify({ error: 'Exhibitor not found or has no user account' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get user profile to get email
      const { data: profileData } = await supabaseClient
        .from('user_profiles')
        .select('email')
        .eq('user_id', exhibitorData.user_id)
        .single()

      const newPassword = generateSecurePassword()

      // Update the user's password
      const { error: updatePasswordError } = await supabaseClient.auth.admin.updateUserById(
        exhibitorData.user_id,
        { password: newPassword }
      )

      if (updatePasswordError) {
        console.error('Error updating password:', updatePasswordError)
        return new Response(
          JSON.stringify({ error: `Failed to reset password: ${updatePasswordError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Generate username from company name
      const resetUsername = exhibitorData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50)

      console.log('Password reset successful')

      // Get the real email from auth user as final fallback
      let displayEmail = profileData?.email
      if (!displayEmail) {
        const { data: authUser } = await supabaseClient.auth.admin.getUserById(exhibitorData.user_id)
        displayEmail = authUser?.user?.email || 'unknown'
      }

      // Log credential reset to credentials_log
      await supabaseClient.from('credentials_log').insert({
        entity_type: 'exhibitor',
        entity_id: exhibitorId,
        entity_name: exhibitorData.name,
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
              entityType: 'exhibitor',
              entityName: exhibitorData.name,
              email: displayEmail,
              password: newPassword,
              portalUrl: portalBaseUrl ? `${portalBaseUrl}/exhibitor-portal/login` : '',
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
            username: resetUsername,
            email: displayEmail,
            password: newPassword,
            userId: exhibitorData.user_id
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new credentials flow
    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: companyName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the main contact's real email, fallback to any active contact
    const { data: mainContact } = await supabaseClient
      .from('exhibitor_contacts')
      .select('email')
      .eq('exhibitor_id', exhibitorId)
      .eq('is_main_contact', true)
      .eq('is_active', true)
      .maybeSingle()

    let contactEmail = mainContact?.email?.toLowerCase().trim()
    
    // Fallback: any active contact with a valid email
    if (!contactEmail) {
      const { data: anyContact } = await supabaseClient
        .from('exhibitor_contacts')
        .select('email')
        .eq('exhibitor_id', exhibitorId)
        .eq('is_active', true)
        .not('email', 'is', null)
        .limit(1)
        .maybeSingle()
      
      contactEmail = anyContact?.email?.toLowerCase().trim()
    }
    
    if (!contactEmail) {
      return new Response(
        JSON.stringify({ error: 'No contact email found. Please add a contact with a valid email address first.' }),
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

    // Generate base username from company name (lowercase, replace spaces with hyphens, remove special chars)
    const baseUsername = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) // Limit length

    // Generate a secure random password
    const password = generateSecurePassword()

    // Use real contact email for auth
    let email = contactEmail
    let username = baseUsername

    console.log('Creating exhibitor credentials:', { username, email, exhibitorId })

    // Retry loop for handling duplicate email conflicts
    const MAX_ATTEMPTS = 5
    let attempt = 0
    let authData: { user: { id: string } } | null = null
    let createError: { message: string } | null = null

    while (attempt < MAX_ATTEMPTS) {
      attempt++
      console.log(`Attempt ${attempt}/${MAX_ATTEMPTS} with email: ${email}`)

      const result = await supabaseClient.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          exhibitor_id: exhibitorId,
          company_name: companyName
        }
      })

      if (!result.error) {
        authData = result.data
        createError = null
        console.log('Auth user created successfully on attempt', attempt)
        break
      }

      createError = result.error
      const errorMessage = createError.message.toLowerCase()

      // Check if it's a duplicate email error - real email already in use
      if (errorMessage.includes('already been registered') || errorMessage.includes('email_exists') || errorMessage.includes('already exists')) {
        console.error('Real email already registered:', email)
        // Do not fall back to placeholder emails - fail with helpful message
        return new Response(
          JSON.stringify({ error: `Email ${contactEmail} is already registered. The user may already have an account.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Non-duplicate error, break out of loop
        console.error('Non-duplicate error creating auth user:', createError)
        break
      }
    }

    if (createError || !authData) {
      console.error('Error creating auth user after all attempts:', createError)
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${createError?.message || 'Unknown error'}` }),
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
        display_name: companyName
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    // Assign exhibitor role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'exhibitor'
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

    // Update exhibitor record with user_id
    const { error: updateError } = await supabaseClient
      .from('exhibitors')
      .update({ user_id: authData.user.id })
      .eq('id', exhibitorId)

    if (updateError) {
      console.error('Error updating exhibitor:', updateError)
      // Clean up
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to update exhibitor: ${updateError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully created exhibitor credentials')

    // Log credential creation to credentials_log
    await supabaseClient.from('credentials_log').insert({
      entity_type: 'exhibitor',
      entity_id: exhibitorId,
      entity_name: companyName,
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
            entityType: 'exhibitor',
            entityName: companyName,
            email: email,
            password: password,
            portalUrl: portalBaseUrl ? `${portalBaseUrl}/exhibitor-portal/login` : '',
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
