import puppeteer from 'puppeteer-core';
const B='http://127.0.0.1:8787';const J=(p,b,t)=>fetch(B+p,{method:'POST',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:JSON.stringify(b)}).then(r=>r.json().then(j=>({s:r.status,j})));
const a=(await J('/api/setup',{name:'Ankit',email:'owner@ivevar.com',password:'testpass123'})).j.token;
await J('/api/users',{name:'Aumsri',email:'aum@ivevar.com',role:'office',active:true,password:'pass12345',modules:['crm','orders']},a);
await J('/api/users',{name:'Ravi',email:'ravi@ivevar.com',role:'office',active:true,password:'pass12345',modules:['crm','orders']},a);
const u=(await J('/api/login',{email:'aum@ivevar.com',password:'pass12345'})).j;const aum=u.token,aumId=u.user.id;
const rv=(await J('/api/login',{email:'ravi@ivevar.com',password:'pass12345'})).j;
// tasks
const t1=(await J('/api/save',{coll:'tasks',doc:{title:'Call John about ring size',assignedTo:aumId,due:'2026-11-03',priority:'High',status:'Open'}},a));console.log('admin gives task:',t1.s,t1.j.doc?.no);
console.log('staff gives task to other (blocked):',(await J('/api/save',{coll:'tasks',doc:{title:'x',assignedTo:rv.user.id,status:'Open'}},aum)).s);
console.log('forged _as/internal ignored:',(await J('/api/save',{coll:'invoices',doc:{amount:1},_as:{id:'x',role:'admin'}},aum)).s);
console.log('staff edits title of admin task (blocked):',(await J('/api/save',{coll:'tasks',doc:{...t1.j.doc,title:'changed'}},aum)).s);
const d=await J('/api/save',{coll:'tasks',doc:{...t1.j.doc,status:'Done'}},aum);console.log('staff marks done:',d.s,d.j.doc?.status,!!d.j.doc?.doneAt,'createdBy kept:',d.j.doc?.createdBy!==aumId);
console.log('other staff cannot see it:',!(await (await fetch(B+'/api/sync?since=0',{headers:{authorization:'Bearer '+rv.token}})).json()).docs.some(x=>x.coll==='tasks'));
// punch
console.log('in:',(await J('/api/punch',{action:'in'},aum)).s,'again:',(await J('/api/punch',{action:'in'},aum)).j.error);
console.log('out before in:',(await J('/api/punch',{action:'out'},rv.token)).j.error);
console.log('punch via save blocked:',(await J('/api/save',{coll:'punch',doc:{user:aumId,in:'2020-01-01'}},aum)).s);
await J('/api/punch',{action:'in'},a);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const errs=[];
for(const [em,pw,file] of [['owner@ivevar.com','testpass123','dash_admin.png'],['aum@ivevar.com','pass12345','dash_staff.png']]){
 const ctx=await b.createBrowserContext();const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.emulateTimezone('Asia/Kolkata');await p.setViewport({width:1400,height:900});
 await p.goto(B+'/',{waitUntil:'domcontentloaded'});await new Promise(x=>setTimeout(x,800));
 await p.type('#lEmail',em);await p.type('#lPw',pw);await p.click('#lf button[type=submit]');await new Promise(x=>setTimeout(x,1500));
 if(file==='dash_admin.png'){console.log('blurred:',await p.evaluate(()=>document.querySelectorAll('.blurv').length));await p.screenshot({path:file,fullPage:true});await p.click('.eye');await new Promise(x=>setTimeout(x,300));console.log('after eye:',await p.evaluate(()=>document.querySelectorAll('.blurv').length));
   await p.evaluate(()=>{const b=[...document.querySelectorAll('.btn.pri')].find(x=>x.textContent.includes('+ New task'));b.click()});await new Promise(x=>setTimeout(x,300));console.log('task form:',await p.evaluate(()=>document.querySelector('.modal h2')?.textContent));}
 else {await p.evaluate(()=>{const b=[...document.querySelectorAll('.pbtn')].find(x=>x.textContent==='OUT');b&&b.click()});await new Promise(x=>setTimeout(x,800));await p.screenshot({path:file,fullPage:true});console.log('staff punch:',await p.evaluate(()=>document.querySelector('.inout').innerText.replace(/\n/g,' ')));}
 await ctx.close()}
console.log('errors',errs);await b.close();
