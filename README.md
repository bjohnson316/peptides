# Protocol Log — Injection Tracker

A single-page tracker for GLP-1, BPC-157/TB-500, Testosterone, and Ipamorelin/CJC-1295 (or any
compound you add), on daily, weekly, or every-2-weeks schedules. No backend, no accounts —
everything is stored in your browser's local storage on whatever device you use it on.

## What it does

- Tracks any number of compounds, each with its own dose, frequency, and injection-site rotation.
- Frequencies: daily, weekly, every 2 weeks, or a 5-days-on/2-days-off cycle (set a cycle start
  date and it repeats automatically).
- Shows an at-a-glance status per compound: overdue, due today, due tomorrow, or on track,
  calculated from your last logged dose.
- Suggests the next injection site in rotation each time you log a dose.
- Keeps a full history log, filterable by compound, exportable as a real PDF file with no
  external library and no internet dependency — it downloads directly, the same as the JSON
  backup, and works the same on desktop and mobile.
- Logging a dose pre-fills the compound's usual dose automatically — just adjust it if this one's
  different.
- Optional 6pm email reminder on any day a dose is due, free via your own email account (needs
  GitHub sync — see below).
- Export/import a JSON backup — useful before clearing browser data or moving to a new device/browser.

## Hosting it on GitHub Pages

1. Create a new GitHub repository (e.g. `protocol-log`).
2. Add `index.html` **and `manifest.json`** from this folder to the repo, in the same folder
   (root of the repo, or a `/docs` folder — your choice, but they need to sit side by side).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the branch (usually `main`) and the folder (`/root` or `/docs`, matching where you put `index.html`).
6. Save. GitHub will give you a URL like `https://<your-username>.github.io/protocol-log/` —
   it can take a minute or two to go live.
7. Optional: add it to your phone's home screen (Share → Add to Home Screen in Safari/Chrome) so it
   opens like an app — the syringe icon shows up automatically as long as `manifest.json` was
   uploaded alongside `index.html`.

## Syncing data across devices via GitHub

By default, data lives only in the browser you're using. To have it follow you across your phone,
laptop, etc., click the status pill under the title ("Local only — click to sync") and connect it
to a private GitHub Gist:

1. On GitHub, go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**
   → **Generate new token (classic)**.
2. Give it a name like `protocol-log-sync`, set an expiration you're comfortable with, and check
   only the **gist** scope — nothing else is needed.
3. Generate it and copy the token (you only see it once).
4. In the app, paste the token into the sync pill's settings and leave the Gist ID blank the first
   time — it'll create a new private gist for you and start syncing.
5. On another device, open the same settings, paste the same token, and this time paste in the
   Gist ID it gave you (visible again any time you reopen the sync settings) so it connects to the
   same store instead of creating a second one.

The token is stored only in that browser's local storage and is sent directly to
`api.github.com` — there's no server in between. Anyone with access to that browser's dev tools
could read the token, so avoid connecting on a shared/public computer, and revoke the token from
GitHub any time you want to cut access off.

If you'd rather not use GitHub sync at all, the app works the same as before — just remember to
use **Export backup** periodically, especially before switching browsers or devices, and **Import
backup** to restore or move it.

## Email reminders (optional)

A static site can't send anything on its own at 6pm — there's no server to run that clock. This
adds a small scheduled job (GitHub Actions, free) that checks your data and emails you if
something's due, using your own email account's SMTP — no paid service required.

**Requirements:**
- GitHub sync must be set up (above) — the reminder job reads the same private Gist your browser
  syncs to, since that's the only copy of your data a server can reach.
- An email account you can send through via SMTP with an app password (Gmail, Outlook, etc. all
  support this for free).

**Setup (using Gmail as the example):**
1. Add the `.github/workflows/dose-reminder.yml` and `scripts/` folder (with `send-reminder.js`,
   `package.json`, `package-lock.json`) from this download to your repo, in those exact locations.
2. In your Google Account → **Security**, turn on 2-Step Verification if it isn't already on,
   then go to **Security → App passwords** and create one (name it anything, e.g. "peptides").
   Copy the 16-character password it gives you.
3. In your repo, go to **Settings → Secrets and variables → Actions → New repository secret**
   and add each of these:
   - `GIST_ID` — the Gist ID from the app's GitHub sync settings
   - `GIST_TOKEN` — a personal access token with `gist` scope (the same one the app uses is fine)
   - `SMTP_HOST` — `smtp.gmail.com`
   - `SMTP_PORT` — `465`
   - `SMTP_USER` — your Gmail address
   - `SMTP_PASS` — the 16-character app password from step 2 (not your regular Gmail password)
   - `EMAIL_TO` — the address you want reminders sent to (can be the same Gmail address)
4. That's it. It runs automatically at 6pm Central and emails you a summary of anything due or
   overdue that day — nothing sends if nothing's due.

Using a different provider (Outlook, Yahoo, a work email, etc.) works the same way — just use
that provider's SMTP host/port and an app password from their security settings instead of steps
2–3 above.

**Testing it:** go to your repo's **Actions** tab → **Dose Reminder** → **Run workflow**, check
the "force" box, and run it. That sends a test email immediately regardless of the time or
whether anything's actually due, so you can confirm it's wired up correctly without waiting for
6pm.

**Notes:** the schedule is set for `America/Chicago`; edit `REMINDER_TIMEZONE` and `REMINDER_HOUR`
in the workflow file if that's not your timezone. It runs on two cron triggers to handle daylight
saving automatically — the script checks the real local hour and only ever sends once a day.
GitHub's scheduled jobs can run a few minutes late during high load, so treat 6pm as approximate.
saving automatically — the script checks the real local hour and only ever sends once a day.
GitHub's scheduled jobs can run a few minutes late during high load, so treat 6pm as approximate.

This is a personal tracking tool, not medical guidance — it just does the date math on when your
next dose is due based on what you tell it.
