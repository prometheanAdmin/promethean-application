# Frontend Integration Sheet

This document is the frontend team's source of truth for the current Promethean backend.

It answers four questions:

1. What backend APIs are live right now?
2. What request and response shapes do they use?
3. Which current frontend dashboard tabs are backed by real APIs versus mock/local-only data?
4. How should each frontend page be designed so it matches the backend that exists today?

---

## 1. Backend Snapshot

### Live backend modules

These routers are mounted and usable today:

- `identity`
- `students`
- `mentors`
- `curriculum`
- `enrollment`
- `admin`

### Scaffolded but not frontend-ready

These modules exist in the backend tree but are not mounted as product-ready APIs:

- `community`
- `notifications`
- `projects`
- `sessions`
- `standups`
- `booking`
- `analytics`

### Core backend capabilities already done

- Clerk JWT auth with role-aware request context
- `POST /api/v1/auth/sync` user bootstrap after sign-in
- PostgreSQL with row-level security
- Redis cache for public domains
- Student profile CRUD
- Mentor profile CRUD
- Public mentor discovery
- Public domain discovery
- Authenticated batch discovery
- Student self-enrollment
- Admin user management
- Admin mentor verification
- Admin domain CRUD
- Admin batch CRUD
- Admin enrollment inspection
- Sentry, Docker, Alembic, CI

---

## 2. Auth and App Boot Sequence

### Required frontend auth flow

After Clerk sign-in, the frontend should do this in order:

1. Clerk completes session and redirects to `/dashboard`
2. Frontend calls `POST /api/v1/auth/sync`
3. Frontend calls `GET /api/v1/me`
4. Frontend decides where to route next based on:
   - role
   - profile existence / completeness
   - enrollment state

### Auth rules

- Most API routes require `Authorization: Bearer <Clerk JWT>`
- Backend reads role from JWT `role` or `roles`
- Backend sets `request.state.user_id`, `request.state.roles`, `request.state.email`
- Public routes are explicitly allowlisted

### Special frontend error case

Some dashboard-facing endpoints can return:

```json
{
  "detail": {
    "code": "PROFILE_INCOMPLETE",
    "message": "Complete your profile before accessing the dashboard."
  }
}
```

When this happens, the frontend should redirect the user to the relevant profile-completion page instead of showing a generic auth error.

---

## 3. Endpoint-by-Endpoint API Sheet

## 3.1 Identity

### `POST /api/v1/auth/sync`

- Purpose: create or refresh the local backend user row right after Clerk sign-in
- Auth: `Public`
- Called by:
  - auth bootstrap after sign-in
  - auth bootstrap after sign-up
  - first page load after Clerk session creation

Request body:

```json
{
  "clerk_user_id": "user_...",
  "email": "user@example.com",
  "first_name": "Ava",
  "last_name": "Stone",
  "avatar_url": "https://...",
  "role": "student"
}
```

Response:

```json
{
  "user_id": "uuid",
  "roles": ["student"],
  "is_new_user": true
}
```

Frontend use:

- Call once after successful Clerk auth
- Store `is_new_user` only for onboarding decisions
- Do not treat this as the canonical user object

---

### `GET /api/v1/me`

- Purpose: return the canonical backend user record
- Auth: `JWT required`
- Called by:
  - dashboard layout bootstrap
  - auth/session provider
  - role-aware routing layer

Response:

```json
{
  "id": "uuid",
  "clerk_user_id": "user_...",
  "email": "user@example.com",
  "first_name": "Ava",
  "last_name": "Stone",
  "avatar_url": "https://...",
  "roles": ["student"],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

Frontend use:

- Main session user source
- Use this instead of the current mock `students.ts` identity layer

---

### `POST /api/v1/auth/github`

- Purpose: exchange GitHub OAuth code and persist verified GitHub username
- Auth: `JWT required`
- Called by:
  - profile completion flow
  - profile settings page when linking GitHub

Request body:

```json
{
  "code": "github_oauth_code"
}
```

Response:

```json
{
  "github_username": "octocat"
}
```

Frontend use:

- Use GitHub OAuth, not manual username entry, when possible
- After success, refetch the student or mentor profile

---

## 3.2 Student Profile

### `PUT /api/v1/me/student-profile`

- Purpose: create or update the logged-in student's profile
- Auth: `JWT required`
- Called by:
  - student onboarding form
  - student profile edit page

Request body:

```json
{
  "education": "B.Tech in Computer Science",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "career_goals": "Become a backend engineer focused on platform systems.",
  "domain_id": "uuid"
}
```

Response:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "education": "B.Tech in Computer Science",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "career_goals": "Become a backend engineer focused on platform systems.",
  "github_username": "octocat",
  "domain_id": "uuid",
  "profile_complete": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

Frontend use:

- This is the main student onboarding/profile API
- `profile_complete` should drive dashboard access and onboarding state

---

### `GET /api/v1/me/student-profile`

- Purpose: fetch current student's profile
- Auth: `JWT required`
- Called by:
  - student profile page
  - dashboard bootstrap when role is `student`

Response shape:

- same as `PUT /api/v1/me/student-profile`

---

### `POST /api/v1/me/github-connect`

- Purpose: directly store a GitHub username
- Auth: `JWT required`
- Called by:
  - fallback/manual GitHub connect flow only

Request body:

```json
{
  "github_username": "octocat"
}
```

Response shape:

- same as student profile response

Frontend note:

- Prefer `POST /api/v1/auth/github` for verified OAuth linking
- Keep this only as a fallback/admin-friendly path

---

## 3.3 Mentor Profile and Discovery

### `PUT /api/v1/me/mentor-profile`

- Purpose: create or update own mentor profile
- Auth: `JWT required + mentor role`
- Called by:
  - mentor onboarding page
  - mentor profile edit page

Request body:

```json
{
  "bio": "Staff backend engineer focused on APIs and scale.",
  "company": "Northwind Pay",
  "experience_yrs": 9,
  "domains": ["domain-uuid-1", "domain-uuid-2"],
  "github_username": "octocat"
}
```

Response:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "bio": "Staff backend engineer focused on APIs and scale.",
  "company": "Northwind Pay",
  "experience_yrs": 9,
  "github_username": "octocat",
  "domains": ["domain-uuid-1", "domain-uuid-2"],
  "is_verified": false,
  "rating_avg": null,
  "rev_share_pct": "65.00",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### `GET /api/v1/me/mentor-profile`

- Purpose: fetch current mentor profile
- Auth: `JWT required`
- Called by:
  - mentor profile page
  - mentor onboarding resume flow

Response shape:

- same as mentor profile response

---

### `GET /api/v1/mentors`

- Purpose: public mentor discovery
- Auth: `Public`
- Called by:
  - student mentor discovery page
  - marketing/preview mentor list if desired

Query params:

- `domain` optional string
- `page` default `1`
- `per_page` default `20`

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "bio": "string",
      "company": "string",
      "experience_yrs": 9,
      "github_username": "octocat",
      "domains": ["domain-uuid"],
      "is_verified": true,
      "rating_avg": "4.80",
      "rev_share_pct": "65.00",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ],
  "total": 12,
  "page": 1,
  "per_page": 20
}
```

Frontend note:

- This is verified mentors only
- Current frontend mentor cards use name/image/expertise mock fields that do not exist in this response
- Name and avatar come from the detail endpoint today, not the list response

---

### `GET /api/v1/mentors/{mentor_id}`

- Purpose: mentor detail page data
- Auth: `Public`
- Called by:
  - mentor detail page
  - mentor modal/drawer

Response:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "bio": "string",
  "company": "string",
  "experience_yrs": 9,
  "github_username": "octocat",
  "domains": ["domain-uuid"],
  "is_verified": true,
  "rating_avg": "4.80",
  "rev_share_pct": "65.00",
  "created_at": "datetime",
  "updated_at": "datetime",
  "first_name": "Ava",
  "last_name": "Stone",
  "avatar_url": "https://..."
}
```

Frontend note:

- This is the best current source for display name and avatar
- Reviews are not backed by backend yet
- Direct messaging is not backed by backend yet

---

## 3.4 Domains

### `GET /api/v1/domains`

- Purpose: active domain list
- Auth: `Public`
- Called by:
  - student profile form
  - mentor profile form
  - batch filters
  - admin UX if needed for reference

Response:

```json
[
  {
    "id": "uuid",
    "name": "Fintech",
    "description": "Payments, ledgers, risk systems",
    "status": "active",
    "created_at": "datetime"
  }
]
```

Frontend note:

- Use this for all domain dropdowns
- Stop hardcoding domain chips from frontend mock data

---

## 3.5 Batch Discovery and Enrollment

### `GET /api/v1/batches`

- Purpose: authenticated batch discovery
- Auth: `JWT required + profile complete`
- Called by:
  - student enrollment page
  - batch discovery page

Query params:

- `domain_id` optional UUID
- `status` optional, defaults to `upcoming`
- `page` default `1`
- `per_page` default `20`

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Fintech Batch 12",
      "project_track": "Payments API",
      "domain_id": "uuid",
      "mentor_id": "uuid",
      "start_date": "2026-07-14",
      "end_date": "2026-10-14",
      "max_students": 20,
      "enrollment_count": 12,
      "status": "upcoming",
      "description": "string",
      "github_repo_url": null
    }
  ],
  "total": 8,
  "page": 1,
  "per_page": 20
}
```

Frontend note:

- This endpoint is a strong candidate to replace several current mock dashboard summaries
- `mentor_id` is provided, but no batch-embedded mentor display object is returned yet

---

### `GET /api/v1/batches/{batch_id}`

- Purpose: public batch detail
- Auth: `Public`
- Called by:
  - batch detail page
  - enrollment confirmation flow

Response:

```json
{
  "id": "uuid",
  "name": "Fintech Batch 12",
  "project_track": "Payments API",
  "domain_id": "uuid",
  "mentor_id": "uuid",
  "start_date": "2026-07-14",
  "end_date": "2026-10-14",
  "max_students": 20,
  "description": "string",
  "github_template_repo": "org/template-repo",
  "github_repo_url": null,
  "status": "upcoming",
  "enrollment_count": 12,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### `POST /api/v1/batches/{batch_id}/enroll`

- Purpose: self-enroll current student into a batch
- Auth: `JWT required + student role`
- Called by:
  - enroll CTA on batch detail page

Request body:

```json
{}
```

Response:

```json
{
  "id": "uuid",
  "student_id": "uuid",
  "batch_id": "uuid",
  "status": "active",
  "payment_status": "free",
  "github_repo_url": "https://github.com/...",
  "enrolled_at": "datetime",
  "updated_at": "datetime"
}
```

Frontend note:

- GitHub fork may succeed or fail independently
- `github_repo_url` can be `null`
- This endpoint is idempotent

---

### `GET /api/v1/enrollments/me`

- Purpose: current active enrollment for the logged-in student
- Auth: `JWT required + student role + profile complete`
- Called by:
  - dashboard bootstrap
  - profile/batch summary card
  - “my batch” page

Response:

```json
{
  "id": "uuid",
  "student_id": "uuid",
  "batch_id": "uuid",
  "status": "active",
  "payment_status": "free",
  "github_repo_url": "https://github.com/...",
  "enrolled_at": "datetime",
  "updated_at": "datetime"
}
```

Frontend note:

- This is the key endpoint for replacing the current fake `batch`, `mentorName`, and `batchStartDate` assumptions in the dashboard
- The frontend will still need one more fetch to get full batch details

---

## 3.6 Admin APIs

These are only for admin-facing frontend.

### `GET /api/v1/admin/users`

- Auth: `JWT required + admin role`
- Use for:
  - admin users page
  - role filter/search page

Query params:

- `role`
- `search`
- `page`
- `per_page`

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "clerk_user_id": "user_...",
      "email": "user@example.com",
      "first_name": "Ava",
      "last_name": "Stone",
      "avatar_url": "https://...",
      "roles": ["student"],
      "created_at": "datetime"
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

---

### `PUT /api/v1/admin/mentors/{mentor_user_id}/verify`

- Auth: `JWT required + admin role`
- Use for:
  - admin mentor approval/rejection page

Request body:

```json
{
  "is_verified": true,
  "rejection_reason": null
}
```

Response:

- mentor profile object

---

### `POST /api/v1/admin/domains`

- Auth: `JWT required + admin role`
- Use for:
  - admin domain creation form

Request:

```json
{
  "name": "Cybersecurity",
  "description": "Security engineering and platform defense"
}
```

Response:

- domain object

---

### `PUT /api/v1/admin/domains/{domain_id}`

- Auth: `JWT required + admin role`
- Use for:
  - admin domain edit form

Request:

```json
{
  "name": "Fintech",
  "description": "Payments and ledger systems",
  "status": "active"
}
```

Response:

- domain object

---

### `GET /api/v1/admin/domains`

- Auth: `JWT required + admin role`
- Use for:
  - admin domain table

Response:

- array of domain objects including inactive domains

---

### `POST /api/v1/admin/batches`

- Auth: `JWT required + admin role`
- Use for:
  - admin batch creation form

Request:

```json
{
  "name": "Fintech Batch 12",
  "project_track": "Payments API",
  "domain_id": "uuid",
  "mentor_id": "uuid",
  "start_date": "2026-07-14",
  "end_date": "2026-10-14",
  "max_students": 20,
  "description": "string",
  "github_template_repo": "org/template-repo",
  "status": "upcoming"
}
```

Response:

- full batch object

---

### `PUT /api/v1/admin/batches/{batch_id}`

- Auth: `JWT required + admin role`
- Use for:
  - admin batch edit form

Request:

- partial batch payload

Response:

- full batch object

---

### `GET /api/v1/admin/batches/{batch_id}/enrollments`

- Auth: `JWT required + admin role`
- Use for:
  - admin enrollment roster page

Response:

```json
[
  {
    "id": "uuid",
    "student_id": "uuid",
    "batch_id": "uuid",
    "status": "active",
    "payment_status": "free",
    "github_repo_url": "https://github.com/...",
    "enrolled_at": "datetime",
    "updated_at": "datetime",
    "student_email": "user@example.com",
    "student_first_name": "Ava",
    "student_last_name": "Stone"
  }
]
```

---

### `POST /api/v1/admin/batches/{batch_id}/enroll`

- Auth: `JWT required + admin role`
- Use for:
  - admin manual enrollment action

Request:

```json
{
  "student_id": "uuid"
}
```

Response:

- enrollment object

---

## 4. Current Frontend Dashboard Audit: Mock vs Backend

This section answers: is each existing dashboard tab aligned with backend, partially aligned, or still different?

| Frontend page | Current source | Backend status | Verdict |
|---|---|---|---|
| `/dashboard` | mock student + localStorage progress/bookings | partial APIs available | different |
| `/dashboard/profile` | mock student profile | student/mentor profile APIs live | different |
| `/dashboard/mentors` | mock mentors + local bookings/messages/favorites | mentor directory APIs live, booking/messages not live | partially aligned |
| `/dashboard/community` | static mock chat rooms | no mounted backend | different |
| `/dashboard/zoom` | static mock zoom classes | no mounted backend | different |
| `/dashboard/updates` | local roadmap/progress | no mounted backend | different |
| `/dashboard/jira` | static mock tickets | no mounted backend | different |
| `/dashboard/todo` | external iframe | independent from backend | separate |
| `/dashboard/reminders` | static reminders + local bookings | no mounted notifications backend | different |

### What this means

- The current dashboard is mostly a product prototype, not an API-backed app yet
- The backend is ready for real profile/discovery/enrollment/admin flows
- The frontend should now pivot from “mock dashboard shell” to “real student workspace backed by identity + profiles + enrollment”

---

## 5. Page-by-Page Frontend Design and Wiring Plan

These are the recommended page specs for the frontend team.

## 5.1 `/sign-in`

### Keep

- current custom-styled Clerk sign-in UI
- custom branding and copy

### Backend interaction

- no backend call on form render
- after successful Clerk sign-in:
  - call `POST /api/v1/auth/sync`
  - then `GET /api/v1/me`

### UX states

- loading during Clerk submission
- loading during backend bootstrap
- failure toast if `auth/sync` fails

### Redirect behavior

- if `roles` includes `student` and profile missing/incomplete: go to profile completion
- if `roles` includes `mentor` and mentor profile missing: go to mentor profile setup
- otherwise go to `/dashboard`

---

## 5.2 `/sign-up`

### Keep

- current custom Clerk-styled sign-up flow

### Backend interaction

- same bootstrap flow as sign-in

### UX recommendation

- after sign-up verification, do not drop directly into a mock dashboard
- route based on role and profile state

---

## 5.3 `/dashboard`

### Current page

Today it shows:

- mock welcome message from `useCurrentStudent`
- mock profile summary
- quick access tiles
- right rail built from local course progress and local mentor bookings

### Backend reality

This page is different from backend today.

### Recommended redesign

Make `/dashboard` a real overview page driven by:

1. `GET /api/v1/me`
2. `GET /api/v1/me/student-profile` or `GET /api/v1/me/mentor-profile`
3. `GET /api/v1/enrollments/me` for students
4. `GET /api/v1/batches/{batch_id}` if enrolled

### Page layout recommendation

#### Hero section

- title: `Welcome back, {first_name}`
- subtitle:
  - student: current domain + batch name if enrolled
  - mentor: mentor verification status + domains
  - admin: admin operations summary

#### Primary cards

- `Profile status`
  - complete / incomplete
  - CTA: complete or edit profile
- `Current batch`
  - batch name
  - project track
  - dates
  - enrollment status
  - CTA: view batch
- `GitHub workspace`
  - repo linked or not
  - CTA if `github_repo_url` exists

#### Secondary tiles

- mentors
- batches
- profile
- domains

### Remove or defer from dashboard home

- fake roadmap progress
- fake booked mentor session card
- fake batch info from mock student object

---

## 5.4 `/dashboard/profile`

### Current page

- fully mock student card
- fields like `program`, `mentorName`, `location`, `bio`, `batchStartDate`

### Backend reality

Different.

Backend gives:

- identity via `GET /api/v1/me`
- student profile via `GET /api/v1/me/student-profile`
- mentor profile via `GET /api/v1/me/mentor-profile`
- enrollment separately

### Recommended design

This should become the real account and profile page.

#### For students

Sections:

- `Account`
  - name
  - email
  - avatar
- `Learning profile`
  - education
  - career goals
  - skills chips
  - selected domain
  - GitHub username
- `Enrollment`
  - current batch
  - project track
  - dates
  - repo URL if available

#### For mentors

Sections:

- `Account`
  - name
  - email
  - avatar
- `Mentor profile`
  - bio
  - company
  - experience
  - domains
  - GitHub username
  - verification status

### Page behavior

- use role-aware tabs or conditional sections
- include editable form mode
- show `profile_complete` or verification state prominently

---

## 5.5 `/dashboard/mentors`

### Current page

Today it includes:

- mentor search/filter cards
- local favorites
- local booking modal
- local direct messaging
- local upcoming sessions list
- local reviews

### Backend reality

Partially aligned only.

Backend supports:

- mentor list
- mentor detail
- mentor own profile

Backend does not support yet:

- booking availability
- booking creation/cancel
- mentor DMs
- mentor reviews
- favorites

### Recommended redesign now

Turn this page into `Mentor Directory`, not `Book a Mentor`.

#### Page sections

- search bar
- domain filter
- mentor cards
- detail drawer or detail page

#### Mentor card contents

Using available backend data:

- full name
- avatar
- company
- years experience
- domain chips
- bio excerpt
- verification badge
- rating if present

#### CTAs

- primary: `View mentor`
- secondary:
  - `Message` -> disabled / coming soon
  - `Book session` -> disabled / coming soon

### Future-ready note

Keep the visual language of the current page, but remove fake interaction paths until backend booking/messaging exists.

---

## 5.6 `/dashboard/community`

### Current page

- static in-memory chat rooms and messages

### Backend reality

- no mounted API

### Recommendation

Mark as `Coming Soon` or remove from primary nav for now.

If kept:

- show intentional empty state
- no fake chat content once real backend integration starts

Suggested design:

- hero
- explanation of upcoming community features
- optional waitlist / feedback CTA

---

## 5.7 `/dashboard/zoom`

### Current page

- static list of zoom classes

### Backend reality

- no classes/sessions API yet

### Recommendation

Do not keep fake session data once the app is meant to feel real.

Replace with:

- `Live sessions coming soon`
- or hide from nav until backend exists

If retained:

- show empty state
- later wire to future `sessions` backend module

---

## 5.8 `/dashboard/updates`

### Current page

- local, student-specific course roadmap and week completion tracker

### Backend reality

- no curriculum progress or standups API yet

### Recommendation

This page is different from backend and should not be represented as real persisted product data.

Short-term options:

- keep as clearly local prototype
- or replace with `Batch roadmap coming soon`

Best product-safe version now:

- show current batch
- show dates and status from backend
- show no fake week progress unless backend supports it

---

## 5.9 `/dashboard/jira`

### Current page

- static kanban board with drag/drop and fake tickets

### Backend reality

- no project/task/ticket API

### Recommendation

Treat this as non-integrated prototype only.

Do not present as real student work data.

If the page remains visible:

- label clearly as sample workspace
- or replace with `Project board coming soon`

---

## 5.10 `/dashboard/todo`

### Current page

- external iframe to `what-to-do-nu.vercel.app`

### Backend reality

- unrelated to current backend

### Recommendation

Keep as a separate external productivity tool if desired.

Frontend should present it as:

- an embedded tool
- not Promethean-owned student data

---

## 5.11 `/dashboard/reminders`

### Current page

- fake reminders plus local mentor bookings

### Backend reality

- notifications backend not mounted
- bookings backend not mounted

### Recommendation

Do not wire to backend yet.

Either:

- hide the page until notifications backend exists
- or show empty state / “coming soon”

---

## 6. Recommended Frontend Information Architecture

This is the best current nav for a real backend-backed product.

### Student nav now

- Dashboard
- Profile
- Mentors
- Batches
- My Enrollment

### Student nav later

- Community
- Live Sessions
- Updates
- Jira
- Notifications

### Mentor nav now

- Dashboard
- Profile
- Students or Batches

### Admin nav now

- Users
- Mentors
- Domains
- Batches

---

## 7. Recommended Frontend Data Model

Replace current mock-only session model with a real backend session model:

- `viewer`
  - from `GET /api/v1/me`
- `studentProfile`
  - from `GET /api/v1/me/student-profile`
- `mentorProfile`
  - from `GET /api/v1/me/mentor-profile`
- `currentEnrollment`
  - from `GET /api/v1/enrollments/me`
- `currentBatch`
  - from `GET /api/v1/batches/{batch_id}`

### Derived frontend fields

The frontend can derive these safely:

- display name
- initials
- profile status
- current role
- current domain label
- batch fullness

### Fields that should no longer come from mocks

- mentor name
- batch name
- batch start date
- student program label
- GitHub repo URL
- domains list

---

## 8. Implementation Priority for Frontend Team

### Phase 1: real auth and profile shell

1. wire sign-in/sign-up bootstrap
2. build frontend session provider from `auth/sync` + `/me`
3. replace mock `useCurrentStudent`
4. implement real profile completion/edit page

### Phase 2: real student discovery

5. wire domains API
6. wire mentor directory page
7. wire batch discovery page
8. wire self-enrollment flow
9. wire “my enrollment” summary on dashboard

### Phase 3: admin

10. users page
11. mentor verification page
12. domain management
13. batch management

### Phase 4: future modules

14. community
15. notifications
16. sessions
17. projects/jira

---

## 9. Final Guidance to Frontend Team

### What to trust as real today

- auth
- roles
- user record
- student profile
- mentor profile
- mentor discovery
- domains
- batches
- enrollments
- admin management

### What to treat as prototype-only today

- community chat
- zoom classes
- reminders
- weekly progress
- jira board
- mentor booking
- mentor reviews
- mentor direct messages
- local favorites

### Design principle

The next frontend iteration should feel like a real backend-backed workspace, not a demo dashboard with static data.

That means:

- remove or clearly label fake productivity/workflow features
- promote real identity/profile/enrollment flows
- use empty states where backend is not ready yet
- prefer “coming soon” over invented data

---

## 10. Suggested Immediate Frontend Rewrite Targets

If the team wants the fastest path to a credible product:

### Rewrite first

- `/dashboard`
- `/dashboard/profile`
- `/dashboard/mentors`

### De-emphasize or hide for now

- `/dashboard/community`
- `/dashboard/zoom`
- `/dashboard/updates`
- `/dashboard/jira`
- `/dashboard/reminders`

### Keep as-is with minor polish

- `/sign-in`
- `/sign-up`
- `/sso-callback`
- `/dashboard/todo` if external embedding is still desired

