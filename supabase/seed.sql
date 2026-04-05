-- =============================================================
-- SEED DATA for Dispart MVP — Stage 3
-- Run this AFTER all schema migrations and AFTER creating
-- test users via Supabase Auth (or use the IDs below as stubs).
-- =============================================================

-- For local dev, we insert into public.users directly:
INSERT INTO public.users (id, display_name, avatar_url, bio) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Sarah J.', null, 'Outdoor enthusiast and sunrise chaser. Always down for a hike or kayak trip.'),
  ('a2222222-2222-2222-2222-222222222222', 'Mike T.', null, 'Music nerd and vinyl collector. If it has a beat, I am there.'),
  ('a3333333-3333-3333-3333-333333333333', 'Elena R.', null, 'Foodie, ceramicist, and weekend explorer. I know every hidden gem in Seattle.'),
  ('a4444444-4444-4444-4444-444444444444', 'Alex Chen', null, 'Community organizer and pottery teacher. Love bringing people together over shared experiences.'),
  ('a5555555-5555-5555-5555-555555555555', 'Marcus T.', null, 'Outdoors by day, synthwave by night. Always looking for good vibes and better company.'),
  ('a6666666-6666-6666-6666-666666666666', 'Priya K.', null, 'Indie music lover and basement venue regular. BYOB is my love language.')
ON CONFLICT (id) DO UPDATE SET bio = EXCLUDED.bio;

-- Communities
INSERT INTO public.communities (id, name, type, domain) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'UW Seattle', 'domain', 'uw.edu'),
  ('c2222222-2222-2222-2222-222222222222', 'Seattle Creatives', 'invite', null)
ON CONFLICT (id) DO NOTHING;

-- Community Memberships — all test users in at least one community
INSERT INTO public.community_memberships (community_id, user_id, role) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'member'),
  ('c1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'member'),
  ('c1111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'member'),
  ('c1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'admin'),
  ('c1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'member'),
  ('c1111111-1111-1111-1111-111111111111', 'a6666666-6666-6666-6666-666666666666', 'member'),
  ('c2222222-2222-2222-2222-222222222222', 'a3333333-3333-3333-3333-333333333333', 'member'),
  ('c2222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'member'),
  ('c2222222-2222-2222-2222-222222222222', 'a5555555-5555-5555-5555-555555555555', 'member'),
  ('c2222222-2222-2222-2222-222222222222', 'a6666666-6666-6666-6666-666666666666', 'admin')
ON CONFLICT DO NOTHING;

-- =============================================================
-- STAGE 3: Organizers
-- =============================================================

INSERT INTO public.organizers (id, name, type, verified, website_url, logo_url, created_by_user_id) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Seattle Community Kitchen',
    'nonprofit',
    true,
    'https://seattlecommunitykitchen.org',
    null,
    'a4444444-4444-4444-4444-444444444444'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'The Crocodile',
    'venue',
    true,
    'https://thecrocodile.com',
    null,
    'a2222222-2222-2222-2222-222222222222'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- Events (with Stage 3 fields: organizer_id, source, external_url, price_display, status)
-- =============================================================

INSERT INTO public.events (id, creator_user_id, title, description, mode, category, start_time, end_time, venue_name, area_label, proximity_public_text, ticket_url, image_url, tags, is_ticketed, price_min, organizer_id, source, external_url, price_display, status) VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'a4444444-4444-4444-4444-444444444444',
    'Clay & Rose: Intro to Pottery',
    'Get your hands dirty with a beginner-friendly pottery workshop. All materials included. We''ll make mugs, bowls, and plates in a cozy studio downtown.',
    'DO',
    'Art & Creative',
    now() + interval '2 hours',
    now() + interval '5 hours',
    'The Mud Room, Downtown',
    'Downtown Seattle',
    'Near Pike Place',
    null,
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80',
    '{"pottery", "beginner", "workshop", "creative"}',
    false,
    null,
    null,
    'community',
    null,
    'Free',
    'active'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'Neon Nights: Synthwave Festival',
    'Immerse yourself in a retro-futuristic soundscape. Neon Nights brings together the best synthwave artists for an unforgettable night of pulsing bass, blinding lasers, and nostalgic vibes. Dress code: 80s Cyberpunk.',
    'WATCH',
    'Music',
    now() + interval '3 days',
    now() + interval '3 days 5 hours',
    'The Brooklyn Mirage',
    'Capitol Hill',
    'Capitol Hill area',
    'https://dice.fm/neon-nights',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&q=80',
    '{"synthwave", "festival", "retro", "neon", "live-music"}',
    true,
    45.00,
    null,
    'community',
    null,
    'From $45',
    'active'
  ),
  (
    'e3333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'Sunrise Summit & Coffee',
    'Early morning hike to catch the sunrise at Twin Peaks Trailhead, followed by pour-over coffee at the top. Bring layers!',
    'DO',
    'Outdoors',
    now() + interval '1 day 6 hours',
    now() + interval '1 day 10 hours',
    'Twin Peaks Trailhead',
    'North Bend',
    'Near North Bend',
    null,
    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80',
    '{"hiking", "sunrise", "coffee", "outdoors"}',
    false,
    null,
    null,
    'community',
    null,
    'Free',
    'active'
  ),
  (
    'e4444444-4444-4444-4444-444444444444',
    'a6666666-6666-6666-6666-666666666666',
    'Underground Indie Showcase',
    'Three local indie bands, one basement venue. This intimate show is all about discovering raw talent. BYOB.',
    'WATCH',
    'Music',
    now() + interval '5 days',
    now() + interval '5 days 3 hours',
    'The Basement Venue',
    'Fremont',
    'Fremont area',
    null,
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80',
    '{"indie", "live-music", "local", "intimate"}',
    false,
    null,
    null,
    'community',
    null,
    'Free / BYOB',
    'active'
  ),
  (
    'e5555555-5555-5555-5555-555555555555',
    'a3333333-3333-3333-3333-333333333333',
    'Hidden Gem Food Crawl',
    'Hit 5 underrated spots in Eastside Market District. We''ll try everything from dumplings to baklava. Come hungry!',
    'DO',
    'Food & Drink',
    now() + interval '2 days',
    now() + interval '2 days 4 hours',
    'Eastside Market District',
    'Bellevue',
    'Near Bellevue',
    null,
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    '{"food", "crawl", "hidden-gems", "dumplings"}',
    false,
    null,
    null,
    'community',
    null,
    null,
    'active'
  ),
  (
    'e6666666-6666-6666-6666-666666666666',
    'a5555555-5555-5555-5555-555555555555',
    'Full Moon Kayak',
    'Paddle under the full moon on Lake Union. Glow sticks provided. No experience necessary — guided by a certified instructor.',
    'DO',
    'Outdoors',
    now() + interval '6 days',
    now() + interval '6 days 3 hours',
    'Lake Union Dock',
    'South Lake Union',
    'Near SLU',
    null,
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
    '{"kayak", "full-moon", "lake", "outdoors", "guided"}',
    false,
    null,
    null,
    'community',
    null,
    'Free',
    'active'
  ),
  -- Stage 3: Organizer events
  (
    'e7777777-7777-7777-7777-777777777777',
    'a4444444-4444-4444-4444-444444444444',
    'Community Kitchen: Volunteer Cook Night',
    'Join Seattle Community Kitchen for a volunteer evening preparing meals for local shelters. No cooking experience needed — just bring an apron and good energy! We provide all ingredients and equipment.',
    'DO',
    'Community',
    now() + interval '4 days',
    now() + interval '4 days 3 hours',
    'Seattle Community Kitchen HQ',
    'Pioneer Square',
    'Near Pioneer Square',
    null,
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    '{"volunteer", "cooking", "community", "nonprofit", "beginner-friendly"}',
    false,
    null,
    '11111111-1111-1111-1111-111111111111',
    'organizer',
    'https://seattlecommunitykitchen.org/events/cook-night',
    'Free',
    'active'
  ),
  (
    'e8888888-8888-8888-8888-888888888888',
    'a4444444-4444-4444-4444-444444444444',
    'Community Kitchen: Sunday Brunch Fundraiser',
    'A delicious brunch experience where all proceeds go to funding weekday meal programs. Live acoustic music, farm-to-table dishes, and great company.',
    'WATCH',
    'Food & Drink',
    now() + interval '5 days',
    now() + interval '5 days 3 hours',
    'The Glass House, Capitol Hill',
    'Capitol Hill',
    'Capitol Hill area',
    null,
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    '{"brunch", "fundraiser", "nonprofit", "acoustic", "farm-to-table"}',
    true,
    25.00,
    '11111111-1111-1111-1111-111111111111',
    'organizer',
    'https://seattlecommunitykitchen.org/events/brunch-fundraiser',
    'From $25',
    'active'
  ),
  (
    'e9999999-9999-9999-9999-999999999999',
    'a2222222-2222-2222-2222-222222222222',
    'The Crocodile: Indie Rock Night',
    'Three rising indie rock bands take the stage at Seattle''s legendary Crocodile. Doors at 7pm, show at 8pm. 21+.',
    'WATCH',
    'Music',
    now() + interval '7 days',
    now() + interval '7 days 4 hours',
    'The Crocodile',
    'Belltown',
    'Belltown area',
    'https://thecrocodile.com/events/indie-rock-night',
    'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&q=80',
    '{"indie-rock", "live-music", "venue", "21+"}',
    true,
    20.00,
    '22222222-2222-2222-2222-222222222222',
    'organizer',
    'https://thecrocodile.com/events/indie-rock-night',
    '$20',
    'active'
  ),
  (
    'eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a2222222-2222-2222-2222-222222222222',
    'The Crocodile: DJ & Dance Party',
    'Saturday night dance party featuring DJ Neon Wave and DJ Sunset. Two rooms, two vibes. One unforgettable night.',
    'WATCH',
    'Nightlife',
    now() + interval '8 days',
    now() + interval '8 days 5 hours',
    'The Crocodile',
    'Belltown',
    'Belltown area',
    'https://thecrocodile.com/events/dance-party',
    'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&q=80',
    '{"dj", "dance", "nightlife", "venue", "21+"}',
    true,
    15.00,
    '22222222-2222-2222-2222-222222222222',
    'organizer',
    'https://thecrocodile.com/events/dance-party',
    '$15',
    'active'
  ),
  (
    'ebbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'a4444444-4444-4444-4444-444444444444',
    'Community Kitchen: Nutrition Workshop',
    'Learn to cook healthy meals on a budget! Our chef-instructors will teach you 5 easy recipes you can make at home this week. Ingredients provided.',
    'DO',
    'Community',
    now() + interval '10 days',
    now() + interval '10 days 2 hours',
    'Seattle Community Kitchen HQ',
    'Pioneer Square',
    'Near Pioneer Square',
    null,
    'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600&q=80',
    '{"workshop", "cooking", "nutrition", "beginner-friendly", "free"}',
    false,
    null,
    '11111111-1111-1111-1111-111111111111',
    'organizer',
    'https://seattlecommunitykitchen.org/events/nutrition-workshop',
    'Free',
    'active'
  ),
  (
    'eccccccc-cccc-cccc-cccc-cccccccccccc',
    'a2222222-2222-2222-2222-222222222222',
    'The Crocodile: Open Mic Night',
    'Got a song, a poem, or a stand-up set? Sign up at the door. All acts welcome. Supportive crowd guaranteed.',
    'DO',
    'Music',
    now() + interval '9 days',
    now() + interval '9 days 3 hours',
    'The Crocodile',
    'Belltown',
    'Belltown area',
    null,
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    '{"open-mic", "live-music", "comedy", "poetry", "free"}',
    false,
    null,
    '22222222-2222-2222-2222-222222222222',
    'organizer',
    'https://thecrocodile.com/events/open-mic',
    'Free',
    'active'
  )
ON CONFLICT (id) DO UPDATE SET
  tags = EXCLUDED.tags,
  is_ticketed = EXCLUDED.is_ticketed,
  price_min = EXCLUDED.price_min,
  organizer_id = EXCLUDED.organizer_id,
  source = EXCLUDED.source,
  external_url = EXCLUDED.external_url,
  price_display = EXCLUDED.price_display,
  status = EXCLUDED.status;

-- Groups — all with community_id set (required by Stage 2 NOT NULL)
-- Stage 3: some groups have allow_social_after_full, some are full for demo
INSERT INTO public.groups (id, event_id, host_user_id, community_id, title, description, capacity, meetup_area_label, allow_social_after_full, social_only_capacity, waitlist_enabled) VALUES
  (
    'b1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'a4444444-4444-4444-4444-444444444444',
    'c1111111-1111-1111-1111-111111111111',
    'Clay & Chill Crew',
    'Looking for chill people to try pottery! We''ll grab boba after.',
    6,
    'Studio 4 Lobby',
    false,
    0,
    true
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    'e2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'Neon Drifters',
    'Looking for chill people who want to dance all night. We usually grab drinks nearby beforehand. Good vibes only!',
    6,
    'Main Entrance',
    false,
    0,
    true
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
    'e2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    'Cyber Punks 2077',
    'First timers to the Mirage! Want a solid crew to navigate the crowd and maybe get late night pizza after.',
    5,
    'Side Gate B',
    false,
    0,
    true
  ),
  (
    'b4444444-4444-4444-4444-444444444444',
    'e2222222-2222-2222-2222-222222222222',
    'a3333333-3333-3333-3333-333333333333',
    'c2222222-2222-2222-2222-222222222222',
    'Synth & Sip',
    'More into the music than the mosh pit. Looking for a relaxed squad to hang near the back and enjoy the visuals.',
    4,
    'VIP Lounge',
    true,
    3,
    true
  ),
  (
    'b5555555-5555-5555-5555-555555555555',
    'e3333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'Dawn Patrol',
    'Early risers only! We leave at 5am sharp.',
    4,
    'Trailhead Parking Lot',
    false,
    0,
    true
  ),
  (
    'b6666666-6666-6666-6666-666666666666',
    'e5555555-5555-5555-5555-555555555555',
    'a3333333-3333-3333-3333-333333333333',
    'c1111111-1111-1111-1111-111111111111',
    'Foodie Explorers',
    'No picky eaters! We''re trying everything.',
    8,
    'Market Entrance',
    false,
    0,
    true
  ),
  -- Stage 3: Groups for organizer events
  (
    'b7777777-7777-7777-7777-777777777777',
    'e7777777-7777-7777-7777-777777777777',
    'a4444444-4444-4444-4444-444444444444',
    'c1111111-1111-1111-1111-111111111111',
    'Volunteer Crew Alpha',
    'Let''s cook some meals and have fun doing it! New volunteers welcome.',
    4,
    'Kitchen Entrance',
    true,
    5,
    true
  ),
  (
    'b8888888-8888-8888-8888-888888888888',
    'e9999999-9999-9999-9999-999999999999',
    'a2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    'Front Row Gang',
    'We are getting there early for front row. No exceptions.',
    3,
    'Box Office',
    false,
    0,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  community_id = EXCLUDED.community_id,
  allow_social_after_full = EXCLUDED.allow_social_after_full,
  social_only_capacity = EXCLUDED.social_only_capacity,
  waitlist_enabled = EXCLUDED.waitlist_enabled;

-- Group Members (hosts auto-join)
-- Stage 3: Make b4444444 (Synth & Sip) and b7777777 (Volunteer Crew) full for demo
INSERT INTO public.group_members (group_id, user_id, role, checkin_status) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'host', 'none'),
  ('b1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'member', 'none'),
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'member', 'none'),
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'host', 'none'),
  ('b2222222-2222-2222-2222-222222222222', 'a5555555-5555-5555-5555-555555555555', 'member', 'none'),
  ('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'host', 'none'),
  ('b3333333-3333-3333-3333-333333333333', 'a6666666-6666-6666-6666-666666666666', 'member', 'none'),
  -- Synth & Sip: 4/4 capacity = FULL (allow_social_after_full=true)
  ('b4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333', 'host', 'none'),
  ('b4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 'member', 'none'),
  ('b4444444-4444-4444-4444-444444444444', 'a5555555-5555-5555-5555-555555555555', 'member', 'none'),
  ('b4444444-4444-4444-4444-444444444444', 'a6666666-6666-6666-6666-666666666666', 'member', 'none'),
  ('b5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 'host', 'none'),
  ('b6666666-6666-6666-6666-666666666666', 'a3333333-3333-3333-3333-333333333333', 'host', 'none'),
  ('b6666666-6666-6666-6666-666666666666', 'a6666666-6666-6666-6666-666666666666', 'member', 'none'),
  -- Volunteer Crew Alpha: 4/4 = FULL (allow_social_after_full=true)
  ('b7777777-7777-7777-7777-777777777777', 'a4444444-4444-4444-4444-444444444444', 'host', 'none'),
  ('b7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111', 'member', 'none'),
  ('b7777777-7777-7777-7777-777777777777', 'a3333333-3333-3333-3333-333333333333', 'member', 'none'),
  ('b7777777-7777-7777-7777-777777777777', 'a5555555-5555-5555-5555-555555555555', 'member', 'none'),
  -- Front Row Gang
  ('b8888888-8888-8888-8888-888888888888', 'a2222222-2222-2222-2222-222222222222', 'host', 'none'),
  ('b8888888-8888-8888-8888-888888888888', 'a6666666-6666-6666-6666-666666666666', 'member', 'none')
ON CONFLICT DO NOTHING;

-- Join Requests (some pending for host dashboard)
INSERT INTO public.join_requests (id, group_id, user_id, answers_json, status, request_type) VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    'a3333333-3333-3333-3333-333333333333',
    '{"why": "I''ve been doing ceramics for a year and would love to meet other creatives! Bringing good vibes and snacks.", "vibe_today": "talkative", "note": ""}',
    'pending',
    'participant'
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'a5555555-5555-5555-5555-555555555555',
    '{"why": "Huge fan of the headliners. Looking for a squad to get there early and grab front row spots.", "vibe_today": "chill", "note": "I can drive 3 people"}',
    'pending',
    'participant'
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'b6666666-6666-6666-6666-666666666666',
    'a2222222-2222-2222-2222-222222222222',
    '{"why": "I know every hidden gem in Bellevue! Happy to be the food guide.", "vibe_today": "talkative", "note": "Allergic to shellfish tho"}',
    'pending',
    'participant'
  ),
  -- Stage 3: Social join request (for full group with social mode)
  (
    'd4444444-4444-4444-4444-444444444444',
    'b4444444-4444-4444-4444-444444444444',
    'a2222222-2222-2222-2222-222222222222',
    '{"why": "Would love to hang out and enjoy the vibes even if the group is full!", "vibe_today": "chill", "note": ""}',
    'pending',
    'social'
  ),
  (
    'd5555555-5555-5555-5555-555555555555',
    'b7777777-7777-7777-7777-777777777777',
    'a6666666-6666-6666-6666-666666666666',
    '{"why": "Want to help out at the kitchen! Heard great things about this org.", "vibe_today": "flexible", "note": ""}',
    'pending',
    'social'
  )
ON CONFLICT DO NOTHING;

-- Messages (sample chat for the pottery group)
INSERT INTO public.messages (group_id, sender_user_id, body, created_at) VALUES
  ('b1111111-1111-1111-1111-111111111111', null, 'Alex Chen created this squad!', now() - interval '2 hours'),
  ('b1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'Hey everyone! Excited for the pottery class tonight! I''ll be in the lobby around 6:45 so we can all walk in together.', now() - interval '1 hour 30 minutes'),
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Sounds perfect! I''m bringing some snacks if anyone wants some before we get our hands dirty', now() - interval '1 hour'),
  ('b1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'Love that! See you both there. I might be 5 mins late depending on traffic but I''ll text here.', now() - interval '30 minutes'),
  ('b1111111-1111-1111-1111-111111111111', null, 'Marcus T. requested to join the squad. Alex approved.', now() - interval '15 minutes');

-- =============================================================
-- STAGE 3: Event Interactions (views/saves for recommendations demo)
-- =============================================================

INSERT INTO public.event_interactions (user_id, event_id, type, created_at) VALUES
  -- Sarah views and saves pottery + hike events
  ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'view', now() - interval '3 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'save', now() - interval '3 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'view', now() - interval '2 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'save', now() - interval '2 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e7777777-7777-7777-7777-777777777777', 'view', now() - interval '1 hour'),
  -- Mike views music events and saves synthwave
  ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 'view', now() - interval '4 hours'),
  ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 'save', now() - interval '4 hours'),
  ('a2222222-2222-2222-2222-222222222222', 'e4444444-4444-4444-4444-444444444444', 'view', now() - interval '3 hours'),
  ('a2222222-2222-2222-2222-222222222222', 'e9999999-9999-9999-9999-999999999999', 'view', now() - interval '2 hours'),
  ('a2222222-2222-2222-2222-222222222222', 'e9999999-9999-9999-9999-999999999999', 'save', now() - interval '2 hours'),
  -- Elena dismisses synthwave but views food events
  ('a3333333-3333-3333-3333-333333333333', 'e2222222-2222-2222-2222-222222222222', 'dismiss', now() - interval '5 hours'),
  ('a3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', 'view', now() - interval '3 hours'),
  ('a3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', 'save', now() - interval '3 hours'),
  ('a3333333-3333-3333-3333-333333333333', 'e8888888-8888-8888-8888-888888888888', 'view', now() - interval '1 hour');

-- =============================================================
-- STAGE 3: User Preferences
-- =============================================================

INSERT INTO public.user_preferences (user_id, mode_preference, categories, tags, max_distance_miles) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'DO', '{"Outdoors", "Art & Creative"}', '{"hiking", "pottery", "coffee", "volunteer"}', 25),
  ('a2222222-2222-2222-2222-222222222222', 'WATCH', '{"Music", "Nightlife"}', '{"live-music", "indie", "synthwave", "vinyl"}', 10)
ON CONFLICT (user_id) DO UPDATE SET
  mode_preference = EXCLUDED.mode_preference,
  categories = EXCLUDED.categories,
  tags = EXCLUDED.tags,
  max_distance_miles = EXCLUDED.max_distance_miles;
