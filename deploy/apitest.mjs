const B='http://127.0.0.1:8787';
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('✓',m)}else{fail++;console.log('✗',m)}};
async function call(tok,path,body){const r=await fetch(B+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{})},body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch(e){}return{s:r.status,j}}
const login=async(e,p)=>(await call(null,'/api/login',{email:e,password:p})).j.token;
const save=(t,coll,doc,extra={})=>call(t,'/api/save',{coll,doc,...extra});

const admin=await login('owner@ivevar.com','testpass123');ok(!!admin,'admin login');
ok((await call(null,'/api/login',{email:'owner@ivevar.com',password:'wrong'})).s===401,'wrong password rejected');
ok((await call(null,'/api/sync')).s===401,'API refuses requests without login');
for(const [n,e,r] of [['Ravi Sales','ravi@ivevar.com','employee'],['Meena QC','meena@ivevar.com','qc'],['Dev Dispatch','dev@ivevar.com','dispatch'],['Asha Accounts','asha@ivevar.com','accountant'],['Mohan Manager','mohan@ivevar.com','manager']])
  ok((await call(admin,'/api/users',{name:n,email:e,role:r,active:true,password:'pass12345'})).s===200,'create user '+r);
const emp=await login('ravi@ivevar.com','pass12345'),qc=await login('meena@ivevar.com','pass12345'),dsp=await login('dev@ivevar.com','pass12345'),acc=await login('asha@ivevar.com','pass12345'),mgr=await login('mohan@ivevar.com','pass12345');
ok((await call(emp,'/api/users',{name:'X',email:'x@x.com',role:'admin',active:true,password:'pass12345'})).s===403,'employee cannot create users');
ok((await save(qc,'invoices',{customer:'c',amount:5})).s===403,'QC user blocked from accounts (server-side)');

const lead=(await save(emp,'leads',{name:'John Carter',phone:'+1 555 0100',email:'john@x.com',source:'Website',stage:'New'})).j.doc;
ok(/^LEAD-\d{4}-000001$/.test(lead.no),'lead auto-number '+lead.no);
const cust=(await save(emp,'customers',{name:'John Carter',phone:'+1 555 0100'})).j.doc;
const q=(await save(emp,'quotes',{customer:cust.id,lead:lead.id,status:'Approved',discount:5000,taxPct:3,lines:[{desc:'Ring',purity:'14K',qty:1,wt:4,rate:7600,making:2000}]})).j.doc;
ok(q.status==='Awaiting Approval','big discount by employee forced to Awaiting Approval');
const q2=(await save(mgr,'quotes',{...q,status:'Approved'})).j.doc;ok(q2.status==='Approved'&&q2.approvedBy,'manager approves quote');
const ord=(await save(emp,'orders',{customer:cust.id,quote:q.id,status:'Confirmed',dueDate:'2026-11-20',lines:[{desc:'Ring',purity:'14K',qty:1,status:'Pending'},{desc:'Pendant',purity:'14K',qty:2,status:'Pending'}]})).j.doc;
ok(/^JWL-\d{4}-000001$/.test(ord.no),'order number '+ord.no);
ok((await save(emp,'orders',{...ord,status:'Cancelled'})).s===403,'employee cannot cancel order');

const op=(await save(admin,'vouchers',{vtype:'Opening stock',category:'Gold',purity:'14K',net:100,gross:100,fine:999})).j.doc;
ok(op.fine===58.5&&op.status==='Approved','server recomputes fine weight (100g 14K = 58.5g fine)');
ok((await save(admin,'vouchers',{...op,net:200})).s===403,'vouchers cannot be edited');
ok((await save(emp,'vouchers',{vtype:'Opening stock',category:'Gold',net:5})).s===403,'metal voucher without purity rejected');
const adj=(await save(mgr,'vouchers',{vtype:'Adjustment',dir:'out',category:'Gold',purity:'14K',net:1,reason:'count'})).j.doc;
ok(adj.status==='Pending','adjustment goes to Pending');
ok((await save(mgr,'vouchers',{...adj,status:'Approved'})).s===403,'maker-checker: maker cannot approve own adjustment');
ok((await save(admin,'vouchers',{...adj,status:'Approved'})).j.doc?.status==='Approved','different approver approves');

const job=(await save(emp,'jobs',{order:ord.id,line:0,product:'Ring',qty:1,mode:'In-house',route:['Casting','Quality Control'],step:0,status:'In Progress'})).j.doc;ok(!!job.no,'job card '+job.no);
const ch=(await save(emp,'challans',{karigar:'k1',job:job.id,order:ord.id,status:'Open',lines:[{category:'Gold',purity:'14K',net:10}]})).j.doc;
ok((await save(emp,'challans',{...ch,lines:[{category:'Gold',purity:'14K',net:8}]})).s===403,'issued challan materials locked');
const w=(await save(emp,'wastage',{source:'Karigar',issuedFine:5.85,accountedFine:5.5,recovered:0.1,expectedPct:0.5})).j.doc;
ok(w.status==='Pending'&&Math.abs(w.variance-0.25)<1e-9,'variance computed on server and pending');
ok((await save(mgr,'wastage',{...w,status:'Approved'})).s===403,'cannot approve unexplained variance above tolerance');
ok((await save(mgr,'wastage',{...w,status:'Approved',explanation:'Polishing loss confirmed'})).j.doc?.status==='Approved','approve with explanation');

const qf=(await save(qc,'qc',{order:ord.id,line:0,result:'Fail',defect:'Porosity'})).j.doc;
const inv=(await save(acc,'invoices',{customer:cust.id,order:ord.id,amount:50000,taxPct:3,total:51500})).j.doc;ok(/^INV-/.test(inv.no),'invoice '+inv.no);
const d=(await save(dsp,'dispatches',{order:ord.id,lines:[{line:0,qty:1}],invoice:inv.id,courier:'FedEx',tracking:'123',status:'Prepared'})).j.doc;
let r=await save(dsp,'dispatches',{...d,status:'Dispatched'});ok(r.s===403&&/QC/.test(r.j.error),'dispatch blocked: QC failed → '+r.j.error);
const qp=(await save(qc,'qc',{order:ord.id,line:0,result:'Pass',checks:['x']})).j.doc;
r=await save(dsp,'dispatches',{...d,status:'Dispatched'});ok(r.s===403,'dispatch blocked: passed but not released');
ok((await save(emp,'qc',{...qp,released:true})).s===403,'employee cannot release QC');
ok((await save(qc,'qc',{...qp,released:true})).j.doc?.released===true,'QC approver releases');
r=await save(dsp,'dispatches',{...d,status:'Dispatched'});ok(r.s===200&&r.j.doc.shippedBy,'dispatch allowed after release (partial: item #1 only)');
ok((await save(emp,'invoices',{...inv,amount:1})).s===403,'posted invoice edit blocked for non-approver');
ok((await call(emp,'/api/delete',{coll:'orders',id:ord.id})).s===403,'only admin can delete');
ok((await call(admin,'/api/delete',{coll:'vouchers',id:op.id})).s===403,'stock vouchers can never be deleted');

const sq=(await call(qc,'/api/sync?since=0')).j;ok(!sq.docs.some(x=>x.coll==='invoices'||x.coll==='leads'),'QC user does not receive accounts or CRM data');
ok(sq.docs.filter(x=>x.coll==='employees').every(x=>!('salary' in x.body)),'salaries hidden from non-HR');
const au=(await call(admin,'/api/audit')).j.rows;ok(au.length>20&&au.some(a=>a.action==='update'&&a.changes.includes('released')),'audit trail captured '+au.length+' entries with field changes');
ok((await call(emp,'/api/audit')).s===403,'employee cannot read audit log');
for(let i=0;i<5;i++)await call(null,'/api/login',{email:'ravi@ivevar.com',password:'bad'});
ok((await call(null,'/api/login',{email:'ravi@ivevar.com',password:'pass12345'})).s===429,'account locks after 5 wrong passwords');
console.log(`\n${pass} passed, ${fail} failed`);
