# Dispart_Social
An app/website for connecting with strangers on campus to plan something together
PRD: Breakr (UW-only MVP) — Restricted “Join My Plan” Events App

0) One-liner

Breakr is a UW-gated app where students post real plans (hikes, trips, outings) with open slots and rules; eligible users request to join, hosts approve, and the group connects safely.

1) Goals
	•	Make it easy for UW students to fill open spots in an existing plan (car seats, group size, tickets, dinner reservations).
	•	Make it less awkward to meet new people by using structured requests instead of cold messaging.
	•	Keep safety strong via UW verification, approval gates, and reporting + plan sharing.

2) MVP Scope (must-have)

A) Authentication & Verification
	•	UW-only sign-in with email verification.
	•	Require email domain allowlist: @uw.edu (optionally include @washington.edu if needed).
	•	Require phone verification (MVP can simulate; production: SMS provider).
	•	Profile basics:
	•	name, UW email, photo (optional), bio (optional)
	•	“vibe tags” (select up to 5): e.g., chill, talkative, outdoorsy, foodie, early-bird, night-owl
	•	safety preference: share plan link enabled (default on)

B) Event Posting (Host)

Host can create an event with:
	•	title (required)
	•	description (required)
	•	category (required): Hike, Road Trip, Food, Sports, Study, Concert, Other
	•	date/time start + optional end time (required start)
	•	meeting location (required) + optional destination
	•	total capacity (required), open slots (computed or entered)
	•	cost split info (optional text; no payments MVP)
	•	eligibility rules (MVP):
	•	community gate: UW-only (always true in MVP)
	•	age range (optional; store but do not hard-enforce if legal concerns—just “preferred”)
	•	vibe tags preferred (optional)
	•	host approval required: always true
	•	visibility: UW feed only

C) Discovery (Joiner)
	•	Event feed for verified UW users:
	•	filter by category, date (today/this week), location radius (simple: same city / neighborhood text match OK for MVP)
	•	sort by soonest start time
	•	Event detail page shows:
	•	host name + UW verified badge
	•	event details + open slots
	•	“Request to Join” button (only if not host, not already requested/accepted)

D) Request to Join (Structured Icebreaker)

Request form fields:
	•	“Why do you want to join?” (required, max 200 chars)
	•	“Your vibe today” (required single choice): chill / talkative / flexible
	•	optional: “Anything to know?” (max 200 chars)

Request lifecycle states:
	•	PENDING → ACCEPTED or DECLINED (host action)
	•	joiner can CANCEL_REQUEST while pending

E) Host Review Queue

Host sees list of requests per event:
	•	requester profile preview + answers to prompts
	•	Accept / Decline
	•	If accepted: requester becomes participant; unlock group chat

F) Chat (Unlocked only after acceptance)
	•	One group chat per event.
	•	Only host + accepted participants can view/send.
	•	Basic messaging: text only MVP.
	•	System messages: “X joined”, “Event updated”, “Event cancelled”.

G) Safety & Accountability (No public ratings)
	•	Report/Block:
	•	user can report a user or an event (reason + optional message)
	•	user can block another user (hide their events + prevent chat)
	•	“Share Plan”:
	•	generate shareable link (tokenized) showing event details + participant first names + start time + meeting location (no phone/email)
	•	“Check-in” buttons for participants: On the way, Arrived, Leaving
	•	Post-event confirmation (private, not public ratings):
	•	after event end + 2 hours: prompt each participant:
	•	“Did you attend?” Yes/No
	•	“Any safety issues?” Yes/No → if Yes, open report form
	•	store internally for abuse detection (not shown publicly)

3) Non-goals (explicitly NOT in MVP)
	•	No payments / deposits (later)
	•	No algorithmic matching beyond filtering + sorting
	•	No public star ratings or reviews
	•	No cross-university expansion in MVP
	•	No friend graph / follow system

4) Success Metrics (MVP)
	•	Activation: % of verified users who view an event and send ≥1 request within 7 days
	•	Supply: # events created per week
	•	Match rate: requests accepted / requests sent
	•	Attendance: % events with ≥1 check-in
	•	Safety: report rate (should be low) + time-to-moderate (manual MVP)

5) Personas
	•	Host (“Planner”): already has 2–3 friends, needs 1–2 more people to fill seats/spots
	•	Joiner (“Explorer”): wants to go out but prefers structured social, not cold outreach

6) User Stories (Acceptance Criteria)

Auth
	•	As a user, I can sign up only with UW email and verify it.
	•	As a user, I cannot browse events until verified.

Create Event
	•	As a host, I can create an event with required fields and publish it.
	•	As a host, I can edit event details (time/location/description) and the chat gets a system update message.
	•	As a host, I can cancel an event; participants are notified; chat becomes read-only.

Browse & Request
	•	As a joiner, I can browse events and request to join with prompts.
	•	As a joiner, I can cancel my pending request.
	•	As a joiner, if declined, I cannot message the group.

Approve & Chat
	•	As a host, I can accept/decline requests.
	•	As an accepted participant, I can access the event group chat.
	•	As a blocked user, I cannot see or interact with the blocker.

Safety
	•	As a user, I can report a user/event.
	•	As a user, I can share plan link and see check-in statuses.

7) Permissions & Rules
	•	Only verified users can create/request/join.
	•	Only host can edit/cancel event and manage requests.
	•	Chat visible only to host + accepted participants.
	•	Requests visible only to host.
	•	Share plan link is view-only and shows limited info.

8) Data Model (MVP)

Use Postgres (recommended) or Firebase. Define these tables/collections:

users
	•	id (uuid)
	•	uw_email (unique)
	•	phone (unique optional)
	•	name
	•	photo_url (nullable)
	•	bio (nullable)
	•	vibe_tags (string[])
	•	verified_email (bool)
	•	verified_phone (bool)
	•	created_at

events
	•	id (uuid)
	•	host_id (fk users)
	•	title
	•	description
	•	category (enum)
	•	start_time (datetime)
	•	end_time (datetime nullable)
	•	meeting_location_text
	•	destination_text (nullable)
	•	capacity (int)
	•	status (enum: ACTIVE, CANCELLED, COMPLETED)
	•	preferred_vibe_tags (string[] nullable)
	•	preferred_age_min (int nullable)
	•	preferred_age_max (int nullable)
	•	created_at
	•	updated_at

event_participants
	•	id (uuid)
	•	event_id
	•	user_id
	•	role (enum: HOST, PARTICIPANT)
	•	checkin_status (enum: NONE, ON_THE_WAY, ARRIVED, LEAVING)
	•	joined_at

join_requests
	•	id (uuid)
	•	event_id
	•	user_id
	•	answers_json (why, vibe_today, note)
	•	status (PENDING, ACCEPTED, DECLINED, CANCELLED)
	•	created_at
	•	updated_at

messages
	•	id (uuid)
	•	event_id
	•	sender_id (nullable for system messages)
	•	message_type (enum: USER, SYSTEM)
	•	body
	•	created_at

reports
	•	id (uuid)
	•	reporter_id
	•	reported_user_id (nullable)
	•	event_id (nullable)
	•	reason (enum)
	•	details (text nullable)
	•	created_at
	•	status (enum: OPEN, REVIEWED, ACTIONED)

blocks
	•	id (uuid)
	•	blocker_id
	•	blocked_id
	•	created_at

share_links
	•	id (uuid)
	•	event_id
	•	token (unique)
	•	created_at
	•	revoked_at (nullable)

post_event_confirmations
	•	id (uuid)
	•	event_id
	•	user_id
	•	attended (bool)
	•	safety_issue (bool)
	•	created_at

9) API Endpoints (REST MVP)

Auth:
	•	POST /auth/signup
	•	POST /auth/verify-email
	•	POST /auth/login
	•	POST /auth/verify-phone (stub ok in dev)

Users:
	•	GET /me
	•	PATCH /me (bio, vibe_tags, photo_url)

Events:
	•	POST /events
	•	GET /events (filters)
	•	GET /events/:id
	•	PATCH /events/:id
	•	POST /events/:id/cancel
	•	POST /events/:id/complete

Join Requests:
	•	POST /events/:id/requests
	•	GET /events/:id/requests (host only)
	•	POST /requests/:id/accept (host only)
	•	POST /requests/:id/decline (host only)
	•	POST /requests/:id/cancel (requester only)

Participants / Check-in:
	•	GET /events/:id/participants (members only)
	•	POST /events/:id/checkin (members only) body: status

Chat:
	•	GET /events/:id/messages (members only)
	•	POST /events/:id/messages (members only)

Safety:
	•	POST /reports
	•	POST /blocks
	•	GET /share/:token (public limited view)
	•	POST /events/:id/share-link (members only) creates token
	•	POST /events/:id/share-link/revoke (host only)

Post-event:
	•	POST /events/:id/confirmations (members only)

10) Tech Stack (Copilot-friendly suggestion)

Option A (fast + scalable): Next.js fullstack
	•	Frontend: Next.js (App Router) + TypeScript + Tailwind
	•	Backend: Next.js API routes OR separate FastAPI
	•	DB: Postgres + Prisma
	•	Auth: NextAuth (email link) or custom JWT
	•	Realtime chat: Pusher/Ably/WebSockets later; MVP can poll or use Supabase realtime

Option B (very fast MVP): Firebase
	•	Frontend: React + Vite + TS + Tailwind
	•	Backend: Firebase Auth + Firestore
	•	Chat: Firestore realtime
	•	Share links: Cloud Functions optional

Choose one and scaffold it consistently.

11) UX Screens (MVP)
	1.	Landing (UW-only message)
	2.	Sign up / verify email
	3.	Profile setup (vibe tags, bio)
	4.	Feed (filters)
	5.	Event detail
	6.	Request-to-join modal (icebreaker prompts)
	7.	Host dashboard (my events + requests)
	8.	Event chat
	9.	Safety screen (share plan + check-in + report)
	10.	Create/Edit event form

12) Edge Cases & Rules
	•	Prevent duplicate requests per event per user.
	•	If host blocks a user, auto-decline pending requests and remove from participants (if already joined).
	•	If event is cancelled, new requests disabled and chat read-only.
	•	If user is not verified, they can only see a “Verify to continue” gate.
	•	Share link should not reveal last names, email, phone, or exact live location.

13) Milestones

M1 (Day 1–2): Auth + profile + DB schema
M2 (Day 3–4): Events CRUD + feed + filters
M3 (Day 5–6): Join requests + host approvals
M4 (Day 7): Chat (basic) + system messages
M5 (Day 8): Safety (report/block/share link/check-in)
M6 (Day 9): Post-event confirmations + admin view (basic)

14) Build Instructions for Copilot (what to generate)
	•	Create a monorepo or single app with:
	•	/app (UI pages/components)
	•	/server (if separate API)
	•	/prisma (schema) if using Postgres
	•	Implement auth gating middleware.
	•	Implement all endpoints listed above with RBAC checks.
	•	Implement the screens with minimal clean UI.
	•	Seed dev data: 10 users, 10 events, 30 requests.
	•	Provide README with npm run dev, env vars, and DB setup.
