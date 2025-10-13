# Deepgram Integration Setup - Final Steps

## ✅ Completed Steps

1. **Added Deepgram API key to local `.env` file**
   - The new Member-level API key has been added
   - Project ID is configured

2. **Fixed response field handling in frontend code**
   - Updated `PublicAvatar.tsx` to handle both `key` and `token` response fields
   - Updated `src/lib/deepgram.ts` for consistency

3. **Verified Edge Function configuration**
   - The `deepgram-token` edge function is properly configured with fallback logic
   - Supports both modern project API and legacy grant API

4. **Build verification passed**
   - Project builds successfully with no errors

---

## 🔧 Required: Configure Supabase Secrets

To complete the setup, you need to add the Deepgram API key to your Supabase project secrets:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **ydvqdfggctpvzermpjhd**
3. Navigate to **Settings** → **Edge Functions** (or **Project Settings** → **Functions**)
4. Click on **Secrets** or **Environment Variables**
5. Add a new secret:
   - **Name**: `DEEPGRAM_API_KEY`
   - **Value**: `5144b95ef4d5bd6325951bb7c235436b6b073198`
6. Optionally add:
   - **Name**: `DEEPGRAM_PROJECT_ID`
   - **Value**: `4d6507e9-d48c-4f00-8ee9-f2c845c6b223`
7. Click **Save** or **Add**

### Option 2: Using Supabase CLI (If installed locally)

```bash
# Set the Deepgram API key
supabase secrets set DEEPGRAM_API_KEY=5144b95ef4d5bd6325951bb7c235436b6b073198

# Optionally set the Project ID (though it has a default in the code)
supabase secrets set DEEPGRAM_PROJECT_ID=4d6507e9-d48c-4f00-8ee9-f2c845c6b223
```

### Option 3: Redeploy Edge Function with Secrets

If you need to redeploy the edge function after setting secrets:

```bash
supabase functions deploy deepgram-token
```

---

## 🧪 Testing the Integration

Once you've added the secrets to Supabase:

1. **Open your application** in the browser
2. **Navigate to a public avatar link** (e.g., `/avatar/your-slug`)
3. **Click "Start Conversation"**
4. **Grant microphone access** when prompted
5. **Check the browser console** for these success messages:
   - `[DeepgramSTT] 🔑 Token retrieved successfully`
   - `[DeepgramSTT] ✅ Connected to Deepgram`
   - `[PublicAvatar] Deepgram listening started`
6. **Speak into your microphone** and verify:
   - Transcripts appear in the console
   - The AI avatar responds to your speech
   - Conversation entries show in the sidebar

---

## 🔍 Troubleshooting

### If you still see "Insufficient permissions" error:

1. **Verify the API key has Member-level permissions**:
   - Log into https://console.deepgram.com/
   - Go to **API Keys**
   - Check the key permissions (should be "Member" or higher)

2. **Check Supabase secrets are set**:
   - Verify in Supabase Dashboard that `DEEPGRAM_API_KEY` exists
   - Make sure there are no extra spaces or characters

3. **Check Supabase Edge Function logs**:
   - In Supabase Dashboard, go to **Edge Functions**
   - Click on `deepgram-token` function
   - View the logs for detailed error messages

4. **Verify Deepgram account status**:
   - Ensure your Deepgram account has active credits
   - Check that the account isn't suspended or rate-limited

### If microphone access is denied:

- Check browser permissions for microphone access
- Try using HTTPS instead of HTTP (required for getUserMedia in some browsers)
- Clear browser cache and reload

### If the avatar doesn't respond:

- Check that the OpenAI API key is valid and has credits
- Verify the HeyGen API key is active
- Check browser console for any error messages

---

## 📋 Summary of Changes Made

1. **`.env` file**: Added `DEEPGRAM_API_KEY` and `DEEPGRAM_PROJECT_ID`
2. **`src/pages/PublicAvatar.tsx`**: Updated to handle `key` response field from edge function
3. **`src/lib/deepgram.ts`**: Updated for consistency with response field handling
4. **Build verification**: Confirmed project builds without errors

---

## ⚠️ Important Security Notes

- **Never commit API keys to version control**
- **Use environment variables for all secrets**
- **Rotate keys regularly** for security
- **Monitor usage** in Deepgram dashboard to detect anomalies
- **The edge function properly secures your API key** by minting short-lived tokens (15 min TTL)

---

## 🎯 Next Steps

1. **Set the Supabase secrets** as described above
2. **Test the integration** by starting a conversation with the avatar
3. **Monitor the console logs** to ensure everything is working correctly
4. **Verify transcription accuracy** and adjust Deepgram model settings if needed

Once the Supabase secrets are configured, your AI avatar will be able to listen to speech and respond in real-time! 🎉
