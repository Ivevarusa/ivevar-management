
/* ============ CORE ============ */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(v);return isFinite(n)?n:0};
const r3=v=>Math.round(num(v)*1000)/1000;
const r2=v=>Math.round(num(v)*100)/100;
const fw=v=>num(v).toLocaleString('en-IN',{minimumFractionDigits:3,maximumFractionDigits:3});
const fq=v=>num(v).toLocaleString('en-IN',{maximumFractionDigits:2});
const money=v=>(SET.currency||'₹')+' '+num(v).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:0});
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today=()=>ymd(new Date());
const nowISO=()=>new Date().toISOString();
const fdate=d=>{if(!d)return '—';const x=new Date(d.length<=10?d+'T00:00':d);return isNaN(x)?esc(d):x.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})};
const fdt=d=>{if(!d)return '—';const x=new Date(d);return isNaN(x)?esc(d):x.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
const daysTo=d=>d?Math.floor((new Date(d+'T00:00')-new Date(today()+'T00:00'))/864e5):null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);

function toast(msg,err){const t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),err?5000:2600)}

/* ---------- personal preferences: theme, text size, notifications ---------- */
const PREF={get:(k,d)=>{try{const v=localStorage.getItem('erp_'+k);return v==null?d:v}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem('erp_'+k,v)}catch(e){}}};
const THEMES=[['cream','Cream','#e8820c','#fffdf9'],['midnight','Midnight','#f59e0b','#161c29'],['royal','Royal','#e0b84a','#1f1830'],['emerald','Emerald','#2ecc8f','#12201b'],['ocean','Ocean','#0e7490','#ffffff']];
function applyPrefs(){try{const th=PREF.get('theme','cream');if(th&&th!=='cream')document.documentElement.dataset.theme=th;else delete document.documentElement.dataset.theme;const sz=PREF.get('size','normal');document.documentElement.style.zoom=sz==='large'?'1.1':sz==='larger'?'1.22':''}catch(e){}}
applyPrefs();
let _ac;function beep(){try{_ac=_ac||new (window.AudioContext||window.webkitAudioContext)();const o=_ac.createOscillator(),g=_ac.createGain();o.connect(g);g.connect(_ac.destination);o.frequency.value=880;g.gain.value=0.05;o.start();o.frequency.exponentialRampToValueAtTime(1320,_ac.currentTime+0.09);g.gain.exponentialRampToValueAtTime(0.0001,_ac.currentTime+0.25);o.stop(_ac.currentTime+0.27)}catch(e){}}
function notifyNewMessages(list){try{
  if(PREF.get('sound','1')==='1')beep();
  if(PREF.get('vibrate','1')==='1'&&navigator.vibrate)navigator.vibrate(180);
  if('Notification'in window&&Notification.permission==='granted'&&document.hidden){const m=list[list.length-1].body;new Notification('Ivevar · '+userName(m.from),{body:(m.text||'📷 Photo').slice(0,120)})}
}catch(e){}}

/* ---------- currencies (with real flag images — emoji flags don't render on Windows) ---------- */
const CURRENCIES=[['USD','USD — US Dollar'],['AUD','AUD — Australian Dollar'],['GBP','GBP — British Pound'],['EUR','EUR — Euro'],['INR','INR — Indian Rupee'],['CAD','CAD — Canadian Dollar'],['AED','AED — UAE Dirham'],['SGD','SGD — Singapore Dollar'],['NZD','NZD — NZ Dollar'],['CHF','CHF — Swiss Franc'],['JPY','JPY — Japanese Yen'],['HKD','HKD — Hong Kong Dollar'],['ZAR','ZAR — S. African Rand'],['SAR','SAR — Saudi Riyal']];
const CUR_CC={USD:'us',AUD:'au',GBP:'gb',EUR:'eu',INR:'in',CAD:'ca',AED:'ae',SGD:'sg',NZD:'nz',CHF:'ch',JPY:'jp',HKD:'hk',ZAR:'za',SAR:'sa'};
const COUNTRY_CODES=[['+1','+1  (US / Canada)'],['+91','+91  (India)'],['+44','+44  (UK)'],['+61','+61  (Australia)'],['+971','+971  (UAE)'],['+65','+65  (Singapore)'],['+64','+64  (New Zealand)'],['+49','+49  (Germany)'],['+33','+33  (France)'],['+353','+353  (Ireland)'],['+27','+27  (S. Africa)'],['+966','+966  (Saudi Arabia)'],['+852','+852  (Hong Kong)'],['+81','+81  (Japan)'],['+41','+41  (Switzerland)'],['+39','+39  (Italy)'],['+34','+34  (Spain)'],['+86','+86  (China)'],['+92','+92  (Pakistan)'],['+880','+880  (Bangladesh)'],['+60','+60  (Malaysia)'],['+63','+63  (Philippines)']];
const PAY_METHODS=['Zelle','Stripe Payment Link','PayPal','Bank Transfer','Crypto','Shopify Website','Wise','Card','Cash','Other'];
const COURIERS=['FedEx','UPS','DHL','Blue Dart','DTDC','India Post','Other'];
const curFlag=code=>{const cc=CUR_CC[code]||'';return cc?`<img class="cflag" src="https://flagcdn.com/24x18/${cc}.png" srcset="https://flagcdn.com/48x36/${cc}.png 2x" width="24" height="18" alt="" loading="lazy">`:'<span class="cflag noflag"></span>'};
function curBtn(code){return `<button type="button" class="curbtn">${curFlag(code)}<span class="curlbl">${esc(code)}</span><span class="curcar">▾</span></button>`}

/* ---------- default settings / masters (all editable in Setup) ---------- */
function defaultSettings(){return{
  company:{name:'Ivevar Jewel LLP',address:'Surat, Gujarat, India',gstin:'',phone:'+91-9265051773',email:'hello@ivevar.com'},
  currency:'₹',
  numbering:{leads:'LEAD',quotes:'QTN',orders:'JWL',designs:'DSN',pos:'PO',vouchers:'STK',pieces:'IVP',jobs:'JOB',challans:'CHL',wastage:'WST',qc:'QC',dispatches:'DSP',invoices:'INV',receipts:'RCP',bills:'BIL',payments:'PAY',expenses:'EXP',cash:'CB',tasks:'TSK',customers:'CUS',suppliers:'SUP',karigars:'KAR',employees:'EMP'},
  usdInr:88,
  pieceMetals:['14K Yellow Gold','14K White Gold','14K Rose Gold','18K Yellow Gold','18K White Gold','18K Rose Gold','10K Gold','925 Silver','Platinum','Gold Vermeil'],
  pieceStones:['Lab-grown Diamond','Natural Diamond','Moissanite','Gemstone','None'],
  courierAgencies:['Malca-Amit','Brinks','Sequel','BVC Logistics','Ferrari Group','Own / direct'],
  trackStatuses:['Dispatched','Picked up','Export customs','In transit','Import customs','Out for delivery','Delivered','Exception / held'],
  paymentMethods:['Website (Shopify)','PayPal','Wise','Bank transfer','Zelle','Card','UPI','Cash','Crypto','Other'],
  shiftPresets:[['09:00','18:00'],['10:00','18:00'],['11:00','20:00'],['23:00','06:00']],
  staffDepts:['Sales','Accounts','Dispatch / Courier','Quality Control','Production','Office / Admin'],
  purities:[{n:'24K',p:99.9,m:'Gold'},{n:'22K',p:91.6,m:'Gold'},{n:'18K',p:75.0,m:'Gold'},{n:'14K',p:58.5,m:'Gold'},{n:'10K',p:41.7,m:'Gold'},{n:'925 Silver',p:92.5,m:'Silver'},{n:'999 Silver',p:99.9,m:'Silver'},{n:'PT950',p:95.0,m:'Platinum'}],
  rates:{Gold:7600,Silver:95,Platinum:3300},
  rateNote:'Rate per gram of fine (pure) metal. Fine weight = Net weight × Purity % ÷ 100, rounded to 3 decimals.',
  categories:['Ring','Engagement Ring','Band','Pendant','Necklace','Chain','Earrings','Bracelet','Bangle','Watch','Grillz','Loose Diamond','Certified Diamonds','Custom Products','Other'],
  materials:['Gold','Silver','Platinum','Diamond (Lab-grown)','Diamond (Natural)','Moissanite','Gemstone','Findings','Consumables','Packaging','Finished Goods','Scrap / Residue'],
  departments:['CAD / Design','Material Planning','Casting','Filing & Assembly','Stone Setting','Polishing','Plating','Quality Control','Final Weight / Purity','Packing / Dispatch'],
  routes:{
    'Standard Gold / Diamond':['CAD / Design','Material Planning','Casting','Filing & Assembly','Stone Setting','Polishing','Plating','Quality Control','Final Weight / Purity','Packing / Dispatch'],
    'Plain Gold (no stones)':['CAD / Design','Material Planning','Casting','Filing & Assembly','Polishing','Quality Control','Final Weight / Purity','Packing / Dispatch'],
    'Silver':['CAD / Design','Casting','Filing & Assembly','Stone Setting','Polishing','Plating','Quality Control','Packing / Dispatch'],
    'Loose Diamond':['Quality Control','Packing / Dispatch']},
  locations:['Main Vault','Casting Floor','Setting Dept','Polishing Dept','QC Desk','Dispatch Desk','With Karigar'],
  leadSources:['Website','Phone Call','Email','SMS','WhatsApp','Instagram','Etsy','Referral','Manual'],
  lostReasons:['Price too high','Chose competitor','No response','Delivery time','Design not available','Just browsing'],
  qcChecks:['Design match','Dimensions / size','Quantity','Gross / net weight','Purity','Stone count / carat','Setting security','Finish / polish','Packaging condition'],
  defects:['Porosity','Loose stone','Missing stone','Size off','Weight short','Poor polish','Plating defect','Wrong purity','Scratch / dent','Other'],
  expenseCats:['Purchase / stock','Wages (in-house)','Rent','Electricity','Courier / shipping','Packaging','Marketing / ads','Software','Office expense','Travel','Tea / food','Bank charges','Owner withdrawal','Other'],
  cashAccounts:['Cash','Bank'],
  couriers:['FedEx','DHL','UPS','BVC','Sequel','Blue Dart','India Post','Hand delivery'],
  discLimitPct:5,
  commissionPct:25,
  wastageTolPct:0.5,
  perms:null
}}

/* ---------- roles & permissions ---------- */
const MODS=[
  ['dashboard','Dashboard','Overview'],['chat','Chat','Overview'],['crm','CRM & Leads','Sales'],['quotes','Quotations','Sales'],['orders','Orders','Sales'],
  ['designs','Designs','Make'],['purchase','Purchase','Make'],['inventory','Inventory','Make'],['production','Production','Make'],['karigars','Karigars','Make'],['wastage','Wastage & Recovery','Make'],['qc','Quality Control','Make'],['dispatch','Packing & Dispatch','Make'],
  ['accounts','Accounts','Money'],['hr','HR & Payroll','Money'],['reports','Reports','Money'],
  ['masters','Masters','Admin'],['setup','Staff & Users','Admin'],['audit','Audit Log','Admin'],['prefs','Settings','Account']];
const LV={none:0,view:1,edit:2,approve:3};
const ROLES={admin:'Super Admin',office:'Ivevar Office'};
/* job-title presets for Ivevar Office users (mirrors the server) */
const OFFICE_MODS=MODS.filter(m=>!['setup','audit'].includes(m[0])).map(m=>m[0]);
const TITLES=['CEO','Accountant','Sales','Courier','Helper','Custom'];
const TITLE_LABEL={CEO:'CEO',Accountant:'Accountant',Sales:'Sales person',Courier:'Courier / dispatch',Helper:'Office helper',Custom:'Custom access'};
const TITLE_MODS={CEO:OFFICE_MODS,Accountant:['dashboard','orders','purchase','inventory','accounts','hr','reports','masters','dispatch'],Sales:['dashboard','quotes','orders','inventory','dispatch'],Courier:['dashboard','orders','qc','dispatch','inventory'],Helper:['dashboard','orders','dispatch','inventory']};
const TITLE_APPROVE={CEO:OFFICE_MODS,Accountant:['purchase','inventory','accounts','hr','reports','masters'],Sales:[],Courier:['dispatch'],Helper:[]};
function effMods(u){return Array.isArray(u.modules)?u.modules.slice():[]}
function roleLabel(u){if(!u)return '';if(u.role==='admin')return 'Super Admin';return (u.title&&TITLE_LABEL[u.title])||'Ivevar Office'}
function defaultPerms(){
  const all=v=>Object.fromEntries(MODS.map(m=>[m[0],v]));
  const p={admin:all('approve'),office:{...all('edit'),setup:'none',audit:'none'},manager:all('approve'),employee:all('none'),accountant:all('none'),qc:all('none'),dispatch:all('none')};
  p.manager.setup='view';p.manager.audit='view';
  Object.assign(p.employee,{dashboard:'view',crm:'edit',quotes:'edit',orders:'edit',designs:'edit',inventory:'view',production:'edit',karigars:'edit',qc:'view',dispatch:'view',masters:'view',reports:'view'});
  Object.assign(p.accountant,{dashboard:'view',orders:'view',purchase:'approve',inventory:'view',karigars:'view',wastage:'view',accounts:'approve',hr:'approve',reports:'view',masters:'edit'});
  Object.assign(p.qc,{dashboard:'view',orders:'view',designs:'view',production:'edit',qc:'approve',wastage:'edit'});
  Object.assign(p.dispatch,{dashboard:'view',orders:'view',qc:'view',dispatch:'approve',inventory:'view',accounts:'view'});
  return p}
const HIDDEN_MODS=['production','karigars','wastage','crm','designs','purchase','hr'];
function can(mod,lvl='view'){
  if(HIDDEN_MODS.includes(mod))return false;
  if(!ME.role||ME.role==='pending')return false;
  if(mod==='chat'||mod==='prefs')return true;
  if(ME.role==='admin')return true;
  if(ME.role==='office'){
    if(mod==='setup'||mod==='audit')return false;
    if(!ME.title&&!Array.isArray(ME.modules)){const p=defaultPerms().office;return (LV[p[mod]||'none']||0)>=LV[lvl]}
    if(mod==='dashboard')return LV[lvl]<=LV.view;
    const ap=(ME.title&&TITLE_APPROVE[ME.title])||[];const em=effMods(ME);
    if(lvl==='approve')return ap.includes(mod)&&em.includes(mod);
    return em.includes(mod)}
  if(Array.isArray(ME.modules)){if(mod==='setup'||mod==='audit')return false;if(mod==='dashboard')return LV[lvl]<=LV.view;return ME.modules.includes(mod)&&LV[lvl]<=LV.edit}
  const p=((SET.perms||{})[ME.role])||defaultPerms()[ME.role]||{};
  return (LV[p[mod]||'none']||0)>=LV[lvl]}

/* ---------- i18n (UI labels only; stored data never changes) ---------- */
const I18N={
 hi:{Dashboard:'डैशबोर्ड','CRM & Leads':'CRM व लीड',Quotations:'कोटेशन',Orders:'ऑर्डर',Designs:'डिज़ाइन',Purchase:'खरीद','Inventory':'इन्वेंट्री',Production:'उत्पादन',Karigars:'कारीगर','Wastage & Recovery':'घटत व रिकवरी','Quality Control':'गुणवत्ता जाँच','Packing & Dispatch':'पैकिंग व डिस्पैच',Accounts:'लेखा','HR & Payroll':'HR व वेतन',Reports:'रिपोर्ट',Masters:'मास्टर','Staff & Users':'स्टाफ व यूज़र',Chat:'चैट','Audit Log':'ऑडिट लॉग',Overview:'सारांश',Sales:'बिक्री',Make:'निर्माण',Money:'वित्त',Admin:'एडमिन',New:'नया',Save:'सेव करें',Cancel:'रद्द करें',Search:'खोजें'},
 gu:{Dashboard:'ડેશબોર્ડ','CRM & Leads':'CRM અને લીડ',Quotations:'ક્વોટેશન',Orders:'ઓર્ડર',Designs:'ડિઝાઇન',Purchase:'ખરીદી','Inventory':'ઇન્વેન્ટરી',Production:'ઉત્પાદન',Karigars:'કારીગર','Wastage & Recovery':'ઘટ અને રિકવરી','Quality Control':'ગુણવત્તા ચકાસણી','Packing & Dispatch':'પેકિંગ અને ડિસ્પેચ',Accounts:'હિસાબ','HR & Payroll':'HR અને પગાર',Reports:'રિપોર્ટ',Masters:'માસ્ટર','Staff & Users':'સ્ટાફ અને યુઝર',Chat:'ચેટ','Audit Log':'ઓડિટ લોગ',Overview:'સારાંશ',Sales:'વેચાણ',Make:'ઉત્પાદન',Money:'નાણાં',Admin:'એડમિન',New:'નવું',Save:'સેવ કરો',Cancel:'રદ કરો',Search:'શોધો'}};
let LANG='en';try{LANG=localStorage.getItem('erp_lang')||'en'}catch(e){}
const T=s=>(I18N[LANG]&&I18N[LANG][s])||s;

/* ---------- data layer: Cloudflare Worker API (D1 + R2) ---------- */
const COLLS=['tasks','punch','messages','cash','leads','quotes','orders','designs','pos','vouchers','pieces','jobs','karigars','challans','wastage','qc','dispatches','invoices','receipts','bills','payments','expenses','customers','suppliers','employees','attendance'];
const S={};COLLS.forEach(c=>S[c]=[]);
let SET=defaultSettings();
let USERS=[];let SINCE=0;let LOADED=false;const DEMO=false;
const ME={id:null,name:'',email:'',role:null,modules:null,title:'',shift:null,salary:0};
let TOKEN=null;try{TOKEN=localStorage.getItem('erp_token')}catch(e){}
const byId=(c,id)=>(S[c]||[]).find(x=>x.id===id);
const nameOf=(c,id)=>{const x=byId(c,id);return x?(x.name||x.no||x.code||id):''};
const userName=id=>{if(!id)return '—';const u=USERS.find(x=>x.id===id);return u?u.name:'System'};
let rT=null;function scheduleRender(){clearTimeout(rT);rT=setTimeout(render,40)}

async function api(path,body,opt={}){
  const h={};if(TOKEN)h.authorization='Bearer '+TOKEN;if(body&&!(body instanceof FormData))h['content-type']='application/json';
  let r;try{r=await fetch(path,{method:opt.method||(body?'POST':'GET'),headers:h,body:body?(body instanceof FormData?body:JSON.stringify(body)):undefined,credentials:'same-origin'})}catch(e){throw new Error('Cannot reach the server. Check your internet connection.')}
  let j=null;try{j=await r.json()}catch(e){}
  if(r.status===401&&!opt.noAuthRedirect){logout(true);throw new Error('Your session has ended. Please sign in again.')}
  if(!r.ok)throw new Error((j&&j.error)||('Server error '+r.status));return j}
function upsert(coll,doc){if(!S[coll])return;const i=S[coll].findIndex(x=>x.id===doc.id);if(i>=0)S[coll][i]=doc;else S[coll].push(doc)}
let syncing=false;
async function sync(){if(syncing||!TOKEN)return;syncing=true;
  try{const j=await api('/api/sync?since='+SINCE);
    if(LOADED){const nm=(j.docs||[]).filter(d=>d.coll==='messages'&&d.body&&d.body.from&&d.body.from!==ME.id&&(d.body.channel==='office'||((d.body.channel||'').startsWith('dm:')&&(d.body.channel||'').includes(ME.id))));if(nm.length)notifyNewMessages(nm)}
    (j.docs||[]).forEach(d=>upsert(d.coll,{...d.body,id:d.id}));
    (j.deleted||[]).forEach(d=>{if(S[d.coll])S[d.coll]=S[d.coll].filter(x=>x.id!==d.id)});
    if(j.settings)SET={...defaultSettings(),...j.settings};if(j.users)USERS=j.users;if(j.me)Object.assign(ME,j.me);
    SINCE=j.now;if((j.docs||[]).length||(j.deleted||[]).length||!LOADED){LOADED=true;scheduleRender()}}
  catch(e){if(!LOADED)toast(e.message,true)}finally{syncing=false}}
setInterval(sync,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});

async function save(coll,obj,{action,reason,silent}={}){
  const doc=clean({...obj});
  let r;try{r=await api('/api/save',{coll,doc,action:action||'',reason:reason||''})}
  catch(e){toast(e.message,true);throw e}
  upsert(coll,{...r.doc});scheduleRender();
  if(!silent)toast(obj.id?`${r.doc.no||r.doc.name||'Record'} saved`:`${r.doc.no||'Record'} created`);
  return r.doc}
async function remove(coll,obj,reason){try{await api('/api/delete',{coll,id:obj.id,reason:reason||''});S[coll]=S[coll].filter(x=>x.id!==obj.id);scheduleRender();toast('Deleted')}catch(e){toast(e.message,true)}}
async function saveSettings(next,reason){try{const r=await api('/api/settings',{settings:{...SET,...next},reason:reason||''});SET={...defaultSettings(),...r.settings};toast('Settings saved');scheduleRender()}catch(e){toast(e.message,true)}}
function audit(){}/* audit trail is written by the server on every change */
function clean(o){return JSON.parse(JSON.stringify(o,(k,v)=>v===undefined?null:v))}
async function uploadFile(f){const fd=new FormData();fd.append('file',f);return api('/api/upload',fd)}
function saveFile(filename,data,type){const b=new Blob([data],{type:type||'text/plain'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}

/* ---------- metal maths ---------- */
const purityPct=n=>{const p=(SET.purities||[]).find(x=>x.n===n);return p?num(p.p):0};
const purityMetal=n=>{const p=(SET.purities||[]).find(x=>x.n===n);return p?p.m:''};
const fineOf=(net,pur)=>r3(num(net)*purityPct(pur)/100);
const rateFor=pur=>num((SET.rates||{})[purityMetal(pur)]);
const OUT_TYPES=['Issue to production','Issue to karigar','Dispatch','Transfer out','Refining out','Scrap out'];
const IN_TYPES=['Opening stock','Purchase receipt','Return from production','Return from karigar','Finished goods receipt','Scrap receipt','Refining in','Transfer in'];
const vSign=v=>v.vtype==='Adjustment'?(v.dir==='out'?-1:1):(OUT_TYPES.includes(v.vtype)?-1:1);
const vLive=v=>v.status!=='Pending'&&v.status!=='Rejected';
function stockBalances(){
  const m={};
  S.vouchers.filter(vLive).forEach(v=>{
    const key=(v.category||'?')+'|'+(v.purity||'')+'|'+(v.lot||'');
    const b=m[key]||(m[key]={category:v.category,purity:v.purity||'',lot:v.lot||'',gross:0,net:0,fine:0,pcs:0,carat:0,loc:{}});
    const s=vSign(v);b.gross+=s*num(v.gross);b.net+=s*num(v.net);b.fine+=s*num(v.fine);b.pcs+=s*num(v.pcs);b.carat+=s*num(v.carat);
    const L=v.location||'—';b.loc[L]=(b.loc[L]||0)+s*(num(v.net)||num(v.carat)||num(v.pcs))});
  return Object.values(m)}
function metalByPurity(){const m={};stockBalances().forEach(b=>{if(!b.purity)return;const k=b.purity;m[k]=m[k]||{purity:k,net:0,fine:0};m[k].net+=b.net;m[k].fine+=b.fine});return Object.values(m).sort((a,b)=>purityPct(b.purity)-purityPct(a.purity))}

/* ---------- business helpers ---------- */
const ORDER_ST=['Draft','Awaiting Approval','Confirmed','Material Planning','In Production','QC','Ready to Pack','Partially Dispatched','Dispatched','Delivered','Closed','Cancelled'];
const LINE_ST=['Pending','In Production','QC','QC Hold','Ready','Partially Dispatched','Dispatched'];
const LEAD_ST=['New','Contacted','Qualified','Quotation Sent','Negotiation','Won','Lost','On Hold'];
const QUOTE_ST=['Draft','Awaiting Approval','Approved','Sent','Accepted','Rejected','Expired'];
const JOB_ST=['Waiting Material','Ready','In Progress','Blocked','On Hold','Completed','Cancelled'];
const DSP_ST=['Prepared','Dispatched','In Transit','Delivered','Delivery Failed / Returned'];
function stPill(s){
  const g=['Won','Approved','Accepted','Completed','Pass','Delivered','Closed','Paid','Active','Received','Ready','Ready to Pack','Dispatched','Present'];
  const w=['Awaiting Approval','Pending','Negotiation','Waiting Material','On Hold','Hold','Rework','Partially Dispatched','Partially Received','Partly Paid','QC Hold','In Transit','Quotation Sent','Open','Prepared','Sent'];
  const b=['Lost','Rejected','Cancelled','Blocked','Fail','Delivery Failed / Returned','Overdue','Inactive','Expired','Unpaid'];
  const i=['In Production','In Progress','QC','Confirmed','Material Planning','Contacted','Qualified','New','Draft'];
  const c=g.includes(s)?'good':w.includes(s)?'warn':b.includes(s)?'bad':i.includes(s)?'info':'';
  return `<span class="pill ${c}">${esc(s||'—')}</span>`}
const quoteTotals=q=>{let sub=0;(q.lines||[]).forEach(l=>sub+=lineAmt(l));const disc=num(q.discount);const taxable=sub-disc;const tax=r2(taxable*num(q.taxPct)/100);return{sub:r2(sub),disc,tax,total:r2(taxable+tax),discPct:sub?disc/sub*100:0}};
function lineAmt(l){return r2(num(l.qty||1)*(num(l.wt)*num(l.rate)+num(l.making)+num(l.stone)+num(l.other)))}
const orderOf=id=>byId('orders',id);
const custName=id=>nameOf('customers',id)||'—';
function lineQCState(orderId,idx){
  const recs=S.qc.filter(q=>q.order===orderId&&String(q.line)===String(idx)).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  const last=recs[0];if(!last)return{ok:false,label:'Not inspected'};
  if(last.result==='Pass'&&last.released)return{ok:true,label:'Released',rec:last};
  if(last.result==='Pass')return{ok:false,label:'Passed — awaiting release',rec:last};
  return{ok:false,label:last.result,rec:last}}
function dispatchedQty(orderId,idx){let q=0;S.dispatches.filter(d=>d.order===orderId&&d.status!=='Delivery Failed / Returned').forEach(d=>(d.lines||[]).forEach(l=>{if(String(l.line)===String(idx))q+=num(l.qty)}));return q}
function invoiced(custId){return S.invoices.filter(i=>!custId||i.customer===custId).reduce((s,i)=>s+num(i.total),0)}
function received(custId){return S.receipts.filter(r=>!custId||r.customer===custId).reduce((s,r)=>s+num(r.amount),0)}
function invPaid(inv){return S.receipts.filter(r=>r.invoice===inv.id).reduce((s,r)=>s+num(r.amount),0)}
function billPaid(b){return S.payments.filter(p=>p.bill===b.id).reduce((s,p)=>s+num(p.amount),0)}
function challanCalc(c){
  const issued=(c.lines||[]).reduce((a,l)=>({net:a.net+num(l.net),fine:a.fine+fineOf(l.net,l.purity),pcs:a.pcs+num(l.pcs),carat:a.carat+num(l.carat)}),{net:0,fine:0,pcs:0,carat:0});
  let back={fine:0,net:0,pcs:0,carat:0,scrapFine:0,rejected:0};
  (c.receipts||[]).forEach(r=>{back.fine+=fineOf(r.finishedNet,r.finishedPurity)+fineOf(r.returnedNet,r.returnedPurity);back.scrapFine+=fineOf(r.scrapNet,r.scrapPurity);back.net+=num(r.finishedNet)+num(r.returnedNet)+num(r.scrapNet);back.pcs+=num(r.finishedPcs);back.carat+=num(r.stonesCt);back.rejected+=num(r.rejectedPcs)});
  const variance=r3(issued.fine-back.fine-back.scrapFine);
  return{issued,back,variance,withKarigar:r3(issued.fine-back.fine-back.scrapFine)}}
function karigarWage(c){const k=byId('karigars',c.karigar);const basis=c.wageBasis||(k&&k.rateBasis)||'Per piece';const rate=num(c.wageRate||(k&&k.rate));const calc=challanCalc(c);
  let base=basis==='Per gram'?calc.back.net:basis==='Fixed job'?1:basis==='Per operation'?num(c.operations||1):calc.back.pcs;return r2(base*rate+num(c.wageAdj))}
function orderCost(o){
  const jobs=S.jobs.filter(j=>j.order===o.id).map(j=>j.id);
  let metal=0,stones=0,other=0;
  S.vouchers.filter(v=>vLive(v)&&(v.order===o.id||jobs.includes(v.job))).forEach(v=>{
    const s=-vSign(v);// issue = cost, return = credit
    if(v.vtype==='Issue to production'||v.vtype==='Return from production'||v.vtype==='Issue to karigar'||v.vtype==='Return from karigar'){
      if(v.purity)metal+=s*num(v.fine)*rateFor(v.purity);else if(/Diamond|Moissanite|Gemstone/.test(v.category||''))stones+=s*num(v.amount);else other+=s*num(v.amount)}});
  const ch=S.challans.filter(c=>c.order===o.id||jobs.includes(c.job));
  const wages=ch.reduce((s,c)=>s+karigarWage(c),0);
  const exp=S.cash.filter(e=>e.order===o.id&&e.type==='Expense').reduce((s,e)=>s+num(e.amount),0);
  const revenue=S.cash.filter(e=>e.order===o.id&&e.type==='Income').reduce((s,e)=>s+num(e.amount),0);
  const est=num(o.estimate)||((byId('quotes',o.quote)&&quoteTotals(byId('quotes',o.quote)).sub)||0);
  const cost=r2(metal+stones+other+wages+exp);
  return{metal:r2(metal),stones:r2(stones),other:r2(other),wages:r2(wages),exp:r2(exp),cost,revenue:r2(revenue),margin:r2(revenue-cost),est}}

/* ---------- order stage pipeline (customer-facing; sales can advance) ---------- */
const ORDER_STAGE=['Order received','Payment confirmed','In production','Quality check','Ready to ship','Dispatched','Delivered'];
const STAGE_ICON={'Order received':'📥','Payment confirmed':'💳','In production':'🛠','Quality check':'🔍','Ready to ship':'📦','Dispatched':'🚚','Delivered':'✅'};
const orderStage=o=>o.stage||'Order received';
const stageIdx=s=>{const i=ORDER_STAGE.indexOf(s);return i<0?0:i};

/* ---------- currency (website orders are USD; manual orders are ₹) ---------- */
const usdRate=()=>num(SET.usdInr)||88;
const ordRate=o=>num(o&&o.usdRate)||usdRate();           // per-order USD→INR rate (locked when the order is taken)
const ordCur=o=>o&&o.currency?o.currency:'INR';
const toINR=(v,cur)=>(cur&&cur!=='INR')?num(v)*usdRate():num(v);
const toINRat=(v,cur,rate)=>(cur&&cur!=='INR')?num(v)*rate:num(v);
const curSym=c=>c==='USD'?'$':c==='EUR'?'€':c==='GBP'?'£':c==='INR'||!c?'₹':c+' ';
const fcur=(v,c)=>curSym(c)+' '+num(v).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
/* both-currency label, e.g. "$ 1,200 · ₹ 1,05,600" */
function dual(v,c,rate){c=c||'INR';if(c==='INR')return money(v);return `${fcur(v,c)} <span class="note">· ${money(toINRat(v,c,rate||usdRate()))}</span>`}
const COMMISSION_PCT=()=>num(SET.commissionPct)||25;

/* ---------- payments on an order (manual / screenshot verified) ---------- */
const orderPayments=o=>Array.isArray(o.payments)?o.payments:[];
const orderPaidRaw=o=>orderPayments(o).filter(p=>p.verified).reduce((t,p)=>t+num(p.amount),0)+num(o.paidOnline);
const orderPaidPending=o=>orderPayments(o).filter(p=>!p.verified).reduce((t,p)=>t+num(p.amount),0);

/* ---------- sales figures (Ivevar profit model: value − making − courier; all normalised to INR) ---------- */
const orderSeller=o=>o.salesBy||o.createdBy;
function orderSaleRaw(o){if(num(o.saleValue))return num(o.saleValue);const q=byId('quotes',o.quote);return q?quoteTotals(q).total:0}
/* Order Value (INR) = sale value × the order's locked USD→INR rate */
function orderValueINR(o){return r2(toINRat(orderSaleRaw(o),ordCur(o),ordRate(o)))}
function orderSale(o){return orderValueINR(o)}
/* Making cost: new orders use makingCostINR; old ones fall back to costPrice */
function orderMakingINR(o){return num(o.makingCostINR)||(o.costPrice?toINRat(num(o.costPrice),ordCur(o),ordRate(o)):0)}
const orderCourierINR=o=>num(o.courierINR);
const orderReceived=o=>toINRat(orderPaidRaw(o),ordCur(o),ordRate(o))+S.cash.filter(e=>e.order===o.id&&e.type==='Income').reduce((t,e)=>t+num(e.amount),0);
/* Profit Before Marketing (INR) */
function orderProfit(o){return r2(orderValueINR(o)-orderMakingINR(o)-orderCourierINR(o))}
/* Sales-executive share of profit (default 25%) */
function orderCommission(o){return r2(orderProfit(o)*COMMISSION_PCT()/100)}

/* ---------- unique-piece inventory helpers ---------- */
function pieceProfit(p){return r2(num(p.priceUSD)-num(p.costUSD))}
function pieceStats(){const all=S.pieces;const inStock=all.filter(p=>(p.status||'In stock')==='In stock');const sold=all.filter(p=>p.status==='Sold');
  return{total:all.length,inStock:inStock.length,sold:sold.length,
    stockCostUSD:inStock.reduce((s,p)=>s+num(p.costUSD),0),stockCostINR:inStock.reduce((s,p)=>s+num(p.costINR),0),
    soldSaleUSD:sold.reduce((s,p)=>s+num(p.priceUSD),0),soldProfitUSD:sold.reduce((s,p)=>s+pieceProfit(p),0)}}
function salesStats(uid,from){const live=o=>!['Cancelled','Draft'].includes(o.status)&&(!uid||orderSeller(o)===uid)&&(!from||(o.date||'')>=from);
  const os=S.orders.filter(live);const sale=os.reduce((t,o)=>t+orderSale(o),0),rev=os.reduce((t,o)=>t+orderReceived(o),0),profit=os.reduce((t,o)=>t+orderProfit(o),0);
  const leads=S.leads.filter(l=>(!uid||l.createdBy===uid)&&(!from||(l.date||'').slice(0,10)>=from));const won=leads.filter(l=>l.stage==='Won').length;
  return{orders:os,count:os.length,sale,rev,due:sale-rev,profit,leads:leads.length,won,conv:leads.length?won/leads.length*100:0,avg:os.length?sale/os.length:0}}

/* ---------- alerts (brief §14) ---------- */
function alerts(){
  const a=[];const t=today();
  S.orders.filter(o=>!['Delivered','Closed','Cancelled','Dispatched'].includes(o.status)&&o.dueDate).forEach(o=>{const d=daysTo(o.dueDate);if(d<0)a.push({sev:'bad',mod:'orders',id:o.id,txt:`Order ${o.no} is ${-d} day(s) overdue`});else if(d<=3)a.push({sev:'warn',mod:'orders',id:o.id,txt:`Order ${o.no} due in ${d} day(s)`})});
  S.leads.filter(l=>!['Won','Lost'].includes(l.stage)&&l.nextFollow&&l.nextFollow<=t).forEach(l=>a.push({sev:l.nextFollow<t?'bad':'warn',mod:'crm',id:l.id,txt:`Follow-up ${l.nextFollow<t?'overdue':'due today'}: ${l.name||l.no}`}));
  S.jobs.filter(j=>j.status==='Blocked').forEach(j=>a.push({sev:'bad',mod:'production',id:j.id,txt:`Job ${j.no} is blocked${j.blockReason?' — '+j.blockReason:''}`}));
  S.jobs.filter(j=>!['Completed','Cancelled'].includes(j.status)&&j.plannedEnd&&j.plannedEnd<t).forEach(j=>a.push({sev:'warn',mod:'production',id:j.id,txt:`Job ${j.no} past planned end date`}));
  S.jobs.filter(j=>j.status==='Waiting Material').forEach(j=>a.push({sev:'warn',mod:'production',id:j.id,txt:`Job ${j.no} waiting for material`}));
  S.qc.filter(q=>['Fail','Hold','Rework'].includes(q.result)&&!q.closed).forEach(q=>a.push({sev:'bad',mod:'qc',id:q.id,txt:`QC ${q.result}: ${q.no} (${orderOf(q.order)?.no||''})`}));
  S.qc.filter(q=>q.result==='Pass'&&!q.released).forEach(q=>a.push({sev:'info',mod:'qc',id:q.id,txt:`QC ${q.no} passed — awaiting release`}));
  S.quotes.filter(q=>q.status==='Awaiting Approval').forEach(q=>a.push({sev:'warn',mod:'quotes',id:q.id,txt:`Quotation ${q.no} awaiting approval`}));
  S.quotes.filter(q=>['Sent','Approved'].includes(q.status)&&q.validTill&&daysTo(q.validTill)<=2).forEach(q=>a.push({sev:'warn',mod:'quotes',id:q.id,txt:`Quotation ${q.no} ${daysTo(q.validTill)<0?'expired':'expiring soon'}`}));
  S.vouchers.filter(v=>v.status==='Pending').forEach(v=>a.push({sev:'warn',mod:'inventory',id:v.id,txt:`Stock adjustment ${v.no} awaiting approval`}));
  S.wastage.filter(w=>w.status==='Pending').forEach(w=>a.push({sev:Math.abs(num(w.variance))>0?'bad':'warn',mod:'wastage',id:w.id,txt:`Metal variance ${fw(w.variance)} g fine on ${w.refNo||w.no} — needs approval`}));
  S.challans.filter(c=>c.status!=='Closed'&&c.expectedReturn&&c.expectedReturn<t).forEach(c=>a.push({sev:'warn',mod:'karigars',id:c.id,txt:`Challan ${c.no} return overdue (${nameOf('karigars',c.karigar)})`}));
  stockBalances().filter(b=>b.purity&&b.fine<-0.0005).forEach(b=>a.push({sev:'bad',mod:'inventory',txt:`Negative stock: ${b.category} ${b.purity} (${fw(b.fine)} g fine)`}));
  S.dispatches.filter(d=>d.status==='Prepared').forEach(d=>a.push({sev:'info',mod:'dispatch',id:d.id,txt:`${d.no} packed and ready to dispatch`}));
  return a}
