
const SHEET_ID = "1Qg6BIwSfSVAz1_fU0mQImpfZYeSu8WnBC7pbzG8ku44";
const REFRESH_MS = 10 * 60 * 1000;

const greetingAssets = {
  morning: "assets/good_morning.png",
  afternoon: "assets/good_afternoon.png",
  evening: "assets/good_evening.png"
};

function urlFor(sheet){
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&cache=${Date.now()}`;
}
function parseCSV(text){
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(quoted){
      if(c === '"' && n === '"'){ field+='"'; i++; }
      else if(c === '"') quoted=false;
      else field+=c;
    }else{
      if(c === '"') quoted=true;
      else if(c === ","){ row.push(field); field=""; }
      else if(c === "\n"){ row.push(field.replace(/\r$/,"")); rows.push(row); row=[]; field=""; }
      else field+=c;
    }
  }
  row.push(field.replace(/\r$/,""));
  if(row.some(v=>v!=="")) rows.push(row);
  return rows;
}
async function getSheet(name){
  const res=await fetch(urlFor(name),{cache:"no-store"});
  if(!res.ok) throw new Error(`Unable to read ${name}`);
  return parseCSV(await res.text());
}
const tidy=v=>(v||"").trim();
function setText(id,value){ const el=document.getElementById(id); if(el) el.textContent=value; }

function kv(rows){
  const out={};
  rows.forEach(r=>{
    const key=tidy(r[0]).toLowerCase();
    if(key) out[key]=tidy(r[1]);
  });
  return out;
}
function greeting(){
  const now=new Date(), hour=now.getHours(), img=document.getElementById("greetingImage");
  if(hour<12){img.src=greetingAssets.morning;img.alt="Good Morning";}
  else if(hour<17){img.src=greetingAssets.afternoon;img.alt="Good Afternoon";}
  else{img.src=greetingAssets.evening;img.alt="Good Evening";}
  setText("dateText",now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}));
}
function renderList(listId,emptyId,values){
  const list=document.getElementById(listId), empty=document.getElementById(emptyId);
  const good=values.map(tidy).filter(Boolean); list.innerHTML="";
  if(!good.length){list.classList.add("hidden");empty.classList.remove("hidden");return;}
  empty.classList.add("hidden");list.classList.remove("hidden");
  good.forEach(v=>{const li=document.createElement("li");li.textContent=v;list.appendChild(li);});
}
function headerMap(row){
  const map={}; row.forEach((h,i)=>map[tidy(h).toLowerCase()]=i); return map;
}
function menuData(rows){
  // Supports either old columns: Day, Dinner, Recipe Link, Prep Notes
  // or new columns: Day, Lunch, Dinner, Prep Notes.
  const headerIndex=rows.findIndex(r=>r.some(v=>tidy(v).toLowerCase()==="day"));
  if(headerIndex<0) return {};
  const h=headerMap(rows[headerIndex]), result={};
  rows.slice(headerIndex+1).forEach(r=>{
    const day=tidy(r[h.day]).toLowerCase();
    if(!day) return;
    result[day]={
      lunch:h.lunch!==undefined?tidy(r[h.lunch]):"",
      dinner:h.dinner!==undefined?tidy(r[h.dinner]):"",
      prep:h["prep notes"]!==undefined?tidy(r[h["prep notes"]]):""
    };
  });
  return result;
}
function dayName(offset=0){
  const d=new Date(); d.setDate(d.getDate()+offset);
  return d.toLocaleDateString("en-US",{weekday:"long"}).toLowerCase();
}
function pratherisms(rows){
  const headerIndex=rows.findIndex(r=>r.some(v=>tidy(v).toLowerCase()==="quote"));
  if(headerIndex<0) return [];
  const h=headerMap(rows[headerIndex]);
  return rows.slice(headerIndex+1).map(r=>({
    quote:tidy(r[h.quote]),
    who:h["who said it"]!==undefined?tidy(r[h["who said it"]]):"",
    age:h.age!==undefined?tidy(r[h.age]):""
  })).filter(x=>x.quote);
}
function dailyIndex(length){
  if(!length)return 0;
  const d=new Date(); const key=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  let hash=0; for(const c of key)hash=((hash<<5)-hash)+c.charCodeAt(0);
  return Math.abs(hash)%length;
}
function rotateMemory(items){
  // Weekend tradition: Kitchen Whiteboard replaces Gentle Reminder.
  const isWeekend=[0,6].includes(new Date().getDay());
  if(!isWeekend || !items.length)return;
  const item=items[dailyIndex(items.length)];
  setText("pratherismText",`“${item.quote}”`);
  const credit=[item.who,item.age?`age ${item.age}`:""].filter(Boolean).join(", ");
  setText("pratherismCredit",credit?`— ${credit}`:"");
  document.getElementById("reminderCard").classList.add("hidden");
  document.getElementById("whiteboardCard").classList.remove("hidden");
}
function sundayPrep(data,menu){
  if(new Date().getDay()!==0)return;
  const raw=[
    data["lunch prep 1"],data["lunch prep 2"],data["lunch prep 3"],
    data["lunch prep 4"],data["lunch prep 5"],
    menu.sunday?.prep
  ].filter(Boolean);
  if(!raw.length)return;
  document.getElementById("reminderCard").classList.add("hidden");
  document.getElementById("whiteboardCard").classList.add("hidden");
  document.getElementById("sundayPrepCard").classList.remove("hidden");
  renderList("prepList","prepEmpty",raw);
}
async function load(){
  greeting();
  try{
    const [dashboardRows,menuRows,quoteRows]=await Promise.all([
      getSheet("Dashboard"),getSheet("Weekly Menu"),getSheet("Pratherisms")
    ]);
    const data=kv(dashboardRows), menu=menuData(menuRows);
    const today=dayName(0), tomorrow=dayName(1), todaysMenu=menu[today]||{}, nextMenu=menu[tomorrow]||{};

    setText("dinnerText",todaysMenu.dinner||data["dinner tonight"]||"Maybe tonight is takeout.");
    setText("tomorrowDinner",nextMenu.dinner?`Tomorrow: ${nextMenu.dinner}`:"");

    const isWeekend=[0,6].includes(new Date().getDay());
    const lunchWrap=document.getElementById("weekendLunchWrap");
    if(isWeekend && todaysMenu.lunch){
      setText("weekendLunch",todaysMenu.lunch); lunchWrap.classList.remove("hidden");
    }else lunchWrap.classList.add("hidden");

    renderList("scheduleList","scheduleEmpty",[data["schedule 1"],data["schedule 2"],data["schedule 3"]]);
    renderList("focusList","focusEmpty",[data["focus 1"],data["focus 2"],data["focus 3"]]);

    setText("scriptureReference",data["scripture reference"]||"Scripture for today");
    setText("scriptureText",data["scripture text"]||"Grace for this day.");
    setText("wordText",data["word of the year"]||"Establish");
    setText("wordYear",data.year||String(new Date().getFullYear()));
    setText("reminderText",data["gentle reminder"]||"Grace for this day.");

    document.getElementById("reminderCard").classList.remove("hidden");
    document.getElementById("whiteboardCard").classList.add("hidden");
    document.getElementById("sundayPrepCard").classList.add("hidden");
    rotateMemory(pratherisms(quoteRows));
    sundayPrep(data,menu);
  }catch(err){
    console.error(err);
    setText("dinnerText","Daily Table is resting.");
    setText("tomorrowDinner","Please check the Google Sheet sharing settings.");
    renderList("scheduleList","scheduleEmpty",[]);
    renderList("focusList","focusEmpty",[]);
  }
}
load();
setInterval(load,REFRESH_MS);
setInterval(greeting,60*1000);
