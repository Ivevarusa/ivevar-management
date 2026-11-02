import puppeteer from 'puppeteer-core';
const B='http://127.0.0.1:8787';
await fetch(B+'/api/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Ankit',email:'owner@ivevar.com',password:'testpass123'})});
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(B+'/',{waitUntil:'domcontentloaded'});await new Promise(x=>setTimeout(x,800));
await p.type('#lEmail','owner@ivevar.com');await p.type('#lPw','testpass123');await p.click('#lf button[type=submit]');await new Promise(x=>setTimeout(x,1500));
console.log('ok');
for(const m of ['masters']){await p.evaluate(m=>location.hash=m,m);await new Promise(x=>setTimeout(x,400))}
console.log('tabs:',await p.evaluate(()=>[...document.querySelectorAll('#view .tabs button')].map(b=>b.textContent).join(' | ')));console.log('errors',errs);await b.close();
