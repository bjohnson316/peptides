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
- Keeps a full history log, filterable by compound, exportable as a PDF (works on mobile too —
  triggers a normal file download/share sheet).
- Export/import a JSON backup — useful before clearing browser data or moving to a new device/browser.

## Hosting it on GitHub Pages

1. Create a new GitHub repository (e.g. `protocol-log`).
2. Add `index.html` from this folder to the repo (root of the repo, or a `/docs` folder — your choice).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment → Source**, choose **Deploy from a branch**.
5. Pick the branch (usually `main`) and the folder (`/root` or `/docs`, matching where you put `index.html`).
6. Save. GitHub will give you a URL like `https://<your-username>.github.io/protocol-log/` —
   it can take a minute or two to go live.
7. Optional: add it to your phone's home screen (Share → Add to Home Screen in Safari/Chrome) so it
   opens like an app.

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

This is a personal tracking tool, not medical guidance — it just does the date math on when your
next dose is due based on what you tell it.
