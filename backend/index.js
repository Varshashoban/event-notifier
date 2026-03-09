const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
let preferences = {
  darkMode: true,
  viewMode: "list",
};

// ─── In-memory DB (swap for SQLite/Postgres easily) ──────────────────────────
let events = [
  { id: 1, title: "Team Standup", date: "2026-03-10", time: "09:00", category: "work", notify: true, note: "Daily sync" },
  { id: 2, title: "Dentist Appointment", date: "2026-03-12", time: "14:30", category: "health", notify: true, note: "" },
  { id: 3, title: "Lunch w/ Sara", date: "2026-03-15", time: "12:00", category: "social", notify: false, note: "Thai place on 5th" },
];
let nextId = 4;
// ─── Conflict Detection Helper ───────────────────────────────────────────────
function findConflict(date, time) {
  const newEventTime = new Date(`${date}T${time}`);

  return events.find((e) => {
    const existingTime = new Date(`${e.date}T${e.time}`);
    return existingTime.getTime() === newEventTime.getTime();
  });
}
// ─────────────────────────────────────────────────────────────────────────────
// ─── Countdown API ─────────────────────────────────────────────
app.get("/events/countdown", (req, res) => {
  const now = new Date();

  const data = events.map((e) => {
    const eventTime = new Date(`${e.date}T${e.time}`);
    const diff = Math.max(0, Math.floor((eventTime - now) / 60000));

    return {
      id: e.id,
      title: e.title,
      countdownMinutes: diff,
    };
  });

  res.json(data);
});
// ─── Upcoming Events API ──────────────────────────────────────
app.get("/events/upcoming", (req, res) => {
  const now = new Date();

  const upcoming = events
    .filter((e) => new Date(`${e.date}T${e.time}`) > now)
    .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))
    .slice(0, 3);

  res.json(upcoming);
});
// ─── Copy Event Details API ───────────────────────────────────
app.get("/events/:id/details", (req, res) => {
  const event = events.find((e) => e.id === parseInt(req.params.id));
  if (!event) return res.status(404).json({ error: "Not found" });

  const text = `${event.title}
${event.date} ${event.time}
Category: ${event.category}
Note: ${event.note || "None"}`;

  res.json({ copyText: text });
});
// ─── Preferences API ──────────────────────────────────────────
app.get("/preferences", (req, res) => {
  res.json(preferences);
});

app.post("/preferences", (req, res) => {
  preferences = { ...preferences, ...req.body };
  res.json(preferences);
});

app.get("/events", (req, res) => {
  const sorted = [...events].sort(
    (a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)
  );
  res.json(sorted);
});

app.post("/events", (req, res) => {
  const { title, date, time, category, notify, note } = req.body;

  if (!title || !date || !time)
    return res.status(400).json({ error: "title, date, and time are required" });

  const conflict = findConflict(date, time);

  if (conflict) {
    return res.status(409).json({
      error: "Schedule conflict",
      conflictingEvent: conflict.title,
    });
  }

  const event = {
    id: nextId++,
    title,
    date,
    time,
    category: category || "other",
    notify: !!notify,
    note: note || "",
  };

  events.push(event);
  res.status(201).json(event);
});

app.patch("/events/:id/notify", (req, res) => {
  const event = events.find((e) => e.id === parseInt(req.params.id));
  if (!event) return res.status(404).json({ error: "Not found" });
  event.notify = !event.notify;
  res.json(event);
});

app.delete("/events/:id", (req, res) => {
  const idx = events.findIndex((e) => e.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  events.splice(idx, 1);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`notifi backend running on http://localhost:${PORT}`));
