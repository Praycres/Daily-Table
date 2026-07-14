
const SHEET_ID="1Qg6BIwSfSVAz1_fU0mQImpfZYeSu8WnBC7pbzG8ku44";
const REFRESH=10*60*1000;
const GREETINGS={morning:"assets/good_morning.png",afternoon:"assets/good_afternoon.png",evening:"assets/good_evening.png"};

function sheetURL(name){return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}&x=${Date.now()}`}
function parseCSV(text){
  const rows=[];let row=[],field="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(q){if(c=='"'&&n=='"'){field+='"';i++}else if(c=='"')q=false;else field+=c}
    else{if(c=='"')q=true;else if(c==","){row.push(field);field=""}else if(c=="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field=""}else field+=c}
  }
  row.push(field.replace(/\r$/,""));if(row.some(v=>v!==""))rows.push(row);return rows
}
async function getSheet(name){const r=await fetch(sheetURL(name),{cache:"no-store"});if(!r.ok)throw new Error(name);return parseCSV(await r.text())}
const clean=v=>(v||"").trim();
function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
function kv(rows){const o={};rows.forEach(r=>{const k=clean(r[0]).toLowerCase();if(k)o[k]=clean(r[1])});return o}
function headers(row){const h={};row.forEach((v,i)=>h[clean(v).toLowerCase()]=i);return h}
function menu(rows){
  const ix=rows.findIndex(r=>r.some(v=>clean(v).toLowerCase()=="day"));if(ix<0)return{};
  const h=headers(rows[ix]),o={};
  rows.slice(ix+1).forEach(r=>{const d=clean(r[h.day]).toLowerCase();if(d)o[d]={lunch:h.lunch!==undefined?clean(r[h.lunch]):"",dinner:h.dinner!==undefined?clean(r[h.dinner]):"",prep:h["prep notes"]!==undefined?clean(r[h["prep notes"]]):""}});
  return o
}
function weekday(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return d.toLocaleDateString("en-US",{weekday:"long"}).toLowerCase()}
function render(listId,emptyId,vals){
  const list=document.getElementById(listId),empty=document.getElementById(emptyId),good=vals.map(clean).filter(Boolean);list.innerHTML="";
  if(!good.length){list.classList.add("hidden");empty.classList.remove("hidden");return}
  list.classList.remove("hidden");empty.classList.add("hidden");good.forEach(v=>{const li=document.createElement("li");li.textContent=v;list.appendChild(li)})
}
function pratherisms(rows){
  const ix=rows.findIndex(r=>r.some(v=>clean(v).toLowerCase()=="quote"));if(ix<0)return[];
  const h=headers(rows[ix]);
  return rows.slice(ix+1).map(r=>({quote:clean(r[h.quote]),who:h["who said it"]!==undefined?clean(r[h["who said it"]]):"",age:h.age!==undefined?clean(r[h.age]):""})).filter(x=>x.quote)
}
function pick(items){if(!items.length)return null;const d=new Date();let h=0;const k=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;for(const c of k)h=((h<<5)-h)+c.charCodeAt(0);return items[Math.abs(h)%items.length]}
function updateGreeting(){
  const d=new Date(),h=d.getHours(),img=document.getElementById("greetingImage");
  if(h<12){img.src=GREETINGS.morning;img.alt="Good Morning"}else if(h<17){img.src=GREETINGS.afternoon;img.alt="Good Afternoon"}else{img.src=GREETINGS.evening;img.alt="Good Evening"}
  setText("dateText",d.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}))
}
function showDynamic(data,quotes,menuData){
  const reminder=document.getElementById("reminderView"),white=document.getElementById("whiteboardView"),prep=document.getElementById("prepView");
  reminder.classList.add("hidden");white.classList.add("hidden");prep.classList.add("hidden");

  const prepItems=[data["lunch prep 1"],data["lunch prep 2"],data["lunch prep 3"],data["lunch prep 4"],data["lunch prep 5"],menuData.sunday?.prep].filter(Boolean);
  if(new Date().getDay()===0 && prepItems.length){
    prep.classList.remove("hidden");render("prepList","prepEmpty",prepItems);return
  }
  const q=pick(quotes);
  if(q && ([0,6].includes(new Date().getDay()) || !data["gentle reminder"])){
    white.classList.remove("hidden");setText("pratherismText",`“${q.quote}”`);
    const credit=[q.who,q.age?`age ${q.age}`:""].filter(Boolean).join(", ");setText("pratherismCredit",credit?`— ${credit}`:"");return
  }
  reminder.classList.remove("hidden");setText("reminderText",data["gentle reminder"]||"Grace for this day.")
}
async function load(){
  updateGreeting();
  try{
    const [dRows,mRows,pRows]=await Promise.all([getSheet("Dashboard"),getSheet("Weekly Menu"),getSheet("Pratherisms")]);
    const data=kv(dRows),m=menu(mRows),today=m[weekday()]||{},tom=m[weekday(1)]||{};
    setText("dinnerText",today.dinner||data["dinner tonight"]||"Maybe tonight is takeout.");
    setText("dinnerSides",data["dinner sides"]||"");
    setText("tomorrowDinner",tom.dinner?`Tomorrow: ${tom.dinner}`:"");
    const weekend=[0,6].includes(new Date().getDay());
    if(weekend&&today.lunch){document.getElementById("weekendLunchBlock").classList.remove("hidden");setText("weekendLunch",today.lunch)}else document.getElementById("weekendLunchBlock").classList.add("hidden");
    render("scheduleList","scheduleEmpty",[data["schedule 1"],data["schedule 2"],data["schedule 3"]]);
    render("focusList","focusEmpty",[data["focus 1"],data["focus 2"],data["focus 3"]]);
    setText("scriptureText",data["scripture text"]||"Grace for this day.");
    setText("scriptureReference",data["scripture reference"]||"");
    setText("wordText",(data["word of the year"]||"Establish").toUpperCase());
    setText("wordYear",data.year||String(new Date().getFullYear()));
    showDynamic(data,pratherisms(pRows),m)
  }catch(e){
    console.error(e);setText("dinnerText","Daily Table is resting.");setText("dinnerSides","Please check the Google Sheet sharing settings.");render("scheduleList","scheduleEmpty",[]);render("focusList","focusEmpty",[])
  }
}
load();setInterval(load,REFRESH);setInterval(updateGreeting,60000);
