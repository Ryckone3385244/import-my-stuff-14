import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExhibitorData {
  id: string;
  name: string;
  description?: string;
  short_description?: string;
  booth_number?: string;
  category?: string;
}

interface EventSettings {
  event_name: string;
  event_date: string;
  location: string;
}

// Background task function - processes exhibitors without blocking the response
async function processExhibitorsSEO(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  exhibitors: ExhibitorData[],
  eventContext: EventSettings,
  lovableApiKey: string
) {
  console.log(`[Background] Starting SEO generation for ${exhibitors.length} exhibitors`);
  
  let successCount = 0;
  let errorCount = 0;

  for (const exhibitor of exhibitors) {
    try {
      // Check if fields still need generation (in case they were updated while waiting)
      const { data: currentExhibitor } = await supabase
        .from('exhibitors')
        .select('meta_title, meta_description')
        .eq('id', exhibitor.id)
        .single();

      const needsTitle = !currentExhibitor?.meta_title;
      const needsDescription = !currentExhibitor?.meta_description;

      if (!needsTitle && !needsDescription) {
        console.log(`[Background] Skipping ${exhibitor.name} - already has SEO`);
        continue;
      }

      const prompt = buildPrompt(exhibitor, eventContext, needsTitle, needsDescription);
      
      const response = await fetch('https://api.lovable.dev/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an SEO specialist. Generate concise, compelling meta tags for exhibitor pages. Respond ONLY with valid JSON, no markdown.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        console.error(`[Background] AI API error for ${exhibitor.name}:`, await response.text());
        errorCount++;
        continue;
      }

      const aiResult = await response.json();
      const content = aiResult.choices?.[0]?.message?.content;

      if (!content) {
        console.error(`[Background] No content returned for ${exhibitor.name}`);
        errorCount++;
        continue;
      }

      // Parse the JSON response
      let seoData;
      try {
        const cleanedContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        seoData = JSON.parse(cleanedContent);
      } catch {
        console.error(`[Background] Failed to parse AI response for ${exhibitor.name}:`, content);
        errorCount++;
        continue;
      }

      // Update exhibitor with generated SEO
      const updateData: { meta_title?: string; meta_description?: string } = {};
      
      if (needsTitle && seoData.meta_title) {
        updateData.meta_title = seoData.meta_title.substring(0, 120);
      }
      if (needsDescription && seoData.meta_description) {
        updateData.meta_description = seoData.meta_description.substring(0, 300);
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('exhibitors')
          .update(updateData)
          .eq('id', exhibitor.id);

        if (updateError) {
          console.error(`[Background] Failed to update ${exhibitor.name}:`, updateError);
          errorCount++;
        } else {
          console.log(`[Background] Updated SEO for ${exhibitor.name}`);
          successCount++;
        }
      }
    } catch (err) {
      console.error(`[Background] Error processing ${exhibitor.name}:`, err);
      errorCount++;
    }
  }

  console.log(`[Background] SEO generation complete: ${successCount} success, ${errorCount} errors`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body (optional exhibitor ID for single generation)
    let exhibitorId: string | null = null;
    let runInBackground = false;
    try {
      const body = await req.json();
      exhibitorId = body.exhibitorId || null;
      runInBackground = body.background === true;
    } catch {
      // No body provided, will process all empty ones
    }

    // Get event settings for context
    const { data: eventSettings } = await supabase
      .from('event_settings')
      .select('event_name, event_date, location')
      .limit(1)
      .single();

    const eventContext: EventSettings = eventSettings || {
      event_name: 'Trade Show',
      event_date: 'Upcoming',
      location: 'Exhibition Centre'
    };

    // Build query for exhibitors
    let query = supabase
      .from('exhibitors')
      .select('id, name, description, short_description, booth_number, category, meta_title, meta_description')
      .eq('is_active', true);

    if (exhibitorId) {
      query = query.eq('id', exhibitorId);
    } else {
      // Only get exhibitors with empty meta fields
      query = query.or('meta_title.is.null,meta_description.is.null');
    }

    const { data: exhibitors, error: exhibitorsError } = await query;

    if (exhibitorsError) {
      throw exhibitorsError;
    }

    if (!exhibitors || exhibitors.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No exhibitors need SEO generation', count: 0, success: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${exhibitors.length} exhibitors needing SEO generation`);

    // For bulk generation (no specific exhibitorId), run in background
    if (!exhibitorId || runInBackground) {
      // Use EdgeRuntime.waitUntil to run in background
      // @ts-ignore - EdgeRuntime is available in Supabase edge functions
      EdgeRuntime.waitUntil(
        processExhibitorsSEO(supabase, exhibitors, eventContext, lovableApiKey)
      );

      return new Response(
        JSON.stringify({ 
          message: 'SEO generation started in background',
          count: exhibitors.length,
          success: 0, // Will be updated in background
          background: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For single exhibitor, process synchronously
    const exhibitor = exhibitors[0];
    const needsTitle = !exhibitor.meta_title;
    const needsDescription = !exhibitor.meta_description;

    if (!needsTitle && !needsDescription) {
      return new Response(
        JSON.stringify({ message: 'SEO fields already filled', success: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildPrompt(exhibitor, eventContext, needsTitle, needsDescription);
    
    const response = await fetch('https://api.lovable.dev/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an SEO specialist. Generate concise, compelling meta tags for exhibitor pages. Respond ONLY with valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${await response.text()}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse the JSON response
    const cleanedContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const seoData = JSON.parse(cleanedContent);

    // Update exhibitor with generated SEO
    const updateData: { meta_title?: string; meta_description?: string } = {};
    
    if (needsTitle && seoData.meta_title) {
      updateData.meta_title = seoData.meta_title.substring(0, 120);
    }
    if (needsDescription && seoData.meta_description) {
      updateData.meta_description = seoData.meta_description.substring(0, 300);
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('exhibitors')
        .update(updateData)
        .eq('id', exhibitor.id);

      if (updateError) {
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'SEO generated successfully',
        success: 1,
        data: updateData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Edge function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildPrompt(
  exhibitor: ExhibitorData, 
  event: EventSettings,
  needsTitle: boolean,
  needsDescription: boolean
): string {
  const companyInfo = [
    exhibitor.description,
    exhibitor.short_description,
    exhibitor.category
  ].filter(Boolean).join(' ').substring(0, 500);

  const fields = [];
  if (needsTitle) fields.push('"meta_title": "string (max 60 chars, include company name and event)"');
  if (needsDescription) fields.push('"meta_description": "string (max 160 chars, compelling description)"');

  return `Generate SEO meta tags for an exhibitor page.

Company: ${exhibitor.name}
${exhibitor.booth_number ? `Booth: ${exhibitor.booth_number}` : ''}
Event: ${event.event_name}
Date: ${event.event_date}
Location: ${event.location}
${companyInfo ? `About: ${companyInfo}` : ''}

Return JSON with these fields:
{
  ${fields.join(',\n  ')}
}

Guidelines:
- meta_title: Include company name, mention the event, keep under 60 chars
- meta_description: Highlight what visitors can discover at their booth, call to action, under 160 chars
- Make it engaging for search results`;
}
