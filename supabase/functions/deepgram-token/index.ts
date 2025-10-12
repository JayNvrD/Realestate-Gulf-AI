// supabase/functions/deepgram-token/index.ts
// ✅ Fixed: uses correct Deepgram token creation endpoint and handles errors cleanly.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    if (!DEEPGRAM_API_KEY) {
      console.error('Missing DEEPGRAM_API_KEY in environment');
      return new Response(
        JSON.stringify({ error: 'Missing Deepgram API key in environment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Correct Deepgram endpoint for token creation
    const response = await fetch('https://api.deepgram.com/v1/listen/auth', {
      method: 'POST',
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl: 900, // 15 minutes
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram token error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to mint Deepgram token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const token = data?.access_token || data?.key || data?.token;

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Deepgram token exception:', error);
    return new Response(
      JSON.stringify({ error: 'Token mint error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
