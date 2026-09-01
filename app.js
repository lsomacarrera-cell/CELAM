const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const STORAGE_KEY="celam-data-v3";
const $=s=>document.querySelector(s);
let data=loadData();
let viewDate=new Date(data.year,new Date().getMonth(),1);

function clone(o){return JSON.parse(JSON.stringify(o))}
function loadData(){
  try{const s=localStorage.getItem(STORAGE_KEY);if(s)return normalize(JSON.parse(s));}catch(e){}
  return clone(CELAM_DEFAULT_DATA);
}
function normalize(v){
  return {
    year:Number(v.year)||2026,
    theme:v.theme||"Nuestro año juntos",
    people:Array.isArray(v.people)?v.people:[],
    reminders:Array.isArray(v.reminders)?v.reminders:[]
  };
}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function initials(name){return String(name||"?").split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function saintDate(v){
  const m=String(v||"").trim().match(/^(\d{1,2})[\/-](\d{1,2})$/);
  return m?{day:Number(m[1]),month:Number(m[2])}:null;
}
function render(){
  if(viewDate.getFullYear()!==data.year)viewDate=new Date(data.year,Math.min(viewDate.getMonth(),11),1);
  $("#yearTitle").textContent=data.year;
  $("#themeTitle").textContent=data.theme;
  $("#monthTitle").textContent=MONTHS[viewDate.getMonth()];
  renderCalendar();renderMonthEvents();renderNextBirthday();renderNextReminder();
  renderContacts();renderReminders();
}
function eventsFor(y,m,d){
  const out=[];
  data.people.forEach(p=>{
    if(p.birthday){
      const dt=new Date(p.birthday+"T00:00:00");
      if(dt.getMonth()+1===m&&dt.getDate()===d)out.push({type:"birthday",title:"🎂 "+p.name});
    }
    const s=saintDate(p.saint);
    if(s&&s.month===m&&s.day===d)out.push({type:"saint",title:"🌿 "+p.name+" · santo"});
  });
  data.reminders.forEach(r=>{
    if(r.date===`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`&&!r.done)out.push({type:"reminder",title:"🔔 "+r.title});
  });
  return out;
}
function renderCalendar(){
  const grid=$("#calendarGrid");grid.innerHTML="";
  const y=viewDate.getFullYear(),m=viewDate.getMonth(),first=new Date(y,m,1),start=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate(),prev=new Date(y,m,0).getDate();
  for(let i=0;i<42;i++){
    const offset=i-start+1;let dn=offset,cm=m,cy=y;
    if(offset<1){dn=prev+offset;cm=m-1;if(cm<0){cm=11;cy--}}
    else if(offset>days){dn=offset-days;cm=m+1;if(cm>11){cm=0;cy++}}
    const cell=document.createElement("div");cell.className="day"+(cm!==m?" other-month":"");
    const now=new Date();if(cy===now.getFullYear()&&cm===now.getMonth()&&dn===now.getDate()&&cy===data.year)cell.classList.add("today");
    cell.innerHTML=`<div class="day-number">${dn}</div><div class="day-events"></div>`;
    const wrap=cell.querySelector(".day-events"),events=eventsFor(cy,cm+1,dn);
    events.slice(0,3).forEach(e=>{const p=document.createElement("div");p.className=`event-pill ${e.type}`;p.textContent=e.title;wrap.appendChild(p)});
    if(events.length>3){const p=document.createElement("div");p.className="event-pill more";p.textContent=`+${events.length-3} más`;wrap.appendChild(p)}
    grid.appendChild(cell);
  }
}
function renderMonthEvents(){
  const m=viewDate.getMonth()+1,y=viewDate.getFullYear(),items=[];
  data.people.forEach(p=>{
    if(p.birthday){const d=new Date(p.birthday+"T00:00:00");if(d.getMonth()+1===m){let age=y-d.getFullYear();items.push({day:d.getDate(),icon:"🎂",title:p.name,detail:age>0?`Cumple ${age} años`:"Cumpleaños"})}}
    const s=saintDate(p.saint);if(s&&s.month===m)items.push({day:s.day,icon:"🌿",title:`Santo de ${p.name}`,detail:`${s.day} de ${MONTHS[m-1].toLowerCase()}`});
  });
  data.reminders.filter(r=>!r.done&&r.date.startsWith(`${y}-${String(m).padStart(2,"0")}-`)).forEach(r=>{items.push({day:Number(r.date.slice(-2)),icon:"🔔",title:r.title,detail:r.time?`${r.date.slice(-2)} de ${MONTHS[m-1].toLowerCase()} · ${r.time}`:`${r.date.slice(-2)} de ${MONTHS[m-1].toLowerCase()}`})});
  items.sort((a,b)=>a.day-b.day);
  $("#detailTitle").textContent=items.length?`Fechas importantes de ${MONTHS[m-1].toLowerCase()}`:"Fechas importantes";
  $("#monthEvents").innerHTML=items.length?items.map(i=>`<div class="event-item"><div class="event-date">${i.icon}<br>${i.day}</div><div><strong>${esc(i.title)}</strong><span>${esc(i.detail)}</span></div></div>`).join(""):`<div class="empty">Todavía no hay fechas configuradas para este mes.</div>`;
}
function renderNextBirthday(){
  const today=new Date(),y=data.year,c=[];
  data.people.forEach(p=>{if(!p.birthday)return;const b=new Date(p.birthday+"T00:00:00");let d=new Date(y,b.getMonth(),b.getDate());if(d<new Date(y,today.getMonth(),today.getDate()))d=new Date(y+1,b.getMonth(),b.getDate());c.push({p,d})});
  c.sort((a,b)=>a.d-b.d);const n=c[0];
  $("#nextBirthdayName").textContent=n?n.p.name:"Añade a la familia";
  $("#nextBirthdayDate").textContent=n?`🎂 ${n.d.getDate()} de ${MONTHS[n.d.getMonth()].toLowerCase()}`:"desde Agenda";
}
function renderNextReminder(){
  const now=Date.now(),rs=data.reminders.filter(r=>!r.done&&new Date(`${r.date}T${r.time||"23:59"}`).getTime()>=now).sort((a,b)=>new Date(`${a.date}T${a.time||"23:59"}`)-new Date(`${b.date}T${b.time||"23:59"}`)),r=rs[0];
  $("#nextReminderTitle").textContent=r?r.title:"No hay recordatorios";
  $("#nextReminderDate").textContent=r?`${r.date}${r.time?" · "+r.time:""}`:"Añade uno desde Recordatorios";
}
function renderContacts(){
  const c=$("#contactsList");
  if(!data.people.length){c.innerHTML=`<div class="empty">Todavía no hay familiares en la agenda.</div>`;return}
  c.innerHTML=data.people.map((p,i)=>`
    <article class="contact-card">
      <div class="contact-avatar">${esc(initials(p.name))}</div>
      <div class="contact-body">
        <strong>${esc(p.name)}</strong>
        <div class="contact-detail">
          ${p.birthday?`🎂 ${formatBirthday(p.birthday)}`:""}${p.saint?`<br>🌿 Santo: ${esc(p.saint)}`:""}${p.address?`<br>📍 ${esc(p.address)}`:""}${p.phone?`<br>📞 ${esc(p.phone)}`:""}${p.email?`<br>✉️ ${esc(p.email)}`:""}
        </div>
        <div class="contact-actions">
          ${p.address?`<a class="map-action" target="_blank" rel="noopener" href="${mapsUrl(p.address)}">📍 Google Maps</a>`:""}
          ${p.phone?`<a href="tel:${esc(p.phone)}">📞 Llamar</a>`:""}
          ${p.email?`<a href="mailto:${esc(p.email)}">✉️ Email</a>`:""}
          <button class="small-action" data-edit-contact="${i}">Editar</button>
        </div>
      </div>
    </article>`).join("");
  c.querySelectorAll("[data-edit-contact]").forEach(b=>b.onclick=()=>openContact(Number(b.dataset.editContact)));
}
function formatBirthday(v){const d=new Date(v+"T00:00:00");return `${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`}
function mapsUrl(address){return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(address)}
function renderReminders(){
  const c=$("#remindersList"),rs=[...data.reminders].sort((a,b)=>new Date(`${a.date}T${a.time||"23:59"}`)-new Date(`${b.date}T${b.time||"23:59"}`));
  if(!rs.length){c.innerHTML=`<div class="empty">No tienes recordatorios todavía.</div>`;return}
  c.innerHTML=rs.map((r,i)=>`<article class="reminder-item ${r.done?"completed":""}">
    <div class="reminder-main"><div class="reminder-icon">🔔</div><div><strong>${esc(r.title)}</strong><span>${esc(r.date)}${r.time?" · "+esc(r.time):""}${r.note?" · "+esc(r.note):""}</span></div></div>
    <div class="reminder-actions"><button class="done-btn" data-done="${i}">${r.done?"↩":"✓"}</button><button class="delete-btn" data-delete="${i}">×</button></div>
  </article>`).join("");
  c.querySelectorAll("[data-done]").forEach(b=>b.onclick=()=>{const r=rs[Number(b.dataset.done)];const real=data.reminders.indexOf(r);data.reminders[real].done=!data.reminders[real].done;save();render()});
  c.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{const r=rs[Number(b.dataset.delete)];data.reminders.splice(data.reminders.indexOf(r),1);save();render()});
}
function switchView(view){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===view));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===view+"View"));
}
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>switchView(t.dataset.view));
$("#prevMonth").onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()-1,1);render()};
$("#nextMonth").onclick=()=>{viewDate=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,1);render()};
function goToday(){viewDate=new Date(data.year,new Date().getFullYear()===data.year?new Date().getMonth():0,1);switchView("calendar");render();window.scrollTo({top:0,behavior:"smooth"})}
$("#todayBtn").onclick=goToday;$("#monthToday").onclick=goToday;
$("#settingsBtn").onclick=openSettings;$("#closeSettings").onclick=()=>$("#settingsDialog").close();
function openSettings(){ $("#yearInput").value=data.year;$("#themeInput").value=data.theme;renderPeopleEditor();$("#settingsDialog").showModal() }
function renderPeopleEditor(){
  const c=$("#peopleEditor");
  c.innerHTML=data.people.length?data.people.map((p,i)=>`<div class="editor-row" data-person="${i}">
    <label>Nombre<input data-f="name" value="${esc(p.name)}" placeholder="Nombre"></label>
    <label>Cumpleaños<input data-f="birthday" type="date" value="${esc(p.birthday||"")}"></label>
    <label>Santo<input data-f="saint" value="${esc(p.saint||"")}" placeholder="17/3"></label>
    <label>Dirección<input data-f="address" value="${esc(p.address||"")}" placeholder="Dirección"></label>
    <button type="button" class="remove-row">×</button></div>`).join(""):`<div class="empty">Todavía no has añadido personas.</div>`;
  c.querySelectorAll(".remove-row").forEach(b=>b.onclick=()=>{data.people.splice(Number(b.closest(".editor-row").dataset.person),1);renderPeopleEditor()});
}
$("#addPerson").onclick=()=>{data.people.push({name:"",birthday:"",saint:"",address:"",phone:"",email:""});renderPeopleEditor()};
$("#settingsForm").onsubmit=e=>{
  e.preventDefault();data.year=Number($("#yearInput").value)||2026;data.theme=$("#themeInput").value.trim()||"Nuestro año juntos";
  data.people=[...document.querySelectorAll("#peopleEditor .editor-row")].map(r=>({name:r.querySelector('[data-f="name"]').value.trim(),birthday:r.querySelector('[data-f="birthday"]').value,saint:r.querySelector('[data-f="saint"]').value.trim(),address:r.querySelector('[data-f="address"]').value.trim()})).filter(p=>p.name);
  save();$("#settingsDialog").close();render()
};
$("#resetData").onclick=()=>{if(confirm("¿Restaurar los datos iniciales? Se borrarán los datos guardados en este dispositivo.")){data=clone(CELAM_DEFAULT_DATA);save();$("#settingsDialog").close();viewDate=new Date(data.year,0,1);render()}};

function openContact(index=-1){
  const p=index>=0?data.people[index]:{name:"",birthday:"",saint:"",address:"",phone:"",email:""};
  $("#contactIndex").value=index;$("#contactDialogTitle").textContent=index>=0?"Editar familiar":"Nuevo familiar";
  $("#contactName").value=p.name||"";$("#contactBirthday").value=p.birthday||"";$("#contactSaint").value=p.saint||"";$("#contactAddress").value=p.address||"";$("#contactPhone").value=p.phone||"";$("#contactEmail").value=p.email||"";
  $("#contactDialog").showModal()
}
$("#addContactFromAgenda").onclick=()=>openContact(-1);$("#closeContact").onclick=()=>$("#contactDialog").close();$("#cancelContact").onclick=()=>$("#contactDialog").close();
$("#contactForm").onsubmit=e=>{
  e.preventDefault();const i=Number($("#contactIndex").value),p={name:$("#contactName").value.trim(),birthday:$("#contactBirthday").value,saint:$("#contactSaint").value.trim(),address:$("#contactAddress").value.trim(),phone:$("#contactPhone").value.trim(),email:$("#contactEmail").value.trim()};
  if(i>=0)data.people[i]=p;else data.people.push(p);save();$("#contactDialog").close();render()
};

function openReminder(){
  $("#reminderForm").reset();
  $("#reminderDate").value=new Date().toISOString().slice(0,10);
  $("#reminderDialog").showModal()
}
$("#addReminder").onclick=openReminder;$("#closeReminder").onclick=()=>$("#reminderDialog").close();$("#cancelReminder").onclick=()=>$("#reminderDialog").close();
$("#reminderForm").onsubmit=e=>{
  e.preventDefault();data.reminders.push({title:$("#reminderTitle").value.trim(),date:$("#reminderDate").value,time:$("#reminderTime").value,note:$("#reminderNote").value.trim(),done:false});save();$("#reminderDialog").close();render()
};
$("#notificationBtn").onclick=async()=>{
  if(!("Notification" in window)){alert("Este navegador no admite avisos.");return}
  const p=await Notification.requestPermission();
  alert(p==="granted"?"Avisos activados. Mientras la app esté abierta, CELAM podrá avisarte de los recordatorios pendientes.":"No se han activado los avisos.");
};
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js"));
render();
