
/* ============ UI ENGINE ============ */
const optList=o=>{const a=typeof o==='function'?o():o||[];return a.map(x=>Array.isArray(x)?x:[x,x])};
const refOpts=(c,lab)=>()=>S[c].filter(x=>x.status!=='Inactive'||true).map(x=>[x.id,lab?lab(x):((x.no?x.no+' · ':'')+(x.name||x.code||x.title||''))]);
const empOpts=()=>S.employees.filter(e=>e.status!=='Inactive').map(e=>[e.id,e.name]);
const purOpts=()=>(SET.purities||[]).map(p=>[p.n,`${p.n} (${p.p}%)`]);
/* file-upload preview tiles with a remove (✕) control — reused on first render and after add/remove */
const fileupPrev=files=>(files||[]).map((fl,i)=>`<span class="fprev"><img src="${esc(fl.url)}" alt=""><button type="button" class="fileup-rm" data-i="${i}" title="Remove">✕</button></span>`).join('');

function inputHTML(f,v,attr){
  const a=`${attr} ${f.req?'required':''} ${f.ro?'readonly tabindex="-1"':''}`;
  const t=f.t||'text';
  if(t==='panel')return `<div class="ordsum" ${attr}></div>`;
  if(t==='ta')return `<textarea ${a}>${esc(v)}</textarea>`;
  if(t==='cur'){const code=v||f.d||'USD';return `<div class="curpick" data-curpick><input type="hidden" ${a} value="${esc(code)}">${curBtn(code)}<div class="curmenu">${CURRENCIES.map(([c,name])=>`<div class="curopt ${c===code?'on':''}" data-code="${esc(c)}">${curFlag(c)}<span>${esc(name)}</span></div>`).join('')}</div></div>`}
  if(t==='ccode'){const code=v||f.d||'+1';const sel=PHONE_CODES.find(p=>p[0]===code)||['+1','us','United States'];return `<div class="curpick ccpick" data-curpick><input type="hidden" ${a} value="${esc(code)}">${ccBtn(sel)}<div class="curmenu"><input class="ccsearch" placeholder="Search country or code…" autocomplete="off">${PHONE_CODES.map(([d,iso,name])=>`<div class="curopt ${d===code&&iso===sel[1]?'on':''}" data-code="${esc(d)}" data-flag="${esc(iso)}" data-lbl="${esc(d)}">${flagImg(iso)}<span>${esc(d)}&nbsp;&nbsp;${esc(name)}</span></div>`).join('')}</div></div>`}
  if(t==='sel'||t==='ref'){const ops=optList(f.o);return `<select ${a}><option value="">Select…</option>${ops.map(([k,l])=>`<option value="${esc(k)}" ${String(k)===String(v??'')?'selected':''}>${esc(l)}</option>`).join('')}${v&&!ops.some(([k])=>String(k)===String(v))?`<option value="${esc(v)}" selected>${esc(v)}</option>`:''}</select>`}
  if(t==='file'){const files=Array.isArray(v)?v:[];const one=f.max===1;return `<div class="fileup" data-fileup><input type="hidden" ${a} value="${esc(JSON.stringify(files))}"><div class="fileup-prev">${fileupPrev(files)}</div><button type="button" class="fileup-add" data-accept="${esc(f.accept||'image/*')}" data-max="${f.max||10}" title="${esc(f.btn||'Upload')}"><span class="fup-ic">＋</span><span>${esc(one?(files.length?'Replace':'Screenshot'):'Add photo')}</span></button></div>`}
  if(t==='bool')return `<label style="display:flex;gap:6px;align-items:center;padding-top:6px"><input type="checkbox" ${a} ${v?'checked':''} style="width:auto"> ${esc(f.cl||'Yes')}</label>`;
  if(t==='chk'){const ops=optList(f.o);const vs=v||[];return `<div class="chk" ${a}>${ops.map(([k,l])=>`<label><input type="checkbox" value="${esc(k)}" ${vs.includes(k)?'checked':''}> ${esc(l)}</label>`).join('')}</div>`}
  const ty=t==='num'?'number" step="any':t==='date'?'date':t==='dt'?'datetime-local':t==='time'?'time':t==='email'?'email':t==='tel'?'tel':'text';
  if(f.list){const lid='dl'+uid();const ops=optList(f.list);return `<input type="${ty}" ${a} value="${esc(v)}" list="${lid}" autocomplete="off"><datalist id="${lid}">${ops.map(([k])=>`<option value="${esc(k)}"></option>`).join('')}</datalist>`}
  return `<input type="${ty}" ${a} value="${esc(v)}">`}

function linesHTML(f,rows){
  rows=rows&&rows.length?rows:[{}];
  return `<div class="tw"><table class="lines" data-lines="${f.k}"><thead><tr>${f.cols.map(c=>`<th>${esc(c.l)}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map((r,i)=>lineRow(f,r,i)).join('')}</tbody></table></div><div style="margin-top:6px"><button type="button" class="btn sm" data-addline="${f.k}">+ Add line</button></div>`}
function lineRow(f,r,i){return `<tr data-row>${f.cols.map(c=>c.calc?`<td class="calc" data-calc="${c.k}">${c.fmt?c.fmt(c.calc(r)):fq(c.calc(r))}</td>`:`<td style="min-width:${c.w||90}px">${inputHTML(c,r[c.k],`data-c="${c.k}"`)}</td>`).join('')}<td><button type="button" class="btn sm dng" data-delline title="Remove line">✕</button></td></tr>`}

function readForm(root,fields){
  const v={};
  fields.forEach(f=>{
    if(f.t==='lines'){const tb=root.querySelector(`[data-lines="${f.k}"] tbody`);v[f.k]=[...tb.querySelectorAll('tr[data-row]')].map(tr=>{const r={};f.cols.forEach(c=>{if(c.calc)return;const el=tr.querySelector(`[data-c="${c.k}"]`);if(!el)return;r[c.k]=c.t==='num'?(el.value===''?'':num(el.value)):el.type==='checkbox'?el.checked:el.value});return r}).filter(r=>Object.values(r).some(x=>x!==''&&x!==false&&x!=null));return}
    const el=root.querySelector(`[data-k="${f.k}"]`);if(!el)return;
    if(f.t==='chk')v[f.k]=[...el.querySelectorAll('input:checked')].map(i=>i.value);
    else if(f.t==='bool')v[f.k]=el.checked;
    else if(f.t==='num')v[f.k]=el.value===''?'':num(el.value);
    else if(f.t==='file'){try{v[f.k]=JSON.parse(el.value||'[]')}catch(e){v[f.k]=[]}}
    else v[f.k]=el.value});
  return v}

function modal({title,sub,body,foot,wide,pro,onMount}){
  const root=$('#modalRoot');const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML=`<div class="modal ${wide?'wide':''} ${pro?'fpro':''}" role="dialog" aria-modal="true"><div class="mh"><div><h2>${esc(title)}</h2>${sub?`<div class="note">${sub}</div>`:''}</div><button class="btn sm x" data-close aria-label="Close">✕</button></div><div class="mb">${body}</div>${foot?`<div class="mf">${foot}</div>`:''}</div>`;
  root.appendChild(ov);
  const close=()=>ov.remove();
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-close]'))close()});
  ov.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  onMount&&onMount(ov,close);
  const first=ov.querySelector('input:not([readonly]),select,textarea');first&&first.focus();
  return{ov,close}}

/* openForm: generic create/edit with validation, live calc and save */
function openForm({title,sub,fields,value={},onSave,wide,pro,extra='',onChange,saveLabel}){
  const v=value||{};
  const fieldHTML=f=> f.t==='lines'?`<div class="f w4"><label>${esc(f.l)}</label>${linesHTML(f,v[f.k])}</div>`
    : f.t==='panel'?`<div class="f w4">${inputHTML(f,'',`data-k="${f.k}"`)}</div>`
    : f.t==='hr'?`<div class="f w4"><h3 style="margin:8px 0 0">${esc(f.l)}</h3></div>`
    : `<div class="f ${f.w?'w'+f.w:''}"><label>${esc(f.l)}${f.req?' <span class="rq">*</span>':''}</label>${inputHTML(f,f.calc?f.calc(v):v[f.k]??f.d??'',`data-k="${f.k}"`)}${f.hint?`<span class="note">${esc(f.hint)}</span>`:''}</div>`;
  let body;
  if(pro){
    // group fields into premium section cards, split at each `hr` marker (its label/icon = card header)
    const cards=[];let cur={title:null,icon:'',items:[]};
    const flush=()=>{if(cur.items.length||cur.title!=null)cards.push(cur);cur={title:null,icon:'',items:[]}};
    fields.forEach(f=>{if(f.t==='hr'){flush();cur={title:f.l,icon:f.icon||'',items:[]}}else cur.items.push(f)});
    flush();
    body=`${extra}<form class="form-pro" novalidate>${cards.map(c=>`<section class="fcard">${c.title!=null?`<div class="fcard-h">${c.icon?`<span class="fcard-ic">${c.icon}</span>`:''}<h3>${esc(c.title)}</h3></div>`:''}<div class="form">${c.items.map(fieldHTML).join('')}</div></section>`).join('')}</form>`;
  }else{
    body=`${extra}<form class="form" novalidate>${fields.map(fieldHTML).join('')}</form>`;
  }
  return modal({title,sub,wide,pro,body,foot:`<button class="btn" data-close>${T('Cancel')}</button><button class="btn pri" data-save>${esc(saveLabel||T('Save'))}</button>`,onMount(ov,close){
    const form=ov.querySelector('form');
    const recalc=()=>{const cur={...v,...readForm(form,fields)};
      fields.forEach(f=>{if(f.calc){const el=form.querySelector(`[data-k="${f.k}"]`);if(el)el.value=f.calc(cur)}
        if(f.t==='lines')form.querySelectorAll(`[data-lines="${f.k}"] tbody tr`).forEach((tr,i)=>{const r=cur[f.k][i]||{};f.cols.forEach(c=>{if(c.calc){const td=tr.querySelector(`[data-calc="${c.k}"]`);if(td){const rr={};c&&f.cols.forEach(cc=>{const el=tr.querySelector(`[data-c="${cc.k}"]`);if(el)rr[cc.k]=el.value});td.textContent=c.fmt?c.fmt(c.calc(rr)):fq(c.calc(rr))}}})})});
      onChange&&onChange(cur,form)};
    form.addEventListener('input',recalc);form.addEventListener('change',recalc);
    form.addEventListener('click',e=>{
      const add=e.target.closest('[data-addline]');if(add){const f=fields.find(x=>x.k===add.dataset.addline);const tb=form.querySelector(`[data-lines="${f.k}"] tbody`);tb.insertAdjacentHTML('beforeend',lineRow(f,{},tb.children.length));recalc()}
      const del=e.target.closest('[data-delline]');if(del){del.closest('tr').remove();recalc()}});
    recalc();
    ov.querySelector('[data-save]').addEventListener('click',async ev=>{
      const vals=readForm(form,fields);
      const miss=fields.filter(f=>f.req&&(vals[f.k]===''||vals[f.k]==null||(Array.isArray(vals[f.k])&&!vals[f.k].length)));
      $$('.f',form).forEach(x=>x.style.outline='');
      if(miss.length){miss.forEach(f=>{const el=form.querySelector(`[data-k="${f.k}"]`);el&&(el.closest('.f').style.outline='2px solid var(--bad)')});toast('Fill the required fields: '+miss.map(f=>f.l).join(', '),true);return}
      fields.forEach(f=>{if(f.calc)vals[f.k]=f.calc({...v,...vals})});
      ev.target.disabled=true;
      try{const r=await onSave({...v,...vals});if(r!==false)close()}catch(e){console.error(e)}finally{ev.target.disabled=false}})}})}

/* confirm with reason (used for sensitive actions) */
function askReason(title,label,cb,{required=true,okLabel='Confirm'}={}){
  modal({title,body:`<div class="f"><label>${esc(label)}${required?' <span class="rq">*</span>':''}</label><textarea id="rsn"></textarea></div>`,foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="rsnOk">${esc(okLabel)}</button>`,onMount(ov,close){
    ov.querySelector('#rsnOk').onclick=async()=>{const r=ov.querySelector('#rsn').value.trim();if(required&&!r){toast('Please give a reason — it is stored in the audit log.',true);return}close();await cb(r)}}})}
function confirmBox(title,msg,cb,okLabel='Confirm'){modal({title,body:`<p style="margin:0">${msg}</p>`,foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="cOk">${esc(okLabel)}</button>`,onMount(ov,close){ov.querySelector('#cOk').onclick=async()=>{close();await cb()}}})}

/* table helper */
function table(cols,rows,{onClick,empty='Nothing here yet.',emptyHint=''}={}){
  if(!rows.length)return `<div class="tw"><div class="empty"><b>${esc(empty)}</b>${esc(emptyHint)}</div></div>`;
  const id='t'+uid();
  setTimeout(()=>{const t=document.getElementById(id);if(t&&onClick)t.addEventListener('click',e=>{const tr=e.target.closest('tr[data-i]');if(tr&&!e.target.closest('button,a,input,select'))onClick(rows[+tr.dataset.i])})});
  return `<div class="tw"><table id="${id}"><thead><tr>${cols.map(c=>`<th class="${c.n?'num':''}">${esc(c.l)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr data-i="${i}" class="${onClick?'click':''}">${cols.map(c=>`<td class="${c.n?'n':''}">${c.h?c.h(r):esc(r[c.k]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}

function phead(title,sub,actions=''){return `<div class="phead"><h1>${esc(T(title))}</h1><div class="act">${actions}</div>${sub?`<div class="sub">${sub}</div>`:''}</div>`}
const btn=(label,attr,cls='')=>`<button class="btn ${cls}" ${attr}>${label}</button>`;

/* list filter state per view */
const FIL={};
function filterBar(key,opts){const f=FIL[key]||(FIL[key]={q:'',st:''});
  return `<div class="tools"><input type="search" placeholder="${T('Search')}…" value="${esc(f.q)}" data-fq="${key}">${opts?`<select data-fs="${key}"><option value="">All statuses</option>${opts.map(o=>`<option ${f.st===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`:''}</div>`}
function applyFil(key,rows,stKey='status'){const f=FIL[key]||{q:'',st:''};const q=f.q.toLowerCase();
  return rows.filter(r=>(!f.st||r[stKey]===f.st)&&(!q||JSON.stringify(r).toLowerCase().includes(q)||custName(r.customer).toLowerCase().includes(q)))}
document.addEventListener('input',e=>{const k=e.target.dataset.fq;if(k){FIL[k].q=e.target.value;clearTimeout(window._fq);window._fq=setTimeout(()=>{render();const el=$(`[data-fq="${k}"]`);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}},250)}});
document.addEventListener('change',e=>{const k=e.target.dataset.fs;if(k){FIL[k].st=e.target.value;render()}});

/* ---------- navigation ---------- */
let ROUTE='dashboard',ROUTE_ARG=null,TAB={};
function navCounts(){let a=alerts();if(ME.role!=='admin'){const C={orders:'orders',crm:'leads',production:'jobs',qc:'qc',quotes:'quotes',inventory:'vouchers',wastage:'wastage',karigars:'challans',dispatch:'dispatches'};a=a.filter(x=>{const r=x.id&&byId(C[x.mod],x.id);return r&&(r.createdBy===ME.id||(x.mod==='orders'&&orderSeller(r)===ME.id))})}const c={};a.forEach(x=>c[x.mod]=(c[x.mod]||0)+1);try{const cu=chatUnread();if(cu)c.chat=cu}catch(e){}return c}
function renderNav(){
  const c=navCounts();let g='';let html='';
  MODS.forEach(([k,l,grp,icon])=>{if(!can(k))return;const sep=(g&&grp!==g)?' gtop':'';g=grp;
    html+=`<a href="#${k}" class="${ROUTE===k?'on':''}${sep}"><span class="navic">${ic(icon||'dashboard')}</span>${esc(T(l))}${c[k]?`<span class="ct ${k!=='dashboard'?'hot':''}">${c[k]}</span>`:''}</a>`});
  $('#nav').innerHTML=html;const bl=$('#blogo');if(bl&&bl.getAttribute('src')!==LOGO)bl.src=LOGO;
  const rf=$('#railfoot');if(rf)rf.innerHTML=`<div class="rf-user"><b>${esc(ME.name||'')}</b><div class="rf-sub">${esc(roleLabel(ME))}${SET.company&&SET.company.name?' · '+esc(SET.company.name):''}</div></div><select class="rf-lang" aria-label="Language" onchange="LANG=this.value;try{localStorage.setItem('erp_lang',LANG)}catch(e){};render()"><option value="en" ${LANG==='en'?'selected':''}>English</option><option value="hi" ${LANG==='hi'?'selected':''}>हिंदी</option><option value="gu" ${LANG==='gu'?'selected':''}>ગુજરાતી</option></select><div class="rf-links"><a onclick="pwForm()">Change password</a> · <a onclick="logout()">Logout</a></div>`}
function go(mod,arg){ROUTE_ARG=arg||null;if(location.hash!=='#'+mod)location.hash=mod;else render()}
window.addEventListener('hashchange',()=>{ROUTE=(location.hash||'#dashboard').slice(1)||'dashboard';$('#app').classList.remove('navopen');render();window.scrollTo(0,0)});
$('#menuBtn').onclick=()=>$('#app').classList.toggle('navopen');
$('#langSel').value=LANG;$('#langSel').onchange=e=>{LANG=e.target.value;try{localStorage.setItem('erp_lang',LANG)}catch(x){}render()};

/* ---------- global search (brief §15) ---------- */
$('#gsearch').addEventListener('input',e=>{
  const q=e.target.value.trim().toLowerCase();const box=$('#sres');
  if(q.length<2){box.hidden=true;return}
  const map=[['orders','orders','Order'],['leads','crm','Lead'],['quotes','quotes','Quotation'],['customers','masters','Customer'],['designs','designs','Design'],['jobs','production','Job card'],['karigars','karigars','Karigar'],['challans','karigars','Challan'],['vouchers','inventory','Voucher'],['invoices','accounts','Invoice'],['dispatches','dispatch','Dispatch'],['qc','qc','QC'],['suppliers','masters','Supplier'],['pos','purchase','PO']];
  const hits=[];map.forEach(([c,mod,lab])=>{if(!can(mod))return;S[c].forEach(x=>{const s=[x.no,x.name,x.code,x.phone,x.email,x.tracking,x.lot,custName(x.customer)].join(' ').toLowerCase();if(s.includes(q))hits.push({c,mod,lab,x})})});
  box.innerHTML=hits.slice(0,25).map((h,i)=>`<a href="#${h.mod}" data-h="${i}"><span class="pill">${h.lab}</span><span class="ref">${esc(h.x.no||h.x.code||'')}</span><span>${esc(h.x.name||custName(h.x.customer)||h.x.vtype||'')}</span></a>`).join('')||'<div class="empty">No matches</div>';
  box.hidden=false;
  box.onclick=ev=>{const a=ev.target.closest('[data-h]');if(!a)return;ev.preventDefault();const h=hits[+a.dataset.h];box.hidden=true;e.target.value='';go(h.mod);setTimeout(()=>openRecord(h.c,h.x.id),60)}});
document.addEventListener('click',e=>{if(!e.target.closest('.search'))$('#sres').hidden=true});
/* custom currency picker (flag dropdown) */
document.addEventListener('click',e=>{
  const opt=e.target.closest('.curopt');
  if(opt){const pick=opt.closest('[data-curpick]');const inp=pick.querySelector('input');const code=opt.dataset.code;inp.value=code;
    const flag=opt.dataset.flag;const lbl=opt.dataset.lbl||code;
    const b=pick.querySelector('.curbtn');b.innerHTML=(flag?flagImg(flag):curFlag(code))+'<span class="curlbl">'+esc(lbl)+'</span><span class="curcar">▾</span>';
    pick.querySelectorAll('.curopt').forEach(o=>o.classList.toggle('on',o===opt));pick.classList.remove('open');
    inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));return}
  const btn=e.target.closest('.curbtn');
  if(btn){e.preventDefault();const pick=btn.closest('[data-curpick]');const open=pick.classList.contains('open');document.querySelectorAll('.curpick.open').forEach(p=>p.classList.remove('open'));if(!open)pick.classList.add('open');return}
  document.querySelectorAll('.curpick.open').forEach(p=>{if(!p.contains(e.target))p.classList.remove('open')})});
document.addEventListener('input',e=>{if(e.target.classList&&e.target.classList.contains('ccsearch')){const q=e.target.value.trim().toLowerCase();e.target.closest('.curmenu').querySelectorAll('.curopt').forEach(o=>{o.style.display=o.textContent.toLowerCase().includes(q)?'':'none'})}});
document.addEventListener('click',e=>{const add=e.target.closest('.fileup-add');if(!add)return;e.preventDefault();const wrap=add.closest('[data-fileup]');const hid=wrap.querySelector('input[type=hidden]');const prev=wrap.querySelector('.fileup-prev');const max=+add.dataset.max||10;let cur=[];try{cur=JSON.parse(hid.value||'[]')}catch(x){}
  // single-file field (e.g. payment screenshot): a new pick replaces the old one
  if(max===1&&cur.length){cur=[]}
  const rem=max-cur.length;if(rem<=0){toast('Limit reached — remove some first.',true);return}pickFiles(fs=>{const next=[...cur,...fs];hid.value=JSON.stringify(next);prev.innerHTML=fileupPrev(next);hid.dispatchEvent(new Event('change',{bubbles:true}))},add.dataset.accept||'image/*',rem)});
/* remove a single uploaded file */
document.addEventListener('click',e=>{const rm=e.target.closest('.fileup-rm');if(!rm)return;e.preventDefault();const wrap=rm.closest('[data-fileup]');const hid=wrap.querySelector('input[type=hidden]');const prev=wrap.querySelector('.fileup-prev');let cur=[];try{cur=JSON.parse(hid.value||'[]')}catch(x){}cur.splice(+rm.dataset.i,1);hid.value=JSON.stringify(cur);prev.innerHTML=fileupPrev(cur);hid.dispatchEvent(new Event('change',{bubbles:true}))});

function openRecord(c,id){const x=byId(c,id);if(!x)return;const fn={orders:orderDetail,leads:leadDetail,quotes:quoteForm,customers:x=>masterForm('customers',x),suppliers:x=>masterForm('suppliers',x),karigars:karigarDetail,challans:challanDetail,designs:designDetail,jobs:jobDetail,vouchers:voucherView,invoices:x=>accForm('invoices',x),dispatches:dispatchForm,qc:qcForm,pos:poForm,wastage:wastageForm}[c];fn&&fn(x)}

/* ---------- CSV export (brief §15: permission-controlled) ---------- */
async function exportCSV(name,cols,rows){
  if(!can('reports','view')){toast('You do not have export permission.',true);return}
  const csv=[cols.map(c=>c.l).join(','),...rows.map(r=>cols.map(c=>{let v=c.x?c.x(r):r[c.k];v=v==null?'':String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(','))].join('\n');
  saveFile(`${name}-${today()}.csv`,'\ufeff'+csv,'text/csv');api('/api/log',{coll:'reports',no:name,action:'export csv',reason:rows.length+' rows'}).catch(()=>{})}
const cellVal=(c,r)=>{let v=c.x?c.x(r):r[c.k];return v==null?'':typeof v==='number'?(''+(Math.round(v*1000)/1000)):String(v)};
function exportXLS(name,cols,rows){
  if(!can('reports','view')){toast('You do not have export permission.',true);return}
  const head=`<tr>${cols.map(c=>`<th style="background:#161d26;color:#fff;border:1px solid #999;padding:4px">${esc(c.l)}</th>`).join('')}</tr>`;
  const body=rows.map(r=>`<tr>${cols.map(c=>`<td style="border:1px solid #ccc;padding:4px">${esc(cellVal(c,r))}</td>`).join('')}</tr>`).join('');
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><h3>${esc(name)} · ${esc(SET.company.name)} · ${today()}</h3><table border="1">${head}${body}</table></body></html>`;
  saveFile(`${name}-${today()}.xls`,html,'application/vnd.ms-excel');api('/api/log',{coll:'reports',no:name,action:'export excel',reason:rows.length+' rows'}).catch(()=>{})}
function exportPDF(name,cols,rows){
  if(!can('reports','view')){toast('You do not have export permission.',true);return}
  const head=`<tr>${cols.map(c=>`<th>${esc(c.l)}</th>`).join('')}</tr>`;
  const body=rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(cellVal(c,r))}</td>`).join('')}</tr>`).join('');
  const html=`<!doctype html><meta charset="utf-8"><title>${esc(name)}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111;font-size:11px}h1{font-size:17px;margin:0}table{border-collapse:collapse;width:100%;margin-top:10px}th,td{border:1px solid #999;padding:4px;text-align:left}th{background:#eee}@media print{button{display:none}}</style><button onclick="print()" style="float:right;padding:8px 14px">Print / Save PDF</button><h1>IVEVAR — ${esc(name)}</h1><div style="color:#555">${esc(SET.company.name)} · ${today()} · ${rows.length} rows</div><table>${head}${body}</table><script>setTimeout(()=>print(),500)</`+`script>`;
  const w=window.open('','_blank');if(!w){toast('Allow pop-ups to export PDF.',true);return}w.document.write(html);w.document.close();api('/api/log',{coll:'reports',no:name,action:'export pdf',reason:rows.length+' rows'}).catch(()=>{})}
