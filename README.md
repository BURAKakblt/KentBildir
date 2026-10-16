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
- `GET /api/reports/:id` returns a limited detail DTO and `GET /api/reports/:id/photo` proxies its private image. There is no global reports-list endpoint.

There is no end-user authentication yet. Knowing a report UUID is not authorization. The database grants are revoked from `anon` and `authenticated`, RLS has no client policies, and Storage remains private. The backend uses the service-role key and therefore bypasses RLS. Do not deploy this milestone to production until authentication, ownership policies, abuse protection, and a real authorization model are implemented.

Uploads are checked by size, declared MIME and file signature. Paths contain server-generated UUIDs. Database failures trigger Storage cleanup. A repeated draft UUID with the identical payload is idempotent; different content returns HTTP 409.

Image analysis runs only through the backend using the Gemini API and a strict six-category response schema. The mobile app contains only `EXPO_PUBLIC_API_URL`; it never receives the Gemini key. The Gemini Free Tier is intended only for development/demo use and remains subject to the provider's terms and quotas. Privacy and KVKK implications must be evaluated separately before processing real user photos. The AI endpoint has its own rate limit and timeout, and upstream errors are converted to safe messages. If analysis fails, the user can retry or choose a category manually; no mock result is substituted.

### M5 email delivery (local/demo only)

Email is sent by the backend after a new report is stored. The citizen does not sign in to an email account, provide a password, or grant OAuth access. SMTP credentials stay only in `backend/.env`; mobile code receives neither credentials nor the recipient address.

`EMAIL_ENABLED` defaults to `false`. To enable local testing, set it to `true` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM_ADDRESS`, and `TEST_REPORT_RECIPIENT_EMAIL`. The test recipient is a controlled demo/test inbox—not a municipality address. Do not automate delivery to a real municipality without its permission and an approved operational process. Gmail SMTP may require an App Password instead of the normal account password; never put that credential in this README or commit it.

Email failure does not undo a stored report. Delivery becomes `sent`, `failed`, or `disabled`, and idempotent retries of an existing report do not send another email. Because there is still no real user/authentication system, this service must not be publicly deployed.

### M6 device history and report details

The mobile history is built only from report UUIDs successfully submitted on that device and stored in AsyncStorage; the backend does not expose a global reports list. `GET /api/reports/:id` returns a limited detail DTO, while `GET /api/reports/:id/photo` downloads the image from the private Storage bucket and proxies it without revealing its internal path or making it public.

A report UUID is not authentication or proof of ownership: anyone who learns a UUID can currently request that report and its photo. This is temporary demo/V1 behavior. Real user authentication and server-side ownership checks are required before any public production deployment.

### M7 demo scope

Native configuration requests only camera/photo selection and foreground location access; microphone and background-location access are not used. This remains a local/demo build. Authentication, ownership enforcement, privacy/KVKK review, municipality email authorization, and production-grade rate limiting are required before production. Physical-device, SMTP, and final end-to-end verification are deferred to M8.
