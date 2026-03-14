import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Internal edge function for auto-creating exhibitor credentials per contact.
 * Called by database trigger when any contact is inserted/updated with a valid email.
 * Each contact gets their own auth user and portal credentials.
 * For the main contact, also sets exhibitors.user_id for backward compatibility.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { exhibitorId, contactId, contactEmail, isMainContact } = await req.json()

    if (!exhibitorId) {
      return new Response(
        JSON.stringify({ error: 'Missing exhibitorId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const email = contactEmail?.toLowerCase().trim()

    if (!email) {
      console.log('No contact email provided');
      return new Response(
        JSON.stringify({ error: 'No contact email provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Reject placeholder email patterns
    if (email.includes('@exhibitor.') || email.includes('@speaker.') || 
        email.includes('@portal.') || email.includes('@disastersexpo.com') ||
        email.includes('@grabandgoexpo.com')) {
      console.error('Rejected placeholder email:', email);
      return new Response(
        JSON.stringify({ error: 'Placeholder emails not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing credentials for contact ${contactId}, exhibitor ${exhibitorId}, email ${email}`);

    // Get exhibitor name for metadata
    const { data: exhibitor, error: exhibitorError } = await supabaseClient
      .from('exhibitors')
      .select('name, user_id')
      .eq('id', exhibitorId)
      .single()

    if (exhibitorError) {
      console.error('Exhibitor not found:', exhibitorError);
      return new Response(
        JSON.stringify({ error: 'Exhibitor not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if this contact already has a user_id (credentials already exist)
    let existingContactUserId: string | null = null;
    if (contactId) {
      const { data: contactData } = await supabaseClient
        .from('exhibitor_contacts')
        .select('user_id')
        .eq('id', contactId)
        .maybeSingle()
      existingContactUserId = contactData?.user_id || null;
    }

    // If contact has no user_id but is main contact, check exhibitors.user_id
    if (!existingContactUserId && isMainContact && exhibitor.user_id) {
      console.log('Main contact has no user_id, using exhibitors.user_id:', exhibitor.user_id);
      existingContactUserId = exhibitor.user_id;
      
      // Backfill: link this user_id to the contact record too
      if (contactId) {
        await supabaseClient
          .from('exhibitor_contacts')
          .update({ user_id: exhibitor.user_id })
          .eq('id', contactId);
        console.log('Backfilled contact user_id from exhibitor');
      }
    }

    // CASE 1: Contact already has credentials - sync email if changed
    if (existingContactUserId) {
      console.log('Contact already has credentials, checking email sync...');
      
      const { data: authUser } = await supabaseClient.auth.admin.getUserById(existingContactUserId)
      const currentAuthEmail = authUser?.user?.email?.toLowerCase().trim()

      if (currentAuthEmail === email) {
        console.log('Email already synced, skipping');
        return new Response(
          JSON.stringify({ success: true, message: 'Email already synced', skipped: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check for conflicts
      const { data: existingUsers } = await supabaseClient.auth.admin.listUsers()
      const conflictingUser = existingUsers?.users?.find(
        u => u.email?.toLowerCase() === email && u.id !== existingContactUserId
      )

      if (conflictingUser) {
        console.error('Email conflict:', email);
        return new Response(
          JSON.stringify({ error: `Email ${email} is already used by another account` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update auth email
      console.log(`Syncing email from ${currentAuthEmail} to ${email}`);
      const { error: updateEmailError } = await supabaseClient.auth.admin.updateUserById(
        existingContactUserId,
        { email: email, email_confirm: true }
      )

      if (updateEmailError) {
        console.error('Failed to sync auth email:', updateEmailError);
        return new Response(
          JSON.stringify({ error: `Failed to sync email: ${updateEmailError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update user_profiles email
      await supabaseClient
        .from('user_profiles')
        .update({ email: email })
        .eq('user_id', existingContactUserId)

      console.log('Email sync completed successfully');
      return new Response(
        JSON.stringify({ success: true, message: 'Email synced', userId: existingContactUserId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CASE 2: Check if an auth user with this email already exists
    const { data: allUsers } = await supabaseClient.auth.admin.listUsers()
    const existingAuthUser = allUsers?.users?.find(u => u.email?.toLowerCase() === email)

    if (existingAuthUser) {
      // Email already has an auth account - link it to this contact
      console.log(`Auth user already exists for ${email}, linking to contact ${contactId}`);
      
      if (contactId) {
        await supabaseClient
          .from('exhibitor_contacts')
          .update({ user_id: existingAuthUser.id })
          .eq('id', contactId)
      }

      // If main contact, also set on exhibitors table
      if (isMainContact) {
        await supabaseClient
          .from('exhibitors')
          .update({ user_id: existingAuthUser.id })
          .eq('id', exhibitorId)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Linked existing user', userId: existingAuthUser.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CASE 3: No credentials yet - create new user
    console.log('Creating new credentials for:', email);
    const password = generateSecurePassword()

    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        exhibitor_id: exhibitorId,
        contact_id: contactId,
        company_name: exhibitor.name
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
        email: email,
        display_name: exhibitor.name
      })

    // Assign exhibitor role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: 'exhibitor' })

    if (roleError) {
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update contact with user_id
    if (contactId) {
      await supabaseClient
        .from('exhibitor_contacts')
        .update({ user_id: authData.user.id })
        .eq('id', contactId)
    }

    // If main contact, also set on exhibitors table for backward compatibility
    if (isMainContact) {
      const { error: updateError } = await supabaseClient
        .from('exhibitors')
        .update({ user_id: authData.user.id })
        .eq('id', exhibitorId)

      if (updateError) {
        console.error('Failed to update exhibitor user_id:', updateError);
        // Don't rollback - contact credentials are still valid
      }
    }

    console.log('Auto-created exhibitor credentials for contact:', contactId);

    // Log credential creation
    await supabaseClient.from('credentials_log').insert({
      entity_type: 'exhibitor',
      entity_id: exhibitorId,
      entity_name: exhibitor.name,
      email: email,
      password_plain: password,
      generated_by: null,
      generation_type: 'create',
    })

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
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
