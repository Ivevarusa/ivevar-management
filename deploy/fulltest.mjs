const B='http://127.0.0.1:8787';
let pass=0,fail=0;const fails=[];
const ok=(c,m)=>{if(c){pass++}else{fail++;fails.push(m);console.log('✗',m)}};
async function call(tok,path,body,method){const r=await fetch(B+path,{method:method||(body?'POST':'GET'),headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{})},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}return{s:r.status,j}}
const login=async(e,p)=>(await call(null,'/api/login',{email:e,password:p})).j.token;
const save=(t,coll,doc,extra={})=>call(t,'/api/save',{coll,doc,...extra});
const mkuser=(t,b)=>call(t,'/api/users',b);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// 0. setup owner
let r=await call(null,'/api/setup',{name:'Ankit Koshiya',email:'owner@ivevar.com',password:'testpass123'});
ok(r.s===200&&r.j.token,'owner setup');
const admin=r.j.token;

// 1. create 8 staff with titles
const staff=[
 ['CEO Aumsri','ceo@ivevar.com','CEO'],
 ['Asha Accounts','acc@ivevar.com','Accountant'],
 ['Ravi Sales','ravi@ivevar.com','Sales'],
 ['Sita Sales','sita@ivevar.com','Sales'],
 ['Gita Sales','gita@ivevar.com','Sales'],
 ['Dev Courier','dev@ivevar.com','Courier'],
 ['Manu Helper','manu@ivevar.com','Helper'],
];
for(const [n,e,t] of staff){const rr=await mkuser(admin,{name:n,email:e,role:t==='CEO'?'office':'office',title:t,active:true,password:'pass12345',shiftStart:t==='Courier'?'23:00':'09:00',shiftEnd:t==='Courier'?'06:00':'18:00',salary:25000});ok(rr.s===200,'create '+t+' '+(rr.j.error||''))}
const ceo=await login('ceo@ivevar.com','pass12345');
const acc=await login('acc@ivevar.com','pass12345');
const ravi=await login('ravi@ivevar.com','pass12345');
const dev=await login('dev@ivevar.com','pass12345');
const manu=await login('manu@ivevar.com','pass12345');
ok(ceo&&acc&&ravi&&dev&&manu,'all staff can log in');

// 2. me / title present
const me=await call(ravi,'/api/me');ok(me.j.user.title==='Sales'&&me.j.user.role==='office','sales title on /api/me');
const meA=await call(acc,'/api/me');ok(meA.j.user.title==='Accountant','accountant title');

// 3. permission boundaries
ok((await call(ravi,'/api/users',{name:'x',email:'x@x.com',role:'office',title:'Sales',active:true,password:'pass12345'})).s===403,'sales cannot create users');
ok((await call(manu,'/api/sync')).s===200,'helper can sync');
// helper cannot write accounts
ok((await save(manu,'invoices',{customer:'c',amount:5})).s===403,'helper blocked from accounts');
// courier cannot write crm
ok((await save(dev,'leads',{name:'X',source:'Website'})).s===403,'courier blocked from crm');
// sales CAN write crm/orders
const cust=(await save(ravi,'customers',{name:'John US',email:'john@us.com',phone:'+1 555 1',country:'USA'})).j.doc;
ok(cust&&cust.id,'sales creates customer');
const lead=(await save(ravi,'leads',{name:'John US',source:'Website',stage:'New'})).j.doc;
ok(/^LEAD-/.test(lead.no),'sales creates lead '+lead.no);

// 4. order flow (USD) + stage + payments + verify
const ord=(await save(ravi,'orders',{customer:cust.id,currency:'USD',saleValue:1200,costPrice:400,status:'Confirmed',stage:'Order received',date:'2026-11-03',dueDate:'2026-11-25',salesBy:(await call(ravi,'/api/me')).j.user.id,lines:[{desc:'2ct Oval Ring',qty:1,status:'Pending',price:1200}]})).j.doc;
ok(/^IVM\d+$/.test(ord.no),'order gets auto IVM id '+ord.no);
const ord_b=(await save(ravi,'orders',{customer:cust.id,currency:'USD',saleValue:500,status:'Confirmed',stage:'Order received',date:'2026-11-03',dueDate:'2026-11-25',lines:[{desc:'Pendant',qty:1}]})).j.doc;
ok(/^IVM\d+$/.test(ord_b.no)&&ord_b.no!==ord.no&&parseInt(ord_b.no.slice(3))===parseInt(ord.no.slice(3))+1,'order ids are continuous '+ord.no+' → '+ord_b.no);
// sales cannot cancel (no approve)
ok((await save(ravi,'orders',{...ord,status:'Cancelled'})).s===403,'sales cannot cancel order');
// CEO can cancel/approve
const ceoCancelTest=(await save(ceo,'orders',{...ord,status:'Confirmed'}));ok(ceoCancelTest.s===200,'CEO can edit order');
// sales advances stage
let o2=(await save(ravi,'orders',{...ord,stage:'Payment confirmed'})).j.doc;
ok(o2.stage==='Payment confirmed'&&(o2.stageHistory||[]).length>=1,'sales advances stage + history logged');
// add payment (unverified)
const pid='p'+Date.now();
o2=(await save(ravi,'orders',{...o2,payments:[{pid,amount:600,currency:'USD',method:'PayPal',date:'2026-11-03',verified:false}]})).j.doc;
ok((o2.payments||[]).length===1&&!o2.payments[0].verified,'sales adds unverified payment');
// sales cannot verify
const salesVerify=await save(ravi,'orders',{...o2,payments:[{...o2.payments[0],verified:true}]});
ok(salesVerify.s===403,'sales cannot verify payment');
// accountant verifies
const accVerify=await save(acc,'orders',{...o2,payments:[{...o2.payments[0],verified:true}]});
ok(accVerify.s===200&&accVerify.j.doc.payments[0].verified&&accVerify.j.doc.payments[0].verifiedBy,'accountant verifies payment + verifier stamped');

// 5. pieces inventory (every piece unique)
const pc=(await save(ravi,'pieces',{name:'1.5ct Round Solitaire',metal:'14K White Gold',stone:'Lab-grown Diamond',costUSD:300,costINR:26400,priceUSD:900,status:'In stock'})).j.doc;
ok(/^IVP-/.test(pc.no),'piece created with auto number '+pc.no);
const pcSold=(await save(ravi,'pieces',{...pc,status:'Sold',priceUSD:950,soldBy:(await call(ravi,'/api/me')).j.user.id,soldDate:'2026-11-03'})).j.doc;
ok(pcSold.status==='Sold'&&pcSold.soldDate,'piece marked sold');

// 6. attendance: multiple sessions + selfie/gps + validation
const p1=await call(ravi,'/api/punch',{action:'in',photo:{url:'/files/abc'},lat:21.17,lng:72.83});
ok(p1.s===200&&(p1.j.doc.sessions||[]).length===1,'punch in creates session');
const p1b=await call(ravi,'/api/punch',{action:'in',photo:{url:'/files/x'}});
ok(p1b.s!==200,'cannot check in twice without checkout');
const pOutShort=await call(ravi,'/api/punch',{action:'out',report:'hi'});
ok(pOutShort.s!==200,'checkout needs a real report');
const pOut=await call(ravi,'/api/punch',{action:'out',report:'Called 6 customers and sent 2 quotes',photo:{url:'/files/y'}});
ok(pOut.s===200&&pOut.j.doc.sessions[0].out,'punch out closes session with report');
const p2=await call(ravi,'/api/punch',{action:'in',photo:{url:'/files/z'}});
ok(p2.s===200&&p2.j.doc.sessions.length===2,'second check-in = new session (multiple entries/day)');

// 7. dispatch + tracking
const disp=(await save(dev,'dispatches',{order:ord.id,date:'2026-11-03',status:'Prepared',courier:'FedEx',agency:'Malca-Amit',tracking:'TRK123',courierPerson:'Dev',lines:[{line:0,qty:1,desc:'Ring'}]})).j.doc;
ok(/^DSP-/.test(disp.no),'courier creates dispatch '+disp.no);
const track=await save(dev,'dispatches',{...disp,status:'In Transit',trackStatus:'Export customs',trackHistory:[{status:'Export customs',ts:new Date().toISOString()}]});
ok(track.s===200,'courier updates tracking');

// 8. integration key scrubbing
await call(admin,'/api/settings',{settings:{...( (await call(admin,'/api/sync')).j.settings||{}),integrations:{waToken:'SECRET123',emailKey:'EK',waNumber:'+91'}}});
const syncRavi=await call(ravi,'/api/sync');
const syncAdmin=await call(admin,'/api/sync');
ok((syncAdmin.j.settings?.integrations?.waToken||'')==='SECRET123','admin sees integration token');
ok((syncRavi.j.settings?.integrations?.waToken||'')==='','sales does NOT see integration token (scrubbed)');
ok((syncRavi.j.settings?.integrations?.waNumber||'')==='+91','sales still sees non-secret integration field');

// 9. sync returns pieces + order payments to sales
const sy=await call(ravi,'/api/sync');
const docs=sy.j.docs||[];
ok(docs.some(d=>d.coll==='pieces'),'pieces synced to sales');
const ordDoc=docs.find(d=>d.coll==='orders'&&d.id===ord.id);
ok(ordDoc&&(ordDoc.body.payments||[]).length>=1,'order payments synced');

// 10. users list: accountant sees salary (hr), sales does not
const accUsers=(await call(acc,'/api/sync')).j.users||[];
const raviUsers=(await call(ravi,'/api/sync')).j.users||[];
ok(accUsers.some(u=>typeof u.salary==='number'&&u.salary>0),'accountant sees staff salary');
ok(raviUsers.every(u=>u.salary===undefined),'sales does NOT see salary');
// but everyone sees title + shift (needed for dashboards)
ok(raviUsers.some(u=>u.title==='Courier'&&u.shift&&u.shift.start==='23:00'),'shift visible for attendance calc');

// 10b. Sales preset now includes dispatch (quotes/orders/inventory/dispatch)
ok((await save(ravi,'dispatches',{order:ord.id,date:'2026-11-03',status:'Prepared',courier:'FedEx',lines:[{line:0,qty:1}]})).s===200,'sales can create dispatch (new Sales preset)');

// 11. internal chat
const raviId=(await call(ravi,'/api/me')).j.user.id;
const accId=(await call(acc,'/api/me')).j.user.id;
const devId=(await call(dev,'/api/me')).j.user.id;
const om=(await save(ravi,'messages',{channel:'office',text:'Hi team 👋'})).j.doc;
ok(om&&om.from===raviId&&om.channel==='office','office message sent, sender stamped');
const accSync=await call(acc,'/api/sync');
ok((accSync.j.docs||[]).some(d=>d.coll==='messages'&&d.id===om.id),'office message visible to other staff');
// DM ravi <-> acc
const dm='dm:'+[raviId,accId].sort().join('|');
const dmMsg=(await save(ravi,'messages',{channel:dm,text:'Private note 🔒'})).j.doc;
ok(dmMsg&&dmMsg.channel===dm,'DM message sent');
const devSync=(await call(dev,'/api/sync')).j.docs||[];
ok(!devSync.some(d=>d.coll==='messages'&&d.id===dmMsg.id),'DM NOT visible to a non-member (dev)');
const accSync2=(await call(acc,'/api/sync')).j.docs||[];
ok(accSync2.some(d=>d.coll==='messages'&&d.id===dmMsg.id),'DM visible to the other member (acc)');
// dev cannot send into someone else's DM
ok((await save(dev,'messages',{channel:dm,text:'butting in'})).s===403,'outsider cannot post into a DM');
// non-sender can react but not edit text
const react=await save(dev,'messages',{...om,reactions:{'👍':[devId]}});
ok(react.s===200&&react.j.doc.reactions['👍'].includes(devId),'non-sender can react (👍)');
const editOther=await save(dev,'messages',{...om,text:'hacked'});
ok(editOther.s===403,'non-sender cannot edit someone else\'s message text');

// 12. department on user
const depU=await mkuser(admin,{name:'Dept Test','email':'dept@ivevar.com',role:'office',title:'Sales',dept:'Sales',active:true,password:'pass12345'});
ok(depU.s===200&&(depU.j.users||[]).some(u=>u.email==='dept@ivevar.com'&&u.dept==='Sales'),'user saved with department');

console.log(`\n${pass} passed, ${fail} failed`);
if(fail){console.log('FAILURES:');fails.forEach(f=>console.log('  - '+f));process.exit(1)}
else console.log('ALL GREEN ✅');
