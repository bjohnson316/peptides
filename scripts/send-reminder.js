// Reads the same data your browser syncs to GitHub (a private Gist), figures out
// which compounds are due today, and emails you a summary via SMTP (free —
// uses your own email account, no paid SMS service).
//
// Runs on a schedule from .github/workflows/dose-reminder.yml. See README.md for
// the one-time setup (an app password + GitHub Actions secrets).

const nodemailer = require("nodemailer");

const GIST_ID = process.env.GIST_ID;
const GIST_TOKEN = process.env.GIST_TOKEN;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;
const EMAIL_TO = process.env.EMAIL_TO;
const TIMEZONE = process.env.REMINDER_TIMEZONE || "America/Chicago";
const REMINDER_HOUR = parseInt(process.env.REMINDER_HOUR || "18", 10);
const FORCE = process.env.FORCE === "true";

const DAY_MS = 86400000;

// Mirrors the frequency logic in index.html
const FREQUENCIES = {
  daily:      { days: 1 },
  weekly:     { days: 7 },
  biweekly:   { days: 14 },
  cycle5_2:   { cycle: true, onDays: 5, cycleLength: 7 },
  monthOnOff: { cycle: true, onDays: 30, cycleLength: 60 },
  cycle8w4w:  { cycle: true, onDays: 56, cycleLength: 84 },
  weekdays:   { weekdays: true },
  custom:     { custom: true }
};

// Day-boundary math must use the reminder's configured timezone, NOT the
// server's local time — GitHub Actions runners default to UTC, so a naive
// setHours(0,0,0,0) would compute "today" using UTC's calendar date instead
// of the calendar date where you actually are, and misjudge what's due
// whenever the two dates disagree (i.e. most of the day).
function localDayKey(ts, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const [y, m, d] = fmt.format(new Date(ts)).split("-").map(Number);
  return Date.UTC(y, m - 1, d); // a stable, comparable "calendar day" key — not a real moment in time
}

function isOnDay(compound, dayKey) {
  const cfg = FREQUENCIES[compound.frequency];
  const anchor = compound.cycleAnchor ? localDayKey(compound.cycleAnchor, TIMEZONE) : dayKey;
  const diff = Math.round((dayKey - anchor) / DAY_MS);
  const pos = ((diff % cfg.cycleLength) + cfg.cycleLength) % cfg.cycleLength;
  return pos < cfg.onDays;
}

function lastLogFor(logs, compoundId) {
  let last = null;
  for (const l of logs) {
    if (l.compoundId !== compoundId) continue;
    if (!last || l.ts > last.ts) last = l;
  }
  return last;
}

function nextDueForCycle(compound, last) {
  const cfg = FREQUENCIES[compound.frequency];
  let d = localDayKey(last.ts, TIMEZONE) + DAY_MS;
  const searchLimit = cfg.cycleLength + 2; // always enough to clear one full off-stretch
  for (let i = 0; i < searchLimit; i++) {
    if (isOnDay(compound, d)) return d;
    d += DAY_MS;
  }
  return d;
}

function nextDueForWeekdays(compound, last) {
  const days = compound.weekdays || [];
  if (days.length === 0) return null; // not configured yet
  let d = localDayKey(last.ts, TIMEZONE) + DAY_MS;
  for (let i = 0; i < 8; i++) { // at most a week needed to hit any selected weekday
    if (days.includes(new Date(d).getUTCDay())) return d;
    d += DAY_MS;
  }
  return d;
}

function nextDueFor(compound, logs) {
  const last = lastLogFor(logs, compound.id);
  if (!last) return null; // never logged yet — nothing to remind about
  const cfg = FREQUENCIES[compound.frequency];
  if (cfg.cycle) return nextDueForCycle(compound, last);
  if (cfg.weekdays) return nextDueForWeekdays(compound, last);
  const intervalDays = cfg.custom ? (compound.customDays || 1) : cfg.days;
  // interval types: advance by N calendar days in the reminder's timezone,
  // not N*24h of raw elapsed time (which can drift a day near DST changes)
  return localDayKey(last.ts, TIMEZONE) + intervalDays * DAY_MS;
}

function currentLocalHour() {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", hour12: false });
  return parseInt(fmt.format(new Date()), 10) % 24;
}

async function main() {
  const hour = currentLocalHour();
  if (!FORCE && hour !== REMINDER_HOUR) {
    console.log(`Local hour in ${TIMEZONE} is ${hour}, not ${REMINDER_HOUR} — skipping. ` +
      `(Two cron triggers exist to handle DST; only one matches at a time.)`);
    return;
  }

  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      "Authorization": `Bearer ${GIST_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });
  if (!res.ok) {
    throw new Error(`Gist fetch failed: ${res.status} ${await res.text()}`);
  }
  const gist = await res.json();
  const filenames = Object.keys(gist.files || {});
  if (filenames.length === 0) throw new Error("Gist has no files");
  const content = gist.files[filenames[0]].content;
  const data = JSON.parse(content);

  const todayStart = localDayKey(Date.now(), TIMEZONE);
  const due = [];
  for (const c of (data.compounds || [])) {
    const dueTs = nextDueFor(c, data.logs || []);
    if (dueTs === null) continue;
    if (dueTs <= todayStart) {
      due.push(c.name);
    }
  }

  if (due.length === 0 && !FORCE) {
    console.log("Nothing due today — no email sent.");
    return;
  }

  const subject = due.length === 0
    ? "Peptides: test reminder (nothing due today)"
    : due.length === 1
      ? `Peptides: ${due[0]} due today`
      : `Peptides: ${due.length} doses due today`;

  const textBody = due.length === 0
    ? "This is a test run — nothing is actually due today."
    : `Due today:\n\n${due.map(n => `- ${n}`).join("\n")}`;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO,
    subject,
    text: textBody
  });

  console.log("Reminder emailed:", subject);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
