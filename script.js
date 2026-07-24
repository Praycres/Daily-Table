const SHEET_ID = "1pRMt9H74na_dlUEd4qZC4tPRNNEbMxC9HQWoKZdJxAs";
const CACHE_KEY = "dailyTableV2LastGoodData";
const REFRESH_MS = 5 * 60 * 1000;

const SHEETS = {
  dashboard: "Dashboard",
  menu: "Weekly Menu",
  schedules: "Schedules",
  pratherisms: "Pratherisms",
  familyDates: "Family Dates",
  settings: "Settings"
};

const $ = (id) => document.getElementById(id);

function setClock() {
  const now = new Date();
  $("weekday").textContent = now.toLocaleDateString(undefined, { weekday: "long" });
  $("dateLabel").textContent = now.toLocaleDateString(undefined, { month: "long", day: "numeric" });

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning, Prathers."
    : hour < 17 ? "Good afternoon, Prathers."
    : "Welcome home, Prathers.";
  $("greeting").textContent = greeting;
}

function normalize(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function truthy(value) {
  return ["true", "yes", "y", "1", "on", "active"].includes(normalize(value).toLowerCase());
}

function parseGviz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Unexpected Google Sheets response.");
  const data = JSON.parse(text.slice(start, end + 1));
  const cols = data.table.cols.map((col, i) => normalize(col.label) || `Column ${i + 1}`);
  return data.table.rows.map(row => {
    const obj = {};
    cols.forEach((col, i) => {
      const cell = row.c?.[i];
      obj[col] = cell?.f ?? cell?.v ?? "";
    });
    return obj;
  });
}

async function fetchSheet(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${sheetName}.`);
  return parseGviz(await response.text());
}

function objectFromPairs(rows) {
  const result = {};
  rows.forEach(row => {
    const values = Object.values(row);
    const key = normalize(values[0]);
    if (key) result[key] = values[1] ?? "";
  });
  return result;
}

function findValue(obj, aliases) {
  const entries = Object.entries(obj);
  for (const alias of aliases) {
    const found = entries.find(([key]) => key.toLowerCase() === alias.toLowerCase());
    if (found) return normalize(found[1]);
  }
  return "";
}

function rowValue(row, aliases) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const match = entries.find(([key]) => key.toLowerCase().trim() === alias.toLowerCase());
    if (match) return normalize(match[1]);
  }
  return "";
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const gvizDate = normalize(value).match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (gvizDate) return new Date(+gvizDate[1], +gvizDate[2], +gvizDate[3]);

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

function nextOccurrence(date, now = new Date()) {
  const target = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (target < startOfDay(now)) target.setFullYear(target.getFullYear() + 1);
  return target;
}

function relativeLabel(days, date) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  if (days <= 31) return `In ${days} days`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderDashboard(rows) {
  const direct = rows[0] || {};
  const pairs = objectFromPairs(rows);
  const get = (aliases) =>
    findValue(direct, aliases) || findValue(pairs, aliases);

  const focuses = [
    get(["Focus 1", "Focus1"]),
    get(["Focus 2", "Focus2"]),
    get(["Focus 3", "Focus3"])
  ].filter(Boolean);

  $("focusList").innerHTML = focuses.length
    ? focuses.map(item => `<li>${escapeHtml(item)}</li>`).join("")
    : `<li class="empty">Room for what matters today.</li>`;

  $("scripture").textContent = get(["Scripture", "Verse"]) || "Scripture for today";
  $("gentleReminder").textContent = get(["Gentle Reminder", "Reminder"]) || "Grace for this day.";
}

function renderMenu(rows) {
  const today = new Date().toLocaleDateString(undefined, { weekday: "long" }).toLowerCase();
  const html = rows
    .map(row => {
      const day = rowValue(row, ["Day"]);
      const dinner = rowValue(row, ["Dinner", "Meal"]);
      if (!day || !dinner) return "";
      const isToday = day.toLowerCase() === today;
      return `<div class="menu-row ${isToday ? "today" : ""}">
        <span class="menu-day">${escapeHtml(day)}</span>
        <span class="menu-meal">${escapeHtml(dinner)}</span>
      </div>`;
    })
    .filter(Boolean)
    .join("");

  $("menuList").innerHTML = html || `<p class="empty">Add this week’s dinners in Google Sheets.</p>`;
}

function renderSchedules(rows) {
  const today = new Date().toLocaleDateString(undefined, { weekday: "long" }).toLowerCase();
  const todayRows = rows.filter(row => rowValue(row, ["Day"]).toLowerCase() === today);

  function renderPerson(person, target) {
    const items = todayRows
      .filter(row => rowValue(row, ["Person", "Name"]).toLowerCase() === person.toLowerCase())
      .map(row => {
        const time = rowValue(row, ["Time"]);
        const activity = rowValue(row, ["Activity", "Event", "Schedule"]);
        return activity ? `<li>${time ? `<strong>${escapeHtml(time)}</strong> — ` : ""}${escapeHtml(activity)}</li>` : "";
      })
      .filter(Boolean);

    $(target).innerHTML = items.length
      ? items.join("")
      : `<li class="empty">Enjoy the margin today.</li>`;
  }

  renderPerson("Lori", "loriSchedule");
  renderPerson("Darin", "darinSchedule");
}

function renderFamilyDates(rows) {
  const now = new Date();
  const events = rows.map(row => {
    const name = rowValue(row, ["Name / Occasion", "Name", "Occasion"]);
    const date = parseDate(rowValue(row, ["Date"]));
    const type = rowValue(row, ["Type"]);
    if (!name || !date) return null;
    const next = nextOccurrence(date, now);
    return { name, date: next, type, days: daysBetween(now, next) };
  }).filter(Boolean).sort((a, b) => a.date - b.date).slice(0, 4);

  $("familyDates").innerHTML = events.length
    ? events.map(event => {
        const icon = /birthday/i.test(event.type) ? "🎂"
          : /anniversary/i.test(event.type) ? "❤️"
          : "✦";
        return `<div class="date-item">
          <span class="date-when">${icon} ${escapeHtml(relativeLabel(event.days, event.date))}</span>
          <span>${escapeHtml(event.name)}</span>
        </div>`;
      }).join("")
    : `<p class="empty">Add birthdays and anniversaries in Google Sheets.</p>`;
}

function renderPratherism(rows) {
  const active = rows.filter(row => {
    const activeValue = rowValue(row, ["Active"]);
    return !activeValue || truthy(activeValue);
  });
  const source = active.length ? active : rows;
  const sayings = source.map(row => rowValue(row, ["Pratherism", "Saying", "Quote"])).filter(Boolean);
  if (sayings.length) {
    const dayIndex = Math.floor(Date.now() / 86400000);
    $("pratherism").textContent = `“${sayings[dayIndex % sayings.length]}”`;
  }
}

function renderPiggy(settingsRows) {
  const settings = objectFromPairs(settingsRows);
  const mode = findValue(settings, ["Piggy Frequency", "Piggie Frequency"]) || "Sometimes";
  const normalized = mode.toLowerCase();
  let chance = 0.22;
  if (normalized.includes("rare")) chance = 0.08;
  if (normalized.includes("daily")) chance = 1;
  if (normalized.includes("mania")) chance = 1;

  const piggy = $("piggy");
  piggy.classList.remove("show");

  const seed = new Date().toDateString() + mode;
  const deterministic = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100 / 100;
  if (deterministic <= chance) {
    const positions = [
      { right: "4%", bottom: "8%", transform: "rotate(-4deg)" },
      { left: "3%", top: "42%", transform: "rotate(5deg)" },
      { right: "17%", top: "18%", transform: "rotate(3deg)" },
      { left: "34%", bottom: "2%", transform: "rotate(-2deg)" }
    ];
    const pos = positions[Math.floor(deterministic * 1000) % positions.length];
    Object.assign(piggy.style, pos);
    setTimeout(() => piggy.classList.add("show"), 1200);
  }
}

function renderAll(data) {
  renderDashboard(data.dashboard || []);
  renderMenu(data.menu || []);
  renderSchedules(data.schedules || []);
  renderFamilyDates(data.familyDates || []);
  renderPratherism(data.pratherisms || []);
  renderPiggy(data.settings || []);
}

function escapeHtml(text) {
  return normalize(text).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

async function loadBoard() {
  $("status").className = "status";
  $("status").textContent = "Updating…";

  try {
    const [dashboard, menu, schedules, pratherisms, familyDates, settings] = await Promise.all([
      fetchSheet(SHEETS.dashboard),
      fetchSheet(SHEETS.menu),
      fetchSheet(SHEETS.schedules),
      fetchSheet(SHEETS.pratherisms),
      fetchSheet(SHEETS.familyDates),
      fetchSheet(SHEETS.settings)
    ]);

    const data = { dashboard, menu, schedules, pratherisms, familyDates, settings };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    renderAll(data);

    $("status").textContent = "Updated";
    $("status").className = "status ready";
  } catch (error) {
    console.error(error);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      renderAll(JSON.parse(cached));
      $("status").textContent = "Showing the last update";
      $("status").className = "status error";
    } else {
      $("status").textContent = "Couldn’t reach Google Sheets";
      $("status").className = "status error";
    }
  }
}

setClock();
loadBoard();
setInterval(setClock, 60 * 1000);
setInterval(loadBoard, REFRESH_MS);
