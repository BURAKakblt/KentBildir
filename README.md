# KentBildir

## M3 local setup

1. Create a Supabase project and run `supabase/migrations/202610140001_create_reports.sql` in the SQL editor. It creates an RLS-protected `reports` table and private `report-images` bucket (8 MB; JPEG/PNG/WebP).
2. Copy `backend/.env.example` to `backend/.env`. Put the service-role key only here; never use it in Expo variables or commit it.
3. In `backend`, run `npm install` and `npm run dev`.
4. Copy `mobile/.env.example` to `mobile/.env` and set only `EXPO_PUBLIC_API_URL`.

On a physical iOS/Android device, `localhost` means the phone itself. Use the development computer's current LAN address or a secure tunnel; do not hardcode a Mac IP. Emulator networking differs (`10.0.2.2` is commonly used by Android Emulator). Ensure `CORS_ORIGINS` contains browser origins when Expo Web is used; native requests do not normally send an Origin header.

### API and security

- `GET /health` is public.
- `POST /api/reports` accepts multipart fields `photo` and JSON `metadata`.
- `GET /api/reports/:id` and `GET /api/reports` return 403 unless `DEV_READ_ACCESS_TOKEN` is configured and sent as a Bearer token.

`DEV_READ_ACCESS_TOKEN` is development/test-only, must be at least 32 characters, and makes the backend refuse startup when set with `NODE_ENV=production`. Send it only as `Authorization: Bearer <token>`.

There is no end-user authentication yet. Knowing a report UUID is not authorization. The database grants are revoked from `anon` and `authenticated`, RLS has no client policies, and Storage remains private. The backend uses the service-role key and therefore bypasses RLS. Do not deploy this milestone to production until authentication, ownership policies, abuse protection, and a real authorization model are implemented.

Uploads are checked by size, declared MIME and file signature. Paths contain server-generated UUIDs. Database failures trigger Storage cleanup. A repeated draft UUID with the identical payload is idempotent; different content returns HTTP 409.
