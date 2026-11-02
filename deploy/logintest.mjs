import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
for(const vp of [{width:1400,height:900},{width:390,height:844}]){await p.setViewport(vp);await p.goto('http://127.0.0.1:8787/',{waitUntil:'domcontentloaded'});await new Promise(r=>setTimeout(r,1200));
console.log(vp.width,await p.evaluate(()=>({app:getComputedStyle(document.getElementById('app')).display,formTop:Math.round(document.querySelector('#lf').getBoundingClientRect().top)})));
await p.screenshot({path:'login_'+vp.width+'.png'})}
await b.close();
