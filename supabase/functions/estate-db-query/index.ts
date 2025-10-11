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

    const { intent, name, location, filters } = await req.json();

    let query = supabase.from('properties').select('*');

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    if (filters?.max_price) {
      query = query.lte('base_price', filters.max_price);
    }

    const { data: properties, error } = await query;

    if (error) throw error;

    const results = properties?.map(p => ({
      name: p.name,
      location: p.location,
      unit_types: p.unit_types,
      base_price: p.base_price,
      amenities: p.amenities,
      highlights: p.highlights,
      availability: p.availability,
    })) || [];

    if (intent === 'faq' && name) {
      const { data: faqs } = await supabase
        .from('property_faqs')
        .select('question, answer')
        .eq('property_id', properties?.[0]?.id);
      
      return new Response(
        JSON.stringify({ results, faqs: faqs || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ results }),
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