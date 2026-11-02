import puppeteer from 'puppeteer-core';
const B='http://127.0.0.1:8787';
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
await p.goto(B+'/',{waitUntil:'domcontentloaded'});await new Promise(x=>setTimeout(x,800));
await p.type('#lEmail','ravi@ivevar.com');await p.type('#lPw','pass12345');await p.click('#lf button[type=submit]');await new Promise(x=>setTimeout(x,1500));
console.log(await p.evaluate(()=>{const all=salesStats(ME.id,'');const d=new Date();d.setDate(1);return JSON.stringify({n:all.orders.length,dates:all.orders.map(o=>o.date),m:d.toISOString().slice(0,7),sale:all.orders.map(o=>orderSale(o))})}));
await b.close();
