import puppeteer from 'puppeteer-core';
const B='http://127.0.0.1:8807';
let pass=0,fail=0;const fails=[];
const ok=(c,m)=>{if(c)pass++;else{fail++;fails.push(m);console.log('✗',m)}};
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});

async function loginAs(email,pw){
  const ctx=await b.createBrowserContext();const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|net::/.test(m.text()))errs.push('console:'+m.text())});
  await p.emulateTimezone('Asia/Kolkata');await p.setViewport({width:1400,height:950});
  await p.goto(B+'/',{waitUntil:'domcontentloaded'});await new Promise(x=>setTimeout(x,600));
  await p.type('#lEmail',email);await p.type('#lPw',pw);await p.click('#lf button[type=submit]');
  await new Promise(x=>setTimeout(x,1500));
  return {p,errs,ctx};
}
async function visit(p,hash){await p.evaluate(h=>{location.hash=h},hash);await new Promise(x=>setTimeout(x,500));return p.evaluate(()=>document.querySelector('#view')?.innerText.length||0)}

// ADMIN: walk every module
{
  const {p,errs}=await loginAs('owner@ivevar.com','testpass123');
  const loggedIn=await p.evaluate(()=>!document.getElementById('app').hidden);
  ok(loggedIn,'admin logged in (UI)');
  const mods=['dashboard','crm','quotes','orders','inventory','qc','dispatch','accounts','hr','reports','masters','setup'];
  for(const m of mods){const len=await visit(p,m);ok(len>20,'admin view renders: '+m+' (len '+len+')')}
  // open an order detail → stage stepper + payments panel present
  await visit(p,'orders');
  const hasOrder=await p.evaluate(()=>{const tr=document.querySelector('#view tbody tr.click');if(!tr)return 'noorder';tr.click();return new Promise(r=>setTimeout(()=>r(document.body.innerHTML.includes('Order stage')&&document.body.innerHTML.includes('Payments')),700))});
  ok(hasOrder===true||hasOrder==='noorder','order detail shows stage + payments'+(hasOrder==='noorder'?' (no orders yet — ok)':''));
  await p.keyboard.press('Escape');
  // pieces tab
  await visit(p,'inventory');
  const pieceTab=await p.evaluate(()=>document.body.innerHTML.includes('Add piece')||document.body.innerHTML.includes('Pieces'));
  ok(pieceTab,'inventory shows Pieces');
  // setup user form opens
  await visit(p,'setup');
  const uf=await p.evaluate(()=>{const btn=[...document.querySelectorAll('button')].find(b=>/Add user/.test(b.textContent));if(!btn)return false;btn.click();return new Promise(r=>setTimeout(()=>r(document.body.innerHTML.includes('Role / access')&&document.body.innerHTML.includes('Shift')),500))});
  ok(uf,'user form has Role/Shift fields');
  await p.keyboard.press('Escape');
  ok(errs.length===0,'admin: no JS errors'+(errs.length?' → '+errs.slice(0,3).join(' | '):''));
}

// SALES: dashboard + allowed modules, selfie card
{
  const {p,errs}=await loginAs('ravi@ivevar.com','pass12345');
  const li=await p.evaluate(()=>!document.getElementById('app').hidden);ok(li,'sales logged in (UI)');
  const dashOk=await p.evaluate(()=>document.body.innerText.includes('Sales')||document.querySelector('.sd-head'));
  ok(!!dashOk,'sales dashboard renders');
  const punch=await p.evaluate(()=>document.body.innerHTML.includes('IN')&&document.querySelector('.inout'));
  ok(!!punch,'sales sees attendance punch card');
  // sales should NOT see setup in nav
  const navHasSetup=await p.evaluate(()=>!![...document.querySelectorAll('#nav a')].find(a=>/Setup/i.test(a.textContent)));
  ok(!navHasSetup,'sales nav hides Setup');
  for(const m of ['crm','quotes','orders','inventory']){const len=await visit(p,m);ok(len>20,'sales view renders: '+m)}
  ok(errs.length===0,'sales: no JS errors'+(errs.length?' → '+errs.slice(0,3).join(' | '):''));
}

// COURIER: courier dashboard + dispatch
{
  const {p,errs}=await loginAs('dev@ivevar.com','pass12345');
  const li=await p.evaluate(()=>!document.getElementById('app').hidden);ok(li,'courier logged in (UI)');
  const cd=await p.evaluate(()=>document.body.innerHTML.includes('Courier / dispatch')||document.body.innerHTML.includes('Ready to pack'));
  ok(cd,'courier dashboard renders');
  const len=await visit(p,'dispatch');ok(len>20,'courier dispatch view renders');
  ok(errs.length===0,'courier: no JS errors'+(errs.length?' → '+errs.slice(0,3).join(' | '):''));
}

// ACCOUNTANT: admin-style dash + accounts
{
  const {p,errs}=await loginAs('acc@ivevar.com','pass12345');
  const li=await p.evaluate(()=>!document.getElementById('app').hidden);ok(li,'accountant logged in (UI)');
  for(const m of ['accounts','hr','reports','inventory']){const len=await visit(p,m);ok(len>20,'accountant view renders: '+m)}
  ok(errs.length===0,'accountant: no JS errors'+(errs.length?' → '+errs.slice(0,3).join(' | '):''));
}

// ORDER FORM: new fields & columns
{
  const {p,errs}=await loginAs('ravi@ivevar.com','pass12345');
  await visit(p,'orders');
  const form=await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>/New order/.test(b.textContent));if(!b)return 'nobtn';b.click();return new Promise(r=>setTimeout(()=>{
    const labs=[...document.querySelectorAll('.ov .f label')].map(l=>l.textContent.replace('*','').trim());
    const th=[...document.querySelectorAll('.ov table.lines th')].map(t=>t.textContent.trim());
    const custEl=[...document.querySelectorAll('.ov [data-k="custName"]')][0];
    const curSel=[...document.querySelectorAll('.ov [data-k="currency"]')][0];
    const catSel=document.querySelector('.ov select[data-c="category"]');
    r({labs,th,custIsText:custEl&&custEl.tagName==='INPUT',curFirst:labs[0]==='Currency',curHasUSD:curSel&&[...curSel.options].some(o=>/USD/.test(o.text)),cats:catSel?[...catSel.options].map(o=>o.textContent):[]});
  },700))});
  ok(form!=='nobtn','new order form opens');
  ok(form.curFirst,'Currency is the first field');
  ok(form.curHasUSD,'currency dropdown has USD (with flag)');
  ok(form.custIsText,'customer is a typeable text field');
  ok(form.labs.some(l=>l.startsWith('Order ID')),'Order ID field present');
  ok(form.labs.some(l=>/Total order value \(\$\)/.test(l)),'Order value shows currency symbol ($)');
  ok(form.labs.some(l=>/Advance/.test(l)),'Advance / deposit field present on new order');
  ok(form.labs.some(l=>/Making \/ product cost/.test(l))&&form.labs.some(l=>/Courier expense/.test(l)),'making cost + courier (₹) fields present');
  ok(form.labs.some(l=>/Profit before marketing/.test(l))&&form.labs.some(l=>/Sales share/.test(l)),'live profit + commission preview present');
  const flag=await p.evaluate(()=>!!document.querySelector('.ov .curpick')&&!!document.querySelector('.ov .curpick .curbtn'));
  ok(flag,'currency flag picker renders (custom dropdown)');
  const noDash=await p.evaluate(()=>{const sels=[...document.querySelectorAll('.ov select')];return sels.every(s=>s.options[0].textContent!=='—')});
  ok(noDash,'no "—" placeholder in dropdowns');
  ok(!form.labs.includes('Customer PO / ref'),'Customer PO/ref removed');
  ok(form.th.includes('Metal purity')&&form.th.includes('Diamond type')&&form.th.includes('Movement (watch)'),'line columns: Metal purity + Diamond type + Movement');
  ok(!form.th.includes('Design')&&!form.th.includes('Line due')&&!form.th.includes('Status'),'line columns removed: Design/Line due/Status');
  ok(form.cats.some(c=>/Certified Diamonds/.test(c))&&form.cats.some(c=>/Custom Products/.test(c))&&form.cats.some(c=>/Add new/.test(c)),'category has Certified Diamonds + Custom Products + Add new');
  // type a customer + save → creates order with IVM id
  const made=await p.evaluate(()=>{const q=s=>document.querySelector('.ov '+s);
    q('[data-k="custName"]').value='Robot Buyer';q('[data-k="custName"]').dispatchEvent(new Event('input',{bubbles:true}));
    q('[data-k="saleValue"]').value='999';q('[data-k="saleValue"]').dispatchEvent(new Event('input',{bubbles:true}));
    const prod=q('table.lines [data-c="desc"]');if(prod){prod.value='Test Ring';prod.dispatchEvent(new Event('input',{bubbles:true}));}
    q('[data-k="dueDate"]').value='2026-12-01';q('[data-k="dueDate"]').dispatchEvent(new Event('input',{bubbles:true}));
    [...document.querySelectorAll('.ov [data-save]')][0].click();
    return new Promise(r=>setTimeout(()=>r(document.body.innerText.includes('IVM')&&document.body.innerText.includes('Robot Buyer')),1200));
  });
  ok(made,'typed-name order saves, creates customer, shows IVM id');
  ok(errs.length===0,'order form: no JS errors'+(errs.length?' → '+errs.slice(0,3).join(' | '):''));
}

// CHAT: ravi opens chat, sends a message
{
  const {p,errs}=await loginAs('ravi@ivevar.com','pass12345');
  await visit(p,'chat');
  const wrap=await p.evaluate(()=>!!document.querySelector('.chatwrap')&&document.body.innerHTML.includes('Office group'));
  ok(wrap,'chat view renders with Office group');
  const navChat=await p.evaluate(()=>!![...document.querySelectorAll('#nav a')].find(a=>/Chat/.test(a.textContent)));
  ok(navChat,'Chat appears in nav');
  // removed modules hidden
  const hidden=await p.evaluate(()=>{const t=[...document.querySelectorAll('#nav a')].map(a=>a.textContent).join('|');return !/CRM|Designs|Purchase|HR/.test(t)});
  ok(hidden,'CRM/Designs/Purchase/HR removed from nav');
  // send a message in office group
  const sent=await p.evaluate(()=>{const inp=document.getElementById('chIn');if(!inp)return 'noinput';inp.value='Hello from robot 🤖';if(window.chSend)window.chSend();return new Promise(r=>setTimeout(()=>r(document.body.innerHTML.includes('Hello from robot')),900))});
  ok(sent===true,'message sent and appears in thread');
  ok(errs.length===0,'chat: no JS errors'+(errs.length?' → '+errs.slice(0,3).join(' | '):''));
}
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
if(fail){console.log('FAILURES:');fails.forEach(f=>console.log('  - '+f));process.exit(1)}else console.log('UI ALL GREEN ✅');
