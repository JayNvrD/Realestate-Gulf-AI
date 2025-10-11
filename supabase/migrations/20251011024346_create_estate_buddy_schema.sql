/*
  # Estate Buddy CRM Database Schema

  ## Overview
  Complete database schema for Estate Buddy voice-first real estate CRM system.
  Implements admin-only CRM with public voice avatar lead generation.

  ## 1. New Tables

  ### Properties Management
  - `properties` - Real estate property listings
    - `id` (uuid, primary key)
    - `name` (text) - Property name
    - `location` (text) - Property location
    - `unit_types` (text[]) - Available unit types
    - `base_price` (numeric) - Starting price
    - `amenities` (text[]) - Property amenities
    - `highlights` (text) - Key highlights
    - `availability` (text) - Availability status
    - `updated_at` (timestamptz) - Last update timestamp

  - `property_faqs` - Property-specific FAQs
    - `id` (uuid, primary key)
    - `property_id` (uuid) - Foreign key to properties
    - `question` (text) - FAQ question
    - `answer` (text) - FAQ answer
    - `lang` (text) - Language code
    - `updated_at` (timestamptz) - Last update timestamp

  ### CRM Core
  - `leads` - Lead management
    - `id` (uuid, primary key)
    - `full_name` (text) - Lead full name
    - `phone` (text) - Phone number
    - `email` (text) - Email address
    - `property_type` (text) - Interested property type
    - `preferred_location` (text) - Preferred location
    - `budget` (numeric) - Budget amount
    - `intent_level` (text) - Intent level (low/medium/high)
    - `conversion_probability` (jsonb) - Probability forecasts {3m, 6m, 9m}
    - `stage` (text) - Pipeline stage
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  - `conversations` - Conversation transcripts
    - `id` (uuid, primary key)
    - `lead_id` (uuid) - Foreign key to leads (nullable)
    - `transcript` (text) - Full conversation transcript
    - `sentiment_topics` (jsonb) - Sentiment analysis data
    - `started_at` (timestamptz) - Conversation start time
    - `ended_at` (timestamptz) - Conversation end time
    - `ext_event_id` (text) - External event ID
    - `created_at` (timestamptz) - Creation timestamp

  - `activities` - Lead activities and notes
    - `id` (uuid, primary key)
    - `lead_id` (uuid) - Foreign key to leads
    - `type` (text) - Activity type (note/task/status)
    - `message` (text) - Activity message
    - `due_at` (timestamptz) - Due date for tasks
    - `created_by` (uuid) - Creator user ID
    - `created_at` (timestamptz) - Creation timestamp

  ### Admin & Public Links
  - `admin_profiles` - Admin user profiles
    - `user_id` (uuid, primary key) - Foreign key to auth.users
    - `display_name` (text) - Admin display name
    - `created_at` (timestamptz) - Creation timestamp

  - `public_links` - Shareable public avatar links
    - `id` (uuid, primary key)
    - `slug` (text, unique) - URL-friendly identifier
    - `title` (text) - Link title
    - `is_enabled` (boolean) - Enable/disable toggle
    - `config` (jsonb) - Configuration {assistantPrompt, model, avatarName, voice}
    - `rate_limit_per_min` (integer) - Rate limit setting
    - `created_by` (uuid) - Creator user ID
    - `created_at` (timestamptz) - Creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Database Views
  - `lead_overview` - Lead summary statistics
  - `insight_intent_counts` - Intent level distribution
  - `insight_conversion_avgs` - Average conversion probabilities
  - `insight_sentiment_topics` - Sentiment analysis aggregations
  - `insight_agent_performance` - Performance metrics by time period

  ## 3. Security
  - Enable RLS on all tables
  - Admin users have full read/write access
  - Public endpoints access via service role only
*/

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  unit_types text[] DEFAULT '{}',
  base_price numeric NOT NULL DEFAULT 0,
  amenities text[] DEFAULT '{}',
  highlights text DEFAULT '',
  availability text DEFAULT 'Available',
  updated_at timestamptz DEFAULT now()
);

-- Create property_faqs table
CREATE TABLE IF NOT EXISTS property_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  lang text DEFAULT 'en',
  updated_at timestamptz DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  property_type text DEFAULT '',
  preferred_location text DEFAULT '',
  budget numeric DEFAULT 0,
  intent_level text DEFAULT 'medium',
  conversion_probability jsonb DEFAULT '{"3m": 0.3, "6m": 0.5, "9m": 0.7}'::jsonb,
  stage text DEFAULT 'New',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  transcript text DEFAULT '',
  sentiment_topics jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  ext_event_id text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note', 'task', 'status')),
  message text NOT NULL,
  due_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create admin_profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create public_links table
CREATE TABLE IF NOT EXISTS public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  is_enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  rate_limit_per_min integer DEFAULT 10,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_faqs_property_id ON property_faqs(property_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_intent_level ON leads(intent_level);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_links_slug ON public_links(slug);

-- Create lead_overview view
CREATE OR REPLACE VIEW lead_overview AS
SELECT
  COUNT(*) AS total_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS new_today,
  COUNT(*) FILTER (WHERE intent_level = 'high') AS high_intent,
  COUNT(*) FILTER (WHERE stage = 'Closed') AS closed_deals,
  COUNT(*) FILTER (WHERE stage = 'Lost') AS lost_deals
FROM leads;

-- Create insight_intent_counts view
CREATE OR REPLACE VIEW insight_intent_counts AS
SELECT
  intent_level,
  COUNT(*) AS count
FROM leads
GROUP BY intent_level;

-- Create insight_conversion_avgs view
CREATE OR REPLACE VIEW insight_conversion_avgs AS
SELECT
  AVG((conversion_probability->>'3m')::numeric) AS avg_3m,
  AVG((conversion_probability->>'6m')::numeric) AS avg_6m,
  AVG((conversion_probability->>'9m')::numeric) AS avg_9m
FROM leads;

-- Create insight_sentiment_topics view
CREATE OR REPLACE VIEW insight_sentiment_topics AS
SELECT
  sentiment_topics->>'sentiment' AS sentiment,
  COUNT(*) AS count
FROM conversations
WHERE sentiment_topics->>'sentiment' IS NOT NULL
GROUP BY sentiment_topics->>'sentiment';

-- Create insight_agent_performance view
CREATE OR REPLACE VIEW insight_agent_performance AS
SELECT
  ap.display_name,
  COUNT(DISTINCT a.lead_id) AS leads_handled,
  COUNT(*) FILTER (WHERE a.type = 'task') AS tasks_created,
  COUNT(*) FILTER (WHERE a.type = 'note') AS notes_added
FROM activities a
LEFT JOIN admin_profiles ap ON ap.user_id = a.created_by
GROUP BY ap.display_name;

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties
CREATE POLICY "Authenticated users can read properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete properties"
  ON properties FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for property_faqs
CREATE POLICY "Authenticated users can read property_faqs"
  ON property_faqs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert property_faqs"
  ON property_faqs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update property_faqs"
  ON property_faqs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete property_faqs"
  ON property_faqs FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for leads
CREATE POLICY "Authenticated users can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for conversations
CREATE POLICY "Authenticated users can read conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for activities
CREATE POLICY "Authenticated users can read activities"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete activities"
  ON activities FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for admin_profiles
CREATE POLICY "Authenticated users can read admin_profiles"
  ON admin_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own admin_profile"
  ON admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own admin_profile"
  ON admin_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for public_links
CREATE POLICY "Authenticated users can read public_links"
  ON public_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert public_links"
  ON public_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update public_links"
  ON public_links FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete public_links"
  ON public_links FOR DELETE
  TO authenticated
  USING (true);