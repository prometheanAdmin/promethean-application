# Promethean Frontend

Next.js 15 (App Router), TypeScript, Clerk v7 auth.

> For full stack setup see the [root README](../README.md). This file covers frontend-only development.

---

## Setup

```bash
cd front-end
npm install
```

Create `front-end/.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Get the Clerk keys from the Clerk Dashboard → API Keys (or ask the team lead).

---

## Run

```bash
npm run dev
```

Frontend: http://localhost:3000. The backend must be running (see root README).

---

## Common commands

```bash
npm run dev          # dev server with hot reload
npm run build        # production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check (no output = clean)
```

---

## Key files

```
src/
├── app/
│   ├── layout.tsx           # Root layout — ClerkProvider wraps everything
│   ├── middleware.ts         # Protects /dashboard/* — redirects unauthenticated users
│   ├── sign-in/page.tsx     # Clerk SignIn component
│   ├── sign-up/page.tsx     # Clerk SignUp component
│   └── sso-callback/page.tsx  # OAuth redirect handler
├── components/
│   ├── AuthModal.tsx         # Sign-in / sign-up modal (Clerk v7 Signal API)
│   ├── Nav.tsx               # Top nav with auth state
│   └── dashboard/
│       ├── DashboardShell.tsx  # Auth-gated dashboard wrapper
│       └── useCurrentStudent.ts  # Hook — fetches /api/v1/me
├── lib/
│   ├── api.ts               # Typed fetch wrapper — auto-attaches Clerk JWT
│   └── auth.ts              # Role helpers — getAppRole(), isStaffRole()
└── clerk.d.ts               # Augments Clerk's Session type with publicMetadata
```

---

## Auth notes

- Roles come from `user.publicMetadata.role` (set server-side via `auth/sync`). Never use `unsafeMetadata` for role checks — it's user-writable.
- `src/lib/api.ts` automatically fetches the active Clerk session token and attaches it as `Authorization: Bearer ...` on every request.
- `/dashboard/*` routes are protected by `src/middleware.ts` using `clerkMiddleware()`. Unauthenticated users are redirected to `/sign-in`.
- After sign-in, the frontend calls `POST /api/v1/auth/sync` to create/update the user in the database and ensure their role is synced to Clerk.
