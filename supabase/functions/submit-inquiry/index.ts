import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InquiryRequest {
  exhibitorId: string;
  visitorName: string;
  visitorEmail: string;
  visitorCompany?: string;
  visitorPhone?: string;
  message: string;
  honeypot?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      exhibitorId,
      visitorName,
      visitorEmail,
      visitorCompany,
      visitorPhone,
      message,
      honeypot,
    }: InquiryRequest = await req.json();

    console.log('Received inquiry submission:', { exhibitorId, visitorEmail });

    // 1. HONEYPOT CHECK
    if (honeypot && honeypot.trim() !== '') {
      console.warn('Honeypot triggered for:', visitorEmail);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. BLOCKED EMAIL CHECK
    const { data: blockedEntry } = await supabaseClient
      .from('blocked_inquiry_emails')
      .select('id')
      .eq('email', visitorEmail.toLowerCase().trim())
      .limit(1)
      .maybeSingle();

    if (blockedEntry) {
      console.warn('Blocked email attempted submission:', visitorEmail);
      // Silently accept to not reveal block status
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. RATE LIMITING - Per exhibitor
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentToSameExhibitor, error: rateLimitError } = await supabaseClient
      .from('exhibitor_inquiries')
      .select('id')
      .eq('visitor_email', visitorEmail)
      .eq('exhibitor_id', exhibitorId)
      .gte('created_at', tenMinutesAgo);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      throw rateLimitError;
    }

    if (recentToSameExhibitor && recentToSameExhibitor.length >= 2) {
      console.warn('Per-exhibitor rate limit exceeded for:', visitorEmail, 'to exhibitor:', exhibitorId);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You recently sent a message to this exhibitor. Please wait a few minutes before sending another.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // 4. DUPLICATE DETECTION
    const { data: duplicates, error: duplicateError } = await supabaseClient
      .from('exhibitor_inquiries')
      .select('id')
      .eq('visitor_email', visitorEmail)
      .eq('exhibitor_id', exhibitorId)
      .eq('message', message)
      .gte('created_at', tenMinutesAgo);

    if (duplicateError) {
      console.error('Duplicate check error:', duplicateError);
      throw duplicateError;
    }

    if (duplicates && duplicates.length > 0) {
      console.warn('Duplicate inquiry detected for:', visitorEmail);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This inquiry was already submitted recently.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 5. INSERT INQUIRY - status defaults to 'pending' via DB default
    const { error: insertError } = await supabaseClient
      .from('exhibitor_inquiries')
      .insert({
        exhibitor_id: exhibitorId,
        visitor_name: visitorName,
        visitor_email: visitorEmail,
        visitor_company: visitorCompany || null,
        visitor_phone: visitorPhone || null,
        message: message,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Inquiry inserted successfully with pending status');

    // No notification email sent at submission time.
    // Emails are only sent when an admin approves the inquiry.

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-inquiry:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
