# KentBildir

## Local setup

1. Create a Supabase project, enable Anonymous Sign-Ins, and run every file in `supabase/migrations` in filename order. The migrations create an RLS-protected `reports` table, a private `report-images` bucket (8 MB; JPEG/PNG/WebP), email delivery state, and server-owned report ownership. Use `supabase/verification/verify_report_ownership.sql` after the migrations for read-only security checks.
2. Copy `backend/.env.example` to `backend/.env`. Put the Supabase service-role key and, to enable image analysis, `GEMINI_API_KEY` only here; never use either secret in Expo variables or commit them. `GEMINI_VISION_MODEL` selects the server-side vision model and defaults to `gemini-3.5-flash-lite`.
3. In `backend`, run `npm install` and `npm run dev`.
4. Copy `mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These Expo public values are embedded in the app; never put a service-role key, Gemini key, SMTP credential, or shared backend secret in them.

On a physical iOS/Android device, `localhost` means the phone itself. Use the development computer's current LAN address or a secure tunnel; do not hardcode a Mac IP. Emulator networking differs (`10.0.2.2` is commonly used by Android Emulator). Ensure `CORS_ORIGINS` contains browser origins when Expo Web is used; native requests do not normally send an Origin header.

### API and security

- `GET /health` is public.
- `POST /api/reports` accepts multipart fields `photo` and JSON `metadata`.
- `POST /api/ai/analyze-image` accepts one private multipart `photo` field (JPEG, PNG or WebP; maximum 8 MB). It returns only `categoryId` and `confidence`. When `GEMINI_API_KEY` is absent, this endpoint returns 503 while the rest of the backend starts normally.
- `GET /api/reports/:id` returns a limited detail DTO and `GET /api/reports/:id/photo` proxies its private image. There is no global reports-list endpoint.

The mobile app creates a persistent Supabase Anonymous Auth session without a sign-up screen. Every protected API request sends that user's access token, and the backend confirms it through Supabase Auth before using the returned user ID as `owner_id`. A report UUID is not authorization: report detail and photo queries are filtered by `owner_id` on the server. The backend uses the service-role key and therefore performs this ownership filter explicitly. The client has no direct `reports` or `report-images` access.

Anonymous users cannot recover their account after clearing app data, uninstalling the app, signing out, or losing the secure local session. Their old reports remain stored but are inaccessible to a newly-created anonymous user. If AsyncStorage history exists but the secure session is missing, startup explains this limitation and requires explicit confirmation before creating a new anonymous session; it neither deletes the local history nor transfers ownership. Legacy rows without `owner_id` deliberately remain inaccessible; migrate them only through a separately approved, auditable mapping to an authenticated identity.

Uploads are checked by size, declared MIME and file signature. Paths contain server-generated UUIDs. Database failures trigger Storage cleanup. A repeated draft UUID with the identical payload is idempotent; different content returns HTTP 409.

Image analysis runs only through the backend using the Gemini API and a strict six-category response schema. The mobile app contains only `EXPO_PUBLIC_API_URL`; it never receives the Gemini key. The Gemini Free Tier is intended only for development/demo use and remains subject to the provider's terms and quotas. Privacy and KVKK implications must be evaluated separately before processing real user photos. The AI endpoint has its own rate limit and timeout, and upstream errors are converted to safe messages. If analysis fails, the user can retry or choose a category manually; no mock result is substituted.

### M5 email delivery (local/demo only)

Email is sent by the backend after a new report is stored. The citizen does not sign in to an email account, provide a password, or grant OAuth access. SMTP credentials stay only in `backend/.env`; mobile code receives neither credentials nor the recipient address.

`EMAIL_ENABLED` defaults to `false`. To enable local testing, set it to `true` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM_ADDRESS`, and `TEST_REPORT_RECIPIENT_EMAIL`. The test recipient is a controlled demo/test inbox—not a municipality address. Do not automate delivery to a real municipality without its permission and an approved operational process. Gmail SMTP may require an App Password instead of the normal account password; never put that credential in this README or commit it.

Email failure does not undo a stored report. Delivery becomes `sent`, `failed`, or `disabled`, and idempotent retries of an existing report do not send another email. Keep `EMAIL_ENABLED=false` until the recipient, privacy process, and operational authorization are approved.

### M6 device history and report details

The mobile history is built only from report UUIDs successfully submitted on that device and stored in AsyncStorage; the backend does not expose a global reports list. `GET /api/reports/:id` returns a limited detail DTO, while `GET /api/reports/:id/photo` downloads the image from the private Storage bucket only after ownership has been verified. Native image requests carry the same user bearer token.

### M7 demo scope

Native configuration requests only camera/photo selection and foreground location access; microphone and background-location access are not used. This remains a local/demo build. Privacy/KVKK review, municipality email authorization, Anonymous Auth abuse protection, production-grade rate limiting, and physical-device/SMTP/final end-to-end verification are required before production.
