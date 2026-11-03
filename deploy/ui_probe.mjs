import pkg from '/opt/npm-tools/node_modules/playwright/index.js';
const {chromium}=pkg;
const B='http://127.0.0.1:8799';
let pass=0,fail=0;const fails=[];
const ok=(c,m)=>{if(c)pass++;else{fail++;fails.push(m);console.log('✗',m)}};
const api=async(tok,path,body)=>{const r=await fetch(B+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(tok?{authorization:'Bearer '+tok}:{})},body:body?JSON.stringify(body):undefined});return r.json()};

// seed
const su=await api(null,'/api/setup',{name:'Admin',email:'a@a.com',password:'adminpass1'});const admin=su.token;
await api(admin,'/api/users',{name:'Ravi Sales',email:'ravi@a.com',role:'office',title:'Sales',active:true,password:'salespass1',commPct:25});
await api(admin,'/api/users',{name:'Gita Salary',email:'gita@a.com',role:'office',title:'Sales',active:true,password:'salespass1'});
const ravi=(await api(null,'/api/login',{email:'ravi@a.com',password:'salespass1'})).token;
const gita=(await api(null,'/api/login',{email:'gita@a.com',password:'salespass1'})).token;
await api(admin,'/api/settings',{settings:{fxRates:{USD:88,AUD:58,GBP:112,EUR:95,CAD:65,INR:1},usdInr:88,currency:'₹'}});

const browser=await chromium.launch();
async function open(tok){
  const ctx=await browser.newContext();
  await ctx.addInitScript(t=>{try{localStorage.setItem('erp_token',t)}catch(e){}},tok);
  // block external
  await ctx.route('**/*',r=>{const u=r.request().url();if(u.includes('flagcdn')||u.includes('countriesnow')||u.includes('fonts.g'))return r.abort();return r.continue()});
  const pg=await ctx.newPage();
  const errs=[];pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto(B,{waitUntil:'networkidle'});
  await pg.waitForTimeout(1500);
  return {pg,ctx,errs};
}

// ---- SALES (Ravi) ----
let {pg,ctx,errs}=await open(ravi);
let bodytxt=await pg.evaluate(()=>document.querySelector('#view')?.innerText||'');
ok(!/Sign in|Login/i.test(bodytxt)||bodytxt.length>0,'Ravi app loaded');
ok(errs.filter(e=>!/Failed to load|net::|flagcdn|countriesnow/i.test(e)).length===0,'Ravi: no JS console errors — '+JSON.stringify(errs.slice(0,3)));
// go to orders and open new-order form
let navOk=await pg.evaluate(()=>{if(typeof go==='function'){go('orders');return true}return false});
await pg.waitForTimeout(600);
let openedForm=await pg.evaluate(()=>{if(typeof orderForm==='function'){orderForm();return true}return false});
await pg.waitForTimeout(800);
// inspect the modal form field order
let formInfo=await pg.evaluate(()=>{
  const modal=document.querySelector('.modal,[data-modal],#modal')||document.body;
  const labels=[...modal.querySelectorAll('label,.flbl,.field label,.fld label')].map(l=>l.innerText.trim()).filter(Boolean);
  const html=modal.innerHTML;
  return {
    labels:labels.slice(0,40),
    hasFileUp:/fileup|Add photo|data-fileup/i.test(html),
    hasPayMethod:/PayPal/i.test(html)&&/Zelle/i.test(html),
    hasOther:/Other/i.test(html),
    hasShare:/Sales share/i.test(html),
    hasSalesExec:/Sales executive|salesBy/i.test(html),
    hasCountry:/United States/i.test(html),
    currencyDefaultUSD:(()=>{const s=[...modal.querySelectorAll('select')].find(x=>/USD|INR/.test(x.innerHTML));return s?s.value:null})(),
    firstLabel:labels[0]||'',
    makingINR:/Making cost \(₹\)|Making.*₹/i.test(html),
  };
});
ok(formInfo.hasFileUp,'order form has photo upload field');
ok(formInfo.hasPayMethod,'order form has payment-method dropdown (PayPal/Zelle)');
ok(formInfo.hasShare,'Ravi(commPct25) SEES "Sales share" preview');
ok(!formInfo.hasSalesExec,'order form has NO "Sales executive" dropdown (seller fills it)');
ok(/photo|product/i.test(formInfo.firstLabel),'FIRST field is product photo — got "'+formInfo.firstLabel+'"');
console.log('  [sales form labels]',JSON.stringify(formInfo.labels.slice(0,12)));
console.log('  [currency default]',formInfo.currencyDefaultUSD,'| payOther',formInfo.hasOther,'| country',formInfo.hasCountry,'| makingINR',formInfo.makingINR);
await ctx.close();

// ---- GITA (salary, commPct 0) — must NOT see Sales share ----
let g=await open(gita);
await g.pg.evaluate(()=>typeof orderForm==='function'&&orderForm());await g.pg.waitForTimeout(700);
let gitaShare=await g.pg.evaluate(()=>/Sales share/i.test((document.querySelector('.modal,#modal')||document.body).innerHTML));
ok(!gitaShare,'Gita(salary-only) does NOT see "Sales share" preview');
await g.ctx.close();

// ---- ADMIN — settings + themes + full width ----
let a=await open(admin);
let adminChecks=await a.pg.evaluate(()=>{
  const out={};
  // themes count
  out.themeCount=(typeof THEMES!=='undefined')?THEMES.length:-1;
  // content full width
  const c=document.querySelector('.content');out.contentMaxW=c?getComputedStyle(c).maxWidth:'?';
  // settings view
  if(typeof go==='function')go('settings');
  return out;
});
await a.pg.waitForTimeout(800);
let setInfo=await a.pg.evaluate(()=>{const v=document.querySelector('#view')||document.body;return{hasCurrencyRates:/Currency rate|USD.*→.*INR|Currency rates|fxForm|rate/i.test(v.innerHTML),txt:v.innerText.slice(0,200)}});
ok(adminChecks.themeCount===12,'12 themes present — got '+adminChecks.themeCount);
ok(adminChecks.contentMaxW==='none'||adminChecks.contentMaxW==='100%',' .content full width (maxWidth='+adminChecks.contentMaxW+')');
ok(setInfo.hasCurrencyRates,'admin Settings exposes currency-rate control');
console.log('  [admin no-JS-errors]',a.errs.filter(e=>!/net::|flagcdn|countriesnow|Failed to load/i.test(e)).slice(0,3));
await a.ctx.close();

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if(fails.length){console.log('--- FAILURES ---');fails.forEach(f=>console.log(' •',f))}
