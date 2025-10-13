import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const SUMMARY_PROMPT = `Analyze the following real estate consultation transcript and extract structured information.

Return a JSON object with the following fields:
- person_name: string (customer's name, empty if not mentioned)
- flat_specification: string (e.g., "2BHK", "3BHK", "4BHK")
- facing_preference: string (e.g., "North", "East", "South", "West")
- interest_level: string (one of: "Low", "Medium", "High")
- period_to_buy: string (e.g., "Within 3 months", "6 months", "1 year")
- responsibility: string (agent or staff member handling this)
- key_action_points: string (important follow-up actions)
- preferred_floor: string (e.g., "Ground floor", "5-10", "High floor")
- conversation_summary: string (3-5 sentence summary of the entire conversation)
- sentiment_topics: string (main topics and sentiment analysis)

Transcript:
{transcript}

Respond with ONLY valid JSON, no markdown formatting.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { transcript, conversationId, leadId } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Conversation Summary] Processing transcript of length:', transcript.length);

    // Call OpenAI to generate structured summary
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a real estate data extraction assistant. Extract structured information from conversation transcripts and return valid JSON only.'
          },
          {
            role: 'user',
            content: SUMMARY_PROMPT.replace('{transcript}', transcript)
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('[Conversation Summary] OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const summaryText = openaiData.choices[0].message.content;

    console.log('[Conversation Summary] OpenAI response:', summaryText);

    let summaryData;
    try {
      summaryData = JSON.parse(summaryText);
    } catch (e) {
      console.error('[Conversation Summary] Failed to parse JSON:', summaryText);
      throw new Error('Failed to parse summary JSON from OpenAI');
    }

    // If conversationId provided, update the conversation record
    if (conversationId) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          person_name: summaryData.person_name || '',
          flat_specification: summaryData.flat_specification || '',
          facing_preference: summaryData.facing_preference || '',
          interest_level: summaryData.interest_level || 'Medium',
          period_to_buy: summaryData.period_to_buy || '',
          responsibility: summaryData.responsibility || '',
          key_action_points: summaryData.key_action_points || '',
          preferred_floor: summaryData.preferred_floor || '',
          conversation_summary: summaryData.conversation_summary || '',
          sentiment_topics: summaryData.sentiment_topics || '',
          ended_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error('[Conversation Summary] Database update error:', updateError);
        throw updateError;
      }

      console.log('[Conversation Summary] Conversation updated:', conversationId);
    }

    // If leadId provided, create/update lead record
    if (leadId && summaryData.person_name) {
      const { error: leadError } = await supabase
        .from('leads')
        .upsert({
          id: leadId,
          full_name: summaryData.person_name,
          property_type: summaryData.flat_specification || '',
          budget: 0,
          stage: 'New',
          intent_level: summaryData.interest_level?.toLowerCase() || 'medium',
          conversion_probability: {
            '3m': summaryData.interest_level === 'High' ? 0.7 : summaryData.interest_level === 'Medium' ? 0.4 : 0.2,
            '6m': summaryData.interest_level === 'High' ? 0.85 : summaryData.interest_level === 'Medium' ? 0.6 : 0.35,
            '9m': summaryData.interest_level === 'High' ? 0.95 : summaryData.interest_level === 'Medium' ? 0.75 : 0.5
          }
        });

      if (leadError) {
        console.log('[Conversation Summary] Lead update warning:', leadError.message);
      } else {
        console.log('[Conversation Summary] Lead updated:', leadId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: summaryData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Conversation Summary] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
