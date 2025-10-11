# HeyGen Streaming Avatar - Debugging & Setup Guide

## Overview
This guide provides comprehensive instructions for setting up, debugging, and troubleshooting the HeyGen Streaming Avatar integration in this application.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Dependencies](#dependencies)
3. [Setup Instructions](#setup-instructions)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Debugging Tips](#debugging-tips)
6. [API Reference](#api-reference)

---

## Architecture Overview

### Components
```
┌─────────────────┐
│  PublicAvatar   │ (React Component)
│   Component     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   HeyGen        │ (Service Class)
│   Avatar        │
│   Service       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Edge  │ (Secure Token Generation)
│   Function      │
│  /heygen-token  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   HeyGen API    │ (External Service)
│   Streaming     │
└─────────────────┘
```

### Data Flow
1. User clicks "Start Conversation"
2. PublicAvatar calls `HeyGenAvatarService.initialize()`
3. Service requests token from Supabase Edge Function
4. Edge Function calls HeyGen API with API key
5. Token returned to service
6. Service initializes StreamingAvatar SDK
7. Video stream established and displayed

---

## Dependencies

### Required NPM Packages
```json
{
  "@heygen/streaming-avatar": "^2.1.0",
  "livekit-client": "^2.15.8",
  "@supabase/supabase-js": "^2.57.4"
}
```

### Installation
```bash
npm install @heygen/streaming-avatar livekit-client @supabase/supabase-js
```

### Verification
```bash
# Check if packages are installed
ls -la node_modules/@heygen/streaming-avatar
ls -la node_modules/livekit-client
```

---

## Setup Instructions

### 1. Environment Variables

Create or verify `.env` file in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# HeyGen Configuration
HEYGEN_API_KEY=your-heygen-api-key
VITE_HEYGEN_AVATAR_NAME=Wayne_20240711

# OpenAI Configuration (if using AI assistant)
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
```

**IMPORTANT**:
- `HEYGEN_API_KEY` is used server-side only (Supabase Edge Function)
- `VITE_*` variables are exposed to the frontend
- Never expose `HEYGEN_API_KEY` in frontend code

### 2. HeyGen API Key Format

The HeyGen API key should be in base64 format. Verify it looks like:
```
Zjc0NGIyMDkxYzc3NGE2ZTg0YTFmYTJiYzY0MzUwYjgtMTc1Njk4NjA5MA==
```

### 3. Supabase Edge Function Deployment

The edge function is already deployed at:
```
/supabase/functions/heygen-token/index.ts
```

Verify the function is deployed:
```bash
# List edge functions
supabase functions list
```

### 4. Test the Token Endpoint

```bash
# Test token generation
curl -X GET https://your-project.supabase.co/functions/v1/heygen-token
```

Expected response:
```json
{
  "token": "eyJhbGc..."
}
```

---

## Common Issues & Solutions

### Issue 1: "Failed to fetch HeyGen token"

**Symptoms:**
- Console error: `Failed to fetch HeyGen token: 401`
- Token endpoint returns error

**Causes:**
1. Invalid HeyGen API key
2. Wrong header format in API call
3. API key not set in Supabase environment

**Solutions:**

#### A. Verify API Key Header Format
The HeyGen API requires `x-api-key` header (NOT `Authorization: Bearer`):

```typescript
// ✅ CORRECT
headers: {
  'x-api-key': HEYGEN_API_KEY,
  'Content-Type': 'application/json'
}

// ❌ INCORRECT
headers: {
  'Authorization': `Bearer ${HEYGEN_API_KEY}`,
  'Content-Type': 'application/json'
}
```

#### B. Verify Environment Variable
Check Supabase Edge Function has access to the key:
```bash
supabase secrets list
```

Set if missing:
```bash
supabase secrets set HEYGEN_API_KEY=your-key-here
```

#### C. Test API Key Directly
```bash
curl -X POST https://api.heygen.com/v1/streaming.create_token \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ttl": 900}'
```

---

### Issue 2: "Video stream not working"

**Symptoms:**
- Avatar initializes but no video appears
- Console shows "Stream ready" but video element is blank

**Solutions:**

#### A. Check Video Element Configuration
Ensure video element has required attributes:
```html
<video
  ref={videoRef}
  autoPlay        <!-- REQUIRED -->
  playsInline     <!-- REQUIRED for mobile -->
  className="w-full h-full object-cover"
/>
```

#### B. Check Browser Permissions
- Camera/microphone permissions may block video
- Check browser console for permission errors
- Try in incognito mode to rule out extension conflicts

#### C. Verify Stream Assignment
Check console logs for:
```
[HeyGen] Stream ready event received
[HeyGen] Video metadata loaded, starting playback
```

If missing, the stream isn't being assigned properly.

#### D. Check MediaStream
Add debugging in console:
```javascript
console.log('Video srcObject:', videoElement.srcObject);
console.log('Video readyState:', videoElement.readyState);
```

---

### Issue 3: "Button click not triggering"

**Symptoms:**
- Clicking "Start Conversation" does nothing
- No console logs appear

**Solutions:**

#### A. Check React Event Handlers
Verify onClick is properly bound:
```typescript
<button onClick={initializeAvatar}>
  Start Conversation
</button>
```

#### B. Check for Disabled State
```typescript
<button
  onClick={initializeAvatar}
  disabled={loading || isConnecting}  // Check these states
>
```

#### C. Check for JavaScript Errors
Open browser console (F12) and look for:
- Syntax errors
- Undefined variable errors
- Import errors

---

### Issue 4: "Avatar not speaking"

**Symptoms:**
- Avatar video works but doesn't speak
- `speak()` method called but no audio

**Solutions:**

#### A. Check Audio Context
Browser may block audio until user interaction:
```typescript
// Add user interaction before first speak
videoElement.muted = false;
await videoElement.play();
```

#### B. Verify Text Input
```typescript
// Add validation
if (!text || text.trim().length === 0) {
  console.warn('Empty text provided to speak()');
  return;
}
```

#### C. Check TaskType
Ensure correct task type:
```typescript
await avatar.speak({
  text: message,
  taskType: TaskType.REPEAT  // or TaskType.TALK
});
```

---

### Issue 5: "CORS errors"

**Symptoms:**
- Console error: `CORS policy blocked`
- Network tab shows failed requests

**Solutions:**

#### A. Verify Edge Function CORS Headers
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

#### B. Handle OPTIONS Requests
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { status: 200, headers: corsHeaders });
}
```

---

## Debugging Tips

### 1. Enable Comprehensive Logging

The HeyGenAvatarService now includes extensive logging with `[HeyGen]` prefix:

```typescript
console.log('[HeyGen] Initializing avatar service...');
console.log('[HeyGen] Token received successfully');
console.log('[HeyGen] Stream ready event received');
console.log('[HeyGen] Avatar session created successfully');
```

Watch for these in the browser console to track progress.

### 2. Browser Developer Tools

#### Console Tab
- Watch for `[HeyGen]` prefixed logs
- Check for error stack traces
- Look for failed promises

#### Network Tab
- Filter by `heygen`
- Check request/response for token endpoint
- Verify status codes (should be 200)
- Inspect request headers

#### Elements Tab
- Find `<video>` element
- Check if `srcObject` is set
- Verify video dimensions

### 3. Common Console Commands

Open browser console and run:

```javascript
// Check if video element has stream
document.getElementById('avatarVideo').srcObject

// Check video ready state (should be 4 when loaded)
document.getElementById('avatarVideo').readyState

// Check for HeyGen SDK
window.StreamingAvatar

// Force video play (if autoplay blocked)
document.getElementById('avatarVideo').play()
```

### 4. Edge Function Logs

View Supabase Edge Function logs:
```bash
supabase functions logs heygen-token
```

Or in Supabase Dashboard:
1. Go to Edge Functions
2. Select `heygen-token`
3. View Logs tab

### 5. Network Debugging

Test the full flow manually:

```bash
# 1. Get token
TOKEN=$(curl -s https://your-project.supabase.co/functions/v1/heygen-token | jq -r '.token')

# 2. Verify token format
echo $TOKEN | cut -d'.' -f1 | base64 -d

# 3. Test with HeyGen SDK (in browser console)
const avatar = new StreamingAvatar({ token: 'YOUR_TOKEN' });
await avatar.createStartAvatar({
  quality: 'high',
  avatarName: 'Wayne_20240711'
});
```

---

## API Reference

### HeyGenAvatarService Methods

#### `initialize(videoElement, avatarName?)`
Initialize the avatar session and connect to video stream.

**Parameters:**
- `videoElement: HTMLVideoElement` - Video element to display avatar
- `avatarName?: string` - Optional avatar name (defaults to env variable)

**Returns:** `Promise<void>`

**Throws:** Error if initialization fails

**Example:**
```typescript
const service = new HeyGenAvatarService();
await service.initialize(videoRef.current, 'Wayne_20240711');
```

---

#### `speak(text)`
Make the avatar speak the provided text.

**Parameters:**
- `text: string` - Text for avatar to speak

**Returns:** `Promise<void>`

**Throws:** Error if avatar not initialized or speak fails

**Example:**
```typescript
await service.speak("Hello! How can I help you today?");
```

---

#### `interrupt()`
Interrupt the avatar's current speech.

**Returns:** `Promise<void>`

**Example:**
```typescript
await service.interrupt();
```

---

#### `close()`
Close the avatar session and cleanup resources.

**Returns:** `Promise<void>`

**Example:**
```typescript
await service.close();
```

---

#### `isInitialized()`
Check if avatar is initialized.

**Returns:** `boolean`

**Example:**
```typescript
if (service.isInitialized()) {
  await service.speak("I'm ready!");
}
```

---

#### `getSessionData()`
Get the current session data.

**Returns:** `any` - Session data object

---

### StreamingEvents

Events emitted by the HeyGen SDK:

| Event | Description | Payload |
|-------|-------------|---------|
| `STREAM_READY` | Video stream is ready | `{ detail: MediaStream }` |
| `STREAM_DISCONNECTED` | Stream disconnected | None |
| `AVATAR_START_TALKING` | Avatar started speaking | None |
| `AVATAR_STOP_TALKING` | Avatar stopped speaking | None |

**Example:**
```typescript
avatar.on(StreamingEvents.STREAM_READY, (event) => {
  console.log('Stream ready:', event.detail);
});
```

---

## Testing Checklist

Use this checklist to verify everything is working:

- [ ] Dependencies installed (`npm install` completed)
- [ ] Environment variables set in `.env`
- [ ] HeyGen API key is valid and in correct format
- [ ] Supabase Edge Function deployed
- [ ] Token endpoint returns valid token (test with curl)
- [ ] Browser console shows no errors
- [ ] Video element renders on page
- [ ] "Start Conversation" button is clickable
- [ ] Clicking button shows "Connecting..." state
- [ ] Video stream appears after connection
- [ ] Avatar speaks greeting message
- [ ] Voice recognition works (if enabled)
- [ ] Avatar responds to spoken input
- [ ] "End Session" button terminates session properly

---

## Performance Optimization

### 1. Token Caching
Consider caching tokens (they're valid for 15 minutes):

```typescript
let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch('/heygen-token');
  const { token } = await response.json();

  cachedToken = token;
  tokenExpiry = Date.now() + (14 * 60 * 1000); // 14 minutes

  return token;
}
```

### 2. Preload Avatar
Preload avatar configuration:

```typescript
// Preload in background
const preloadAvatar = async () => {
  const token = await getToken();
  // Token is now cached for when user clicks start
};
```

### 3. Quality Settings
Adjust quality based on network:

```typescript
const quality = navigator.connection?.effectiveType === '4g'
  ? AvatarQuality.High
  : AvatarQuality.Medium;
```

---

## Security Best Practices

### 1. Never Expose API Key in Frontend
- ✅ Store in Supabase Edge Function environment
- ❌ Never in `.env` with `VITE_` prefix
- ❌ Never hardcode in frontend code

### 2. Use HTTPS Only
- Always use HTTPS in production
- HeyGen requires secure context for media streams

### 3. Implement Rate Limiting
Consider adding rate limiting to token endpoint:

```typescript
// In edge function
const rateLimitKey = `ratelimit:${clientIP}`;
const requests = await redis.incr(rateLimitKey);
if (requests > 10) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

### 4. Validate Token Origin
Verify tokens are only used from your domain:

```typescript
// Check Origin header
if (req.headers.get('origin') !== 'https://yourdomain.com') {
  return new Response('Invalid origin', { status: 403 });
}
```

---

## Support & Resources

### Documentation
- [HeyGen Streaming Avatar Docs](https://docs.heygen.com/docs/streaming-avatar)
- [LiveKit Client SDK](https://docs.livekit.io/client-sdk-js/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Community
- [HeyGen Discord](https://discord.gg/heygen)
- [Supabase Discord](https://discord.supabase.com/)

### Troubleshooting
If issues persist after following this guide:
1. Check HeyGen API status page
2. Verify HeyGen account credits/subscription
3. Test with different avatar names
4. Try different browsers
5. Contact HeyGen support with error logs

---

## Changelog

### Version 1.1.0 (Current)
- ✅ Fixed HeyGen API authentication (x-api-key header)
- ✅ Added livekit-client dependency
- ✅ Enhanced error handling and logging
- ✅ Improved video stream initialization
- ✅ Added comprehensive debugging logs

### Version 1.0.0
- Initial implementation with React + Supabase
- Basic avatar streaming functionality
