import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await p.setViewport({width:1400,height:850});
await p.goto('http://127.0.0.1:8787/',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,800));
await p.type('#lEmail','owner@ivevar.com');await p.type('#lPw','testpass123');await p.click('#lf button[type=submit]');await new Promise(r=>setTimeout(r,1500));
console.log('nav:',await p.evaluate(()=>[...document.querySelectorAll('#nav a')].map(a=>a.textContent).join(' | ')));
for(const m of ['dashboard','orders','reports','production']){await p.evaluate(m=>location.hash=m,m);await new Promise(r=>setTimeout(r,400));}
await p.evaluate(()=>location.hash='dashboard');await new Promise(r=>setTimeout(r,500));await p.screenshot({path:'white_dash.png'});console.log('errors',errs);await b.close();
