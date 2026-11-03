import pkg from '/opt/npm-tools/node_modules/playwright/index.js';const {chromium}=pkg;
const B='http://127.0.0.1:8792';
let pass=0,fail=0;const F=[];const ok=(c,m)=>{if(c)pass++;else{fail++;F.push(m);console.log('✗',m)}};
const api=async(tok,path,body)=>{const r=await fetch(B+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{})},body:body?JSON.stringify(body):undefined});return r.json()};
const admin=(await api(null,'/api/setup',{name:'Admin',email:'a@a.com',password:'adminpass1'})).token;
await api(admin,'/api/users',{name:'Ravi',email:'ravi@a.com',role:'office',title:'Sales',active:true,password:'salespass1',commPct:25});
await api(admin,'/api/settings',{settings:{fxRates:{USD:88,AUD:58,GBP:112,EUR:95,CAD:65,INR:1},usdInr:88,currency:'₹'}});
const ravi=(await api(null,'/api/login',{email:'ravi@a.com',password:'salespass1'})).token;
const br=await chromium.launch();
async function open(tok,vp){const ctx=await br.newContext(vp?{viewport:vp}:{});await ctx.addInitScript(t=>localStorage.setItem('erp_token',t),tok);await ctx.route('**/*',r=>{const u=r.request().url();return(u.includes('flagcdn')||u.includes('countriesnow')||u.includes('fonts.g'))?r.abort():r.continue()});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});await pg.goto(B,{waitUntil:'networkidle'});for(let i=0;i<25;i++){if(await pg.evaluate(()=>typeof ME!=='undefined'&&ME&&ME.id))break;await pg.waitForTimeout(300)}await pg.waitForTimeout(500);return{pg,ctx,errs}}

// ---------- DESKTOP ----------
let {pg,ctx,errs}=await open(ravi,{width:1280,height:900});
await pg.evaluate(()=>orderForm());await pg.waitForTimeout(900);
let d=await pg.evaluate(()=>{
  const m=document.querySelector('.modal.fpro');
  const cards=[...document.querySelectorAll('.fcard-h h3')].map(h=>h.innerText.trim());
  return {
    isPro:!!m,
    cardTitles:cards,
    cardCount:document.querySelectorAll('.fcard').length,
    hasSummary:!!document.querySelector('.ordsum'),
    firstCard:cards[0]||'',
  };
});
ok(d.isPro,'order form renders in premium (.fpro) mode');
ok(d.cardCount>=7,'has 7 section cards — got '+d.cardCount);
ok(/Customer/i.test(d.firstCard),'first card is Customer information — got "'+d.firstCard+'"');
ok(d.hasSummary,'live pricing summary panel present');
console.log('  cards:',JSON.stringify(d.cardTitles));

// fill pricing and check summary updates live
await pg.evaluate(()=>{
  const set=(k,val)=>{const el=document.querySelector(`[data-k="${k}"]`);if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}))}};
  set('saleValue',2000);set('makingCostINR',15000);set('courierINR',2000);set('advance',500);
});
await pg.waitForTimeout(500);
let sum=await pg.evaluate(()=>{const tiles=[...document.querySelectorAll('.sumtile')].map(t=>({l:t.querySelector('.st-l').innerText,v:t.querySelector('.st-v').innerText}));return tiles});
console.log('  summary tiles:',JSON.stringify(sum));
let profTile=sum.find(t=>/profit/i.test(t.l));
ok(profTile&&/1,?806\.82/.test(profTile.v.replace(/\s/g,'')),'summary Profit = $1806.82 (176000-15000-2000)/88 — got '+(profTile&&profTile.v));
let balTile=sum.find(t=>/balance/i.test(t.l));
ok(balTile&&/1,?500/.test(balTile.v.replace(/\s/g,'')),'summary Balance shows $1500 — got '+(balTile&&balTile.v));

// screenshot desktop
await pg.screenshot({path:'/tmp/claude-0/-home-claude/2fc38d1b-ec39-5832-bf0e-a2ecc9faa111/scratchpad/after_desktop.png',fullPage:true});

// fill required + customer + item, then SAVE a real order
await pg.evaluate(()=>{
  const set=(k,val)=>{const el=document.querySelector(`[data-k="${k}"]`);if(el){el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}};
  set('custName','Test Buyer One');set('custEmail','buyer1@x.com');set('dueDate','2026-12-01');
  // first line item desc
  const li=document.querySelector('[data-lines="lines"] tbody tr [data-c="desc"]');if(li){li.value='Solitaire Ring';li.dispatchEvent(new Event('input',{bubbles:true}))}
});
await pg.waitForTimeout(300);
let errBefore=errs.length;
await pg.evaluate(()=>document.querySelector('.modal.fpro [data-save]').click());
await pg.waitForTimeout(1500);
let saved=await pg.evaluate(()=>{const o=S.orders.find(x=>x.customer&&custName(x.customer)==='Test Buyer One');return o?{no:o.no,sale:o.saleValue,cur:o.currency,rate:o.usdRate,make:o.makingCostINR,hasPay:(o.payments||[]).length}:null});
ok(saved&&/^IVM/.test(saved.no),'SAVE works — order created '+(saved&&saved.no));
ok(saved&&saved.sale===2000&&saved.rate===88,'saved order keeps correct sale/rate (no logic break)');
ok(saved&&saved.hasPay===1,'advance deposit saved as a payment');
ok(errs.length===errBefore,'no JS errors during save — '+JSON.stringify(errs.slice(0,2)));
await ctx.close();

// ---------- MOBILE ----------
let m=await open(ravi,{width:390,height:844});
await m.pg.evaluate(()=>orderForm());await m.pg.waitForTimeout(900);
let mob=await m.pg.evaluate(()=>{const f=document.querySelector('.form-pro');const bodyW=document.body.scrollWidth,winW=window.innerWidth;return{cards:document.querySelectorAll('.fcard').length,noHscroll:bodyW<=winW+2,cols:getComputedStyle(document.querySelector('.ordsum')).gridTemplateColumns}});
ok(mob.cards>=7,'mobile: cards render ('+mob.cards+')');
ok(mob.noHscroll,'mobile: no horizontal scroll');
await m.pg.screenshot({path:'/tmp/claude-0/-home-claude/2fc38d1b-ec39-5832-bf0e-a2ecc9faa111/scratchpad/after_mobile.png',fullPage:true});
console.log('  mobile summary cols:',mob.cols,'| hscroll ok:',mob.noHscroll);
const realErr=m.errs.filter(e=>!/net::|Failed to load|flagcdn|countriesnow/i.test(e));ok(realErr.length===0,'mobile: no real JS errors — '+JSON.stringify(realErr.slice(0,2)));
await m.ctx.close();

await br.close();
console.log(`\n${pass} passed, ${fail} failed`);if(F.length){console.log('--- FAIL ---');F.forEach(x=>console.log(' •',x))}
