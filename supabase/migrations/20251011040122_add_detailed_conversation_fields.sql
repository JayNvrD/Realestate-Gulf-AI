/*
  # Add Detailed Conversation Fields

  ## Overview
  Extends the conversations table to support comprehensive real estate consultation tracking
  with structured fields for property specifications, customer preferences, and follow-up actions.

  ## Changes
  1. Add new columns to conversations table:
     - person_name (customer name)
     - flat_specification (unit type requested)
     - facing_preference (directional preference)
     - interest_level (low/medium/high)
     - period_to_buy (timeframe)
     - responsibility (assigned team/person)
     - key_action_points (next steps)
     - preferred_floor (floor preference)
     - conversation_summary (detailed summary <300 words)
     - date_of_visit (consultation date)
  
  2. Add indexes for common queries
  3. Update existing data structure to be backward compatible
*/

-- Add new columns to conversations table
DO $$ 
BEGIN
  -- Add person_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'person_name'
  ) THEN
    ALTER TABLE conversations ADD COLUMN person_name text DEFAULT '';
  END IF;

  -- Add flat_specification if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'flat_specification'
  ) THEN
    ALTER TABLE conversations ADD COLUMN flat_specification text DEFAULT '';
  END IF;

  -- Add facing_preference if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'facing_preference'
  ) THEN
    ALTER TABLE conversations ADD COLUMN facing_preference text DEFAULT '';
  END IF;

  -- Add interest_level if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'interest_level'
  ) THEN
    ALTER TABLE conversations ADD COLUMN interest_level text DEFAULT 'Medium';
  END IF;

  -- Add period_to_buy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'period_to_buy'
  ) THEN
    ALTER TABLE conversations ADD COLUMN period_to_buy text DEFAULT '';
  END IF;

  -- Add responsibility if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'responsibility'
  ) THEN
    ALTER TABLE conversations ADD COLUMN responsibility text DEFAULT '';
  END IF;

  -- Add key_action_points if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'key_action_points'
  ) THEN
    ALTER TABLE conversations ADD COLUMN key_action_points text DEFAULT '';
  END IF;

  -- Add preferred_floor if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'preferred_floor'
  ) THEN
    ALTER TABLE conversations ADD COLUMN preferred_floor text DEFAULT '';
  END IF;

  -- Add conversation_summary if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'conversation_summary'
  ) THEN
    ALTER TABLE conversations ADD COLUMN conversation_summary text DEFAULT '';
  END IF;

  -- Add date_of_visit if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'date_of_visit'
  ) THEN
    ALTER TABLE conversations ADD COLUMN date_of_visit timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_conversations_person_name ON conversations(person_name);
CREATE INDEX IF NOT EXISTS idx_conversations_interest_level ON conversations(interest_level);
CREATE INDEX IF NOT EXISTS idx_conversations_date_of_visit ON conversations(date_of_visit DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_responsibility ON conversations(responsibility);

-- Update existing conversations to use started_at as date_of_visit if not set
UPDATE conversations 
SET date_of_visit = started_at 
WHERE date_of_visit IS NULL OR date_of_visit = now();

-- Insert sample data matching Conversations.md format
INSERT INTO conversations (
  date_of_visit,
  person_name,
  conversation_summary,
  flat_specification,
  facing_preference,
  interest_level,
  period_to_buy,
  responsibility,
  key_action_points,
  preferred_floor,
  transcript,
  sentiment_topics
) VALUES
('2025-10-01', 'Aamir Khan', 'Aamir visited the Al Qusais residential project with his wife and expressed strong interest in a 2 BHK unit. He appreciated the location and amenities but requested a flexible payment plan. Follow-up to share customized EMI options and finalize within two weeks.', '2 BHK', 'East Facing', 'High', '2 Weeks', 'Sales Executive', 'Send EMI options and schedule second visit.', '3rd Floor', '', '{"sentiment": "positive", "topics": ["payment plan", "2 BHK", "location"]}'::jsonb),
('2025-10-02', 'Fatima Ali', 'Fatima came to review 3 BHK apartments for her extended family. She is considering investing for long-term rental income. She needs details about ROI and rental demand in the area. Schedule a meeting with the investment advisor next week to discuss rental yield and tax benefits.', '3 BHK', 'South Facing', 'Medium', '1 Month', 'Investment Team', 'Arrange meeting with advisor.', '5th Floor', '', '{"sentiment": "neutral", "topics": ["investment", "rental income", "ROI"]}'::jsonb),
('2025-10-03', 'Rajesh Kumar', 'Rajesh was looking for a compact 1 BHK apartment for his son studying nearby. He liked the connectivity and affordable pricing. Requested a site visit for Saturday morning with his son.', '1 BHK', 'North Facing', 'High', '1 Week', 'Sales Team', 'Confirm Saturday visit with family.', 'Ground Floor', '', '{"sentiment": "positive", "topics": ["1 BHK", "connectivity", "site visit"]}'::jsonb),
('2025-10-04', 'Aisha Rahman', 'Aisha was impressed by the premium layout and clubhouse facilities. She asked for the latest brochure and details of interior customization. She prefers higher floors for better view and privacy. Follow up with layout brochure and customization options.', '3 BHK Premium', 'West Facing', 'High', '3 Weeks', 'Marketing Team', 'Share brochure and customization details.', '8th Floor', '', '{"sentiment": "positive", "topics": ["premium", "customization", "clubhouse"]}'::jsonb),
('2025-10-05', 'John Mathew', 'John visited the property as a reference from an existing customer. He was mainly comparing nearby projects for value. Wants clarity on maintenance costs and long-term benefits. Suggested a financial breakdown report for maintenance vs competitor projects.', '2 BHK', 'East Facing', 'Medium', '1 Month', 'Finance Team', 'Prepare and share comparison sheet.', '4th Floor', '', '{"sentiment": "neutral", "topics": ["comparison", "maintenance", "value"]}'::jsonb),
('2025-10-06', 'Noor Ahmed', 'Noor, an NRI, is exploring investment options. Requested virtual tour and price list in USD. Interested in two adjacent units for joint investment with brother.', '2 BHK (x2)', 'East Facing', 'High', '1 Month', 'NRI Desk', 'Share price in USD and arrange video tour.', '6th Floor', '', '{"sentiment": "positive", "topics": ["NRI", "investment", "virtual tour"]}'::jsonb),
('2025-10-07', 'Sneha Reddy', 'Sneha showed interest in 2.5 BHK units and mentioned her parents might move in soon. Needs details about elder-friendly features and nearby healthcare facilities. Suggested follow-up call with the wellness consultant.', '2.5 BHK', 'North Facing', 'Medium', '2 Weeks', 'Sales Team', 'Connect with wellness consultant.', '2nd Floor', '', '{"sentiment": "neutral", "topics": ["elder-friendly", "healthcare", "2.5 BHK"]}'::jsonb),
('2025-10-08', 'Pradeep Sharma', 'Pradeep was evaluating for investment and resale potential. Requested past 5-year appreciation data and upcoming infrastructure plans near the project. Needs report for ROI calculation before finalizing.', '3 BHK', 'East Facing', 'Medium', '1 Month', 'Research Team', 'Share appreciation and infra data.', '7th Floor', '', '{"sentiment": "neutral", "topics": ["investment", "appreciation", "infrastructure"]}'::jsonb),
('2025-10-09', 'Huda Karim', 'Huda, a first-time buyer, liked the interiors and amenities. Requested breakdown of total cost including registration and taxes. Needs financing options explained in detail.', '2 BHK', 'South Facing', 'High', '3 Weeks', 'Finance Team', 'Send cost breakup and financing options.', '5th Floor', '', '{"sentiment": "positive", "topics": ["first-time buyer", "financing", "costs"]}'::jsonb),
('2025-10-10', 'Arjun Mehta', 'Arjun was exploring options for relocation. Wants a ready-to-move unit. Asked about availability for immediate possession. Team to share inventory of ready flats and fast-track documentation process.', '2 BHK Ready', 'West Facing', 'High', 'Immediate', 'Sales Executive', 'Share list of ready-to-move units.', '1st Floor', '', '{"sentiment": "positive", "topics": ["relocation", "ready-to-move", "immediate"]}'::jsonb)
ON CONFLICT DO NOTHING;