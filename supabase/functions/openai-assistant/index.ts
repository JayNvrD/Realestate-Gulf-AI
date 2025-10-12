const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

const SYSTEM_PROMPT = `You are Estate Buddy, a concise real-estate voice assistant. Keep spoken replies under 80 words, friendly and factual.

When users ask about properties, prices, amenities, availability, or locations, call estate_db__query.
When you gather enough information about a serious buyer (name, contact, budget, location preference), call estate_crm__create_lead.
For follow-up tasks or notes on existing leads, call estate_crm__log_activity.

Always be helpful, professional, and guide users toward finding their perfect property.`;

const ASSISTANT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'estate_db__query',
      description: 'Query properties and property FAQs from the Estate Buddy database. Use this for any questions about listings, prices, amenities, availability, or location.',
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
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    
    if (!response.ok) {
      const error = await response.text();
      return JSON.stringify({ error: `Tool call failed: ${error}` });
    }
    
    const data = await response.json();
    return JSON.stringify(data);
  } catch (error: any) {
    return JSON.stringify({ error: error.message });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, threadId, systemPrompt } = await req.json();

    const finalSystemPrompt = systemPrompt || SYSTEM_PROMPT;

    let currentThreadId = threadId;
    
    if (!currentThreadId) {
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
    }

    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
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

    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        name: 'Estate Buddy',
        model: 'gpt-4o-mini',
        instructions: finalSystemPrompt,
        tools: ASSISTANT_TOOLS
      })
    });
    const assistant = await assistantResponse.json();

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
    let run = await runResponse.json();

    while (true) {
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      run = await statusResponse.json();

      if (run.status === 'requires_action') {
        const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls || [];
        
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

        await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}/submit_tool_outputs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({ tool_outputs: toolOutputs })
        });
        
        continue;
      }

      if (['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (run.status !== 'completed') {
      throw new Error(`Run ended with status: ${run.status}`);
    }

    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    const messages = await messagesResponse.json();
    
    const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
    const text = assistantMessage?.content?.[0]?.text?.value || 'I apologize, but I could not generate a response.';

    return new Response(
      JSON.stringify({ text, threadId: currentThreadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});