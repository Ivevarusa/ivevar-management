import puppeteer from 'puppeteer-core';
const B='http://127.0.0.1:8787';
const call=async(t,path,body)=>{const r=await fetch(B+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',authorization:'Bearer '+t},body:body?JSON.stringify(body):undefined});return{s:r.status,j:await r.json()}};
const t=(await (await fetch(B+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'owner@ivevar.com',password:'testpass123'})})).json()).token;
const m=new Date().toISOString().slice(0,7);
for(const d of [{type:'Income',category:'Opening balance',account:'Cash',amount:50000,date:m+'-01'},{type:'Income',category:'Opening balance',account:'Bank',amount:200000,date:m+'-01'},{type:'Income',category:'Sales (ivevar.com)',account:'Bank',amount:85000,party:'John Carter',date:m+'-02'},{type:'Expense',category:'Courier / shipping',account:'Cash',amount:6500,party:'FedEx',date:m+'-02'},{type:'Transfer',account:'Bank',to:'Cash',amount:20000,date:m+'-02'}]){const r=await call(t,'/api/save',{coll:'cash',doc:d});console.log(r.s,r.j.doc?.no||r.j.error)}
console.log('bad amount:',(await call(t,'/api/save',{coll:'cash',doc:{type:'Expense',account:'Cash',amount:0}})).j.error);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:1400,height:900});await p.goto(B+'/',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,800));
await p.type('#lEmail','owner@ivevar.com');await p.type('#lPw','testpass123');await p.click('#lf button[type=submit]');await new Promise(r=>setTimeout(r,1500));
await p.evaluate(()=>location.hash='accounts');await new Promise(r=>setTimeout(r,700));
console.log(await p.evaluate(()=>[...document.querySelectorAll('.kpi')].map(k=>k.innerText.replace(/\n/g,' ')).join(' | ')));
await p.screenshot({path:'cash.png'});
for(const tb of ['in','out','sum']){await p.evaluate(x=>{TAB.acc=x;render()},tb);await new Promise(r=>setTimeout(r,300))}
await p.evaluate(()=>{TAB.acc='book';render()});await p.click('#view .phead .act .btn.pri');await new Promise(r=>setTimeout(r,300));console.log('form:',await p.evaluate(()=>document.querySelector('.modal h2').textContent));
await p.evaluate(()=>location.hash='dashboard');await new Promise(r=>setTimeout(r,500));await p.evaluate(()=>document.querySelectorAll('.ov').forEach(o=>o.remove()));
console.log('dash:',await p.evaluate(()=>[...document.querySelectorAll('.kpi')].map(k=>k.innerText.replace(/\n/g,' ')).join(' | ')));
await p.evaluate(()=>{location.hash='orders';TAB.orders='list'});await new Promise(r=>setTimeout(r,500));await p.click('#view tbody tr.click');await new Promise(r=>setTimeout(r,400));
console.log('order modal ok:',await p.evaluate(()=>!!document.querySelector('.modal')&&document.querySelector('.modal').innerText.includes('Payments for this order')));
await p.setViewport({width:390,height:844,isMobile:true});await p.evaluate(()=>{document.querySelectorAll('.ov').forEach(o=>o.remove());location.hash='accounts'});await new Promise(r=>setTimeout(r,500));await p.screenshot({path:'cash_m.png'});
console.log('overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'errors',errs);await b.close();
