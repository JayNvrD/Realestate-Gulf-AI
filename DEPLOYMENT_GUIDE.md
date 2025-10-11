# Estate Buddy - Deployment Guide

## Overview
This guide covers the complete deployment process for Estate Buddy, including database setup, Edge Functions, environment configuration, and frontend deployment.

---

## Prerequisites

- Supabase account (already set up)
- Node.js 18+ installed
- npm or yarn package manager
- Domain name (optional, for custom domains)

---

## Current Deployment Status

### ✅ Completed
- Database schema created with all tables and views
- Row Level Security policies configured
- Sample data populated (5 properties, 10 leads, conversations)
- 5 Edge Functions deployed:
  - `heygen-token` - HeyGen token generation
  - `openai-assistant` - OpenAI Assistant integration
  - `estate-db-query` - Property search tool
  - `estate-crm-create-lead` - Lead creation tool
  - `estate-crm-log-activity` - Activity logging tool
- Environment variables configured
- Frontend built and tested

### 🔧 Configuration Required
- Production domain setup (optional)
- Custom avatar configuration (optional)
- Additional admin user accounts

---

## Step-by-Step Deployment

### 1. Verify Database Setup

Your database is already configured at:
```
URL: https://ydvqdfggctpvzermpjhd.supabase.co
```

**Verify Schema:**
```sql
-- Check all tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Verify sample data
SELECT COUNT(*) FROM properties;
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM public_links;
```

**Expected Results:**
- 7 tables (properties, property_faqs, leads, conversations, activities, admin_profiles, public_links)
- 5 properties
- 10 leads
- 1 public link

---

### 2. Verify Edge Functions

All Edge Functions are already deployed. Test them:

#### Test HeyGen Token
```bash
curl https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/heygen-token
```

Expected response:
```json
{"token": "eyJhbGc..."}
```

#### Test OpenAI Assistant
```bash
curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/openai-assistant \
  -H "Content-Type: application/json" \
  -d '{"message": "What properties do you have?"}'
```

Expected response:
```json
{"text": "We have several properties...", "threadId": "thread_..."}
```

#### Test Property Query
```bash
curl -X POST https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1/estate-db-query \
  -H "Content-Type: application/json" \
  -d '{"intent": "search_property", "location": "Miami"}'
```

Expected response:
```json
{"results": [{"name": "Oceanview Residences", ...}]}
```

---

### 3. Environment Variables

Your `.env` file is configured with:
```env
# Supabase
VITE_SUPABASE_URL=https://ydvqdfggctpvzermpjhd.supabase.co
VITE_SUPABASE_ANON_KEY=[configured]

# OpenAI (Server-side)
OPENAI_API_KEY=[configured]
OPENAI_MODEL=gpt-4o-mini

# HeyGen (Server-side)
HEYGEN_API_KEY=[configured]
VITE_HEYGEN_AVATAR_NAME=Wayne_20240711

# Server
PORT=5174
ORIGIN=http://localhost:5173
```

**For Production:** Update ORIGIN to your production domain.

---

### 4. Frontend Deployment

#### Option A: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel deploy --prod
   ```

3. **Configure Environment Variables:**
   In Vercel dashboard, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_HEYGEN_AVATAR_NAME`

#### Option B: Netlify

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and Deploy:**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. **Configure Environment Variables:**
   In Netlify dashboard, add the same variables.

#### Option C: Manual Static Hosting

1. **Build:**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder to:**
   - AWS S3 + CloudFront
   - Google Cloud Storage
   - Azure Static Web Apps
   - Any static hosting service

---

### 5. Custom Domain Setup

#### Update CORS Origin

Update Edge Functions to allow your domain:

1. **Update `.env` ORIGIN:**
   ```env
   ORIGIN=https://your-domain.com
   ```

2. **Redeploy if needed** (Edge Functions automatically use environment variables)

#### Configure DNS

Point your domain to your hosting provider:
- Vercel: Add CNAME record
- Netlify: Add CNAME or A record
- Static hosting: Follow provider instructions

---

### 6. Create Admin Account

1. **Visit your deployed site:**
   ```
   https://your-domain.com/auth
   ```

2. **Sign up with:**
   - Email
   - Password (minimum 6 characters)
   - Display name

3. **Verify account created:**
   ```sql
   SELECT * FROM admin_profiles;
   ```

---

### 7. Configure Public Avatar Links

1. **Log in to admin dashboard**

2. **Navigate to Public Links** (`/links`)

3. **Default link is already created:**
   - Slug: `property-showcase`
   - URL: `https://your-domain.com/avatar/property-showcase`

4. **Create additional links:**
   - Click "Create Link"
   - Set slug, title, and configuration
   - Copy shareable URL

---

### 8. Add Real Property Data

Replace sample data with your actual properties:

1. **Navigate to Knowledge Base** (`/kb`)

2. **Add Properties:**
   - Click "Add Property"
   - Fill in details (name, location, pricing, amenities)
   - Upload property images (optional)

3. **Add FAQs:**
   - Select property
   - Click "Add FAQ"
   - Enter common questions and answers

---

### 9. Testing Checklist

#### Test Admin Dashboard
- [ ] Sign in successfully
- [ ] Dashboard loads with KPIs
- [ ] Charts render correctly
- [ ] Activity feed displays

#### Test Lead Management
- [ ] Leads table displays
- [ ] Lead drawer opens
- [ ] Can add activities
- [ ] Can export CSV

#### Test Conversations
- [ ] Conversations list loads
- [ ] Transcripts display
- [ ] Can search conversations
- [ ] Can export data

#### Test Knowledge Base
- [ ] Can view properties
- [ ] Can add new property
- [ ] Can add FAQs
- [ ] Can delete items

#### Test Public Links
- [ ] Can create new link
- [ ] Can enable/disable link
- [ ] Can copy link URL
- [ ] Links list displays

#### Test Avatar Integration
- [ ] Public avatar page loads
- [ ] Avatar initializes on button click
- [ ] Video stream appears
- [ ] Voice input works (Chrome/Edge)
- [ ] Text input works
- [ ] Assistant responds correctly
- [ ] Avatar speaks responses
- [ ] Conversation logs properly

---

### 10. Performance Optimization

#### Frontend
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'avatar': ['@heygen/streaming-avatar']
        }
      }
    }
  }
});
```

#### Database
Indexes are already created for optimal performance:
- `idx_property_faqs_property_id`
- `idx_conversations_lead_id`
- `idx_activities_lead_id`
- `idx_leads_stage`
- `idx_leads_intent_level`

#### Edge Functions
- Functions use connection pooling
- Tool calls are parallelized where possible
- Responses are streamed for better performance

---

### 11. Monitoring & Analytics

#### Supabase Dashboard
Monitor:
- Database queries per second
- Edge Function invocations
- Error rates
- Response times

#### Application Logs
Check Edge Function logs for:
- OpenAI API errors
- HeyGen token errors
- Database query errors
- Tool call failures

#### User Analytics (Optional)
Integrate analytics:
```javascript
// Add to main.tsx
import ReactGA from 'react-ga4';
ReactGA.initialize('YOUR-GA-ID');
```

---

### 12. Security Checklist

- [x] RLS policies enabled on all tables
- [x] API keys stored server-side only
- [x] CORS configured correctly
- [x] SQL injection protection (parameterized queries)
- [ ] Rate limiting configured per link
- [ ] SSL/TLS enabled (handled by hosting)
- [ ] Regular backups enabled (Supabase auto-backup)
- [ ] Admin password requirements enforced

---

### 13. Backup & Recovery

#### Database Backups
Supabase automatically backs up your database daily.

**Manual Backup:**
```bash
# Export data
supabase db dump > backup.sql

# Restore
supabase db restore backup.sql
```

#### Configuration Backup
Keep copies of:
- Environment variables
- Edge Function code
- Public link configurations

---

### 14. Scaling Considerations

#### Database
- Supabase automatically scales
- Current plan supports thousands of concurrent users

#### Edge Functions
- Auto-scale with demand
- No manual configuration needed

#### Frontend
- Static files cached by CDN
- No server-side rendering required

---

### 15. Troubleshooting

#### Avatar Won't Initialize
1. Check HeyGen API key is valid
2. Verify `/heygen-token` endpoint responds
3. Check browser console for errors
4. Ensure CORS headers are correct

#### OpenAI Assistant Not Responding
1. Verify OPENAI_API_KEY is set
2. Check Edge Function logs
3. Test `/openai-assistant` endpoint directly
4. Verify tool endpoints are accessible

#### Database Connection Errors
1. Check Supabase URL and keys
2. Verify RLS policies allow access
3. Check network connectivity
4. Review Edge Function logs

#### Build Errors
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear build cache: `rm -rf dist`
3. Check TypeScript errors: `npm run typecheck`
4. Update dependencies: `npm update`

---

### 16. Post-Deployment Tasks

- [ ] Update README with production URLs
- [ ] Document admin login credentials
- [ ] Train team on CRM usage
- [ ] Set up monitoring alerts
- [ ] Schedule regular data backups
- [ ] Plan for feature additions
- [ ] Gather user feedback
- [ ] Optimize based on usage patterns

---

### 17. Support Resources

**Documentation:**
- [Supabase Docs](https://supabase.com/docs)
- [HeyGen API Docs](https://docs.heygen.com)
- [OpenAI Assistants](https://platform.openai.com/docs/assistants)

**API Reference:**
- See `API_DOCUMENTATION.md` for complete API reference

**Implementation Guide:**
- See `IMPLEMENTATION_GUIDE.md` for technical details

---

## Production URLs

After deployment, update these URLs:

**Admin Dashboard:**
```
https://your-domain.com
```

**Public Avatar:**
```
https://your-domain.com/avatar/property-showcase
```

**API Base:**
```
https://ydvqdfggctpvzermpjhd.supabase.co/functions/v1
```

---

## Success Metrics

Track these KPIs post-deployment:
- Number of avatar conversations
- Lead conversion rate
- Average conversation length
- Top property inquiries
- User satisfaction scores

---

## Maintenance Schedule

**Daily:**
- Monitor error logs
- Check system health

**Weekly:**
- Review lead data
- Update property listings
- Check performance metrics

**Monthly:**
- Database cleanup
- Security audit
- Feature updates

---

## Contact & Support

For technical issues:
1. Check logs in Supabase dashboard
2. Review error messages
3. Consult API documentation
4. Test endpoints individually

---

**Deployment Status:** ✅ Ready for Production

**Last Updated:** 2025-10-11
