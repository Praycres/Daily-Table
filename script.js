(() => {
  "use strict";

  const SHEET_ID = "1Qg6BIwSfSVAz1_fU0mQImpfZYeSu8WnBC7pbzG8ku44";
  const REFRESH_MINUTES = 10;

  const DEMO_DATA = {
    dashboard: {
      "Greeting": "Good Evening",
      "Dinner Tonight": "Fear Lime Chicken with Cilantro Rice & Avocado Salsa",
      "Tomorrow's Dinner": "Taco Bowls",
      "Focus 1": "Settle into the new rhythm",
      "Focus 2": "Prep tomorrow before bed",
      "Focus 3": "Leave room to breathe",
      "Schedule 1": "6:30 • Dinner",
      "Schedule 2": "7:30 • Unpack & reset",
      "Schedule 3": "9:00 • Wind down",
      "Scripture Reference": "Ephesians 3:17",
      "Scripture Text": "May your roots grow down into God’s love and keep you strong.",
      "Word of the Year": "Establish",
      "Year": "2026",
      "Gentle Reminder": "You do not have to finish everything today."
    },
    menu: [],
    pratherisms: [
      { quote: "A day is not wasted if a memory is made.", who: "Darin", age: "" },
      { quote: "Big head, big brain.", who: "Ethan", age: "" },
      { quote: "I just fweaked out!", who: "Ethan", age: "4" }
    ]
  };

  const $ = (id) => document.getElementById(id);
  const clean = (value) => (value == null ? "" : String(value).trim());

  function setDateAndGreeting() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    $("greeting").textContent = greeting;
    $("weekday").textContent = now.toLocaleDateString(undefined, { weekday: "long" });
    $("full-date").textContent = now.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  function gvizUrl(sheetName) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&_=${Date.now()}`;
  }

  async function fetchGviz(sheetName) {
    const response = await fetch(gvizUrl(sheetName), { cache: "no-store" });
    if (!response.ok) throw new Error(`${sheetName}: HTTP ${response.status}`);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?\s*$/);
    if (!match) throw new Error(`${sheetName}: unexpected response`);
    const payload = JSON.parse(match[1]);
    if (payload.status === "error") throw new Error(payload.errors?.[0]?.detailed_message || `${sheetName}: Google error`);
    return payload.table;
  }

  function tableRows(table) {
    return (table.rows || []).map(row => (row.c || []).map(cell => cell ? (cell.f ?? cell.v ?? "") : ""));
  }

  function dashboardMap(table) {
    const out = {};
    for (const row of tableRows(table)) {
      const key = clean(row[0]);
      if (key) out[key] = clean(row[1]);
    }
    return out;
  }

  function findHeaderIndex(rows, requiredWord) {
    return rows.findIndex(row => row.some(cell => clean(cell).toLowerCase() === requiredWord.toLowerCase()));
  }

  function objectRows(table, requiredHeader) {
    const rows = tableRows(table);
    const headerIndex = findHeaderIndex(rows, requiredHeader);
    if (headerIndex < 0) return [];
    const headers = rows[headerIndex].map(h => clean(h));
    return rows.slice(headerIndex + 1)
      .filter(row => row.some(cell => clean(cell)))
      .map(row => Object.fromEntries(headers.map((h, i) => [h, clean(row[i])])));
  }

  function valueByAliases(obj, aliases) {
    for (const alias of aliases) {
      if (clean(obj[alias])) return clean(obj[alias]);
    }
    return "";
  }

  function currentMenu(menuRows) {
    const now = new Date();
    const todayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const tomorrowName = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      .toLocaleDateString("en-US", { weekday: "long" });
    const today = menuRows.find(r => clean(r.Day).toLowerCase() === todayName.toLowerCase()) || {};
    const tomorrow = menuRows.find(r => clean(r.Day).toLowerCase() === tomorrowName.toLowerCase()) || {};
    return { today, tomorrow };
  }

  function nonEmptyValues(map, prefix, max = 8) {
    const values = [];
    for (let i = 1; i <= max; i++) {
      const value = clean(map[`${prefix} ${i}`]);
      if (value) values.push(value);
    }
    return values;
  }

  function setList(id, values, fallback) {
    const el = $(id);
    el.innerHTML = "";
    const items = values.length ? values : [fallback];
    for (const text of items) {
      const li = document.createElement("li");
      li.textContent = text;
      el.appendChild(li);
    }
  }

  function fitDinner(text) {
    const el = $("dinner-tonight");
    el.classList.remove("compact", "tiny");
    const length = clean(text).length;
    if (length > 58) el.classList.add("tiny");
    else if (length > 34) el.classList.add("compact");
  }

  function render(data) {
    const dashboard = data.dashboard || {};
    const menu = currentMenu(data.menu || []);
    const todayDinner = valueByAliases(menu.today, ["Dinner", "Dinner Tonight", "Meal"]) ||
      clean(dashboard["Dinner Tonight"]) || "Dinner is not planned yet";
    const tomorrowDinner = valueByAliases(menu.tomorrow, ["Dinner", "Dinner Tonight", "Meal"]) ||
      clean(dashboard["Tomorrow's Dinner"]) || clean(dashboard["Tomorrow Dinner"]) || "Not planned yet";

    $("dinner-tonight").textContent = todayDinner;
    $("dinner-tomorrow").textContent = tomorrowDinner;
    fitDinner(todayDinner);

    setList("focus-list", nonEmptyValues(dashboard, "Focus", 5), "Choose one gentle priority");
    setList("schedule-list", nonEmptyValues(dashboard, "Schedule", 6), "Nothing scheduled");

    $("scripture-text").textContent = clean(dashboard["Scripture Text"]) || "Be still, and know that I am God.";
    $("scripture-reference").textContent = clean(dashboard["Scripture Reference"]) || "Psalm 46:10";

    $("word-value").textContent = (clean(dashboard["Word of the Year"]) || "Establish").toUpperCase();
    $("word-year").textContent = clean(dashboard["Year"]) || String(new Date().getFullYear());

    renderLowerPanel(data, dashboard);
  }

  function renderLowerPanel(data, dashboard) {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const lunchPrep = nonEmptyValues(dashboard, "Lunch Prep", 8);

    if (isSunday && lunchPrep.length) {
      $("lower-title").textContent = "Lunch Prep";
      $("lower-content").classList.add("no-quotes");
      $("lower-content").textContent = lunchPrep.join("  •  ");
      $("lower-credit").textContent = "A gentle start for the week";
      return;
    }

    const sayings = (data.pratherisms || []).filter(item => clean(item.quote));
    if (sayings.length) {
      const dayKey = Math.floor(Date.now() / 86400000);
      const saying = sayings[dayKey % sayings.length];
      $("lower-title").textContent = "Kitchen Whiteboard";
      $("lower-content").classList.remove("no-quotes");
      $("lower-content").textContent = saying.quote;
      const age = clean(saying.age) ? `, age ${clean(saying.age)}` : "";
      $("lower-credit").textContent = saying.who ? `— ${saying.who}${age}` : "";
      return;
    }

    $("lower-title").textContent = "Gentle Reminder";
    $("lower-content").classList.remove("no-quotes");
    $("lower-content").textContent = clean(dashboard["Gentle Reminder"]) || "You have done enough for today.";
    $("lower-credit").textContent = "";
  }

  async function loadData() {
    const demo = new URLSearchParams(location.search).get("demo") === "1";
    if (demo) {
      render(DEMO_DATA);
      $("status").textContent = "Preview mode";
      return;
    }

    $("status").textContent = "Updating…";
    try {
      const [dashboardTable, menuTable, pratherTable] = await Promise.all([
        fetchGviz("Dashboard"),
        fetchGviz("Weekly Menu"),
        fetchGviz("Pratherisms")
      ]);

      const data = {
        dashboard: dashboardMap(dashboardTable),
        menu: objectRows(menuTable, "Day"),
        pratherisms: objectRows(pratherTable, "Quote").map(row => ({
          quote: valueByAliases(row, ["Quote", "Pratherism"]),
          who: valueByAliases(row, ["Who Said It", "Who", "Name"]),
          age: valueByAliases(row, ["Age"])
        }))
      };

      render(data);
      $("status").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } catch (error) {
      console.error(error);
      render(DEMO_DATA);
      $("status").textContent = "Preview shown • check Sheet sharing";
    }
  }

  setDateAndGreeting();
  loadData();
  setInterval(setDateAndGreeting, 60_000);
  setInterval(loadData, REFRESH_MINUTES * 60_000);
})();
