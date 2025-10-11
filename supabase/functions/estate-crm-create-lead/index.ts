import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const leadData = await req.json();

    const { data, error } = await supabase
      .from('leads')
      .insert({
        full_name: leadData.full_name || '',
        phone: leadData.phone || '',
        email: leadData.email || '',
        property_type: leadData.property_type || '',
        preferred_location: leadData.preferred_location || '',
        budget: leadData.budget || 0,
        intent_level: leadData.intent_level,
        conversion_probability: leadData.conversion_probability,
        stage: 'New',
      })
      .select()
      .single();

    if (error) throw error;

    if (leadData.summary) {
      await supabase.from('activities').insert({
        lead_id: data.id,
        type: 'note',
        message: leadData.summary,
        created_by: null,
      });
    }

    return new Response(
      JSON.stringify({ lead_id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});