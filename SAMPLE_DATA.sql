-- Sample Data for Estate Buddy CRM
-- Run this in your Supabase SQL Editor to populate initial data

-- Sample Properties
INSERT INTO properties (name, location, unit_types, base_price, amenities, highlights, availability) VALUES
('Oceanview Residences', 'Miami Beach, FL', ARRAY['1BHK', '2BHK', '3BHK', 'Penthouse'], 450000, ARRAY['Swimming Pool', 'Gym', 'Parking', '24/7 Security', 'Ocean View', 'Smart Home'], 'Luxury beachfront living with stunning ocean views. Modern amenities and prime location.', 'Available'),
('Downtown Plaza', 'Austin, TX', ARRAY['Studio', '1BHK', '2BHK'], 320000, ARRAY['Parking', 'Gym', 'Rooftop Terrace', 'Pet Friendly', 'Co-working Space'], 'Urban living in the heart of Austin. Walking distance to restaurants and entertainment.', 'Available'),
('Green Valley Estates', 'Portland, OR', ARRAY['2BHK', '3BHK', '4BHK'], 550000, ARRAY['Garden', 'Playground', 'Clubhouse', 'Parking', 'Gym', 'Pet Park'], 'Family-friendly community surrounded by nature. Spacious homes with modern design.', 'Available'),
('Skyline Towers', 'Seattle, WA', ARRAY['1BHK', '2BHK', '3BHK', 'Penthouse'], 680000, ARRAY['Concierge', 'Sky Lounge', 'Gym', 'Parking', 'City View', 'Smart Home', 'EV Charging'], 'Premium high-rise living with panoramic city views. State-of-the-art amenities.', 'Limited Units'),
('Riverside Gardens', 'Denver, CO', ARRAY['2BHK', '3BHK'], 420000, ARRAY['Riverside Walk', 'Parking', 'Gym', 'Bike Storage', 'Pet Friendly'], 'Peaceful riverside living with mountain views. Perfect for outdoor enthusiasts.', 'Available');

-- Sample Property FAQs
INSERT INTO property_faqs (property_id, question, answer, lang) VALUES
((SELECT id FROM properties WHERE name = 'Oceanview Residences'), 'What is the HOA fee?', 'The HOA fee ranges from $350 to $650 per month depending on the unit size. This includes maintenance of common areas, security, and amenities.', 'en'),
((SELECT id FROM properties WHERE name = 'Oceanview Residences'), 'Is parking included?', 'Yes, each unit comes with 1-2 assigned parking spots in the secure underground garage.', 'en'),
((SELECT id FROM properties WHERE name = 'Oceanview Residences'), 'Are pets allowed?', 'Yes, we are pet-friendly! Up to 2 pets per unit are allowed with a one-time pet deposit.', 'en'),
((SELECT id FROM properties WHERE name = 'Downtown Plaza'), 'What is the move-in timeline?', 'Units are available for immediate occupancy. The move-in process typically takes 2-3 weeks after contract signing.', 'en'),
((SELECT id FROM properties WHERE name = 'Downtown Plaza'), 'Is there public transportation nearby?', 'Yes, the property is located 2 blocks from the metro station and multiple bus routes service the area.', 'en'),
((SELECT id FROM properties WHERE name = 'Green Valley Estates'), 'What schools are nearby?', 'The property is zoned for excellent Portland Public Schools, with elementary, middle, and high schools within 1-2 miles.', 'en'),
((SELECT id FROM properties WHERE name = 'Skyline Towers'), 'What floor plans are available?', 'We offer 1BHK (650-800 sq ft), 2BHK (1000-1200 sq ft), 3BHK (1400-1600 sq ft), and Penthouses (2000+ sq ft).', 'en'),
((SELECT id FROM properties WHERE name = 'Riverside Gardens'), 'Is there bike storage?', 'Yes, we have secure climate-controlled bike storage on the ground level available for all residents.', 'en');

-- Sample Leads (for demonstration)
INSERT INTO leads (full_name, phone, email, property_type, preferred_location, budget, intent_level, conversion_probability, stage) VALUES
('Sarah Johnson', '+1-555-0101', 'sarah.j@email.com', '2BHK', 'Miami Beach, FL', 480000, 'high', '{"3m": 0.7, "6m": 0.85, "9m": 0.9}'::jsonb, 'Qualified'),
('Michael Chen', '+1-555-0102', 'mchen@email.com', '3BHK', 'Austin, TX', 350000, 'medium', '{"3m": 0.4, "6m": 0.6, "9m": 0.75}'::jsonb, 'New'),
('Emily Rodriguez', '+1-555-0103', 'emily.r@email.com', 'Penthouse', 'Seattle, WA', 750000, 'high', '{"3m": 0.8, "6m": 0.9, "9m": 0.95}'::jsonb, 'Site Visit'),
('David Park', '+1-555-0104', 'dpark@email.com', '1BHK', 'Austin, TX', 300000, 'low', '{"3m": 0.2, "6m": 0.35, "9m": 0.5}'::jsonb, 'New'),
('Jessica Williams', '+1-555-0105', 'jwilliams@email.com', '3BHK', 'Portland, OR', 550000, 'high', '{"3m": 0.75, "6m": 0.85, "9m": 0.9}'::jsonb, 'Negotiation');

-- Sample Conversations
INSERT INTO conversations (lead_id, transcript, sentiment_topics, started_at, ended_at) VALUES
((SELECT id FROM leads WHERE full_name = 'Sarah Johnson'),
'User: Hi, I am looking for a beachfront property in Miami.
Assistant: Great! I can help you with that. Let me search for available beachfront properties in Miami Beach.
User: What amenities do they have?
Assistant: Oceanview Residences offers a swimming pool, gym, 24/7 security, parking, ocean views, and smart home features.
User: That sounds perfect! What is the price range?
Assistant: The base price starts at $450,000, with unit types ranging from 1BHK to Penthouse.
User: I am interested in a 2BHK. Can we schedule a visit?',
'{"sentiment": "positive", "topics": ["beachfront", "amenities", "pricing", "site visit"]}'::jsonb,
NOW() - INTERVAL '2 days',
NOW() - INTERVAL '2 days' + INTERVAL '8 minutes'),

((SELECT id FROM leads WHERE full_name = 'Michael Chen'),
'User: Hello, do you have any properties in Austin?
Assistant: Yes! We have Downtown Plaza in Austin with studio, 1BHK, and 2BHK units.
User: What is the starting price?
Assistant: The base price starts at $320,000.
User: I will think about it and get back to you.',
'{"sentiment": "neutral", "topics": ["Austin properties", "pricing"]}'::jsonb,
NOW() - INTERVAL '1 day',
NOW() - INTERVAL '1 day' + INTERVAL '5 minutes');

-- Sample Activities
INSERT INTO activities (lead_id, type, message, created_at) VALUES
((SELECT id FROM leads WHERE full_name = 'Sarah Johnson'), 'note', 'Initial contact established. Customer very interested in beachfront properties.', NOW() - INTERVAL '2 days'),
((SELECT id FROM leads WHERE full_name = 'Sarah Johnson'), 'task', 'Schedule site visit for Oceanview Residences', NOW() - INTERVAL '1 day'),
((SELECT id FROM leads WHERE full_name = 'Emily Rodriguez'), 'status', 'Qualified lead - scheduled site visit for next week', NOW() - INTERVAL '3 hours'),
((SELECT id FROM leads WHERE full_name = 'Jessica Williams'), 'note', 'In negotiation phase. Requested customization options for 3BHK unit.', NOW() - INTERVAL '5 hours');

-- Sample Public Link
INSERT INTO public_links (slug, title, is_enabled, config, rate_limit_per_min) VALUES
('property-showcase', 'Estate Buddy Property Showcase', true,
'{
  "assistantPrompt": "You are Estate Buddy, a helpful real estate assistant. Help visitors find their dream property by answering questions about our listings. Be concise and friendly.",
  "model": "gpt-4o-mini",
  "avatarName": "Estate Buddy",
  "voice": "en-US-JennyNeural"
}'::jsonb, 10);

-- Verify inserted data
SELECT 'Properties' as table_name, COUNT(*) as count FROM properties
UNION ALL
SELECT 'Property FAQs', COUNT(*) FROM property_faqs
UNION ALL
SELECT 'Leads', COUNT(*) FROM leads
UNION ALL
SELECT 'Conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'Activities', COUNT(*) FROM activities
UNION ALL
SELECT 'Public Links', COUNT(*) FROM public_links;
