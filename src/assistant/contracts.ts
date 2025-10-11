export interface EstateDBQueryInput {
  intent: string;
  name?: string;
  location?: string;
  filters?: {
    unit_type?: string;
    max_price?: number;
    amenities?: string[];
  };
}

export interface EstateDBQueryOutput {
  results: Array<{
    name: string;
    location: string;
    unit_types: string[];
    base_price: number;
    amenities: string[];
    highlights: string;
    availability: string;
  }>;
}

export interface EstateCRMCreateLeadInput {
  full_name?: string;
  phone?: string;
  email?: string;
  property_type?: string;
  preferred_location?: string;
  budget?: number;
  intent_level: 'low' | 'medium' | 'high';
  conversion_probability: {
    '3m': number;
    '6m': number;
    '9m': number;
  };
  summary: string;
}

export interface EstateCRMCreateLeadOutput {
  lead_id: string;
}

export interface EstateCRMLogActivityInput {
  lead_id: string;
  type: 'note' | 'task' | 'status';
  message: string;
  due_at?: string;
}

export interface EstateCRMLogActivityOutput {
  ok: boolean;
}

export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'estate_db__query',
      description: 'Query properties and property FAQs from the Estate Buddy database. Use this for any questions about listings, prices, amenities, availability, or location.',
      parameters: {
        type: 'object',
        properties: {
          intent: {
            type: 'string',
            description: 'The user\'s intent: "search_property", "property_details", "faq", or "general_inquiry"',
          },
          name: {
            type: 'string',
            description: 'Property name to search for (partial match supported)',
          },
          location: {
            type: 'string',
            description: 'Location to filter by',
          },
          filters: {
            type: 'object',
            properties: {
              unit_type: {
                type: 'string',
                description: 'Unit type filter (e.g., "1BHK", "2BHK", "3BHK")',
              },
              max_price: {
                type: 'number',
                description: 'Maximum price filter',
              },
              amenities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Required amenities',
              },
            },
          },
        },
        required: ['intent'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'estate_crm__create_lead',
      description: 'Create a new lead in the CRM when sufficient information is gathered from the conversation. Use this when the user shows clear buying intent.',
      parameters: {
        type: 'object',
        properties: {
          full_name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          property_type: { type: 'string' },
          preferred_location: { type: 'string' },
          budget: { type: 'number' },
          intent_level: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Assess intent: low=browsing, medium=considering, high=ready to buy',
          },
          conversion_probability: {
            type: 'object',
            properties: {
              '3m': { type: 'number', description: '3-month conversion probability (0-1)' },
              '6m': { type: 'number', description: '6-month conversion probability (0-1)' },
              '9m': { type: 'number', description: '9-month conversion probability (0-1)' },
            },
            required: ['3m', '6m', '9m'],
          },
          summary: {
            type: 'string',
            description: 'Brief summary of the conversation and lead details',
          },
        },
        required: ['intent_level', 'conversion_probability', 'summary'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'estate_crm__log_activity',
      description: 'Log an activity (note/task/status) for an existing lead. Use this to add follow-up tasks or notes.',
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'The lead ID to log activity for' },
          type: {
            type: 'string',
            enum: ['note', 'task', 'status'],
            description: 'Activity type',
          },
          message: { type: 'string', description: 'Activity message' },
          due_at: { type: 'string', description: 'Due date for tasks (ISO 8601 format)' },
        },
        required: ['lead_id', 'type', 'message'],
      },
    },
  },
];

export const DEFAULT_SYSTEM_PROMPT = `You are Estate Buddy, a concise real-estate voice assistant. Always call estate_db__query for listings, prices, amenities, availability, or location questions. Keep spoken replies ≤ 80 words, friendly and factual. If no results, say so and suggest close alternatives. When a clear lead is present, call estate_crm__create_lead with a short summary; use estate_crm__log_activity for notes or follow-ups.`;
