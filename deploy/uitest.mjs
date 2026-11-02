import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-gpu']});
const p=await b.newPage();const errs=[];
p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_TUNNEL|net::/.test(m.text()))errs.push('CONSOLE '+m.text())});
await p.setViewport({width:1400,height:900});
await p.goto('http://127.0.0.1:8787/',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,800));
await p.screenshot({path:'shot_login.png'});
await p.type('#lEmail','owner@ivevar.com');await p.type('#lPw','testpass123');await p.click('#lf button[type=submit]');
await new Promise(r=>setTimeout(r,1500));
const mods=['dashboard','crm','quotes','orders','designs','purchase','inventory','production','karigars','wastage','qc','dispatch','accounts','hr','reports','masters','setup','audit'];
for(const m of mods){await p.evaluate(m=>location.hash=m,m);await new Promise(r=>setTimeout(r,500));
  const t=await p.evaluate(()=>document.querySelector('#view h1')?.textContent||document.querySelector('#view').textContent.slice(0,60));
  console.log(m,'→',t);
  // click every tab in module
  const tabs=await p.$$('#view .tabs button');for(let i=0;i<tabs.length;i++){const tb=(await p.$$('#view .tabs button'))[i];if(tb){await tb.click();await new Promise(r=>setTimeout(r,250))}}
  // open primary action form and close
  const pri=await p.$('#view .phead .act .btn.pri');if(pri){await pri.click();await new Promise(r=>setTimeout(r,300));const mt=await p.evaluate(()=>document.querySelector('.modal h2')?.textContent);console.log('   form:',mt);await p.keyboard.press('Escape');await p.evaluate(()=>document.querySelectorAll('.ov').forEach(o=>o.remove()))}
  // open first row
  const row=await p.$('#view tbody tr.click');if(row){await row.click();await new Promise(r=>setTimeout(r,300));const mt=await p.evaluate(()=>document.querySelector('.modal h2')?.textContent);console.log('   detail:',mt);await p.evaluate(()=>document.querySelectorAll('.ov').forEach(o=>o.remove()))}
  const tile=await p.$('#view .tile');if(tile&&!row){await tile.click();await new Promise(r=>setTimeout(r,300));console.log('   tile:',await p.evaluate(()=>document.querySelector('.modal h2')?.textContent));await p.evaluate(()=>document.querySelectorAll('.ov').forEach(o=>o.remove()))}
}
await p.evaluate(()=>location.hash='dashboard');await new Promise(r=>setTimeout(r,500));await p.screenshot({path:'shot_dash.png'});
await p.evaluate(()=>{TAB.orders='list';location.hash='orders'});await new Promise(r=>setTimeout(r,500));await p.click('#view tbody tr.click');await new Promise(r=>setTimeout(r,400));await p.screenshot({path:'shot_order.png'});
await p.evaluate(()=>document.querySelectorAll('.ov').forEach(o=>o.remove()));
await p.setViewport({width:390,height:844,isMobile:true});await p.evaluate(()=>location.hash='production');await new Promise(r=>setTimeout(r,500));await p.screenshot({path:'shot_mobile.png'});
const ov=await p.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);console.log('mobile horizontal overflow:',ov);
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await p.setViewport({width:1400,height:900});await p.evaluate(()=>location.hash='inventory');await new Promise(r=>setTimeout(r,500));await p.screenshot({path:'shot_dark.png'});
console.log('ERRORS:',errs.length?errs.join('\n'):'none');await b.close();
