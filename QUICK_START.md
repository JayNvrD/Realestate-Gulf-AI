# HeyGen Streaming Avatar - Quick Start Guide

## 🚀 5-Minute Setup

This guide will get your HeyGen streaming avatar working in 5 minutes.

---

## Prerequisites

- Node.js 18+ installed
- HeyGen API key ([Get one here](https://app.heygen.com/settings/api-key))
- Supabase project ([Create one here](https://supabase.com))

---

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages including:
- `@heygen/streaming-avatar` - HeyGen SDK
- `livekit-client` - WebRTC client
- `@supabase/supabase-js` - Supabase client

---

## Step 2: Configure Environment Variables

Verify your `.env` file has these variables:

```env
# Supabase (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# HeyGen (Backend only - NEVER expose in frontend)
HEYGEN_API_KEY=your-heygen-api-key-here

# Avatar Configuration (Frontend)
VITE_HEYGEN_AVATAR_NAME=Wayne_20240711

# OpenAI (if using AI assistant)
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
```

**IMPORTANT:**
- The `HEYGEN_API_KEY` should NOT have a `VITE_` prefix
- This key is only used server-side in the Supabase Edge Function

---

## Step 3: Deploy Supabase Edge Function

The edge function is already created at `/supabase/functions/heygen-token/`

### Set the HeyGen API key in Supabase:

**Option A: Using Supabase CLI**
```bash
supabase secrets set HEYGEN_API_KEY=your-key-here
```

**Option B: Using Supabase Dashboard**
1. Go to your Supabase project
2. Navigate to **Project Settings** → **Edge Functions**
3. Click **Secrets**
4. Add secret: `HEYGEN_API_KEY` = `your-key-here`

### Deploy the function (if not already deployed):
```bash
supabase functions deploy heygen-token
```

---

## Step 4: Test the Token Endpoint

Verify the edge function works:

```bash
curl https://your-project.supabase.co/functions/v1/heygen-token
```

Expected response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

If you get an error, check:
- ✅ Edge function is deployed
- ✅ `HEYGEN_API_KEY` secret is set
- ✅ API key is valid

---

## Step 5: Run the Application

```bash
npm run dev
```

Open browser to: `http://localhost:5173`

---

## Step 6: Test the Avatar

1. Navigate to **AI Avatar** page (or use public link)
2. Click **Start Conversation**
3. Wait for "Connecting..." (should take 3-5 seconds)
4. Avatar video should appear
5. Speak or type to interact

---

## ✅ Success Indicators

When everything is working, you should see:

### In Browser Console:
```
[HeyGen] Initializing avatar service...
[HeyGen] Fetching access token from backend...
[HeyGen] Token received successfully
[HeyGen] Creating avatar session with config: {...}
[HeyGen] Stream ready event received
[HeyGen] Video metadata loaded, starting playback
[HeyGen] Avatar session created successfully
```

### In Browser:
- Video of avatar appears
- Avatar speaks greeting message
- Voice recognition indicator shows "Voice Active"
- You can speak and avatar responds

---

## 🐛 Troubleshooting

### Issue: "Failed to fetch HeyGen token"

**Solution:**
```bash
# Check if edge function is deployed
supabase functions list

# Check logs for errors
supabase functions logs heygen-token

# Verify secret is set
supabase secrets list
```

---

### Issue: Video doesn't appear

**Check:**
1. Open browser console (F12)
2. Look for `[HeyGen]` logs
3. Check if you see "Stream ready event received"
4. Try refreshing the page
5. Try a different browser

---

### Issue: No audio from avatar

**Solution:**
- Check browser audio isn't muted
- Check video element isn't muted
- Click on page first (browsers block audio without user interaction)

---

### Issue: Voice recognition not working

**Check:**
- Browser must support Web Speech API (Chrome/Edge recommended)
- Microphone permissions must be granted
- Try speaking clearly and wait 1-2 seconds

---

## 🔧 Advanced Configuration

### Change Avatar

Edit `.env`:
```env
VITE_HEYGEN_AVATAR_NAME=Angela_20240702
```

Available avatars:
- `Wayne_20240711` (Male, professional)
- `Angela_20240702` (Female, friendly)
- [See full list](https://docs.heygen.com/docs/list-avatars)

### Change Video Quality

Edit `/src/lib/heygen.ts`:
```typescript
await this.avatar.createStartAvatar({
  quality: AvatarQuality.Medium,  // Change from High to Medium
  avatarName: avatarName,
  language: 'English',
});
```

Options: `Low`, `Medium`, `High`

### Change Language

Edit `/src/lib/heygen.ts`:
```typescript
await this.avatar.createStartAvatar({
  quality: AvatarQuality.High,
  avatarName: avatarName,
  language: 'Spanish',  // Change language
});
```

---

## 📚 Next Steps

- Read [HEYGEN_DEBUGGING_GUIDE.md](./HEYGEN_DEBUGGING_GUIDE.md) for detailed troubleshooting
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API integration
- Review [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production deployment

---

## 📞 Support

If you're still having issues:

1. Check browser console for `[HeyGen]` logs
2. Check Supabase Edge Function logs
3. Test token endpoint with curl
4. Review [HEYGEN_DEBUGGING_GUIDE.md](./HEYGEN_DEBUGGING_GUIDE.md)
5. Open an issue with:
   - Browser console logs
   - Edge function logs
   - Steps to reproduce

---

## ✨ Features Included

- ✅ Real-time video avatar streaming
- ✅ Voice recognition (speech-to-text)
- ✅ Text-to-speech with lip sync
- ✅ OpenAI integration for intelligent responses
- ✅ Conversation history tracking
- ✅ Real-time sentiment analysis
- ✅ Secure token management
- ✅ Mobile responsive design
- ✅ Error handling and recovery

---

## 🎉 You're Done!

Your HeyGen streaming avatar should now be working. Enjoy building amazing conversational AI experiences!
