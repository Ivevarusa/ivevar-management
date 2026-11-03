// Deep adversarial QA: 10 users, RBAC matrix, validation, edge data, order-number race.
const B='http://127.0.0.1:8790';
let pass=0,fail=0;const fails=[];
const ok=(c,m)=>{if(c)pass++;else{fail++;fails.push(m);console.log('✗',m)}};
async function call(tok,path,body,method){const r=await fetch(B+path,{method:method||(body?'POST':'GET'),headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{})},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}return{s:r.status,j}}
const login=async(e,p)=>(await call(null,'/api/login',{email:e,password:p})).j.token;
const save=(t,coll,doc,extra={})=>call(t,'/api/save',{coll,doc,...extra});
const mkuser=(t,b)=>call(t,'/api/users',b);

// 0. owner
let r=await call(null,'/api/setup',{name:'Ankit Owner',email:'owner@ivevar.com',password:'ownerpass1'});
ok(r.s===200&&r.j.token,'owner setup'); const admin=r.j.token;

// 1. ten users
const defs=[
 ['Admin Two','admin2@ivevar.com','admin',null,25],
 ['Aumsri CEO','ceo@ivevar.com','office','CEO',0],
 ['Asha Accountant','acc@ivevar.com','office','Accountant',0],
 ['Ravi Sales','ravi@ivevar.com','office','Sales',25],
 ['Sita Sales','sita@ivevar.com','office','Sales',30],
 ['Gita Sales(salary)','gita@ivevar.com','office','Sales',''],   // salary only, no commission
 ['Dev Courier','courier@ivevar.com','office','Courier',0],
 ['Manu Helper','helper@ivevar.com','office','Helper',0],
 ['Cus Custom','custom@ivevar.com','office','Custom',0],          // custom modules below
 ['Old Inactive','inactive@ivevar.com','office','Helper',0],
];
for(const [n,e,role,title,cp] of defs){
  const b={name:n,email:e,role,active:e==='inactive@ivevar.com'?false:true,password:'staffpass1'};
  if(title)b.title=title; if(cp!=='')b.commPct=cp;
  if(title==='Custom')b.modules=['orders','inventory'];
  const rr=await mkuser(admin,b); ok(rr.s===200,'create '+n+' '+(rr.j.error||''));
}
const ceo=await login('ceo@ivevar.com','staffpass1');
const acc=await login('acc@ivevar.com','staffpass1');
const ravi=await login('ravi@ivevar.com','staffpass1');
const sita=await login('sita@ivevar.com','staffpass1');
const courier=await login('courier@ivevar.com','staffpass1');
const helper=await login('helper@ivevar.com','staffpass1');
const custom=await login('custom@ivevar.com','staffpass1');
ok(ceo&&acc&&ravi&&sita&&courier&&helper&&custom,'all active staff log in');
ok(!(await login('inactive@ivevar.com','staffpass1')),'inactive user CANNOT log in');

// 2. commission stored per-user
const usersList=(await mkuser(admin,{})); // no-op? actually posts empty -> error; fetch via sync instead
const sync=await call(admin,'/api/sync'); const U=(sync.j.users||[]);
const uRavi=U.find(u=>u.email==='ravi@ivevar.com');
// users in sync are limited fields; use /api/users list returned on a real edit instead:
const listR=await mkuser(admin,{id:uRavi.id,name:'Ravi Sales',email:'ravi@ivevar.com',role:'office',title:'Sales',active:true,commPct:25});
const full=listR.j.users||[];
ok((full.find(u=>u.email==='ravi@ivevar.com')||{}).commPct===25,'Ravi commPct=25 persisted');
ok((full.find(u=>u.email==='gita@ivevar.com')||{}).commPct===0,'Gita (salary only) commPct=0');

// 3. RBAC — orders
const mkOrder=(t,extra={})=>save(t,'orders',{customer:'',currency:'USD',saleValue:1000,makingCostINR:8800,courierINR:0,status:'Confirmed',priority:'Normal',lines:[{desc:'Ring',qty:1,status:'Pending'}],...extra});
let o1=await mkOrder(ravi); ok(o1.s===200&&/^IVM\d+$/.test(o1.j.doc.no),'Sales can create order '+(o1.j.doc?.no||o1.j.error));
const oid=o1.j.doc.id, ono=o1.j.doc.no;
// Sales cannot cancel/close
let cancel=await save(ravi,'orders',{...o1.j.doc,id:oid,status:'Cancelled'});
ok(cancel.s===403,'Sales CANNOT cancel order (got '+cancel.s+')');
// CEO can cancel
let cancel2=await save(ceo,'orders',{...o1.j.doc,id:oid,status:'Cancelled'});
ok(cancel2.s===200,'CEO CAN cancel order (got '+cancel2.s+' '+(cancel2.j.error||'')+')');

// 4. PAYMENT VERIFY RBAC
let o2=await mkOrder(ravi); const oid2=o2.j.doc.id;
// Sales adds UNVERIFIED payment (allowed)
let payAdd=await save(ravi,'orders',{...o2.j.doc,id:oid2,payments:[{pid:'p1',amount:500,verified:false,method:'PayPal',by:'ravi'}]});
ok(payAdd.s===200,'Sales can add unverified payment screenshot');
// Sales tries to VERIFY own payment -> must be blocked
let payVerifySales=await save(ravi,'orders',{...payAdd.j.doc,id:oid2,payments:[{pid:'p1',amount:500,verified:true,method:'PayPal',by:'ravi'}]});
ok(payVerifySales.s===403,'Sales CANNOT verify a payment (got '+payVerifySales.s+')');
// Accountant verifies -> allowed, stamps verifiedBy
let payVerifyAcc=await save(acc,'orders',{...payAdd.j.doc,id:oid2,payments:[{pid:'p1',amount:500,verified:true,method:'PayPal',by:'ravi'}]});
ok(payVerifyAcc.s===200,'Accountant CAN verify payment (got '+payVerifyAcc.s+' '+(payVerifyAcc.j.error||'')+')');
ok(payVerifyAcc.j.doc&&payVerifyAcc.j.doc.payments[0].verifiedBy,'verifiedBy stamped on approval');
// CEO can also verify (approve on orders)
let o2b=await mkOrder(sita);const oid2b=o2b.j.doc.id;
let addB=await save(sita,'orders',{...o2b.j.doc,id:oid2b,payments:[{pid:'q1',amount:200,verified:false,by:'sita'}]});
let ceoVer=await save(ceo,'orders',{...addB.j.doc,id:oid2b,payments:[{pid:'q1',amount:200,verified:true,by:'sita'}]});
ok(ceoVer.s===200,'CEO can verify payment');

// 5. CURRENCY RATE LOCK — non-admin cannot change fxRates
const getS=await call(admin,'/api/settings',{settings:{fxRates:{USD:88,AUD:58,INR:1},usdInr:88}});
ok(getS.s===200,'admin sets fx rates');
let salesRate=await call(ravi,'/api/settings',{settings:{fxRates:{USD:50,AUD:58,INR:1},usdInr:50}});
ok(salesRate.s===403,'Sales CANNOT change currency rates (got '+salesRate.s+')');
let ceoRate=await call(ceo,'/api/settings',{settings:{fxRates:{USD:90,INR:1},usdInr:90}});
// NOTE: CEO title has OFFICE_MODS which EXCLUDES setup -> can(setup,approve)=false; has masters? yes. fxRates not a list -> should be 403
ok(ceoRate.s===403,'CEO CANNOT change rates either (only admin; got '+ceoRate.s+')');

// 6. delete protection
let del=await call(ravi,'/api/delete',{coll:'orders',id:oid2}); ok(del.s===403,'Sales cannot delete orders');
let delFin=await call(admin,'/api/delete',{coll:'payments',id:'x'}); ok(delFin.s===403,'even admin cannot hard-delete financial coll');

// 7. self-protection
const meAdmin=(await call(admin,'/api/me')).j.user;
let selfDeact=await mkuser(admin,{id:meAdmin.id,name:meAdmin.name,email:meAdmin.email,role:'admin',active:false});
ok(selfDeact.s!==200,'admin cannot deactivate self (got '+selfDeact.s+')');

// 8. module boundaries — Helper cannot write cash (accounts), Custom limited
let helperCash=await save(helper,'cash',{type:'Expense',amount:100,account:'Cash'}); ok(helperCash.s===403,'Helper cannot write cash/accounts');
let customCrm=await save(custom,'leads',{name:'Lead X'}); ok(customCrm.s===403,'Custom(orders,inventory) cannot write CRM leads');
let customInv=await save(custom,'pieces',{name:'Piece A',status:'In stock'}); ok(customInv.s===200,'Custom CAN write inventory pieces ('+(customInv.j.error||'ok')+')');

// 9. validation edges
let cash0=await save(acc,'cash',{type:'Expense',amount:0,account:'Cash'}); ok(cash0.s===403||cash0.s===400,'cash amount 0 rejected (got '+cash0.s+')');
let cashNeg=await save(acc,'cash',{type:'Income',amount:-50,account:'Cash'}); ok(cashNeg.s===403||cashNeg.s===400,'cash negative rejected (got '+cashNeg.s+')');
let badColl=await save(admin,'nosuchcoll',{x:1}); ok(badColl.s===400||badColl.s===403,'unknown collection rejected');
// XSS round-trip (server should store raw; client escapes on render)
let xss=await save(admin,'customers',{name:'<img src=x onerror=alert(1)>',email:'xss@x.com'});
ok(xss.s===200&&xss.j.doc.name.includes('<img'),'XSS payload stored verbatim (client-side esc handles render)');
// huge number
let huge=await mkOrder(admin,{saleValue:1e15}); ok(huge.s===200,'huge saleValue accepted without crash');
// id injection attempt -> treated as NEW (regex rejects), does not overwrite
let inj=await save(admin,'customers',{id:"x' OR '1'='1",name:'Inj',email:'inj@x.com'});
ok(inj.s===200&&inj.j.doc.id!=="x' OR '1'='1",'SQL-ish id rejected -> new random id');

// 10. ORDER NUMBER RACE — 10 concurrent creates must be unique & sequential-ish
const burst=await Promise.all(Array.from({length:10},()=>mkOrder(ravi)));
const nos=burst.map(x=>x.j.doc&&x.j.doc.no).filter(Boolean);
ok(nos.length===10,'10 concurrent orders all created');
ok(new Set(nos).size===10,'10 concurrent order numbers are UNIQUE (no duplicates) — got '+JSON.stringify(nos));

// 11. dispatch gating — Courier cannot dispatch without QC release
let o3=await mkOrder(ceo);const oid3=o3.j.doc.id;
let disp=await save(courier,'dispatches',{order:oid3,status:'Dispatched',courier:'DHL',tracking:'TRK1',lines:[{line:0}]});
ok(disp.s===403,'Dispatch blocked when item not QC-released (got '+disp.s+' '+(disp.j.error||'')+')');

console.log(`\n${pass} passed, ${fail} failed`);
if(fails.length){console.log('--- FAILURES ---');fails.forEach(f=>console.log(' •',f))}
