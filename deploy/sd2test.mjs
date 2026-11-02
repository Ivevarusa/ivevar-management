import puppeteer from 'puppeteer-core';
const B='http://127.0.0.1:8787';const J=(p,b,t)=>fetch(B+p,{method:'POST',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:JSON.stringify(b)}).then(r=>r.json());
const a=(await J('/api/setup',{name:'Ankit',email:'owner@ivevar.com',password:'testpass123'})).token;
await J('/api/users',{name:'Aumsri',email:'aum@ivevar.com',role:'office',active:true,password:'pass12345',modules:['crm','quotes','orders','accounts']},a);
await J('/api/users',{name:'Ravi Sales',email:'ravi@ivevar.com',role:'office',active:true,password:'pass12345',modules:['crm','quotes','orders']},a);
const r=(await J('/api/login',{email:'ravi@ivevar.com',password:'pass12345'})).token;
const c=(await J('/api/save',{coll:'customers',doc:{name:'John Carter'}},r)).doc;
const d=new Date();const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const o=(await J('/api/save',{coll:'orders',doc:{customer:c.id,date:m+'-01',dueDate:m+'-02',status:'Confirmed',saleValue:120000,costPrice:70000,lines:[{desc:'Ring',qty:1}]}},r)).doc;
await J('/api/save',{coll:'leads',doc:{name:'Priya Shah',phone:'+1 555 0101',source:'Website',stage:'Contacted',date:m+'-01T10:00',nextFollow:m+'-01'}},r);
await J('/api/save',{coll:'cash',doc:{type:'Income',category:'Sales (ivevar.com)',account:'Bank',amount:50000,order:o.id,date:m+'-01'}},a);
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const errs=[];
for(const [em,file,vp] of [['aum@ivevar.com','sd_empty.png',{width:1400,height:900}],['ravi@ivevar.com','sd_data.png',{width:1400,height:1000}],['ravi@ivevar.com','sd_phone.png',{width:390,height:1100,isMobile:true}]]){
 const ctx=await b.createBrowserContext();const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.emulateTimezone('Asia/Kolkata');await p.setViewport(vp);
 await p.goto(B+'/',{waitUntil:'domcontentloaded'});await new Promise(x=>setTimeout(x,800));
 await p.type('#lEmail',em);await p.type('#lPw','pass12345');await p.click('#lf button[type=submit]');await new Promise(x=>setTimeout(x,1500));
 if(file==='sd_data.png'){await p.evaluate(()=>{SD_P='month';render()});await new Promise(x=>setTimeout(x,300))}
 await p.screenshot({path:file,fullPage:file!=='sd_empty.png'});
 if(vp.isMobile)console.log('overflow',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
 await ctx.close()}
console.log('errors',errs);await b.close();
