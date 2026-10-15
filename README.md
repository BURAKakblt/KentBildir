# KentBildir

## Local setup

1. Create a Supabase project and run `supabase/migrations/202610140001_create_reports.sql` in the SQL editor. It creates an RLS-protected `reports` table and private `report-images` bucket (8 MB; JPEG/PNG/WebP).
2. Copy `backend/.env.example` to `backend/.env`. Put the Supabase service-role key and, to enable image analysis, `GEMINI_API_KEY` only here; never use either secret in Expo variables or commit them. `GEMINI_VISION_MODEL` selects the server-side vision model and defaults to `gemini-3.5-flash-lite`.
3. In `backend`, run `npm install` and `npm run dev`.
4. Copy `mobile/.env.example` to `mobile/.env` and set only `EXPO_PUBLIC_API_URL`.

On a physical iOS/Android device, `localhost` means the phone itself. Use the development computer's current LAN address or a secure tunnel; do not hardcode a Mac IP. Emulator networking differs (`10.0.2.2` is commonly used by Android Emulator). Ensure `CORS_ORIGINS` contains browser origins when Expo Web is used; native requests do not normally send an Origin header.

### API and security

- `GET /health` is public.
- `POST /api/reports` accepts multipart fields `photo` and JSON `metadata`.
- `POST /api/ai/analyze-image` accepts one private multipart `photo` field (JPEG, PNG or WebP; maximum 8 MB). It returns only `categoryId` and `confidence`. When `GEMINI_API_KEY` is absent, this endpoint returns 503 while the rest of the backend starts normally.
- `GET /api/reports/:id` and `GET /api/reports` return 403 unless `DEV_READ_ACCESS_TOKEN` is configured and sent as a Bearer token.

`DEV_READ_ACCESS_TOKEN` is development/test-only, must be at least 32 characters, and makes the backend refuse startup when set with `NODE_ENV=production`. Send it only as `Authorization: Bearer <token>`.

There is no end-user authentication yet. Knowing a report UUID is not authorization. The database grants are revoked from `anon` and `authenticated`, RLS has no client policies, and Storage remains private. The backend uses the service-role key and therefore bypasses RLS. Do not deploy this milestone to production until authentication, ownership policies, abuse protection, and a real authorization model are implemented.

Uploads are checked by size, declared MIME and file signature. Paths contain server-generated UUIDs. Database failures trigger Storage cleanup. A repeated draft UUID with the identical payload is idempotent; different content returns HTTP 409.

Image analysis runs only through the backend using the Gemini API and a strict six-category response schema. The mobile app contains only `EXPO_PUBLIC_API_URL`; it never receives the Gemini key. The Gemini Free Tier is intended only for development/demo use and remains subject to the provider's terms and quotas. Privacy and KVKK implications must be evaluated separately before processing real user photos. The AI endpoint has its own rate limit and timeout, and upstream errors are converted to safe messages. If analysis fails, the user can retry or choose a category manually; no mock result is substituted.
