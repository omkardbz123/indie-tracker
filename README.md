# Indie Tracker (Dog ID)

QR tags for pet and community dogs in Pune / Alandi. Anyone who finds a dog scans its tag (phone camera or Google Lens),
sees the dog's public profile, and **messages the caretaker anonymously on the website**. Neither side ever sees the
other's phone number.

- **Finders**: no login. Profile at `/d/<id>`, anonymous chat at `/chat/?dog=<id>`.
- **Caretakers**: sign in with a personal login link from an admin. At `/portal/` they register their own dogs,
  download QR tags and answer messages about their dogs.
- **Admins**: `/admin/` (protected by Cloudflare Access). They manage all dogs and caretakers and can read and reply to every conversation.

Stack: a Cloudflare Worker with static assets, D1 (SQLite), Cloudflare Access. R2 photo storage is optional and currently **off**.

## Layout
- `src/worker.js`: entry point and URL routing (files in `public/` are served directly)
- `src/routes/profile.js`: public profile `/d/<id>` (only dog details, never contact info)
- `src/routes/public.js`: dog JSON, anonymous chat (the finder holds a secret token; only its hash is stored), caretaker login
- `src/routes/caretakers.js`: admin-only caretaker management
- `src/lib/middleware.js`: guards for `/api/admin/*` (Cloudflare Access JWT) and `/api/my/*` (caretaker session cookie)
- `src/lib/`: shared data access (`store.js`), chat logic, dashboard handlers, validation
- `public/app/`: dashboard used by both `/admin/` and `/portal/`
- `public/chat/`, `public/login/`: finder chat page, caretaker sign-in page
- `migrations/`: D1 schema migrations

## Local development
Double-click `start.bat`, or:
```bash
npm install
npm run db:migrate:local
npm run dev        # http://localhost:8788/admin/ (admin login bypassed locally via DEV_BYPASS=1)
```
To try the caretaker portal locally: Admin → Caretakers → Add caretaker → open the login link it shows.

## Hosting on Cloudflare (Worker, deployed from GitHub)
1. Cloudflare dashboard (omkardbz123@gmail.com's Account) → **Workers & Pages → Create → Import a repository** → `omkardbz123/indie-tracker`.
2. Project name `indie-tracker` · Build command *(empty)* · Deploy command `npx wrangler deploy`.
3. The D1 binding (`DB` → database `indie-tracker`) and static files come from `wrangler.toml`. Every push to `main` redeploys.
4. Database changes: add a file in `migrations/`, then run `npm run db:migrate:remote`.
Manual deploy from this computer: `npm run deploy`.

## Admin sign-in
Admins sign in at `/admin/` with a password stored as a Worker secret (never in the code or on GitHub).
Set or change it from this folder; changing it signs every admin out:
```bash
npx wrangler secret put ADMIN_PASSWORD
```
It must be at least 8 characters. Use a longer one before real data goes in. After 10 wrong attempts from one connection, sign-in is blocked for 15 minutes.

## Optional: Cloudflare Access for admins
Access (an email one-time code) can be used instead of, or alongside, the password.
1. Cloudflare dashboard → **Zero Trust**. The first time, pick a team name and the Free plan.
2. Access → Applications → **Add an application → Self-hosted**. Add two public hostnames on the site's address (e.g. `indie-tracker.<your-subdomain>.workers.dev`, or your custom domain): path `admin` and path `api/admin`.
   Don't use the Worker's one-click "Enable Cloudflare Access" toggle: it locks the whole site, including the public pages.
   **Don't** protect `/portal`, `/api/my`, `/login`, `/chat` or `/d`. Caretakers and finders use those.
3. Policy: **Allow**, Include → Emails → the admins' addresses. Login method: One-time PIN.
4. Copy the application's **AUD tag**, then:
   ```bash
   npx wrangler secret put ACCESS_TEAM_DOMAIN   # e.g. yourteam.cloudflareaccess.com
   npx wrangler secret put ACCESS_AUD
   ```
**Never set `DEV_BYPASS` in production.**

## Privacy and safety
- The public page and `/api/dog/:id` show only dog details. The caretaker's name, phone and address are visible only to admins, and to the caretaker for their own dogs.
- Finders reply from the same browser (a token kept in local storage), or from a private link they can copy.
- Only Google Maps location links are clickable in chats, so nobody can slip in phishing links.
- Rate limits: 5 new conversations per connection per hour, 6 finder messages per minute per conversation.
- Login links work like passwords. Making a new link for a caretaker turns the old one off.

## Not built yet
- **Notifications**: caretakers see new messages only when they open the dashboard (unread badge, refreshed every 15 s while open). A Telegram bot or push notifications would make alerts instant.
- **Photos**: create an R2 bucket (`npx wrangler r2 bucket create dog-photos`), uncomment `[[r2_buckets]]` in `wrangler.toml`, then redeploy.
- **Custom domain**: QR tags encode the site address, so **print tags only after the final domain is set**.
- **Spam protection**: consider adding Cloudflare Turnstile to the chat form if spam appears.
