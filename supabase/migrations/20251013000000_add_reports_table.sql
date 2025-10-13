/*
  # Add Reports Table

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key to conversations)
      - `lead_id` (uuid, foreign key to leads)
      - `report_type` (text) - Type of report (consultation, follow-up, etc.)
      - `content_html` (text) - HTML content of the report
      - `generated_at` (timestamptz) - When the report was generated
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `reports` table
    - Add policies for authenticated users to read and create reports
*/

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  report_type text DEFAULT 'consultation',
  content_html text NOT NULL DEFAULT '',
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_conversation_id ON reports(conversation_id);
CREATE INDEX IF NOT EXISTS idx_reports_lead_id ON reports(lead_id);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Authenticated users can read reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update reports"
  ON reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete reports"
  ON reports FOR DELETE
  TO authenticated
  USING (true);
