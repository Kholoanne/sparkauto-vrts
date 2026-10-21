const $=s=>document.querySelector(s);
const STATUS=["Awaiting Parts","In Progress","Ready for Collection"];
const ROLES={manager:"Workshop Manager",office:"Front Office / Admin",mechanic:"Mechanic"};
const USERS={manager:{pw:"manager123",role:"manager",name:"Manager"},frontoffice:{pw:"office123",role:"office",name:"Front office"},mechanic:{pw:"mechanic123",role:"mechanic",name:"Mechanic"},kholofelo:{pw:"Kholofelo.1",role:"manager",name:"Kholofelo"}};
/* Permissions follow the Assignment 2 use case diagram */
const PERM={mechanic:["jobs"],manager:["jobs","parts","assign","mechs","invoice","reports","safe","release"],office:["jobs","invoice","reports","safe","release"]};
const day=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
const R=n=>"R "+(+n).toLocaleString("en-ZA",{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let DB,user,view="jobs",fails=0,lock=0,_act;
const can=a=>PERM[user.role].includes(a);
const part=id=>DB.parts.find(p=>p.id==id),job=id=>DB.jobs.find(j=>j.id==id),mech=id=>DB.mechs.find(m=>m.id==id);
const pn=id=>"P"+id;
const pc=j=>j.parts.reduce((s,l)=>s+l.qty*l.unit,0);
const total=j=>(+j.labour||0)+pc(j);
const mkInv=(j,no)=>({no,date:j.done||day(0),labour:+j.labour,parts:pc(j),total:total(j)});
const tag=s=>`<span class="tag t-${s.split(" ")[0]}">${s}</span>`;

/* ---- data ---- */
function seed(){const L=(pid,qty,unit,name)=>({pid,qty,unit,name});
 const mk=o=>({make:"",model:"",email:"",mech:0,partsOk:false,safe:false,done:null,parts:[],notes:[],inv:null,hist:[{t:day(2),s:o.status}],...o});
 const s={nj:1004,np:106,nm:4,alerts:[],
 mechs:[{id:1,name:"Norman Stone",spec:"Brakes and suspension"},{id:2,name:"Sipho Dlamini",spec:"Engines"},{id:3,name:"Thabo Mokoena",spec:"General servicing"}],
 parts:[{id:100,name:"Oil filter",price:250,stock:10,min:5},{id:101,name:"Spark plugs",price:100,stock:109,min:20},{id:103,name:"Air filter",price:410,stock:6,min:8},{id:104,name:"Cabin filter",price:300,stock:33,min:10},{id:105,name:"Brake pads",price:760,stock:11,min:4}],
 jobs:[mk({id:1000,reg:"NB33KLGP",make:"Toyota",model:"Corolla",client:"RS Styen",phone:"071 555 0101",desc:"Brake pads and oil service",mech:1,labour:1350,status:"Ready for Collection",partsOk:true,safe:true,done:day(1),parts:[L(105,2,760,"Brake pads"),L(100,1,250,"Oil filter")]}),
  mk({id:1001,reg:"HH98CJGP",make:"VW",model:"Polo",client:"SC Ngobeni",phone:"082 555 0144",desc:"Air filter replacement",mech:2,labour:400,status:"Awaiting Parts"}),
  mk({id:1002,reg:"LS9001GP",make:"Ford",model:"Fiesta",client:"MM Teffo",phone:"083 555 0177",desc:"Spark plug replacement",mech:3,labour:500,status:"Ready for Collection",partsOk:true,safe:true,done:day(3),parts:[L(101,4,100,"Spark plugs")]}),
  mk({id:1003,reg:"FZ22HCGP",make:"Nissan",model:"NP200",client:"HZ Zulu",phone:"072 555 0123",desc:"Cabin filter and service",mech:1,labour:650,status:"In Progress",parts:[L(104,1,300,"Cabin filter")]})]};
 s.jobs.filter(j=>j.done).forEach((j,i)=>j.inv=mkInv(j,1000+i));s.ni=1002;return s}
function load(){try{DB=JSON.parse(localStorage.getItem("vrts3"))}catch(e){}if(!DB)DB=seed()}
function save(){try{localStorage.setItem("vrts3",JSON.stringify(DB))}catch(e){}}

/* ---- INCREMENT 1: login, forgot password, logout ---- */
function login(){const u=$("#u").value.trim().toLowerCase(),p=$("#p").value;
 if(Date.now()<lock){$("#lmsg").textContent="Too many wrong attempts. Wait 30 seconds and try again.";return}
 if(USERS[u]&&USERS[u].pw===p){fails=0;user={...USERS[u]};$("#lmsg").textContent="";$("#u").value=$("#p").value="";
  $("#login").classList.add("hide");$("#app").classList.remove("hide");$("#who").textContent=`${user.name}, ${ROLES[user.role]}`;
  document.querySelectorAll("[data-p]").forEach(b=>b.classList.toggle("hide",!can(b.dataset.p)));go("jobs")}
 else{if(++fails>=3){lock=Date.now()+3e4;fails=0}$("#lmsg").textContent="Wrong username or password. Check both and try again."}}
$("#lbtn").onclick=login;$("#p").onkeydown=e=>{if(e.key==="Enter")login()};
$("#out").onclick=()=>{user=null;$("#app").classList.add("hide");$("#login").classList.remove("hide")};
$("#nav").onclick=e=>{const v=e.target.dataset.v;if(v)go(v)};
function forgot(){dlg(`<h2>Reset password</h2><p class="sub">Enter your username. The workshop manager will be asked to reset it.</p><label>Username<input id="fu"></label><div class="row"><button class="btn alt" onclick="$('#dlg').close()">Cancel</button><button class="btn" onclick="reset()">Request reset</button></div>`)}
function reset(){const u=$("#fu").value.trim().toLowerCase();if(USERS[u]){DB.alerts.unshift({t:new Date().toLocaleString("en-ZA"),m:`Password reset requested for “${u}”`});save()}
 dlg(`<p>If that username exists, the manager has been notified and will give you a new password.</p><div class="row"><button class="btn" onclick="$('#dlg').close()">OK</button></div>`)}
function go(v){const need={mechs:"mechs",invoices:"invoice",reports:"reports"}[v];if(need&&!can(need))v="jobs";view=v;
 document.querySelectorAll("#nav [data-v]").forEach(b=>b.setAttribute("aria-current",b.dataset.v===v));
 $("#view").innerHTML=({jobs:vJobs,parts:vParts,mechs:vMechs,invoices:vInvoices,reports:vReports})[v]()}

/* ---- INCREMENT 1: dashboard and service jobs (search, create, edit, delete) ---- */
function vJobs(){const a=can("reports")&&DB.alerts.length?`<div class="panel"><b>Alerts</b><ul>${DB.alerts.map(n=>`<li>${n.t}: ${esc(n.m)}</li>`).join("")}</ul></div>`:"";
 return `<div class="bar"><h2>Jobs</h2><button class="btn" onclick="editJob()">+ Add job</button></div>${a}
<label>Search registration<input type="search" placeholder="e.g. NB33KLGP" oninput="filt(this.value)"></label>
<div class="panel scroll"><table><thead><tr><th>Job ID</th><th>Client</th><th>Veh. reg</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>
${DB.jobs.map(j=>`<tr data-n="${esc((j.reg+" "+j.client).toLowerCase())}"><td>${j.id}</td><td>${esc(j.client)}</td><td>${esc(j.reg)}</td><td>${tag(j.status)}</td><td>${R(total(j))}</td><td><button class="btn alt sm" onclick="openJob(${j.id})">Open</button></td></tr>`).join("")||`<tr><td colspan="6">No jobs yet. Add the first one.</td></tr>`}</tbody></table></div>`}
function filt(v){document.querySelectorAll("tr[data-n]").forEach(r=>r.hidden=!r.dataset.n.includes(v.toLowerCase()))}

function editJob(id){const j=id?job(id):{reg:"",make:"",model:"",client:"",phone:"",email:"",desc:"",labour:0};
 const f=(k,l,t)=>`<label>${l}<input id="f_${k}" type="${t||"text"}" value="${esc(j[k])}"></label>`;
 dlg(`<h2>${id?"Edit job "+id:"Creating new job"}</h2><h3>Vehicle details</h3><div class="grid">${f("reg","Registration no.")}${f("make","Make")}${f("model","Model")}</div>
 <h3>Client details</h3><div class="grid">${f("client","Name")}${f("phone","Phone number","tel")}${f("email","Email (optional)","email")}</div>
 <h3>Job information</h3><label>Problem or service description<textarea id="f_desc" rows="3">${esc(j.desc)}</textarea></label>
 <h3>Costing</h3><div class="grid">${f("labour","Labour cost (R)","number")}</div><div class="msg" id="fm" role="alert"></div>
 <div class="row"><button class="btn alt" onclick="$('#dlg').close()">Cancel</button><button class="btn" onclick="saveJob(${id||0})">Save job</button></div>`)}
function saveJob(id){const g=k=>$("#f_"+k).value.trim();
 if(!g("reg")||!g("client")||!g("phone")||!g("desc")){$("#fm").textContent="Enter the registration, client name, phone number and a description.";return}
 const lab=+g("labour");if(!(lab>=0)){$("#fm").textContent="Labour cost must be 0 or more.";return}
 const d={reg:g("reg").toUpperCase(),make:g("make"),model:g("model"),client:g("client"),phone:g("phone"),email:g("email"),desc:g("desc"),labour:lab};
 let nid=id;
 if(id){const j=job(id);Object.assign(j,d);if(j.inv)j.inv=mkInv(j,j.inv.no)}
 else{nid=DB.nj++;DB.jobs.push({id:nid,...d,mech:0,status:"Awaiting Parts",partsOk:false,safe:false,done:null,parts:[],hist:[{t:day(0),s:"Awaiting Parts"}],notes:[],inv:null})}
 save();go(view);openJob(nid)}
function delJob(id){ask("Delete this job? Its parts go back into stock.",()=>{const j=job(id);j.parts.forEach(l=>{const p=part(l.pid);if(p)p.stock+=l.qty});DB.jobs=DB.jobs.filter(x=>x.id!==id);save();go(view)})}

/* ---- repair progress screen for one job (status, technician, release rule) ---- */
function openJob(id,msg,ok){const j=job(id),ci=STATUS.indexOf(j.status),A=can("assign"),S=can("safe");
 dlg(`<h2>Job No. ${j.id} <small style="font-weight:400;color:var(--mut)">${esc(j.reg)} ${esc(j.make)} ${esc(j.model)}</small></h2>
 <p class="sub">${esc(j.client)}, ${esc(j.phone)}${j.email?", "+esc(j.email):""}<br>${esc(j.desc)}</p>
 <ol class="steps">${STATUS.map((s,i)=>`<li class="${i<=ci?"on":""}">${s}</li>`).join("")}</ol>
 <div class="grid"><label>Technician${A?"":" (assigned by manager)"}<select ${A?"":"disabled"} onchange="upd(${id},'mech',this.value)"><option value="0">Unassigned</option>${DB.mechs.map(m=>`<option value="${m.id}" ${m.id===j.mech?"selected":""}>${esc(m.name)}</option>`).join("")}</select></label>
 <label>Current status<select onchange="setStatus(${id},this.value)">${STATUS.map(s=>`<option ${s===j.status?"selected":""}>${s}</option>`).join("")}</select></label></div>
 <label class="chk"><input type="checkbox" ${j.partsOk?"checked":""} ${S?"":"disabled"} onchange="upd(${id},'partsOk',this.checked)"> All required parts are accounted for</label>
 <label class="chk"><input type="checkbox" ${j.safe?"checked":""} ${S?"":"disabled"} onchange="upd(${id},'safe',this.checked)"> Service marked as safe</label>
 <div class="msg" role="alert" style="${ok?"color:var(--ok)":""}">${msg||""}</div>
 <h3>Parts on this job</h3><table style="min-width:0"><tbody>${j.parts.map((l,i)=>`<tr><td>${esc(l.name)}</td><td>× ${l.qty}</td><td>${R(l.qty*l.unit)}</td><td>${A?`<button class="btn alt sm" onclick="rmPart(${id},${i})">Remove</button>`:""}</td></tr>`).join("")||`<tr><td>No parts assigned yet.</td></tr>`}</tbody></table>
 ${A?`<div class="grid" style="margin-top:10px;align-items:end"><label>Add part<select id="ap">${DB.parts.map(p=>`<option value="${p.id}">${esc(p.name)} (${p.stock} in stock)</option>`).join("")}</select></label><label>Quantity<input id="aq" type="number" min="1" value="1"></label><div><button class="btn" style="margin-bottom:10px" onclick="addPart(${id})">Assign part</button></div></div>`:""}
 <p>Labour: ${R(j.labour)}<br>Parts: ${R(pc(j))}</p><p class="total">Total: ${R(total(j))}</p>
 <details><summary>Progress history and client notifications</summary><ul>${j.hist.map(h=>`<li>${h.t}: ${h.s}</li>`).join("")}${j.notes.map(n=>`<li>${n.t}: ${esc(n.m)}</li>`).join("")}</ul></details>
 <div class="row">${j.inv&&can("invoice")?`<button class="btn alt" onclick="invoice(${id})">Invoice</button>`:""}<button class="btn alt" onclick="editJob(${id})">Edit details</button><button class="btn del" onclick="delJob(${id})">Delete</button><button class="btn" onclick="$('#dlg').close()">Close</button></div>`)}
function log(j,s){j.hist.push({t:day(0),s});
 j.notes.push({t:day(0),m:`SMS to ${j.phone}: your ${j.reg} is now “${s}”.`+(s==="Ready for Collection"?" Invoice attached.":"")});
 DB.alerts.unshift({t:new Date().toLocaleString("en-ZA"),m:`${user.name}: job ${j.id} (${j.reg}) set to ${s}`});DB.alerts=DB.alerts.slice(0,6)}
function reopen(j){if(j.status==="Ready for Collection"){j.status="In Progress";j.done=null;j.inv=null;log(j,j.status)}}
function upd(id,k,v){const j=job(id);j[k]=k==="mech"?+v:v;if((k==="partsOk"||k==="safe")&&!v)reopen(j);save();go(view);openJob(id)}
function setStatus(id,s){const j=job(id);if(s===j.status)return;
 if(s==="Ready for Collection"){ /* release conditions check */
  if(!can("release"))return openJob(id,"Only the front office or the manager can release a vehicle.");
  if(!j.mech)return openJob(id,"Assign a technician before the vehicle can be released.");
  if(!j.partsOk)return openJob(id,"Confirm that all required parts are accounted for first.");
  if(!j.safe)return openJob(id,"The service must be marked as safe before release.");
  j.status=s;j.done=day(0);j.inv=mkInv(j,DB.ni++)}
 else{j.status=s;j.done=null;j.inv=null}
 log(j,s);save();go(view);openJob(id,s==="Ready for Collection"?`Released. Invoice #${j.inv.no} created and the client has been notified.`:"",1)}
function addPart(id){const j=job(id),p=part($("#ap").value),q=Math.floor(+$("#aq").value);
 if(!p||!(q>=1))return openJob(id,"Choose a part and a quantity of 1 or more.");
 if(q>p.stock)return openJob(id,`Only ${p.stock} of ${esc(p.name)} in stock. Lower the quantity or reorder the part.`);
 p.stock-=q;const l=j.parts.find(x=>x.pid===p.id&&x.unit===p.price);l?l.qty+=q:j.parts.push({pid:p.id,qty:q,unit:p.price,name:p.name});
 j.partsOk=false;reopen(j);save();go(view);openJob(id)}
function rmPart(id,i){const j=job(id),l=j.parts[i],p=part(l.pid);if(p)p.stock+=l.qty;j.parts.splice(i,1);j.partsOk=false;reopen(j);save();go(view);openJob(id)}

/* ---- INCREMENT 3: invoice ---- */
function invoice(id){const j=job(id),i=j.inv,m=mech(j.mech);
 dlg(`<div id="inv"><h2>Invoice #${i.no}</h2><p class="sub">SparkAuto Workshop, Gqeberha. Date: ${i.date}</p>
 <p>Job ID: ${j.id}<br>Vehicle: ${esc(j.reg)} ${esc(j.make)} ${esc(j.model)}<br>Client: <b>${esc(j.client)}</b><br>Technician: ${esc(m?m.name:"-")}</p>
 <table style="min-width:0"><thead><tr><th>Part</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${j.parts.map(l=>`<tr><td>${esc(l.name)}</td><td>${l.qty}</td><td>${R(l.unit)}</td><td>${R(l.qty*l.unit)}</td></tr>`).join("")||`<tr><td colspan="4">No parts</td></tr>`}</tbody></table>
 <p>Parts total: ${R(i.parts)}<br>Labour: ${R(i.labour)}</p><p class="total">Total: ${R(i.total)}</p></div>
 <div class="row"><button class="btn alt" onclick="openJob(${id})">Back</button><button class="btn" onclick="window.print()">Print invoice</button></div>`)}
function vInvoices(){const l=DB.jobs.filter(j=>j.inv);return `<h2>Invoices</h2><p class="sub">Created automatically when a vehicle is released for collection.</p><div class="panel scroll"><table><thead><tr><th>Invoice</th><th>Job</th><th>Client</th><th>Date</th><th>Total</th><th></th></tr></thead><tbody>${l.map(j=>`<tr><td>#${j.inv.no}</td><td>${j.id}</td><td>${esc(j.client)}</td><td>${j.inv.date}</td><td>${R(j.inv.total)}</td><td><button class="btn alt sm" onclick="invoice(${j.id})">View</button></td></tr>`).join("")||`<tr><td colspan="6">No invoices yet.</td></tr>`}</tbody></table></div>`}

/* ---- INCREMENT 2: spare parts ---- */
function vParts(){const low=DB.parts.filter(p=>p.stock<=p.min),M=can("parts");
 return `<div class="bar"><h2>Parts</h2>${M?`<button class="btn" onclick="editPart()">+ Add new part</button>`:""}</div>
<label>Part search<input type="search" placeholder="Type a part name or ID" oninput="filt(this.value)"></label>
<div class="panel scroll"><table><thead><tr><th>Part ID</th><th>Part name</th><th>Price</th><th>Availability</th><th></th></tr></thead><tbody>
${DB.parts.map(p=>`<tr data-n="${esc((pn(p.id)+" "+p.name).toLowerCase())}"><td>${pn(p.id)}</td><td>${esc(p.name)}</td><td>${R(p.price)}</td><td class="${p.stock<=p.min?"low":""}">${p.stock}${p.stock<=p.min?" (low)":""}</td><td>${M?`<button class="btn alt sm" onclick="editPart(${p.id})">Edit</button> <button class="btn del sm" onclick="delPart(${p.id})">Delete</button>`:""}</td></tr>`).join("")||`<tr><td colspan="5">No parts yet.</td></tr>`}</tbody></table></div>
${low.length?`<div class="panel alert"><b>Low stock alert:</b> ${low.map(p=>esc(p.name)+" ("+p.stock+" left)").join(", ")}</div>`:""}`}
function editPart(id){const p=id?part(id):{name:"",price:0,stock:0,min:5};
 dlg(`<h2>${id?"Edit part":"Add new part"}</h2><div class="grid"><label>Part name<input id="p_name" value="${esc(p.name)}"></label><label>Price (R)<input id="p_price" type="number" min="0" step="0.01" value="${p.price}"></label><label>Stock on hand<input id="p_stock" type="number" min="0" value="${p.stock}"></label><label>Low-stock level<input id="p_min" type="number" min="0" value="${p.min}"></label></div>
 <div class="msg" id="fm" role="alert"></div><div class="row"><button class="btn alt" onclick="$('#dlg').close()">Cancel</button><button class="btn" onclick="savePart(${id||0})">Save part</button></div>`)}
function savePart(id){const n=$("#p_name").value.trim();if(!n){$("#fm").textContent="Enter a part name.";return}
 const d={name:n,price:Math.max(0,+$("#p_price").value||0),stock:Math.max(0,Math.floor(+$("#p_stock").value||0)),min:Math.max(0,Math.floor(+$("#p_min").value||0))};
 if(id)Object.assign(part(id),d);else DB.parts.push({id:DB.np++,...d});save();$("#dlg").close();go(view)}
function delPart(id){if(DB.jobs.some(j=>j.parts.some(l=>l.pid===id)))return tell("This part is assigned to a job. Remove it from the job first.");
 ask("Delete this part?",()=>{DB.parts=DB.parts.filter(p=>p.id!==id);save();go(view)})}

/* ---- mechanics (manager) ---- */
function vMechs(){return `<div class="bar"><h2>Mechanics</h2><button class="btn" onclick="editMech()">+ Add mechanic</button></div><div class="panel scroll"><table><thead><tr><th>Name</th><th>Specialisation</th><th>Open jobs</th><th></th></tr></thead><tbody>${DB.mechs.map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.spec)}</td><td>${DB.jobs.filter(j=>j.mech===m.id&&j.status!=="Ready for Collection").length}</td><td><button class="btn alt sm" onclick="editMech(${m.id})">Edit</button></td></tr>`).join("")}</tbody></table></div>`}
function editMech(id){const m=id?mech(id):{name:"",spec:""};dlg(`<h2>${id?"Edit":"Add"} mechanic</h2><div class="grid"><label>Name<input id="m_n" value="${esc(m.name)}"></label><label>Specialisation<input id="m_s" value="${esc(m.spec)}"></label></div><div class="msg" id="fm" role="alert"></div><div class="row"><button class="btn alt" onclick="$('#dlg').close()">Cancel</button><button class="btn" onclick="saveMech(${id||0})">Save mechanic</button></div>`)}
function saveMech(id){const n=$("#m_n").value.trim();if(!n){$("#fm").textContent="Enter the mechanic’s name.";return}const d={name:n,spec:$("#m_s").value.trim()};if(id)Object.assign(mech(id),d);else DB.mechs.push({id:DB.nm++,...d});save();$("#dlg").close();go(view)}

/* ---- INCREMENT 3: reports ---- */
function vReports(){const wk=day(7),done=DB.jobs.filter(j=>j.done&&j.done>=wk),low=DB.parts.filter(p=>p.stock<=p.min);
 return `<h2>Reports</h2><p class="sub">Repairs completed in the last 7 days, and parts that need reordering.</p>
<div class="panel scroll"><h3>Weekly completed repairs</h3><table><thead><tr><th>Completed</th><th>Job</th><th>Reg.</th><th>Client</th><th>Technician</th><th>Total</th></tr></thead><tbody>
${done.map(j=>`<tr><td>${j.done}</td><td>${j.id}</td><td>${esc(j.reg)}</td><td>${esc(j.client)}</td><td>${esc(mech(j.mech)?.name)}</td><td>${R(total(j))}</td></tr>`).join("")||`<tr><td colspan="6">No repairs completed this week.</td></tr>`}</tbody></table>
<p class="total">${done.length} repair(s), ${R(done.reduce((s,j)=>s+total(j),0))}</p></div>
<div class="panel scroll"><h3>Low-stock alert</h3><table><thead><tr><th>Part</th><th>In stock</th><th>Low-stock level</th></tr></thead><tbody>
${low.map(p=>`<tr><td>${pn(p.id)} ${esc(p.name)}</td><td class="low">${p.stock}</td><td>${p.min}</td></tr>`).join("")||`<tr><td colspan="3">All parts are above their low-stock level.</td></tr>`}</tbody></table></div>`}

/* ---- shared dialog helpers ---- */
function dlg(h){const d=$("#dlg");d.innerHTML=h;if(!d.open)d.showModal()}
function ask(m,fn){_act=fn;dlg(`<h2>Please confirm</h2><p>${m}</p><div class="row"><button class="btn alt" onclick="$('#dlg').close()">Cancel</button><button class="btn del" onclick="$('#dlg').close();_act()">Yes, continue</button></div>`)}
function tell(m){dlg(`<p>${m}</p><div class="row"><button class="btn" onclick="$('#dlg').close()">OK</button></div>`)}
load();
