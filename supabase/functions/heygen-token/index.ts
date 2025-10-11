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
    const HEYGEN_API_KEY = Deno.env.get('HEYGEN_API_KEY')!;

    const response = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ttl: 60 * 15 })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('HeyGen token error:', response.status, error);
      return new Response(
        JSON.stringify({ error: 'Failed to mint HeyGen token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const token = data?.data?.token || data?.token;

    return new Response(
      JSON.stringify({ token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('HeyGen token exception:', error);
    return new Response(
      JSON.stringify({ error: 'Token mint error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});