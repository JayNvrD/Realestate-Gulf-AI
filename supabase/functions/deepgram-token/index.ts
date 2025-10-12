// supabase/functions/deepgram-token/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Retrieve your Deepgram API key from environment variables
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');

    // Check if the key exists
    if (!DEEPGRAM_API_KEY) {
      console.error('[Deepgram] Missing DEEPGRAM_API_KEY in environment');
      return new Response(
        JSON.stringify({
          error: 'DEEPGRAM_API_KEY not configured in environment variables',
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Return the key to your frontend as JSON
    return new Response(
      JSON.stringify({ key: DEEPGRAM_API_KEY }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Deepgram] Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
