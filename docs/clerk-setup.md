# Clerk Setup — One-Time Steps

Run these once from your **host terminal** (not the Docker container).
The Clerk CLI needs OS keychain access + outbound network, neither of which
are available in the sandbox.

---

## 1. Install & log in

```bash
npm install -g clerk
clerk auth login          # opens browser, stores token in OS keychain
```

## 2. Link this repo to the Clerk app

```bash
cd /Users/charan/Documents/Promethean/front-end
clerk link                # picks up NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from .env.local
clerk doctor              # should show all green
```

## 3. Create the JWT template

This makes the `role` claim available in every JWT so the backend middleware
(`ClerkAuthMiddleware._extract_roles`) can read it without a DB lookup.

```bash
clerk api /v1/jwt_templates \
  --secret-key "$(grep CLERK_SECRET_KEY front-end/.env.local | cut -d= -f2)" \
  -d '{
    "name": "promethean-backend",
    "claims": {
      "role": "{{ user.public_metadata.role | default: \"student\" }}",
      "email": "{{ user.primary_email_address }}"
    },
    "lifetime": 60,
    "allowed_clock_skew": 5
  }'
```

Verify it was created:

```bash
clerk api /v1/jwt_templates \
  --secret-key "$(grep CLERK_SECRET_KEY front-end/.env.local | cut -d= -f2)"
```

### Why this matters

| Without template | With template |
|---|---|
| JWT has only `sub`, `exp`, `iss` | JWT also has `role` + `email` |
| `require_role("admin")` → 403 for everyone | `require_role("admin")` works correctly |
| Backend can't tell user's role | Role read from JWT (no extra DB query) |

The backend already handles the fallback: if no `role` claim is present,
`request.state.roles` is `[]` and any `require_role()` dep returns 403.

---

## 4. How role assignment works (automatic)

Once the template exists, roles flow through automatically:

1. User signs up / signs in with Clerk
2. Frontend calls `POST /api/v1/auth/sync` with `{ email, first_name, last_name, role }`
3. Backend upserts the local `users` row **and** calls
   `PATCH https://api.clerk.com/v1/users/{id}` to set `publicMetadata.role`
4. Clerk's JWT template embeds that role in every subsequent token
5. Backend middleware reads `role` from JWT → `request.state.roles`

Admins can change a user's role via `PUT /api/v1/admin/users/{id}/role` (Sprint 2)
or directly in the Clerk Dashboard → Users → select user → Public metadata.

---

## 5. Verify end-to-end

```bash
# Get a token for a test user (requires clerk auth login)
clerk api /v1/users --secret-key "$(grep CLERK_SECRET_KEY front-end/.env.local | cut -d= -f2)" \
  | python3 -c "import json,sys; users=json.load(sys.stdin)['data']; print(users[0]['public_metadata'])"
```

After at least one sign-in (which triggers auth/sync), every user's
`public_metadata` should have `{ "role": "student" }` (or mentor/admin).
