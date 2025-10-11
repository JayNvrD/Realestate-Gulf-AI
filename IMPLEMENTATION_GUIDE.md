# Estate Buddy - Implementation Guide

## Overview
Estate Buddy is a voice-first real estate CRM system with AI-powered lead generation through public avatar interfaces. This guide covers the implementation of missing server-side components.

## Architecture

### Frontend (Complete ✅)
- React 18 + TypeScript + Vite
- Tailwind CSS with custom Space Grotesk font
- React Router DOM for navigation
- Recharts for data visualization
- Supabase Auth for authentication
- 7 core admin pages + public avatar interface

### Database (Complete ✅)
- PostgreSQL via Supabase
- Full schema with RLS policies
- Views for analytics and reporting
- All tables created and indexed

### Missing Components (Requires Implementation)

## 1. OpenAI Assistant Setup

### Create Your Assistant
```bash
# Using OpenAI API
curl https://api.openai.com/v1/assistants \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Estate Buddy",
    "instructions": "You are Estate Buddy, a concise real-estate voice assistant. Always call estate_db__query for listings, prices, amenities, availability, or location questions. Keep spoken replies ≤ 80 words, friendly and factual. If no results, say so and suggest close alternatives. When a clear lead is present, call estate_crm__create_lead with a short summary; use estate_crm__log_activity for notes or follow-ups.",
    "model": "gpt-4o-mini",
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "estate_db__query",
          "description": "Query properties and property FAQs from the Estate Buddy database.",
          "parameters": {
            "type": "object",
            "properties": {
              "intent": {
                "type": "string",
                "description": "The user intent: search_property, property_details, faq, or general_inquiry"
              },
              "name": {"type": "string"},
              "location": {"type": "string"},
              "filters": {
                "type": "object",
                "properties": {
                  "unit_type": {"type": "string"},
                  "max_price": {"type": "number"},
                  "amenities": {"type": "array", "items": {"type": "string"}}
                }
              }
            },
            "required": ["intent"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "estate_crm__create_lead",
          "description": "Create a new lead in the CRM.",
          "parameters": {
            "type": "object",
            "properties": {
              "full_name": {"type": "string"},
              "phone": {"type": "string"},
              "email": {"type": "string"},
              "property_type": {"type": "string"},
              "preferred_location": {"type": "string"},
              "budget": {"type": "number"},
              "intent_level": {
                "type": "string",
                "enum": ["low", "medium", "high"]
              },
              "conversion_probability": {
                "type": "object",
                "properties": {
                  "3m": {"type": "number"},
                  "6m": {"type": "number"},
                  "9m": {"type": "number"}
                },
                "required": ["3m", "6m", "9m"]
              },
              "summary": {"type": "string"}
            },
            "required": ["intent_level", "conversion_probability", "summary"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "estate_crm__log_activity",
          "description": "Log an activity for an existing lead.",
          "parameters": {
            "type": "object",
            "properties": {
              "lead_id": {"type": "string"},
              "type": {
                "type": "string",
                "enum": ["note", "task", "status"]
              },
              "message": {"type": "string"},
              "due_at": {"type": "string"}
            },
            "required": ["lead_id", "type", "message"]
          }
        }
      }
    ]
  }'
```

Save the returned `assistant_id` for use in your application.

## 2. Server-Side Tool Handlers

### Option A: Supabase Edge Functions (Recommended)

Create three edge functions for the tool handlers:

#### estate-db-query Function
```typescript
// supabase/functions/estate-db-query/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { intent, name, location, filters } = await req.json();

    let query = supabase.from('properties').select('*');

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    if (location) {
      query = query.ilike('location', `%${location}%`);
    }
    if (filters?.max_price) {
      query = query.lte('base_price', filters.max_price);
    }

    const { data: properties, error } = await query;

    if (error) throw error;

    const results = properties?.map(p => ({
      name: p.name,
      location: p.location,
      unit_types: p.unit_types,
      base_price: p.base_price,
      amenities: p.amenities,
      highlights: p.highlights,
      availability: p.availability,
    })) || [];

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### estate-crm-create-lead Function
```typescript
// supabase/functions/estate-crm-create-lead/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const leadData = await req.json();

    const { data, error } = await supabase
      .from('leads')
      .insert({
        full_name: leadData.full_name || '',
        phone: leadData.phone || '',
        email: leadData.email || '',
        property_type: leadData.property_type || '',
        preferred_location: leadData.preferred_location || '',
        budget: leadData.budget || 0,
        intent_level: leadData.intent_level,
        conversion_probability: leadData.conversion_probability,
        stage: 'New',
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ lead_id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### estate-crm-log-activity Function
```typescript
// supabase/functions/estate-crm-log-activity/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { lead_id, type, message, due_at } = await req.json();

    const { error } = await supabase
      .from('activities')
      .insert({
        lead_id,
        type,
        message,
        due_at: due_at || null,
        created_by: null,
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

Deploy these functions using the Supabase MCP tool or CLI.

## 3. HeyGen Streaming Avatar Integration

### Setup
1. Sign up for HeyGen account at https://heygen.com
2. Get your API credentials
3. Choose an avatar and get the avatar_id

### Frontend Integration
Update `/src/pages/PublicAvatar.tsx`:

```typescript
// Add HeyGen SDK
// npm install @heygen/streaming-avatar

import StreamingAvatar, { AvatarQuality } from '@heygen/streaming-avatar';

const [avatar, setAvatar] = useState<StreamingAvatar | null>(null);
const [sessionData, setSessionData] = useState<any>(null);

const initializeAvatar = async () => {
  const newAvatar = new StreamingAvatar({
    token: 'YOUR_HEYGEN_API_TOKEN',
  });

  const session = await newAvatar.createStartAvatar({
    quality: AvatarQuality.High,
    avatarName: link.config.avatarName || 'default_avatar',
    voice: {
      voiceId: link.config.voice || 'en-US-JennyNeural',
    },
  });

  setSessionData(session);
  setAvatar(newAvatar);

  // Connect to OpenAI Assistant
  await startConversationLoop(newAvatar, session);
};

const startConversationLoop = async (avatar: StreamingAvatar, session: any) => {
  // Create OpenAI Thread
  const thread = await createThread();

  // Listen to user speech
  avatar.on('user_speech', async (text: string) => {
    // Send to OpenAI Assistant
    await sendMessage(thread.id, text);

    // Run assistant
    const run = await runAssistant(thread.id, ASSISTANT_ID);

    // Handle tool calls
    if (run.required_action) {
      const toolOutputs = await handleToolCalls(run.required_action.submit_tool_outputs.tool_calls);
      await submitToolOutputs(thread.id, run.id, toolOutputs);
    }

    // Get response
    const messages = await getMessages(thread.id);
    const response = messages[0].content[0].text.value;

    // Speak response
    await avatar.speak({ text: response });
  });
};
```

## 4. Environment Variables

Add to your `.env` file:

```env
# Already configured
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Add these
VITE_OPENAI_API_KEY=sk-...
VITE_OPENAI_ASSISTANT_ID=asst_...
VITE_HEYGEN_API_TOKEN=...
```

## 5. Testing Workflow

1. **Database**: Already set up and ready
2. **Authentication**: Sign up via /auth page
3. **Add Properties**: Go to Knowledge Base, add sample properties
4. **Create Public Link**: Go to Public Links, create a new link
5. **Test Avatar**: Visit /avatar/{slug} (will show integration placeholder)
6. **Add OpenAI Integration**: Implement assistant conversation loop
7. **Add HeyGen Integration**: Initialize avatar with API credentials
8. **Test End-to-End**: Voice conversation → Lead creation → View in CRM

## 6. Production Deployment

### Frontend
```bash
npm run build
# Deploy dist/ folder to Vercel, Netlify, or similar
```

### Database
Already deployed on Supabase

### Edge Functions
Deploy via Supabase CLI or management interface

## Key Features Implemented

✅ Complete CRM dashboard with KPIs and charts
✅ Lead management with detailed drawer and activities
✅ Conversation logging and transcript management
✅ Reports and analytics with exportable data
✅ Knowledge base for properties and FAQs
✅ Public link management system
✅ Authentication and authorization
✅ Responsive design with custom fonts
✅ Row Level Security on all tables
✅ Database views for efficient analytics

## Integration Checklist

- [ ] Deploy Supabase Edge Functions for tool handlers
- [ ] Create OpenAI Assistant with function definitions
- [ ] Add HeyGen API credentials
- [ ] Integrate HeyGen Streaming Avatar SDK
- [ ] Connect OpenAI Assistant to HeyGen avatar
- [ ] Implement conversation state management
- [ ] Add error handling and retry logic
- [ ] Test voice conversation end-to-end
- [ ] Add rate limiting on public endpoints
- [ ] Monitor performance and optimize

## Support

For questions or issues:
- Supabase: https://supabase.com/docs
- OpenAI Assistants: https://platform.openai.com/docs/assistants
- HeyGen SDK: https://docs.heygen.com

## License

Proprietary - Estate Buddy CRM
