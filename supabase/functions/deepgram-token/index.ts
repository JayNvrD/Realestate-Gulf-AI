// supabase/functions/deepgram-token/index.ts
// ✅ Deepgram Token Minting Function (2025 API Version)
// Reference: https://developers.deepgram.com/reference/token-based-auth-api/grant-token

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    const DEEPGRAM_PROJECT_ID =
      Deno.env.get('DEEPGRAM_PROJECT_ID') || '4d6507e9-d48c-4f00-8ee9-f2c845c6b223';

    if (!DEEPGRAM_API_KEY) {
      console.error('[Deepgram Function] Missing DEEPGRAM_API_KEY');
      return new Response(
        JSON.stringify({ error: 'Missing Deepgram API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Deepgram Token API endpoint (latest)
    const url = `https://api.deepgram.com/v1/projects/${DEEPGRAM_PROJECT_ID}/access-tokens`;

    console.log('[Deepgram Function] Minting new token...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ttl: 900, // 15 minutes
        scope: 'listen:stream', // allow real-time transcription
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Deepgram Function] Deepgram API error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: 'Failed to mint Deepgram token', details: errText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const token = data.access_token || data.token || data.key;

    console.log('[Deepgram Function] ✅ Token minted successfully');
    return new Response(
      JSON.stringify({ key: token }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Deepgram Function] ❌ Exception:', error);
    return new Response(
      JSON.stringify({ error: 'Unexpected error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
