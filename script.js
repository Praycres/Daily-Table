
const SHEET_ID = "1Qg6BIwSfSVAz1_fU0mQImpfZYeSu8WnBC7pbzG8ku44";
const REFRESH_MINUTES = 10;

const ASSETS = {
  morning: "assets/good_morning.png",
  afternoon: "assets/good_afternoon.png",
  evening: "assets/good_evening.png"
};

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&t=${Date.now()}`;
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') quoted = true;
      else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  row.push(field.replace(/\r$/, ""));
  if (row.some(cell => cell !== "")) rows.push(row);
  return rows;
}

async function fetchSheet(name) {
  const response = await fetch(csvUrl(name), { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not read ${name}`);
  return parseCSV(await response.text());
}

function rowsToKeyValue(rows) {
  const result = {};
  rows.forEach(row => {
    const key = (row[0] || "").trim();
    const value = (row[1] || "").trim();
    if (key) result[key.toLowerCase()] = value;
  });
  return result;
}

function clean(value) {
  return (value || "").trim();
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setGreetingAndDate() {
  const now = new Date();
  const hour = now.getHours();
  const image = document.getElementById("greetingImage");

  if (hour < 12) {
    image.src = ASSETS.morning;
    image.alt = "Good Morning";
  } else if (hour < 17) {
    image.src = ASSETS.afternoon;
    image.alt = "Good Afternoon";
  } else {
    image.src = ASSETS.evening;
    image.alt = "Good Evening";
  }

  setText("dateText", now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }));
}

function renderList(listId, emptyId, items) {
  const list = document.getElementById(listId);
  const empty = document.getElementById(emptyId);
  list.innerHTML = "";

  const valid = items.map(clean).filter(Boolean);
  if (!valid.length) {
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  list.classList.remove("hidden");
  valid.forEach(value => {
    const li = document.createElement("li");
    li.textContent = value;
    list.appendChild(li);
  });
}

function getTodayName() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function getTomorrowName() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function getMenu(rows) {
  const menu = {};
  rows.forEach(row => {
    const day = clean(row[0]);
    const dinner = clean(row[1]);
    if (day && dinner && day.toLowerCase() !== "day") {
      menu[day.toLowerCase()] = dinner;
    }
  });
  return menu;
}

function deterministicIndex(length) {
  if (!length) return 0;
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
  let hash = 0;
  for (const ch of key) hash = ((hash << 5) - hash) + ch.charCodeAt(0);
  return Math.abs(hash) % length;
}

function getPratherisms(rows) {
  return rows
    .filter(row => clean(row[0]) && clean(row[0]).toLowerCase() !== "quote")
    .map(row => ({
      quote: clean(row[0]),
      person: clean(row[1]),
      age: clean(row[2])
    }));
}

function maybeShowKitchenWhiteboard(pratherisms) {
  // Show Kitchen Whiteboard on Saturdays and Sundays; Gentle Reminder on weekdays.
  const weekend = [0, 6].includes(new Date().getDay());
  if (!weekend || !pratherisms.length) return;

  const choice = pratherisms[deterministicIndex(pratherisms.length)];
  const reminderPanel = document.querySelector(".reminder-panel");
  const memoryPanel = document.querySelector(".memory-panel");

  setText("pratherismText", `“${choice.quote}”`);
  const detail = [choice.person, choice.age ? `age ${choice.age}` : ""].filter(Boolean).join(", ");
  setText("pratherismCredit", detail ? `— ${detail}` : "");

  reminderPanel.style.display = "none";
  memoryPanel.style.display = "block";
}

async function loadDashboard() {
  setGreetingAndDate();

  try {
    const [dashboardRows, menuRows, pratherismRows] = await Promise.all([
      fetchSheet("Dashboard"),
      fetchSheet("Weekly Menu"),
      fetchSheet("Pratherisms")
    ]);

    const data = rowsToKeyValue(dashboardRows);
    const menu = getMenu(menuRows);

    const todayDinner =
      menu[getTodayName().toLowerCase()] ||
      clean(data["dinner tonight"]) ||
      "Maybe tonight is takeout.";

    const tomorrowDinner =
      menu[getTomorrowName().toLowerCase()] ||
      clean(data["tomorrow's dinner"]);

    setText("dinnerText", todayDinner);
    setText(
      "tomorrowDinner",
      tomorrowDinner ? `Tomorrow: ${tomorrowDinner}` : ""
    );

    renderList("focusList", "focusEmpty", [
      data["focus 1"],
      data["focus 2"],
      data["focus 3"]
    ]);

    // Add Schedule 1, Schedule 2, and Schedule 3 to the Dashboard tab.
    renderList("scheduleList", "scheduleEmpty", [
      data["schedule 1"],
      data["schedule 2"],
      data["schedule 3"]
    ]);

    setText("scriptureReference", clean(data["scripture reference"]) || "Scripture for today");
    setText("scriptureText", clean(data["scripture text"]) || "Grace for this day.");

    setText("wordText", clean(data["word of the year"]) || "Establish");
    setText("wordYear", clean(data["year"]) || String(new Date().getFullYear()));

    setText("reminderText", clean(data["gentle reminder"]) || "Grace for this day.");

    maybeShowKitchenWhiteboard(getPratherisms(pratherismRows));
  } catch (error) {
    console.error(error);
    setText("dinnerText", "Daily Table is resting.");
    setText("tomorrowDinner", "Check the Google Sheet sharing settings.");
    document.getElementById("dinnerText").classList.add("loading-error");
    renderList("scheduleList", "scheduleEmpty", []);
    renderList("focusList", "focusEmpty", []);
  }
}

loadDashboard();
setInterval(loadDashboard, REFRESH_MINUTES * 60 * 1000);
setInterval(setGreetingAndDate, 60 * 1000);
