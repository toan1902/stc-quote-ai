# Contract: POST /api/login
Request `{ "password": "..." }` → 200 sets httpOnly cookie `stc_auth` (HMAC, 30 days) · 401 on mismatch.
POST /api/logout clears it. GET /api/health → `{ok, provider, model}` (no secrets).
