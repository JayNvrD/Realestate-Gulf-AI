// supabase/functions/deepgram-token/index.ts
// Returns Deepgram API key for browser WebSocket Sec-WebSocket-Protocol authentication
// Browser WebSockets cannot use custom headers, so Sec-WebSocket-Protocol is required
// which needs the actual API key, not a JWT token
// Returns: { key: "<api_key>" }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');

    if (!DEEPGRAM_API_KEY) {
      console.error('[deepgram-token] Missing DEEPGRAM_API_KEY');
      return json(500, { error: 'Missing Deepgram API key' });
    }

    // Return the API key for Sec-WebSocket-Protocol authentication
    // This is the only way to authenticate WebSocket connections from browsers
    console.log('[deepgram-token] ✔ Returning API key for WebSocket authentication');
    return json(200, { key: DEEPGRAM_API_KEY });
  } catch (err) {
    console.error('[deepgram-token] Exception', err);
    return json(500, { error: 'Token fetch exception', details: String(err) });
  }
});
