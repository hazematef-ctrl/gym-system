###Gym Management System (MVP)###

A modern, streamlined Gym Management System designed to simplify member registration, attendance tracking, and subscription management for gyms and fitness centers.

About The Project 

This application aims to digitize and facilitate the check-in and management processes inside gyms. It provides a seamless experience for both Gym Admins and Members through a clean and intuitive interface.

--Current Features (MVP)

Member Registration & Management: Easily onboard and manage gym subscribers.

Member Dashboard: A dedicated interface for members to view their current subscription status, remaining days, and plan details.

Daily Dynamic QR Code: Each member gets a unique QR code that automatically refreshes daily to ensure secure, fast, and contactless check-ins.

Admin Panel: Manage members, verify check-ins, and oversee active subscriptions.

Demo Accounts (Try It Out!)

---If you would like to test the application, please use the following credentials:

--Member Account

Phone Number: 01200000000

Password: memberPassword1

--Admin Account

phone number: 01230000000

Password: memberPassword1

-Future Roadmap

This release represents the Minimum Viable Product (MVP). Several exciting features are planned for upcoming updates, including:

[ ] Gym Owner Financial Dashboard: A dedicated analytics and financial overview page for gym owners to track revenue, expenses, and growth.

[ ] Events & Announcements Section: A new hub inside the member portal to keep subscribers updated on upcoming gym events, challenges, and news.

[ ] Live Subscription Plans & Pricing: A dedicated section allowing members to browse current subscription packages and renewal offers.

[ ] Online Payment Gateway: Seamless integration with electronic payment gateways so members can subscribe and renew their memberships online.

## QR attendance and profile photos

Admins can record attendance by scanning a member's daily QR code at
`POST /api/qr/scan`. QR consumption and attendance insertion are committed in
one database transaction. A retry of a successful scan returns the original
attendance result. The QR remains bound to the subscription used to generate
it; scans are accepted only while that same subscription is active on the
current `Africa/Cairo` business date. Renewals do not silently rebind an
existing QR.

Admins can upload, replace, or remove member photos from the admin directory.
Images are validated and normalized to WebP before being stored in a **private**
Supabase Storage bucket. PostgreSQL stores only the generated storage key.
Photo URLs returned to admin pages are signed and expire after 15 minutes.

### Storage and scheduled cleanup setup

Profile photos use Supabase Storage. Create a **private** bucket in Supabase
Storage (for example, `member-photos`); the backend checks that the configured
bucket is private. PostgreSQL stores only the generated object key, and the
backend returns signed URLs that expire after 15 minutes.

The backend requires these exact environment variables:

- `SUPABASE_URL` — Supabase Dashboard > Project Settings > API > Project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Dashboard > Project Settings > API
  Keys; use the server-side service-role/secret key, never the `anon`/publishable
  key. This key bypasses Storage RLS and must never be exposed to the frontend.
- `SUPABASE_STORAGE_BUCKET` — the exact bucket name created under Storage.
- `CRON_SECRET` — a long random secret used to authorize the scheduled cleanup
  endpoint.

For **local development**, add these values to `backend/.env` (the variable
names and safe placeholders are in [`backend/.env.example`](backend/.env.example)).
Do not replace an existing `.env` wholesale; preserve its database and other
application settings. Restart the backend after editing it.

For **Vercel**, add the variables in the Vercel project that deploys the
backend, under Settings > Environment Variables. Set them for each deployment
target you use (Development, Preview, and/or Production), then redeploy. If
frontend and backend are deployed from separate Vercel projects, configure
these variables only in the backend project. Vercel does not read the local
`backend/.env`. Keep the service-role key out of all frontend and `VITE_`
variables.

The backend requires Node.js 22.x for its image-type validation dependency.
Profile images are limited to 5 MB and stored as WebP. The deployment schedules
the protected photo-cleanup task daily at 03:15 UTC. Failed deletes remain in a
database queue and are retried with backoff. Generate a strong random value for
`CRON_SECRET`, use it in the backend environment, and confirm scheduled
functions are available on the selected Vercel plan.

### Database migration

Apply `backend/migrations/003_attendance_profile_photos.sql` manually after
reviewing the target database and taking the normal deployment precautions.
It adds the nullable user photo storage key, attendance constraints/table, and
the storage cleanup queue. Migrations are not run automatically by the app.

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.