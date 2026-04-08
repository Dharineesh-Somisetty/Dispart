-- =============================================================
-- SEED DATA for Dispart — DO-only Activities Pivot
-- Run AFTER all schema migrations (including 00005_pivot_do_only.sql)
-- =============================================================

-- Test users
INSERT INTO public.users (id, display_name, avatar_url, bio) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Sarah J.', null, 'Outdoor enthusiast and sunrise chaser. Always down for a hike or kayak trip.'),
  ('a2222222-2222-2222-2222-222222222222', 'Mike T.', null, 'Music nerd and vinyl collector. If it has a beat, I am there.'),
  ('a3333333-3333-3333-3333-333333333333', 'Elena R.', null, 'Foodie, ceramicist, and weekend explorer. I know every hidden gem in Seattle.'),
  ('a4444444-4444-4444-4444-444444444444', 'Alex Chen', null, 'Pottery teacher and thoughtful host. Love bringing people together over shared experiences.'),
  ('a5555555-5555-5555-5555-555555555555', 'Marcus T.', null, 'Outdoors by day, synthwave by night. Always looking for good vibes and better company.'),
  ('a6666666-6666-6666-6666-666666666666', 'Priya K.', null, 'Indie music lover and basement venue regular. BYOB is my love language.')
ON CONFLICT (id) DO UPDATE SET bio = EXCLUDED.bio;

-- Communities
INSERT INTO public.communities (id, name, type, domain) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'UW Seattle', 'domain', 'uw.edu'),
  ('c2222222-2222-2222-2222-222222222222', 'Seattle Creatives', 'invite', null)
ON CONFLICT (id) DO NOTHING;

-- Community Memberships
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
-- Activities (all DO-mode, created by users, community-sourced)
-- =============================================================

INSERT INTO public.events (id, creator_user_id, title, description, mode, category, start_time, end_time, venue_name, area_label, lat, lng, proximity_public_text, image_url, tags, source, status) VALUES
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
    47.6097,
    -122.3425,
    'Near Pike Place',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80',
    '{"pottery", "beginner", "workshop", "creative"}',
    'community',
    'active'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'Open Mic & Jam Session',
    'Bring your instrument or just your voice! Open mic at The Basement — sign up at the door. All skill levels welcome. Supportive crowd guaranteed.',
    'DO',
    'Music',
    now() + interval '3 days',
    now() + interval '3 days 3 hours',
    'The Basement Venue',
    'Capitol Hill',
    47.6231,
    -122.3191,
    'Capitol Hill area',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
    '{"open-mic", "jam", "live-music", "beginner-friendly"}',
    'community',
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
    47.4957,
    -121.7864,
    'Near North Bend',
    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80',
    '{"hiking", "sunrise", "coffee", "outdoors"}',
    'community',
    'active'
  ),
  (
    'e4444444-4444-4444-4444-444444444444',
    'a6666666-6666-6666-6666-666666666666',
    'Pickup Basketball at Greenlake',
    'Casual 3v3 or 5v5 at the Greenlake courts. All levels welcome — bring water and good vibes. We split teams on arrival.',
    'DO',
    'Sports',
    now() + interval '5 days',
    now() + interval '5 days 2 hours',
    'Greenlake Courts',
    'Greenlake',
    47.6815,
    -122.3272,
    'Greenlake area',
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80',
    '{"basketball", "pickup", "sports", "casual"}',
    'community',
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
    47.6101,
    -122.2015,
    'Near Bellevue',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
    '{"food", "crawl", "hidden-gems", "dumplings"}',
    'community',
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
    47.6332,
    -122.3371,
    'Near SLU',
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
    '{"kayak", "full-moon", "lake", "outdoors", "guided"}',
    'community',
    'active'
  ),
  (
    'e7777777-7777-7777-7777-777777777777',
    'a4444444-4444-4444-4444-444444444444',
    'Volunteer Cook Night',
    'Join us for a volunteer evening preparing meals for local shelters. No cooking experience needed — just bring an apron and good energy!',
    'DO',
    'Community',
    now() + interval '4 days',
    now() + interval '4 days 3 hours',
    'Community Kitchen HQ',
    'Pioneer Square',
    47.6019,
    -122.3347,
    'Near Pioneer Square',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    '{"volunteer", "cooking", "community", "beginner-friendly"}',
    'community',
    'active'
  ),
  (
    'e8888888-8888-8888-8888-888888888888',
    'a3333333-3333-3333-3333-333333333333',
    'Watercolor in the Park',
    'Bring your sketchbook or borrow supplies — we''ll paint en plein air at Volunteer Park. Beginners and pros welcome. Tea and snacks provided!',
    'DO',
    'Art & Creative',
    now() + interval '5 days',
    now() + interval '5 days 3 hours',
    'Volunteer Park',
    'Capitol Hill',
    47.6308,
    -122.3143,
    'Capitol Hill area',
    'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80',
    '{"watercolor", "painting", "outdoors", "art", "beginner-friendly"}',
    'community',
    'active'
  ),
  (
    'e9999999-9999-9999-9999-999999999999',
    'a1111111-1111-1111-1111-111111111111',
    'Yoga on the Pier',
    'Morning flow yoga on the pier at golden hour. All levels welcome. Bring your own mat or borrow one from us.',
    'DO',
    'Fitness',
    now() + interval '7 days',
    now() + interval '7 days 1 hour',
    'Pier 62',
    'Downtown Seattle',
    47.6075,
    -122.3426,
    'Downtown waterfront',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    '{"yoga", "fitness", "morning", "outdoors", "all-levels"}',
    'community',
    'active'
  ),
  (
    'eaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'a5555555-5555-5555-5555-555555555555',
    'Trail Run & Recovery Smoothies',
    'A casual 5K trail run through Discovery Park followed by smoothies at the trailhead. We go at conversational pace — no one gets left behind!',
    'DO',
    'Fitness',
    now() + interval '8 days',
    now() + interval '8 days 2 hours',
    'Discovery Park',
    'Magnolia',
    47.6590,
    -122.4068,
    'Near Magnolia',
    'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80',
    '{"running", "trail", "smoothies", "fitness", "intermediate"}',
    'community',
    'active'
  )
ON CONFLICT (id) DO UPDATE SET
  mode = 'DO',
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  source = 'community',
  status = EXCLUDED.status;

-- =============================================================
-- Squads (Groups)
-- =============================================================

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
    'a2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    'Jam Fam',
    'Bringing a guitar and good energy. All instruments welcome — let''s make some noise!',
    6,
    'Front door by the mural',
    false,
    0,
    true
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
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
    'b4444444-4444-4444-4444-444444444444',
    'e4444444-4444-4444-4444-444444444444',
    'a6666666-6666-6666-6666-666666666666',
    'c1111111-1111-1111-1111-111111111111',
    'Ballers United',
    'Casual game, no hard fouls. Post-game burritos are mandatory.',
    4,
    'Court #3',
    true,
    3,
    true
  ),
  (
    'b5555555-5555-5555-5555-555555555555',
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
  (
    'b6666666-6666-6666-6666-666666666666',
    'e6666666-6666-6666-6666-666666666666',
    'a5555555-5555-5555-5555-555555555555',
    'c2222222-2222-2222-2222-222222222222',
    'Moonlight Paddlers',
    'First-timers welcome! We''ll pair you with experienced paddlers.',
    6,
    'Dock C',
    false,
    0,
    true
  ),
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
    'e8888888-8888-8888-8888-888888888888',
    'a3333333-3333-3333-3333-333333333333',
    'c2222222-2222-2222-2222-222222222222',
    'Brush & Sip',
    'Watercolors + herbal tea + good conversation. Let''s paint together!',
    5,
    'Near the conservatory',
    false,
    0,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  community_id = EXCLUDED.community_id,
  allow_social_after_full = EXCLUDED.allow_social_after_full,
  social_only_capacity = EXCLUDED.social_only_capacity,
  waitlist_enabled = EXCLUDED.waitlist_enabled;

-- =============================================================
-- Group Members
-- =============================================================

INSERT INTO public.group_members (group_id, user_id, role, checkin_status) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'host', 'none'),
  ('b1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'member', 'none'),
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'member', 'none'),
  ('b2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'host', 'none'),
  ('b2222222-2222-2222-2222-222222222222', 'a6666666-6666-6666-6666-666666666666', 'member', 'none'),
  ('b3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'host', 'none'),
  -- Ballers United: 4/4 capacity = FULL (allow_social_after_full=true)
  ('b4444444-4444-4444-4444-444444444444', 'a6666666-6666-6666-6666-666666666666', 'host', 'none'),
  ('b4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 'member', 'none'),
  ('b4444444-4444-4444-4444-444444444444', 'a5555555-5555-5555-5555-555555555555', 'member', 'none'),
  ('b4444444-4444-4444-4444-444444444444', 'a2222222-2222-2222-2222-222222222222', 'member', 'none'),
  ('b5555555-5555-5555-5555-555555555555', 'a3333333-3333-3333-3333-333333333333', 'host', 'none'),
  ('b5555555-5555-5555-5555-555555555555', 'a6666666-6666-6666-6666-666666666666', 'member', 'none'),
  ('b6666666-6666-6666-6666-666666666666', 'a5555555-5555-5555-5555-555555555555', 'host', 'none'),
  -- Volunteer Crew Alpha: 4/4 = FULL (allow_social_after_full=true)
  ('b7777777-7777-7777-7777-777777777777', 'a4444444-4444-4444-4444-444444444444', 'host', 'none'),
  ('b7777777-7777-7777-7777-777777777777', 'a1111111-1111-1111-1111-111111111111', 'member', 'none'),
  ('b7777777-7777-7777-7777-777777777777', 'a3333333-3333-3333-3333-333333333333', 'member', 'none'),
  ('b7777777-7777-7777-7777-777777777777', 'a5555555-5555-5555-5555-555555555555', 'member', 'none'),
  ('b8888888-8888-8888-8888-888888888888', 'a3333333-3333-3333-3333-333333333333', 'host', 'none'),
  ('b8888888-8888-8888-8888-888888888888', 'a4444444-4444-4444-4444-444444444444', 'member', 'none')
ON CONFLICT DO NOTHING;

-- =============================================================
-- Join Requests (pending for host dashboard)
-- =============================================================

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
    'b3333333-3333-3333-3333-333333333333',
    'a5555555-5555-5555-5555-555555555555',
    '{"why": "Love early mornings and mountain views. Happy to bring a french press for the crew.", "vibe_today": "chill", "note": "I can drive 3 people"}',
    'pending',
    'participant'
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'b5555555-5555-5555-5555-555555555555',
    'a2222222-2222-2222-2222-222222222222',
    '{"why": "I know every hidden gem in Bellevue! Happy to be the food guide.", "vibe_today": "talkative", "note": "Allergic to shellfish tho"}',
    'pending',
    'participant'
  ),
  -- Social join request (for full group with social mode)
  (
    'd4444444-4444-4444-4444-444444444444',
    'b4444444-4444-4444-4444-444444444444',
    'a3333333-3333-3333-3333-333333333333',
    '{"why": "Would love to hang out and cheer even if the teams are set!", "vibe_today": "chill", "note": ""}',
    'pending',
    'social'
  ),
  (
    'd5555555-5555-5555-5555-555555555555',
    'b7777777-7777-7777-7777-777777777777',
    'a6666666-6666-6666-6666-666666666666',
    '{"why": "Want to help out at the kitchen! Heard great things about this crew.", "vibe_today": "flexible", "note": ""}',
    'pending',
    'social'
  )
ON CONFLICT DO NOTHING;

-- =============================================================
-- Messages (sample chat for the pottery squad)
-- =============================================================

INSERT INTO public.messages (group_id, sender_user_id, body, created_at) VALUES
  ('b1111111-1111-1111-1111-111111111111', null, 'Alex Chen created this squad!', now() - interval '2 hours'),
  ('b1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'Hey everyone! Excited for the pottery class tonight! I''ll be in the lobby around 6:45 so we can all walk in together.', now() - interval '1 hour 30 minutes'),
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Sounds perfect! I''m bringing some snacks if anyone wants some before we get our hands dirty', now() - interval '1 hour'),
  ('b1111111-1111-1111-1111-111111111111', 'a5555555-5555-5555-5555-555555555555', 'Love that! See you both there. I might be 5 mins late depending on traffic but I''ll text here.', now() - interval '30 minutes'),
  ('b1111111-1111-1111-1111-111111111111', null, 'Marcus T. requested to join the squad. Alex approved.', now() - interval '15 minutes');

-- =============================================================
-- Event Interactions (views/saves for recommendations)
-- =============================================================

INSERT INTO public.event_interactions (user_id, event_id, type, created_at) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'view', now() - interval '3 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'save', now() - interval '3 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'view', now() - interval '2 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e3333333-3333-3333-3333-333333333333', 'save', now() - interval '2 hours'),
  ('a1111111-1111-1111-1111-111111111111', 'e7777777-7777-7777-7777-777777777777', 'view', now() - interval '1 hour'),
  ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 'view', now() - interval '4 hours'),
  ('a2222222-2222-2222-2222-222222222222', 'e2222222-2222-2222-2222-222222222222', 'save', now() - interval '4 hours'),
  ('a2222222-2222-2222-2222-222222222222', 'e4444444-4444-4444-4444-444444444444', 'view', now() - interval '3 hours'),
  ('a3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', 'view', now() - interval '3 hours'),
  ('a3333333-3333-3333-3333-333333333333', 'e5555555-5555-5555-5555-555555555555', 'save', now() - interval '3 hours'),
  ('a3333333-3333-3333-3333-333333333333', 'e8888888-8888-8888-8888-888888888888', 'view', now() - interval '1 hour'),
  ('a3333333-3333-3333-3333-333333333333', 'e1111111-1111-1111-1111-111111111111', 'join_request', now() - interval '20 minutes'),
  ('a1111111-1111-1111-1111-111111111111', 'e1111111-1111-1111-1111-111111111111', 'check_in', now() - interval '5 minutes');

-- =============================================================
-- User Preferences (DO-only)
-- =============================================================

INSERT INTO public.user_preferences (user_id, mode_preference, categories, tags, max_distance_miles, include_categories, exclude_categories, hobby_allowlist, hobby_blocklist, digest_frequency, email_opt_in, sms_opt_in) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'DO', '{"Outdoors", "Art & Creative"}', '{"hiking", "pottery", "coffee", "volunteer"}', 25, '{"Outdoors", "Art & Creative", "Fitness"}', '{"Nightlife"}', '{"hiking", "pottery", "yoga", "kayaking"}', '{"clubbing"}', 'weekly', true, false),
  ('a2222222-2222-2222-2222-222222222222', 'DO', '{"Music", "Sports"}', '{"live-music", "basketball", "jam"}', 10, '{"Music", "Sports"}', '{"Workshops"}', '{"guitar", "basketball", "running"}', '{"pottery"}', 'daily', true, false)
ON CONFLICT (user_id) DO UPDATE SET
  mode_preference = 'DO',
  categories = EXCLUDED.categories,
  tags = EXCLUDED.tags,
  max_distance_miles = EXCLUDED.max_distance_miles,
  include_categories = EXCLUDED.include_categories,
  exclude_categories = EXCLUDED.exclude_categories,
  hobby_allowlist = EXCLUDED.hobby_allowlist,
  hobby_blocklist = EXCLUDED.hobby_blocklist,
  digest_frequency = EXCLUDED.digest_frequency,
  email_opt_in = EXCLUDED.email_opt_in,
  sms_opt_in = EXCLUDED.sms_opt_in;

-- =============================================================
-- Notifications
-- =============================================================

INSERT INTO public.notifications (id, user_id, type, payload, read_at, created_at) VALUES
  (
    'b0111111-1111-1111-1111-111111111111',
    'a4444444-4444-4444-4444-444444444444',
    'request_received',
    '{"group_id": "b1111111-1111-1111-1111-111111111111", "group_title": "Clay & Chill Crew", "event_title": "Clay & Rose: Intro to Pottery", "requester_id": "a3333333-3333-3333-3333-333333333333", "requester_name": "Elena R.", "request_type": "participant"}'::jsonb,
    null,
    now() - interval '2 hours'
  ),
  (
    'b0222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'request_accepted',
    '{"group_id": "b3333333-3333-3333-3333-333333333333", "group_title": "Dawn Patrol", "event_title": "Sunrise Summit & Coffee"}'::jsonb,
    null,
    now() - interval '1 hour'
  ),
  (
    'b0333333-3333-3333-3333-333333333333',
    'a4444444-4444-4444-4444-444444444444',
    'group_message',
    '{"group_id": "b1111111-1111-1111-1111-111111111111", "group_title": "Clay & Chill Crew", "sender_name": "Sarah J.", "message_preview": "Sounds perfect! I am bringing some snacks if anyone wants some"}'::jsonb,
    now() - interval '30 minutes',
    now() - interval '1 hour'
  )
ON CONFLICT (id) DO NOTHING;
