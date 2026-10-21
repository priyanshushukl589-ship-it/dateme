# DateMe 💘

A Tinder-style dating web app. You can use it on phones and computers.

**What it can do**

- Sign up / sign in with email and password, password reset
- Profile: up to 6 photos, bio, interests, age (18+ enforced), gender, who you want to meet, age range, distance
- Swipe cards (drag, buttons, or keyboard arrows). Right = like, left = pass, up = Super Like (1 per day)
- Match when two people like each other ("It's a match!")
- Real-time chat with unread badges and "Seen"
- Safety: report, block, unmatch, hide profile, delete account, safety tips, Terms and Privacy pages

**Built with:** Next.js (the website) + Supabase (login, database, photos, live chat) + Vercel (hosting). All have free plans.

You do **not** need to know how to code. Just follow the steps in order. Total time: about 30–40 minutes.

---

## Step 1 — Set up Supabase (the "back end")

1. Go to **supabase.com** → sign in → **New project**.
2. Name: `dateme`. Choose a database password and **save it somewhere**. Pick the region closest to your users (e.g. *Mumbai* for India). Plan: **Free**. Click **Create**. Wait about 2 minutes.
3. Left menu → **SQL Editor** → **New query**.
4. On your computer, open the file **`supabase/schema.sql`** from this folder with Notepad (or any text editor). Select all, copy, and paste it into the SQL Editor. Click **Run**.
   You should see *"Success. No rows returned"*. (If you see a red error, copy it to Claude and ask for help.)
5. **Make testing easy:** left menu → **Authentication** → **Sign In / Providers** (or just *Providers*) → **Email** → switch **"Confirm email" OFF** → Save.
   *(Turn it back ON before you invite real users.)*
6. Get your two keys: **Project Settings** (gear icon) → **API** (or **API Keys**). Copy:
   - **Project URL** (looks like `https://abcdxyz.supabase.co`:  https://spmhebhmtbzvtzoqvsxw.supabase.co)
   - **anon / public key** (newer dashboards call it the **publishable key:  sb_publishable_Aka5Vt0afjGqnDwazijghw_lRn_PjHG**)

   ⚠️ Never use the `service_role` / `secret` key anywhere in this project.

## Step 2 — Put the code on GitHub

1. Unzip `dateme.zip` on your computer. You get a folder named `dateme`.
2. Go to **github.com** → **+** (top right) → **New repository**. Name it `dateme`. Choose **Private**. Do **not** tick "Add a README". Click **Create repository**.
3. On the next page click the link **"uploading an existing file"**.
4. Open the `dateme` folder on your computer, select **everything inside it** (all files and folders), and **drag them into the browser window**. Wait until all uploads finish.
5. Scroll down → **Commit changes**.

✅ Check: on GitHub you should see `package.json`, `app`, `components`, `lib`, `supabase` directly in the repository's main page (not inside another folder).

## Step 3 — Put it online with Vercel

1. Go to **vercel.com** → **Add New…** → **Project**.
2. Find your `dateme` repository → **Import**.
3. Framework should say **Next.js**. Open **Environment Variables** and add two:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon / publishable key |

4. Click **Deploy**. After about a minute you get a link like `https://dateme-xxxx.vercel.app`. 🎉

## Step 4 — Tell Supabase your website address

Supabase needs this so email links (password reset / confirmation) point to your site.

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL**: your Vercel link (e.g. `https://dateme-xxxx.vercel.app`).
3. **Redirect URLs** → add `https://dateme-xxxx.vercel.app/**` → Save.

## Step 5 — Test it with two accounts

You need two people to see matching work.

1. Open your link, **Create account**, fill in a profile (add a photo).
2. Open the link in a **private/incognito window** (or on a friend's phone) and make a second account.
3. Make sure the preferences fit each other, for example: Account 1 = *Woman, shows Men*; Account 2 = *Man, shows Women*. Both need an age within the other's range.
4. Swipe right on each other → **It's a match!** → open **Matches** → chat.

---

## Everyday tasks

| I want to… | Do this |
|---|---|
| **See reports** | Supabase → **Table Editor** → `reports` |
| **Remove a bad user** | Supabase → **Authentication** → **Users** → ⋯ → Delete user |
| **See all profiles** | Supabase → **Table Editor** → `profiles` |
| **Change the code** | Ask Claude for the changed file, then on GitHub open the file → ✏️ edit → paste → Commit. Vercel redeploys automatically in about a minute. |
| **Use my own domain** | Vercel → your project → **Settings** → **Domains**. Then update Supabase **URL Configuration** to the new domain. |

## Run on your own computer (optional)

1. Install **Node.js** (LTS) from nodejs.org.
2. In the project folder: copy `.env.example` to `.env.local` and fill in your two values.
3. Open a terminal in the folder and run: `npm install`, then `npm run dev`.
4. Open http://localhost:3000

## Troubleshooting

- **"Almost there" screen** → the two environment variables are missing on Vercel. Add them (Project → Settings → Environment Variables) and **Redeploy**.
- **"email rate limit exceeded" when signing up** → Supabase's built-in email sending is very limited. Keep "Confirm email" OFF while testing; for launch set up a real email sender (Supabase → Authentication → SMTP Settings, e.g. Resend or Brevo).
- **Photo upload fails** → the SQL in Step 1 may not have fully run. Run `supabase/schema.sql` again (safe to repeat) and check **Storage** shows a bucket called `photos`.
- **Discover is empty** → you need a second account whose gender/preferences/age range fit yours; or you already swiped on everyone (Settings → "Reset" brings back people you passed on).
- **Chat doesn't update live** → re-run `schema.sql`; then Supabase → Database → Publications → `supabase_realtime` should include `messages`.
- **Vercel build fails** → on GitHub make sure `package.json` is at the top level, not inside another folder.

## Before you invite the public (important for a dating app)

1. **Legal pages:** `/terms` and `/privacy` are templates. Replace `[YOUR CONTACT EMAIL]` / `[DATE]` and have a lawyer review them for your country (e.g. India's DPDP Act).
2. **Email:** turn "Confirm email" back ON and set up custom SMTP.
3. **Moderation:** check `reports` regularly and remove abusive accounts. Consider a photo-moderation service as you grow.
4. **Photos are public links.** Anyone with a photo's exact URL can open it (the Privacy page says so). Fine for most dating apps, but know it.
5. **Limits & cost:** free plans have limits on users, storage, bandwidth, and Supabase may pause inactive free projects. Check current limits on supabase.com/pricing and vercel.com/pricing and upgrade when you have real traffic.
6. **Backups:** free Supabase projects have limited backups. Consider a paid plan before storing real users' data.

## Ideas for next phases

Google login · push notifications · photo verification (selfie check) · premium plan with payments (Razorpay/Stripe) · "Likes you" screen · admin dashboard for moderation · profile prompts · GIFs/images in chat · multi-language.

## What's in this folder

```
app/            the pages (landing, login, profile, discover, matches, chat, settings, legal)
components/     reusable pieces (swipe card, nav bar, report/block menu, login handling)
lib/            helpers (Supabase connection, photo resizing)
supabase/schema.sql   the database + security rules (run once in Supabase)
package.json    list of libraries
.env.example    the two settings you need
```
