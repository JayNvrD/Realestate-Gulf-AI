// supabase/functions/deepgram-token/index.ts
// Deepgram temporary token minting with robust fallback & diagnostics.
// - Primary: 2025 API (project-scoped access token)
// - Fallback: legacy /v1/auth/grant
// Returns: { key: "<temporary_token>" }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type DGTokenResponse =
  | { access_token?: string; token?: string; key?: string }
  | { error?: string; message?: string; detail?: string };

function json(status: number, body: any) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function mintViaProjectAPI(key: string, projectId: string) {
  const url = `https://api.deepgram.com/v1/projects/${projectId}/access-tokens`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      // CRITICAL: Deepgram expects "Token", not "Bearer"
      Authorization: `Token ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ttl: 900, // 15 minutes
      scope: 'listen:stream', // minimum for realtime STT
    }),
  });

  const text = await res.text();
  let body: DGTokenResponse = {};
  try {
    body = text ? (JSON.parse(text) as DGTokenResponse) : {};
  } catch {
    body = { error: text };
  }

  return { ok: res.ok, status: res.status, body };
}

async function mintViaGrantAPI(key: string) {
  const url = `https://api.deepgram.com/v1/auth/grant`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ttl: 900, // 15 minutes
      // scopes may be optional on older accounts, but you can add:
      // scopes: ["listen:stream"]
    }),
  });

  const text = await res.text();
  let body: DGTokenResponse = {};
  try {
    body = text ? (JSON.parse(text) as DGTokenResponse) : {};
  } catch {
    body = { error: text };
  }

  return { ok: res.ok, status: res.status, body };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    // You provided this; we still allow override via env for flexibility.
    const DEEPGRAM_PROJECT_ID =
      Deno.env.get('DEEPGRAM_PROJECT_ID') || '4d6507e9-d48c-4f00-8ee9-f2c845c6b223';

    if (!DEEPGRAM_API_KEY) {
      console.error('[deepgram-token] Missing DEEPGRAM_API_KEY');
      return json(500, { error: 'Missing Deepgram API key' });
    }

    // 1) Try the project-scoped API (modern)
    console.log('[deepgram-token] Minting via project access-tokens API…');
    const proj = await mintViaProjectAPI(DEEPGRAM_API_KEY, DEEPGRAM_PROJECT_ID);

    if (proj.ok) {
      const token = proj.body.access_token || proj.body.token || proj.body.key;
      console.log('[deepgram-token] ✔ Token minted via project API');
      return json(200, { key: token });
    }

    console.warn(
      `[deepgram-token] Project API failed (${proj.status}). Body: ${JSON.stringify(proj.body)}`
    );

    // Heuristic: if 404/400 (endpoint not available for account), try legacy grant
    if (proj.status === 404 || proj.status === 400 || proj.status === 401) {
      console.log('[deepgram-token] Falling back to legacy grant API…');
      const grant = await mintViaGrantAPI(DEEPGRAM_API_KEY);

      if (grant.ok) {
        const token = grant.body.access_token || grant.body.token || grant.body.key;
        console.log('[deepgram-token] ✔ Token minted via legacy grant API');
        return json(200, { key: token });
      }

      console.error(
        `[deepgram-token] Legacy grant failed (${grant.status}). Body: ${JSON.stringify(grant.body)}`
      );
      return json(500, {
        error: 'Failed to mint Deepgram token (grant)',
        details: grant.body,
      });
    }

    // If not a typical “wrong endpoint” class of error, bubble up diagnostic
    return json(500, {
      error: 'Failed to mint Deepgram token (project)',
      details: proj.body,
    });
  } catch (err) {
    console.error('[deepgram-token] Exception', err);
    return json(500, { error: 'Token mint exception', details: String(err) });
  }
});
