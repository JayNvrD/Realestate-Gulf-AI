// Allow public access to this function
Deno.env.set('SUPABASE_FUNCTIONS_VERIFY_JWT', 'false');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // use your domain if you want to restrict
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Authorization',
    'X-Client-Info',
    'Apikey',
    'Content-Type',
    'apikey',
  ].join(', '),
  'Access-Control-Max-Age': '86400', // cache preflight for 24h
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

const SYSTEM_PROMPT = `You are Realestate AI, a concise real-estate voice assistant. Keep spoken replies under 80 words, friendly and factual.

When users ask about properties, prices, amenities, availability, or locations, call estate_db__query.
When you gather enough information about a serious buyer (name, contact, budget, location preference), call estate_crm__create_lead.
For follow-up tasks or notes on existing leads, call estate_crm__log_activity.

Always be helpful, professional, and guide users toward finding their perfect property.`;

const ASSISTANT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'estate_db__query',
      description: 'Query properties and property FAQs from the Realestate AI database. Use this for any questions about listings, prices, amenities, availability, or location.',
      parameters: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description: "The user's intent: search_property, property_details, faq, or general_inquiry",
            enum: ['search_property', 'property_details', 'faq', 'general_inquiry']
          },
          name: {
            type: 'string',
            description: 'Property name to search for (partial match supported)'
          },
          location: {
            type: 'string',
            description: 'Location to filter by'
          },
          filters: {
            type: 'object',
            properties: {
              unit_type: {
                type: 'string',
                description: 'Unit type filter (e.g., "1BHK", "2BHK", "3BHK")'
              },
              max_price: {
                type: 'number',
                description: 'Maximum price filter'
              },
              amenities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Required amenities'
              }
            }
          }
        },
        required: ['intent']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'estate_crm__create_lead',
      description: 'Create a new lead in the CRM when sufficient information is gathered. Use when the user shows clear buying intent.',
      parameters: {
        type: 'object',
        properties: {
          full_name: { type: 'string', description: 'Lead full name' },
          phone: { type: 'string', description: 'Phone number' },
          email: { type: 'string', description: 'Email address' },
          property_type: { type: 'string', description: 'Interested property type' },
          preferred_location: { type: 'string', description: 'Preferred location' },
          budget: { type: 'number', description: 'Budget amount' },
          intent_level: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Assess intent: low=browsing, medium=considering, high=ready to buy'
          },
          conversion_probability: {
            type: 'object',
            properties: {
              '3m': { type: 'number', description: '3-month conversion probability (0-1)' },
              '6m': { type: 'number', description: '6-month conversion probability (0-1)' },
              '9m': { type: 'number', description: '9-month conversion probability (0-1)' }
            },
            required: ['3m', '6m', '9m']
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the conversation and lead details'
          }
        },
        required: ['intent_level', 'conversion_probability', 'summary']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'estate_crm__log_activity',
      description: 'Log an activity (note/task/status) for an existing lead.',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'The lead ID to log activity for' },
          type: {
            type: 'string',
            enum: ['note', 'task', 'status'],
            description: 'Activity type'
          },
          message: { type: 'string', description: 'Activity message' },
          due_at: { type: 'string', description: 'Due date for tasks (ISO 8601 format)' }
        },
        required: ['lead_id', 'type', 'message']
      }
    }
  }
];

async function callToolFunction(name: string, args: any): Promise<string> {
  const functionUrl = `${SUPABASE_URL}/functions/v1/${name.replace('__', '-')}`;

  console.log(`[OpenAI Assistant] Calling tool: ${name}`, args);

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[OpenAI Assistant] Tool ${name} failed:`, error);
      return JSON.stringify({ error: `Tool call failed: ${error}` });
    }

    const data = await response.json();
    console.log(`[OpenAI Assistant] Tool ${name} succeeded:`, data);
    return JSON.stringify(data);
  } catch (error: any) {
    console.error(`[OpenAI Assistant] Tool ${name} exception:`, error);
    return JSON.stringify({ error: error.message });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[OpenAI Assistant] Request received');

  try {
    // Validate OpenAI API key
    if (!OPENAI_API_KEY) {
      console.error('[OpenAI Assistant] Missing OPENAI_API_KEY');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, threadId, systemPrompt } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[OpenAI Assistant] Message received:', message.substring(0, 50) + '...');

    const finalSystemPrompt = systemPrompt || SYSTEM_PROMPT;

    let currentThreadId = threadId;

    // Create thread if needed
    if (!currentThreadId) {
      console.log('[OpenAI Assistant] Creating new thread');
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!threadResponse.ok) {
        const error = await threadResponse.text();
        console.error('[OpenAI Assistant] Thread creation failed:', error);
        throw new Error(`Failed to create thread: ${error}`);
      }

      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
      console.log('[OpenAI Assistant] Thread created:', currentThreadId);
    }

    // Add message to thread
    console.log('[OpenAI Assistant] Adding message to thread');
    const addMessageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });

    if (!addMessageResponse.ok) {
      const error = await addMessageResponse.text();
      console.error('[OpenAI Assistant] Add message failed:', error);
      throw new Error(`Failed to add message: ${error}`);
    }

    // Create assistant
    console.log('[OpenAI Assistant] Creating assistant');
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        name: 'Realestate AI',
        model: 'gpt-4o-mini',
        instructions: finalSystemPrompt,
        tools: ASSISTANT_TOOLS
      })
    });

    if (!assistantResponse.ok) {
      const error = await assistantResponse.text();
      console.error('[OpenAI Assistant] Assistant creation failed:', error);
      throw new Error(`Failed to create assistant: ${error}`);
    }

    const assistant = await assistantResponse.json();
    console.log('[OpenAI Assistant] Assistant created:', assistant.id);

    // Create run
    console.log('[OpenAI Assistant] Creating run');
    let runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistant.id
      })
    });

    if (!runResponse.ok) {
      const error = await runResponse.text();
      console.error('[OpenAI Assistant] Run creation failed:', error);
      throw new Error(`Failed to create run: ${error}`);
    }

    let run = await runResponse.json();
    console.log('[OpenAI Assistant] Run created:', run.id);

    // Poll for completion
    let pollCount = 0;
    const maxPolls = 60; // 30 seconds max

    while (pollCount < maxPolls) {
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!statusResponse.ok) {
        const error = await statusResponse.text();
        console.error('[OpenAI Assistant] Status check failed:', error);
        throw new Error(`Failed to check run status: ${error}`);
      }

      run = await statusResponse.json();
      console.log('[OpenAI Assistant] Run status:', run.status);

      if (run.status === 'requires_action') {
        const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls || [];
        console.log('[OpenAI Assistant] Processing', toolCalls.length, 'tool calls');

        const toolOutputs = await Promise.all(
          toolCalls.map(async (call: any) => {
            const args = JSON.parse(call.function.arguments);
            const output = await callToolFunction(call.function.name, args);
            return {
              tool_call_id: call.id,
              output
            };
          })
        );

        const submitResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/submit_tool_outputs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({ tool_outputs: toolOutputs })
        });

        if (!submitResponse.ok) {
          const error = await submitResponse.text();
          console.error('[OpenAI Assistant] Submit tool outputs failed:', error);
          throw new Error(`Failed to submit tool outputs: ${error}`);
        }

        pollCount = 0; // Reset poll count after tool submission
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      if (['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
        break;
      }

      pollCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (pollCount >= maxPolls) {
      throw new Error('Run timed out after 30 seconds');
    }

    if (run.status !== 'completed') {
      throw new Error(`Run ended with status: ${run.status}`);
    }

    // Get messages
    console.log('[OpenAI Assistant] Fetching messages');
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });

    if (!messagesResponse.ok) {
      const error = await messagesResponse.text();
      console.error('[OpenAI Assistant] Fetch messages failed:', error);
      throw new Error(`Failed to fetch messages: ${error}`);
    }

    const messages = await messagesResponse.json();

    const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
    const text = assistantMessage?.content?.[0]?.text?.value || 'I apologize, but I could not generate a response.';

    const duration = Date.now() - startTime;
    console.log(`[OpenAI Assistant] Request completed in ${duration}ms`);

    return new Response(
      JSON.stringify({ text, threadId: currentThreadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[OpenAI Assistant] Error after ${duration}ms:`, error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
