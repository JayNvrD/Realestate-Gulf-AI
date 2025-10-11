# Estate Buddy - Voice-First Real Estate CRM

A comprehensive, production-ready CRM system for real estate businesses with AI-powered voice avatar lead generation.

## Features

### Admin Dashboard
- Real-time KPI tracking (new leads, high intent percentage, conversion rates)
- Interactive analytics charts (intent distribution, conversion forecasts, sentiment trends)
- Activity feed with recent updates across all leads

### Lead Management
- Comprehensive lead table with filtering and search
- Detailed lead drawer with contact info and conversion probabilities
- Activity timeline with notes, tasks, and status updates
- Bulk export to CSV

### Conversation Management
- Searchable transcript log from all avatar interactions
- Sentiment analysis and topic extraction
- Conversation-to-lead conversion tracking
- Export capabilities

### Reporting & Analytics
- Time-based filtering (day/week/month/custom)
- Performance metrics and conversion tracking
- Downloadable reports (CSV/PDF)
- Saved report templates

### Knowledge Base
- CRUD operations for properties and FAQs
- Property data management (pricing, amenities, availability)
- FAQ management per property
- Bulk CSV import support

### Public Link Management
- Create shareable avatar links with custom configurations
- Configure assistant prompts, models, and voice settings
- Enable/disable toggles and rate limiting
- Usage analytics per link

### Public Avatar Interface
- Voice-only interaction with AI assistant
- Large, accessible start button
- Responsive design for desktops, tablets, and kiosks
- Real-time conversation with property database grounding

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Space Grotesk font
- **UI**: Lucide React icons
- **Charts**: Recharts
- **Routing**: React Router DOM
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: OpenAI Assistants API (requires setup)
- **Voice**: HeyGen Streaming Avatar SDK (requires setup)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Setup
The database schema has been automatically created in your Supabase project with:
- 7 core tables (properties, property_faqs, leads, conversations, activities, admin_profiles, public_links)
- 5 analytics views for dashboard insights
- Row Level Security policies for all tables
- Indexes for optimal query performance

### 4. Run Development Server
```bash
npm run dev
```

Visit http://localhost:5173

### 5. First Time Setup
1. Navigate to `/auth` to create your admin account
2. Go to "Knowledge Base" and add sample properties
3. Create a public link in "Public Links"
4. Test the avatar at `/avatar/{your-slug}`

## Project Structure

```
/src
  /components      # Reusable UI components
  /pages          # Main application pages
  /routes         # React Router configuration
  /lib            # Utilities (Supabase, auth, fetch)
  /contexts       # React contexts (Auth)
  /types          # TypeScript type definitions
  /assistant      # OpenAI Assistant contracts
```

## Database Schema

### Core Tables
- `properties` - Property listings with amenities and pricing
- `property_faqs` - Property-specific FAQs
- `leads` - Lead management with intent levels and conversion probabilities
- `conversations` - Avatar conversation transcripts with sentiment analysis
- `activities` - Lead activities (notes, tasks, status updates)
- `admin_profiles` - Admin user profiles
- `public_links` - Shareable avatar link configurations

### Analytics Views
- `lead_overview` - Summary statistics
- `insight_intent_counts` - Intent level distribution
- `insight_conversion_avgs` - Average conversion probabilities
- `insight_sentiment_topics` - Sentiment aggregations
- `insight_agent_performance` - Performance metrics

## Integration Guide

### OpenAI Assistant Setup
See `IMPLEMENTATION_GUIDE.md` for detailed instructions on:
- Creating your OpenAI Assistant
- Setting up function tools
- Implementing conversation loops

### HeyGen Avatar Integration
See `IMPLEMENTATION_GUIDE.md` for:
- HeyGen API credentials setup
- Streaming Avatar SDK integration
- Voice configuration options

### Server-Side Tool Handlers
Three edge functions required:
1. `estate-db-query` - Query properties database
2. `estate-crm-create-lead` - Create new leads
3. `estate-crm-log-activity` - Log lead activities

Deploy using Supabase Edge Functions or your preferred serverless platform.

## Build for Production

```bash
npm run build
```

The `dist/` folder contains optimized production assets ready for deployment.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Design System

### Colors
- Primary: Cyan (500-600) to Blue (500-600) gradients
- Success: Emerald (500-600)
- Warning: Amber (500-600)
- Error: Red (500-600)
- Surfaces: White cards on Gray-50 background

### Typography
- Headings: Space Grotesk (Google Fonts)
- Body: System font stack

### Components
- Cards: White background, rounded-2xl, subtle shadows
- Buttons: Gradient backgrounds with hover effects
- Inputs: Focus rings with cyan accent
- Tables: Zebra striping with hover states

## Security

- Row Level Security enabled on all tables
- Admin-only access to CRM features
- Public links can be enabled/disabled
- Rate limiting support per link
- Parameterized queries prevent SQL injection

## Performance

- Optimized database queries with indexes
- Lazy loading for charts and heavy components
- Efficient React rendering with proper memoization
- Code splitting via React Router
- Compressed production builds

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Proprietary - Estate Buddy CRM

## Support

For implementation support, see `IMPLEMENTATION_GUIDE.md`
