// supabase/functions/deepgram-token/index.ts

// Tell Supabase this function is public
// @ts-ignore
Deno.env.set('SUPABASE_FUNCTIONS_VERIFY_JWT', 'false');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Fetch key from environment
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');

    if (!DEEPGRAM_API_KEY) {
      console.error('[Deepgram] Missing DEEPGRAM_API_KEY in environment');
      return new Response(
        JSON.stringify({ error: 'DEEPGRAM_API_KEY not found' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the key
    return new Response(
      JSON.stringify({ key: DEEPGRAM_API_KEY }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Deepgram] Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
