(() => {
  "use strict";

  const SHEET_ID = "1Qg6BIwSfSVAz1_fU0mQImpfZYeSu8WnBC7pbzG8ku44";
  const REFRESH_MINUTES = 10;

  const DEMO = {
    dashboard: {
      "Focus 1": "Stuff to attic",
      "Focus 2": "Family Fun!",
      "Focus 3": "Work Prep",
      "Scripture Reference": "Psalm 46:10",
      "Scripture Text": "Be still, and know that I am God.",
      "Gentle Reminder": "A day is not wasted if a memory is made."
    },
    menu: [
      { Day: "Monday", Dinner: "Carnitas Bowls" },
      { Day: "Tuesday", Dinner: "Meatloaf & Baked Potatoes" }
    ],
    schedules: {
      Lori: ["Isaiah House", "Lunch with Jen", "Work on lesson", "Kids practice", "Prayer time"],
      Darin: ["Workout", "Work", "Lunch", "Pick up kids", "Men’s group"]
    },
    pratherisms: [{ quote: "A day is not wasted if a memory is made.", who: "Darin", age: "" }]
  };

  const $ = id => document.getElementById(id);
  const clean = value => value == null ? "" : String(value).trim();

  function setDateAndGreeting() {
    const now = new Date();
    const hour = now.getHours();
    $("greeting").innerHTML =
      `${hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening"} <span class="heart">♡</span>`;
    $("weekday").textContent = now.toLocaleDateString(undefined, { weekday: "long" });
    $("full-date").textContent = now.toLocaleDateString(undefined, {
      month: "long", day: "numeric", year: "numeric"
    });
  }

  function gvizUrl(sheet) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&_=${Date.now()}`;
  }

  async function fetchTable(sheet) {
    const response = await fetch(gvizUrl(sheet), { cache: "no-store" });
    if (!response.ok) throw new Error(`${sheet}: HTTP ${response.status}`);
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?\s*$/);
    if (!match) throw new Error(`${sheet}: unexpected Google response`);
    const data = JSON.parse(match[1]);
    if (data.status === "error") throw new Error(data.errors?.[0]?.detailed_message || `${sheet}: Google error`);
    return data.table;
  }

  function rows(table) {
    return (table.rows || []).map(row =>
      (row.c || []).map(cell => cell ? (cell.f ?? cell.v ?? "") : "")
    );
  }

  function dashboardMap(table) {
    const map = {};
    rows(table).forEach(row => {
      const key = clean(row[0]);
      if (key) map[key] = clean(row[1]);
    });
    return map;
  }

  function objectRows(table, requiredHeader) {
    const all = rows(table);
    const headerIndex = all.findIndex(row =>
      row.some(cell => clean(cell).toLowerCase() === requiredHeader.toLowerCase())
    );
    if (headerIndex < 0) return [];
    const headers = all[headerIndex].map(clean);
    return all.slice(headerIndex + 1)
      .filter(row => row.some(cell => clean(cell)))
      .map(row => Object.fromEntries(headers.map((header, i) => [header, clean(row[i])])));
  }

  function scheduleColumns(table) {
    const all = rows(table);
    const headerIndex = all.findIndex(row =>
      row.some(cell => ["lori", "darin"].includes(clean(cell).toLowerCase()))
    );
    if (headerIndex < 0) return { Lori: [], Darin: [] };

    const headers = all[headerIndex].map(clean);
    const loriIndex = headers.findIndex(h => h.toLowerCase() === "lori");
    const darinIndex = headers.findIndex(h => h.toLowerCase() === "darin");
    const result = { Lori: [], Darin: [] };

    all.slice(headerIndex + 1).forEach(row => {
      const lori = loriIndex >= 0 ? clean(row[loriIndex]) : "";
      const darin = darinIndex >= 0 ? clean(row[darinIndex]) : "";
      if (lori) result.Lori.push(lori);
      if (darin) result.Darin.push(darin);
    });
    return result;
  }

  function valueByAliases(obj, aliases) {
    for (const alias of aliases) {
      if (clean(obj?.[alias])) return clean(obj[alias]);
    }
    return "";
  }

  function menuForToday(menuRows) {
    const now = new Date();
    const todayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const tomorrowName = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      .toLocaleDateString("en-US", { weekday: "long" });
    return {
      today: menuRows.find(r => clean(r.Day).toLowerCase() === todayName.toLowerCase()) || {},
      tomorrow: menuRows.find(r => clean(r.Day).toLowerCase() === tomorrowName.toLowerCase()) || {}
    };
  }

  function prefixedValues(map, prefix, max = 8) {
    const values = [];
    for (let i = 1; i <= max; i++) {
      const value = clean(map[`${prefix} ${i}`]);
      if (value) values.push(value);
    }
    return values;
  }

  function setList(id, values, fallback) {
    const list = $(id);
    list.innerHTML = "";
    (values.length ? values : [fallback]).slice(0, 6).forEach(value => {
      const li = document.createElement("li");
      li.textContent = value;
      list.appendChild(li);
    });
  }

  function fitText(id, compactAt, tinyAt) {
    const el = $(id);
    el.classList.remove("compact", "tiny");
    const length = clean(el.textContent).length;
    if (tinyAt && length > tinyAt) el.classList.add("tiny");
    else if (length > compactAt) el.classList.add("compact");
  }

  function render(data) {
    const dashboard = data.dashboard || {};
    const menu = menuForToday(data.menu || []);

    $("dinner-tonight").textContent =
      valueByAliases(menu.today, ["Dinner", "Meal"]) ||
      clean(dashboard["Dinner Tonight"]) ||
      "Dinner is not planned yet";

    $("dinner-tomorrow").textContent =
      valueByAliases(menu.tomorrow, ["Dinner", "Meal"]) ||
      clean(dashboard["Tomorrow's Dinner"]) ||
      "Not planned yet";

    fitText("dinner-tonight", 23, 43);
    fitText("dinner-tomorrow", 26);

    setList("focus-list", prefixedValues(dashboard, "Focus", 5), "Choose one gentle priority");
    setList("lori-list", data.schedules?.Lori || [], "Nothing listed");
    setList("darin-list", data.schedules?.Darin || [], "Nothing listed");

    $("scripture-text").textContent =
      clean(dashboard["Scripture Text"]) || "Be still, and know that I am God.";
    $("scripture-reference").textContent =
      clean(dashboard["Scripture Reference"]) || "Psalm 46:10";

    renderWhiteboard(data, dashboard);
    placePiggy();
  }

  function renderWhiteboard(data, dashboard) {
    const sayings = (data.pratherisms || []).filter(item => clean(item.quote));
    if (sayings.length) {
      const dayNumber = Math.floor(new Date().setHours(0,0,0,0) / 86400000);
      const saying = sayings[dayNumber % sayings.length];
      $("lower-title").textContent = "Kitchen Whiteboard";
      $("lower-content").classList.remove("no-quotes");
      $("lower-content").textContent = saying.quote;
      const age = clean(saying.age) ? `, age ${clean(saying.age)}` : "";
      $("lower-credit").textContent = saying.who ? `— ${saying.who}${age}` : "";
      return;
    }

    $("lower-title").textContent = "Gentle Reminder";
    $("lower-content").classList.remove("no-quotes");
    $("lower-content").textContent =
      clean(dashboard["Gentle Reminder"]) || "You have done enough for today.";
    $("lower-credit").textContent = "";
  }

  function dailySeed() {
    const d = new Date();
    return Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`);
  }

  function placePiggy() {
    const params = new URLSearchParams(location.search);
    const forced = params.get("pig") === "1";
    const seed = dailySeed();

    // Piggy appears most days, but occasionally takes the day off.
    const appears = forced || (seed % 7 !== 0 && seed % 11 !== 0);
    const pig = $("piggy");
    pig.className = "piggy";
    if (!appears) return;

    const spot = seed % 6;
    pig.classList.add("show", `spot-${spot}`);
  }

  async function loadData() {
    const params = new URLSearchParams(location.search);
    if (params.get("demo") === "1") {
      render(DEMO);
      $("status").textContent = "Preview mode";
      return;
    }

    $("status").textContent = "Updating…";
    try {
      const [dashboard, menu, schedules, pratherisms] = await Promise.all([
        fetchTable("Dashboard"),
        fetchTable("Weekly Menu"),
        fetchTable("Schedules"),
        fetchTable("Pratherisms")
      ]);

      render({
        dashboard: dashboardMap(dashboard),
        menu: objectRows(menu, "Day"),
        schedules: scheduleColumns(schedules),
        pratherisms: objectRows(pratherisms, "Quote").map(row => ({
          quote: valueByAliases(row, ["Quote", "Pratherism"]),
          who: valueByAliases(row, ["Who Said It", "Who", "Name"]),
          age: valueByAliases(row, ["Age"])
        }))
      });

      $("status").textContent =
        `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    } catch (error) {
      console.error(error);
      render(DEMO);
      $("status").textContent = "Preview shown • add/share the Schedules tab";
    }
  }

  setDateAndGreeting();
  loadData();
  setInterval(setDateAndGreeting, 60_000);
  setInterval(loadData, REFRESH_MINUTES * 60_000);
})();
