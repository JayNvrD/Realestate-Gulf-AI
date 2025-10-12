// supabase/functions/deepgram-token/index.ts

// Disable JWT verification (public function)
Deno.env.set('SUPABASE_FUNCTIONS_VERIFY_JWT', 'false');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const key = Deno.env.get('DEEPGRAM_API_KEY');
    if (!key) {
      return new Response(
        JSON.stringify({ error: 'DEEPGRAM_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ key }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
