# Estate Buddy API Documentation

## Overview
Estate Buddy provides a comprehensive API for managing real estate properties, leads, and AI-powered voice avatar interactions. All APIs are deployed as Supabase Edge Functions with automatic authentication handling.

## Base URL
```
https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1
```

---

## Authentication

### Admin Authentication
Admin endpoints use Supabase Auth. Include the user's JWT token in requests:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

### Public Endpoints
Public endpoints (avatar interactions) do not require authentication.

---

## API Endpoints

### 1. HeyGen Token Generation

**Endpoint:** `GET /heygen-token`

**Description:** Generates a short-lived HeyGen streaming token for avatar initialization.

**Authentication:** None required

**Response:**
```json
{
  "token": "eyJhbGc..."
}
```

**Example:**
```javascript
const response = await fetch('https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/heygen-token');
const { token } = await response.json();
```

---

### 2. OpenAI Assistant Conversation

**Endpoint:** `POST /openai-assistant`

**Description:** Sends a message to the OpenAI Assistant and receives a response. Handles tool calls automatically.

**Authentication:** None required

**Request Body:**
```json
{
  "message": "I'm looking for a 2BHK property in Miami",
  "threadId": "thread_abc123" // Optional, for continuing conversation
}
```

**Response:**
```json
{
  "text": "I found several 2BHK properties in Miami Beach. Oceanview Residences offers...",
  "threadId": "thread_abc123"
}
```

**Example:**
```javascript
const response = await fetch('https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/openai-assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What properties do you have in Austin?",
    threadId: null // Start new conversation
  })
});

const { text, threadId } = await response.json();
```

---

### 3. Property Database Query

**Endpoint:** `POST /estate-db-query`

**Description:** Query properties and FAQs. Called automatically by OpenAI Assistant as a tool.

**Authentication:** None required (internal tool)

**Request Body:**
```json
{
  "intent": "search_property",
  "name": "Oceanview",
  "location": "Miami",
  "filters": {
    "unit_type": "2BHK",
    "max_price": 500000,
    "amenities": ["Gym", "Pool"]
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "name": "Oceanview Residences",
      "location": "Miami Beach, FL",
      "unit_types": ["1BHK", "2BHK", "3BHK", "Penthouse"],
      "base_price": 450000,
      "amenities": ["Swimming Pool", "Gym", "Parking", "24/7 Security"],
      "highlights": "Luxury beachfront living...",
      "availability": "Available"
    }
  ],
  "faqs": [] // Included when intent is 'faq'
}
```

**Intent Types:**
- `search_property` - Search for properties
- `property_details` - Get details about a specific property
- `faq` - Get FAQs for a property
- `general_inquiry` - General property questions

---

### 4. Create Lead

**Endpoint:** `POST /estate-crm-create-lead`

**Description:** Creates a new lead in the CRM. Called automatically by OpenAI Assistant when sufficient information is gathered.

**Authentication:** None required (internal tool)

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+1-555-0123",
  "email": "john@example.com",
  "property_type": "2BHK",
  "preferred_location": "Miami Beach",
  "budget": 480000,
  "intent_level": "high",
  "conversion_probability": {
    "3m": 0.7,
    "6m": 0.85,
    "9m": 0.9
  },
  "summary": "Interested in beachfront 2BHK. Ready to schedule site visit."
}
```

**Response:**
```json
{
  "lead_id": "uuid-here"
}
```

**Intent Levels:**
- `low` - Just browsing, minimal engagement
- `medium` - Considering options, asking detailed questions
- `high` - Ready to buy, requesting site visits

---

### 5. Log Activity

**Endpoint:** `POST /estate-crm-log-activity`

**Description:** Logs an activity (note/task/status) for an existing lead.

**Authentication:** None required (internal tool)

**Request Body:**
```json
{
  "lead_id": "uuid-here",
  "type": "task",
  "message": "Schedule site visit for Oceanview Residences",
  "due_at": "2025-10-15T10:00:00Z" // Optional, for tasks
}
```

**Activity Types:**
- `note` - General note about the lead
- `task` - Action item with optional due date
- `status` - Status change notification

**Response:**
```json
{
  "ok": true
}
```

---

## Supabase Database Direct Access

### Authentication Required
All direct database queries require Supabase authentication:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ydvqdfggctpvzermpjhd.supabase.co',
  'YOUR_SUPABASE_ANON_KEY'
);
```

### Example Queries

#### Get All Properties
```javascript
const { data, error } = await supabase
  .from('properties')
  .select('*')
  .order('name');
```

#### Get Lead with Activities
```javascript
const { data, error } = await supabase
  .from('leads')
  .select(`
    *,
    activities (*)
  `)
  .eq('id', leadId)
  .maybeSingle();
```

#### Get Dashboard Analytics
```javascript
// Lead Overview
const { data: overview } = await supabase
  .from('lead_overview')
  .select('*')
  .maybeSingle();

// Intent Distribution
const { data: intents } = await supabase
  .from('insight_intent_counts')
  .select('*');

// Conversion Averages
const { data: conversion } = await supabase
  .from('insight_conversion_avgs')
  .select('*')
  .maybeSingle();
```

---

## Complete Integration Example

### Frontend Avatar Integration

```typescript
import { HeyGenAvatarService } from './lib/heygen';
import { OpenAIAssistantService } from './lib/openai';

// Initialize services
const avatar = new HeyGenAvatarService();
const assistant = new OpenAIAssistantService();

// Initialize avatar
await avatar.initialize(videoElement, 'Wayne_20240711');

// Send message and get response
const response = await assistant.sendMessage("Show me 3BHK properties in Seattle");

// Speak response through avatar
await avatar.speak(response);
```

### Backend Tool Flow

```
User Message
    ↓
OpenAI Assistant
    ↓
Requires Tool Call?
    ↓ Yes
estate-db-query OR estate-crm-create-lead OR estate-crm-log-activity
    ↓
Query Supabase Database
    ↓
Return Results to Assistant
    ↓
Assistant Generates Response
    ↓
Return to User
    ↓
Avatar Speaks Response
```

---

## Error Handling

### Error Response Format
```json
{
  "error": "Error message here"
}
```

### Common HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `404` - Not Found
- `500` - Internal Server Error

### Example Error Handling
```javascript
try {
  const response = await fetch(apiUrl, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  // Handle error appropriately
}
```

---

## Rate Limiting

### Public Link Rate Limits
Each public link has a configurable rate limit (default: 10 requests/minute).

Rate limit is enforced per:
- IP address
- Public link slug
- Time window (1 minute rolling)

### Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1735689600
```

---

## Testing

### Test Data Available
The database is pre-populated with:
- 5 properties with detailed information
- 8 FAQs across properties
- 10 sample leads in various stages
- 2 conversation transcripts
- 5 activities (notes and tasks)
- 1 public link: `/avatar/property-showcase`

### Test the Avatar
1. Visit: `http://localhost:5173/avatar/property-showcase`
2. Click "Start Conversation"
3. Try queries like:
   - "What properties do you have in Miami?"
   - "Tell me about Oceanview Residences"
   - "I'm looking for a 2BHK under $500,000"
   - "What amenities does Skyline Towers have?"

### Test Admin Dashboard
1. Sign up at `/auth`
2. Navigate to `/dashboard`
3. View KPIs, charts, and analytics
4. Manage leads at `/leads`
5. View conversations at `/conversations`

---

## API Keys Configuration

### Environment Variables
```env
# Supabase
VITE_SUPABASE_URL=https://ydvqdfggctpvzermpjhd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# OpenAI (Server-side only)
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

# HeyGen (Server-side only)
HEYGEN_API_KEY=Zjc0NGIyMD...
VITE_HEYGEN_AVATAR_NAME=Wayne_20240711
```

**Important:** OpenAI and HeyGen keys are only used server-side in Edge Functions. They are never exposed to the client.

---

## Deployment

### Edge Functions
All functions are deployed to Supabase:
- ✅ `heygen-token` - Token generation
- ✅ `openai-assistant` - AI conversation handler
- ✅ `estate-db-query` - Property search tool
- ✅ `estate-crm-create-lead` - Lead creation tool
- ✅ `estate-crm-log-activity` - Activity logging tool

### Frontend
Deploy the built application:
```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

---

## Support & Troubleshooting

### Common Issues

**1. HeyGen Token Error**
- Verify HEYGEN_API_KEY is set in Edge Function secrets
- Check token expiration (15 minutes)

**2. OpenAI Assistant Timeout**
- Increase timeout in Edge Function
- Check tool call responses are properly formatted

**3. Avatar Not Initializing**
- Ensure video element is properly referenced
- Check browser console for CORS errors
- Verify HeyGen token is valid

**4. Database Queries Failing**
- Verify RLS policies allow access
- Check authentication token is valid
- Ensure proper field names in queries

### Debug Mode
Enable verbose logging in Edge Functions:
```typescript
console.log('Request:', JSON.stringify(request));
console.log('Response:', JSON.stringify(response));
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Edge Functions deployed and tested
- [ ] Database populated with real property data
- [ ] RLS policies verified for security
- [ ] Rate limiting configured appropriately
- [ ] Error handling implemented
- [ ] Analytics tracking enabled
- [ ] Public links created and tested
- [ ] Admin accounts provisioned
- [ ] Documentation shared with team

---

## API Version
**Current Version:** 1.0.0
**Last Updated:** 2025-10-11
