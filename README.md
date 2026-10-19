# Maison Éclat Premium
Static salon website with booking ticket flow and protected admin page.

## Setup on Vercel
Set these **server-side** Environment Variables in the new project (never commit them):
- `UPSTASH_REDIS_REST_URL` — REST URL from an Upstash Redis database
- `UPSTASH_REDIS_REST_TOKEN` — REST token from that database
- `ADMIN_SECRET` — strong random secret of at least 16 characters

Redeploy after saving variables. Bookings are saved to Redis for up to one year. Admin page: `/admin.html`. New bookings start as **pending**; the ticket is a request receipt, not a confirmed appointment. No booking data is saved if the API is not configured. Set up proper customer consent/privacy terms before collecting real customer information.