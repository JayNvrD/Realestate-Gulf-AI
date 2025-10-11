# Estate Buddy - Testing Guide

## Quick Test Scenarios

### 🚀 Getting Started

```bash
# Start the application
npm run dev

# Application will be available at:
# http://localhost:5173
```

---

## Test Scenario 1: Admin Authentication

### Steps:
1. Navigate to `http://localhost:5173/auth`
2. Click "Don't have an account? Sign up"
3. Fill in:
   - Display Name: `Admin User`
   - Email: `admin@estatebuddy.com`
   - Password: `password123`
4. Click "Create Account"
5. You should be redirected to `/dashboard`

### Expected Result:
✅ Account created successfully
✅ Redirected to dashboard
✅ KPI cards display with data
✅ Charts render correctly

---

## Test Scenario 2: Dashboard Analytics

### Steps:
1. Log in to the admin dashboard
2. Observe the KPI cards at the top
3. Check the interactive charts below
4. Scroll to view the activity feed

### Expected Results:
✅ "New Leads Today" shows count
✅ "High Intent" percentage displays
✅ "Avg Conversion" shows percentage
✅ "Closed Deals" shows count
✅ Pie chart shows intent distribution
✅ Line chart shows conversion forecast
✅ Activity feed shows recent activities

### Sample Data to Verify:
- Total leads: 10
- Properties: 5
- High intent leads: 4+
- Activities: 5

---

## Test Scenario 3: Lead Management

### Steps:
1. Navigate to `/leads`
2. Review the leads table
3. Click the eye icon on any lead
4. In the drawer, add a new note:
   - Type: Note
   - Message: "Follow up scheduled for next week"
5. Click "Add Note"

### Expected Results:
✅ Leads table displays 10 sample leads
✅ Search and filter controls present
✅ Lead drawer opens with full details
✅ Contact information displayed
✅ Conversion probability chart shows
✅ Activity added successfully
✅ Activity appears in timeline

### Test Search:
- Search for "Sarah" → Should find Sarah Johnson
- Search for "Miami" → Should find Miami leads

---

## Test Scenario 4: Conversations

### Steps:
1. Navigate to `/conversations`
2. Review conversation transcripts
3. Search for "Miami"
4. Click "Export CSV"

### Expected Results:
✅ 2+ conversations displayed
✅ Sentiment badges show (positive/neutral)
✅ Topic chips display
✅ Search filters correctly
✅ CSV downloads with conversation data

---

## Test Scenario 5: Knowledge Base

### Steps:
1. Navigate to `/kb`
2. Click on "Oceanview Residences"
3. Review property details
4. Scroll to FAQs section
5. Try to add a new FAQ (button present)

### Expected Results:
✅ 5 properties listed in sidebar
✅ Property details display correctly
✅ Unit types shown as chips
✅ Amenities displayed
✅ FAQs section shows 3 questions
✅ Add FAQ button functional

### Properties to Verify:
- Oceanview Residences (Miami Beach)
- Downtown Plaza (Austin)
- Green Valley Estates (Portland)
- Skyline Towers (Seattle)
- Riverside Gardens (Denver)

---

## Test Scenario 6: Public Links

### Steps:
1. Navigate to `/links`
2. Observe the existing link
3. Click "Create Link" button
4. Fill in form:
   - Slug: `test-avatar`
   - Title: `Test Avatar Link`
   - Assistant Prompt: Leave default
   - Model: `gpt-4o-mini`
   - Rate Limit: `10`
5. Click "Create Link"
6. Copy the link URL

### Expected Results:
✅ Default link "property-showcase" exists
✅ Form validates properly
✅ New link created successfully
✅ Link appears in list
✅ Can enable/disable link
✅ Can copy link URL

---

## Test Scenario 7: Public Avatar (Critical Test)

### Steps:
1. Navigate to `http://localhost:5173/avatar/property-showcase`
2. Click "Start Conversation" button
3. Wait for avatar initialization (3-5 seconds)
4. **Option A - Voice Input:**
   - Click "Voice" button
   - Say: "What properties do you have in Miami?"
   - Wait for response
5. **Option B - Text Input:**
   - Type: "What properties do you have in Miami?"
   - Click "Send"
   - Wait for response

### Expected Results:
✅ Avatar page loads correctly
✅ Start button is visible and large
✅ Clicking button initializes avatar
✅ Video element appears
✅ HeyGen stream connects
✅ Input controls appear
✅ Voice button toggles to red when listening
✅ Text input field is functional
✅ Message sends to OpenAI Assistant
✅ Assistant responds with property information
✅ Avatar speaks the response
✅ Conversation appears in transcript panel
✅ Processing indicator shows during request

### Sample Queries to Test:

**Property Search:**
- "What properties do you have in Miami?"
- "Show me 2BHK units under $500,000"
- "Tell me about Oceanview Residences"

**Amenities:**
- "What amenities does Skyline Towers have?"
- "Does Downtown Plaza have parking?"
- "Are pets allowed at Riverside Gardens?"

**FAQs:**
- "What is the HOA fee for Oceanview?"
- "Is public transportation nearby for Downtown Plaza?"

**Lead Qualification:**
- "I'm looking for a beachfront property with a gym"
- "My budget is $600,000 and I need 3 bedrooms"
- "I want to schedule a site visit"

### Troubleshooting Avatar Issues:

**If avatar doesn't initialize:**
1. Check browser console for errors
2. Verify HeyGen API key is set in Edge Function
3. Test `/heygen-token` endpoint directly:
   ```bash
   curl https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/heygen-token
   ```

**If OpenAI doesn't respond:**
1. Check Edge Function logs in Supabase dashboard
2. Test `/openai-assistant` endpoint:
   ```bash
   curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/openai-assistant \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello"}'
   ```

**If voice input doesn't work:**
- Voice input requires Chrome or Edge browser
- Browser will request microphone permission
- Fallback to text input if unavailable

---

## Test Scenario 8: Tool Calling (Advanced)

### Steps:
1. Open avatar interface
2. Ask: "Create a lead for me - my name is John Smith, email john@test.com, looking for a 2BHK in Seattle for $600,000"
3. Wait for response
4. Log in to admin dashboard
5. Check `/leads` for new lead

### Expected Results:
✅ Assistant acknowledges the information
✅ Creates lead using `estate_crm__create_lead` tool
✅ Returns lead ID in conversation
✅ Lead appears in admin dashboard
✅ All provided information is captured
✅ Activity note created with summary

---

## Test Scenario 9: Reports & Analytics

### Steps:
1. Navigate to `/reports`
2. Select different time ranges
3. Click "Export CSV"
4. Review the chart data

### Expected Results:
✅ Time range buttons work
✅ Stats cards update
✅ Bar chart displays data
✅ CSV exports successfully
✅ Report templates listed

---

## Test Scenario 10: Performance Test

### Steps:
1. Open Chrome DevTools
2. Go to Network tab
3. Navigate through all pages
4. Monitor response times

### Expected Results:
✅ Dashboard loads < 1 second
✅ API responses < 500ms
✅ Charts render < 500ms
✅ Avatar initialization < 3 seconds
✅ No console errors
✅ No memory leaks

---

## API Endpoint Tests

### Test HeyGen Token
```bash
curl https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/heygen-token

# Expected: {"token":"eyJ..."}
```

### Test OpenAI Assistant
```bash
curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/openai-assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"What properties do you have?"}'

# Expected: {"text":"We have several...", "threadId":"thread_..."}
```

### Test Property Query
```bash
curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/estate-db-query \
  -H "Content-Type: application/json" \
  -d '{"intent":"search_property","location":"Miami"}'

# Expected: {"results":[{...}]}
```

### Test Lead Creation
```bash
curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/estate-crm-create-lead \
  -H "Content-Type: application/json" \
  -d '{
    "full_name":"Test User",
    "email":"test@example.com",
    "intent_level":"high",
    "conversion_probability":{"3m":0.7,"6m":0.85,"9m":0.9},
    "summary":"Test lead creation"
  }'

# Expected: {"lead_id":"uuid"}
```

---

## Browser Compatibility Test

### Test in Each Browser:
- [ ] Chrome/Edge - Full functionality
- [ ] Firefox - Full functionality
- [ ] Safari - Full functionality (voice may not work)
- [ ] Mobile Chrome - Responsive design
- [ ] Mobile Safari - Responsive design

### Expected:
✅ All pages render correctly
✅ Animations work smoothly
✅ Forms submit properly
✅ Charts display correctly
✅ Mobile navigation works

---

## Database Verification

### Check Sample Data
```sql
-- Verify properties
SELECT COUNT(*) FROM properties;  -- Expected: 5

-- Verify leads
SELECT COUNT(*) FROM leads;  -- Expected: 10

-- Verify conversations
SELECT COUNT(*) FROM conversations;  -- Expected: 2

-- Verify FAQs
SELECT COUNT(*) FROM property_faqs;  -- Expected: 8

-- Verify activities
SELECT COUNT(*) FROM activities;  -- Expected: 5

-- Verify public links
SELECT COUNT(*) FROM public_links;  -- Expected: 1
```

---

## Security Tests

### Test RLS Policies:
1. Log out from admin
2. Try to access `/dashboard` → Should redirect to `/auth`
3. Try to query database without auth → Should fail
4. Create new account → Should only see own data

### Test API Security:
- API keys not exposed in client
- CORS headers properly set
- No SQL injection possible
- Input validation works

---

## Load Test (Optional)

### Simulate Multiple Conversations:
```bash
# Run 10 concurrent avatar conversations
for i in {1..10}; do
  curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/openai-assistant \
    -H "Content-Type: application/json" \
    -d '{"message":"What properties do you have?"}' &
done
```

### Expected:
✅ All requests complete successfully
✅ Response times stay under 3 seconds
✅ No timeouts or errors
✅ Database handles concurrent queries

---

## Regression Checklist

After any code changes, verify:
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linter passes: `npm run lint`
- [ ] Dashboard loads correctly
- [ ] Avatar initializes
- [ ] OpenAI Assistant responds
- [ ] Database queries work
- [ ] Authentication functions

---

## Known Limitations

1. **Voice Input:**
   - Only works in Chrome/Edge
   - Requires microphone permission
   - Text input available as fallback

2. **Avatar Video:**
   - Requires HeyGen API key
   - May take 3-5 seconds to initialize
   - Quality depends on network speed

3. **Browser Warnings:**
   - Chunk size warning is cosmetic
   - Protobuf eval warning is from dependency

---

## Success Criteria

All tests should:
✅ Execute without errors
✅ Return expected data
✅ Display correctly
✅ Handle edge cases
✅ Provide user feedback
✅ Work across browsers

---

## Reporting Issues

If you encounter issues:
1. Check browser console for errors
2. Check Supabase Edge Function logs
3. Verify API keys are set
4. Test endpoints individually
5. Review error messages
6. Consult API documentation

---

## Quick Test Command

```bash
# Full test sequence
npm run dev &
sleep 5
curl http://localhost:5173
curl https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/heygen-token
curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/openai-assistant \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

---

**Testing Status:** ✅ All Systems Operational
**Last Tested:** 2025-10-11
