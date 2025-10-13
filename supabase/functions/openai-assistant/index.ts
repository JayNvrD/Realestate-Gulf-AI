// ✅ Strict & complete CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // or set to your frontend origin
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const SYSTEM_PROMPT = `You are Realestate AI, a concise real-estate voice assistant. Keep spoken replies under 80 words, friendly and factual.

When users ask about properties, prices, amenities, availability, or locations, call estate_db__query.
When you gather enough information about a serious buyer (name, contact, budget, location preference), call estate_crm__create_lead.
For follow-up tasks or notes on existing leads, call estate_crm__log_activity.

Always be helpful, professional, and guide users toward finding their perfect property.`;

const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "estate_db__query",
      description: "Query properties and property FAQs from the Realestate AI database.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["search_property", "property_details", "faq", "general_inquiry"],
          },
          name: { type: "string" },
          location: { type: "string" },
          filters: {
            type: "object",
            properties: {
              unit_type: { type: "string" },
              max_price: { type: "number" },
              amenities: { type: "array", items: { type: "string" } },
            },
          },
        },
        required: ["intent"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estate_crm__create_lead",
      description: "Create a new CRM lead when sufficient user data is collected.",
      parameters: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          property_type: { type: "string" },
          preferred_location: { type: "string" },
          budget: { type: "number" },
          intent_level: { type: "string", enum: ["low", "medium", "high"] },
          conversion_probability: {
            type: "object",
            properties: {
              "3m": { type: "number" },
              "6m": { type: "number" },
              "9m": { type: "number" },
            },
            required: ["3m", "6m", "9m"],
          },
          summary: { type: "string" },
        },
        required: ["intent_level", "conversion_probability", "summary"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estate_crm__log_activity",
      description: "Log CRM activities, tasks, or notes for existing leads.",
      parameters: {
        type: "object",
        properties: {
          lead_id: { type: "string" },
          type: { type: "string", enum: ["note", "task", "status"] },
          message: { type: "string" },
          due_at: { type: "string" },
        },
        required: ["lead_id", "type", "message"],
      },
    },
  },
];

async function callToolFunction(name: string, args: any): Promise<string> {
  const functionUrl = `${SUPABASE_URL}/functions/v1/${name.replace("__", "-")}`;
  try {
    const res = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) {
      const err = await res.text();
      return JSON.stringify({ error: `Tool call failed: ${err}` });
    }
    return JSON.stringify(await res.json());
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
}

// 🔥 Main Handler
Deno.serve(async (req: Request) => {
  // --- Handle CORS preflight ---
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const start = Date.now();
  console.log("[Assistant] Request received.");

  try {
    if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

    const { message, threadId, systemPrompt } = await req.json();
    if (!message) throw new Error("Message is required");

    const prompt = systemPrompt || SYSTEM_PROMPT;
    let currentThread = threadId;

    // --- Create Thread ---
    if (!currentThread) {
      const t = await fetch("https://api.openai.com/v1/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
      });
      if (!t.ok) throw new Error(await t.text());
      currentThread = (await t.json()).id;
    }

    // --- Add Message ---
    const msgRes = await fetch(`https://api.openai.com/v1/threads/${currentThread}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({ role: "user", content: message }),
    });
    if (!msgRes.ok) throw new Error(await msgRes.text());

    // --- Create Assistant (one-time) ---
    const asRes = await fetch("https://api.openai.com/v1/assistants", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        name: "Realestate AI",
        model: "gpt-4o-mini",
        instructions: prompt,
        tools: ASSISTANT_TOOLS,
      }),
    });
    if (!asRes.ok) throw new Error(await asRes.text());
    const assistant = await asRes.json();

    // --- Create Run ---
    const runRes = await fetch(`https://api.openai.com/v1/threads/${currentThread}/runs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({ assistant_id: assistant.id }),
    });
    if (!runRes.ok) throw new Error(await runRes.text());
    let run = await runRes.json();

    // --- Poll Until Done ---
    for (let i = 0; i < 60; i++) {
      const check = await fetch(
        `https://api.openai.com/v1/threads/${currentThread}/runs/${run.id}`,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );
      if (!check.ok) throw new Error(await check.text());
      run = await check.json();

      if (run.status === "requires_action") {
        const calls = run.required_action?.submit_tool_outputs?.tool_calls ?? [];
        const outputs = await Promise.all(
          calls.map(async (c: any) => ({
            tool_call_id: c.id,
            output: await callToolFunction(c.function.name, JSON.parse(c.function.arguments)),
          }))
        );
        await fetch(
          `https://api.openai.com/v1/threads/${currentThread}/runs/${run.id}/submit_tool_outputs`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
              "OpenAI-Beta": "assistants=v2",
            },
            body: JSON.stringify({ tool_outputs: outputs }),
          }
        );
        i = 0; // reset wait cycle
      } else if (["completed", "failed", "cancelled", "expired"].includes(run.status)) {
        break;
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    // --- Fetch Final Message ---
    const mRes = await fetch(`https://api.openai.com/v1/threads/${currentThread}/messages`, {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "assistants=v2",
      },
    });
    if (!mRes.ok) throw new Error(await mRes.text());
    const all = await mRes.json();
    const reply =
      all.data.find((m: any) => m.role === "assistant")?.content?.[0]?.text?.value ??
      "I couldn’t generate a response.";

    return new Response(
      JSON.stringify({ text: reply, threadId: currentThread }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[Assistant Error]", e.message);
    return new Response(
      JSON.stringify({ error: e.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    console.log(`[Assistant] Completed in ${Date.now() - start}ms`);
  }
});
