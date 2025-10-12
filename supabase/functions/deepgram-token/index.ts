// supabase/functions/deepgram-token/index.ts
// ✅ Secure Supabase Edge Function for minting temporary Deepgram tokens

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
      throw new Error('Missing DEEPGRAM_API_KEY in environment');
    }

    // 🔐 Request temporary Deepgram access token
    const response = await fetch('https://api.deepgram.com/v1/projects/me/keys', {
      method: 'POST',
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: 'SupabaseTemporaryToken',
        scopes: ['usage:write', 'usage:read'],
        time_to_live: 900, // 15 minutes
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
    const token = data?.key || data?.token;

    return new Response(
      JSON.stringify({ token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Deepgram token exception:', error);
    return new Response(
      JSON.stringify({ error: 'Token mint error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
