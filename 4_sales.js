
/* ============ DASHBOARD ============ */
function hbars(rows){const mx=Math.max(1,...rows.map(r=>Math.abs(r.v)));return `<div class="hbars">${rows.map(r=>`<div class="r"><span>${esc(r.l)}</span><div class="bar"><i style="width:${Math.abs(r.v)/mx*100}%"></i></div><span class="num">${r.f?r.f(r.v):fq(r.v)}</span></div>`).join('')}</div>`}

function viewDashboard(){
  if(ME.role==='admin'||ME.title==='CEO'||ME.title==='Accountant')return viewAdminDash();
  if(ME.title==='Courier'||ME.title==='Helper')return viewCourierDash();
  return viewSalesDash();
}
function viewCourierDash(){
  const hour=new Date().getHours();const hi=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  // orders ready to pack / dispatch, and shipments in transit
  const ready=[];S.orders.filter(o=>!['Closed','Cancelled','Delivered'].includes(o.status)).forEach(o=>{const st=orderStage(o);if(['Quality check','Ready to ship'].includes(st)||o.status==='Ready to Pack')ready.push(o)});
  const inTransit=S.dispatches.filter(d=>['Dispatched','In Transit'].includes(d.status));
  const tile=(v,l,c='')=>`<div class="card sd-big ${c}"><span class="l">${esc(l)}</span><span class="v">${v}</span></div>`;
  return `<div class="sd-head"><div><h1>${hi}, ${esc((ME.name||'').split(' ')[0])}</h1><div class="note">Courier / dispatch</div></div></div>
  <div class="grid g2" style="margin-bottom:16px">${punchCard()}${taskTiles(false)}</div>
  <div style="margin-bottom:16px">${tasksCard(false)}</div>
  <div class="sd-kpis">${tile(ready.length,'Ready to pack','gold')}${tile(inTransit.length,'In transit')}${tile(S.dispatches.filter(d=>d.status==='Prepared').length,'Packed, not sent')}${tile(S.dispatches.filter(d=>(d.deliveredAt||'').slice(0,7)===today().slice(0,7)).length,'Delivered this month')}</div>
  <div class="grid g2" style="margin-top:16px">
   <div class="card"><h2>Ready to pack / ship <span class="pill ${ready.length?'warn':'good'}">${ready.length}</span></h2>${ready.length?table([{l:'Order',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Customer',h:r=>esc(custName(r.customer))},{l:'Stage',h:r=>stPill(orderStage(r))},{l:'Due',h:r=>fdate(r.dueDate)}],ready,{onClick:orderDetail}):'<div class="empty"><b>Nothing waiting 👍</b></div>'}</div>
   <div class="card"><h2>Shipments in transit</h2>${inTransit.length?table([{l:'No.',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Order',h:r=>esc(orderOf(r.order)?.no||'')},{l:'Courier',h:r=>esc([r.agency,r.courier,r.tracking].filter(Boolean).join(' · '))},{l:'Status',h:r=>stPill(r.trackStatus||r.status)}],inTransit,{onClick:dispatchForm}):'<div class="empty">None in transit.</div>'}</div>
  </div>`;
}
function _unusedAdminDashOld(){
  if(ME.role!=='admin')return viewSalesDash();
  return viewAdminDash();
  const open=S.orders.filter(o=>!['Delivered','Closed','Cancelled'].includes(o.status));
  const over=open.filter(o=>o.dueDate&&daysTo(o.dueDate)<0&&o.status!=='Dispatched');
  const inProd=S.jobs.filter(j=>['Ready','In Progress','Waiting Material','Blocked','On Hold'].includes(j.status));
  const qcHold=S.qc.filter(q=>['Fail','Hold','Rework'].includes(q.result)&&!q.closed);
  const ready=S.orders.reduce((n,o)=>n+(o.lines||[]).filter((l,i)=>lineQCState(o.id,i).ok&&dispatchedQty(o.id,i)<num(l.qty||1)).length,0);
  const fu=S.leads.filter(l=>!['Won','Lost'].includes(l.stage)&&l.nextFollow&&l.nextFollow<=today());
  const gold=metalByPurity().filter(m=>purityMetal(m.purity)==='Gold').reduce((s,m)=>s+m.fine,0);
  
  const al=alerts();
  const byStatus=ORDER_ST.map(s=>({l:s,v:S.orders.filter(o=>o.status===s).length})).filter(r=>r.v);
  const q={};inProd.forEach(j=>{const st=(j.route||[])[j.step||0]||'—';q[st]=(q[st]||0)+1});
  const lp=LEAD_ST.map(s=>({l:s,v:S.leads.filter(x=>x.stage===s).length})).filter(r=>r.v);
  const k=(v,l,cls='',mod)=>`<div class="card kpi ${cls}" ${mod?`style="cursor:pointer" onclick="go('${mod}')"`:''}><span class="v">${v}</span><span class="l">${esc(l)}</span></div>`;
  return phead('Dashboard',`${esc(SET.company.name)} · ${fdate(today())}${DEMO?' · <span class="pill warn">Demo data — nothing is saved</span>':''}`,can('orders','edit')?btn('+ New order','onclick="orderForm()"','pri'):'')+
  `<div class="grid g4">${k(open.length,'Open orders','', 'orders')}${k(over.length,'Overdue orders',over.length?'alert':'','orders')}${k(qcHold.length,'QC fail / hold',qcHold.length?'alert':'','qc')}${k(ready,'Lines ready to dispatch','','dispatch')}${k(fu.length,'Follow-ups due',fu.length?'alert':'','crm')}${k(fw(gold)+' g','Fine gold in stock','gold','inventory')}${k(money(cashBal()),'Cash + bank balance','gold','accounts')}</div>
  <div class="grid g2" style="margin-top:14px">
   <div class="card"><h2>Needs attention <span class="pill ${al.length?'bad':'good'}">${al.length}</span></h2>${al.length?`<div class="alerts">${al.slice(0,14).map(a=>`<div class="alert" onclick="go('${a.mod}');${a.id?`setTimeout(()=>openAlert('${a.mod}','${a.id}'),80)`:''}"><span class="sev ${a.sev}"></span><span>${esc(a.txt)}</span></div>`).join('')}${al.length>14?`<div class="note">+ ${al.length-14} more — see each module.</div>`:''}</div>`:'<div class="empty"><b>All clear</b>No overdue orders, blocked jobs or pending approvals.</div>'}</div>
   
   <div class="card"><h2>Orders by status</h2>${byStatus.length?hbars(byStatus):'<div class="empty"><b>No orders yet</b>Create one from a won lead or directly.</div>'}</div>
   <div class="card"><h2>Metal stock by purity</h2>${metalByPurity().length?table([{l:'Purity',k:'purity'},{l:'Net wt (g)',n:1,h:r=>fw(r.net)},{l:'Fine wt (g)',n:1,h:r=>`<span class="fine">${fw(r.fine)}</span>`},{l:'Value',n:1,h:r=>money(r.fine*rateFor(r.purity))}],metalByPurity()):'<div class="empty">No metal vouchers yet.</div>'}</div>
   <div class="card"><h2>Lead pipeline</h2>${lp.length?hbars(lp):'<div class="empty">No leads yet.</div>'}</div>
   <div class="card"><h2>This month</h2>${monthStats()}</div>
   <div class="card" style="grid-column:1/-1"><h2>Sales team · this month</h2>${salesTeamTable()}</div>
  </div>`}
function monthStats(){const m=today().slice(0,7);const inM=d=>(d||'').slice(0,7)===m;
  const rows=[['New leads',S.leads.filter(l=>inM(l.date)).length],['Leads won',S.leads.filter(l=>l.stage==='Won'&&inM(l.wonAt||l.updatedAt)).length],['Orders booked',S.orders.filter(o=>inM(o.date)).length],['Dispatches',S.dispatches.filter(d=>inM(d.date)).length],['Money in',money(S.cash.filter(e=>e.type==='Income'&&e.category!=='Opening balance'&&inM(e.date)).reduce((s,e)=>s+num(e.amount),0))],['Money out',money(S.cash.filter(e=>e.type==='Expense'&&inM(e.date)).reduce((s,e)=>s+num(e.amount),0))]];
  return `<dl class="dl">${rows.map(r=>`<dt>${r[0]}</dt><dd class="num" style="text-align:left">${r[1]}</dd>`).join('')}</dl>`}
function openAlert(mod,id){const c={orders:'orders',crm:'leads',production:'jobs',qc:'qc',quotes:'quotes',inventory:'vouchers',wastage:'wastage',karigars:'challans',dispatch:'dispatches'}[mod];c&&openRecord(c,id)}

/* ============ CRM (brief §4) ============ */
const LEAD_F=()=>[
  {k:'date',l:'Enquiry date/time',t:'dt',d:new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16)},
  {k:'source',l:'Source',t:'sel',o:()=>SET.leadSources,req:1},{k:'priority',l:'Priority',t:'sel',o:['Hot','Warm','Cold'],d:'Warm'},{k:'stage',l:'Stage',t:'sel',o:LEAD_ST,d:'New'},
  {k:'name',l:'Customer name',req:1,w:2},{k:'company',l:'Company'},{k:'prefContact',l:'Preferred contact',t:'sel',o:['Phone','Email','SMS','WhatsApp']},
  {k:'phone',l:'Phone',t:'tel'},{k:'email',l:'Email',t:'email'},{k:'city',l:'City'},{k:'country',l:'Country',d:'USA'},
  {k:'hr1',l:'Requirement',t:'hr'},
  {k:'category',l:'Product category',t:'sel',o:()=>SET.categories},{k:'design',l:'Design reference',t:'ref',o:refOpts('designs')},{k:'qty',l:'Quantity',t:'num'},{k:'purity',l:'Metal / purity',t:'sel',o:purOpts},
  {k:'budget',l:'Approx. budget',t:'num'},{k:'expectedDate',l:'Expected delivery',t:'date'},{k:'assignedTo',l:'Assigned to',t:'ref',o:empOpts},{k:'nextFollow',l:'Next follow-up',t:'date'},
  {k:'campaign',l:'Campaign / UTM',w:2},{k:'customer',l:'Linked customer',t:'ref',o:refOpts('customers'),w:2},
  {k:'notes',l:'Notes',t:'ta',w:4}];
function viewCRM(){
  const tab=TAB.crm||'board';const t=today();
  const tabs=[['board','Pipeline'],['list','All leads'],['follow','Follow-ups'],['report','Sales report']];
  let body='';
  if(tab==='board'){
    body=`<div class="board">${LEAD_ST.map(s=>{const ls=S.leads.filter(l=>(l.stage||'New')===s);return `<div class="col ${ls.length?'':'zero'}"><h4>${esc(s)}<span>${ls.length}</span></h4>${ls.map(l=>`<div class="tile ${l.nextFollow&&l.nextFollow<t&&!['Won','Lost'].includes(s)?'over':''}" onclick="leadDetail(byId('leads','${l.id}'))"><b>${esc(l.name)}</b><div class="meta"><span>${esc(l.category||'')}</span><span>${l.budget?money(l.budget):''}</span></div><div class="meta"><span>${esc(l.source||'')}</span><span>${l.nextFollow?'↻ '+fdate(l.nextFollow):''}</span></div></div>`).join('')||'<div class="note" style="padding:6px">—</div>'}</div>`}).join('')}</div>`}
  else if(tab==='list'){body=filterBar('leads',LEAD_ST)+table([{l:'Lead',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdt(r.date)},{l:'Name',k:'name'},{l:'Source',k:'source'},{l:'Category',k:'category'},{l:'Budget',n:1,h:r=>r.budget?money(r.budget):''},{l:'Assigned',h:r=>esc(nameOf('employees',r.assignedTo))},{l:'Stage',h:r=>stPill(r.stage)},{l:'Follow-up',h:r=>fdate(r.nextFollow)}],applyFil('leads',S.leads,'stage').sort((a,b)=>(b.date||'').localeCompare(a.date||'')),{onClick:leadDetail,empty:'No leads yet',emptyHint:'Add enquiries from website, calls, email or SMS.'})}
  else if(tab==='follow'){const rows=S.leads.filter(l=>!['Won','Lost'].includes(l.stage)&&l.nextFollow).sort((a,b)=>a.nextFollow.localeCompare(b.nextFollow));
    body=table([{l:'Due',h:r=>`${fdate(r.nextFollow)} ${r.nextFollow<t?'<span class="pill bad">Overdue</span>':r.nextFollow===t?'<span class="pill warn">Today</span>':''}`},{l:'Lead',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Name',k:'name'},{l:'Phone',k:'phone'},{l:'Stage',h:r=>stPill(r.stage)},{l:'Assigned',h:r=>esc(nameOf('employees',r.assignedTo))},{l:'Last activity',h:r=>{const a=(r.activities||[]).slice(-1)[0];return a?esc(a.type+': '+(a.outcome||'')):'—'}}],rows,{onClick:leadDetail,empty:'No follow-ups scheduled'})}
  else body=salesReport();
  return phead('CRM & Leads','Online sales only — website, calls, email, SMS. No field-sales tracking.',can('crm','edit')?btn('+ New lead','onclick="leadForm()"','pri'):'')+tabsHTML('crm',tabs,tab)+body}
function tabsHTML(key,tabs,cur){return `<div class="tabs">${tabs.map(([k,l])=>`<button class="${cur===k?'on':''}" onclick="TAB['${key}']='${k}';render()">${esc(l)}</button>`).join('')}</div>`}
function salesReport(){
  const bySrc={};S.leads.forEach(l=>{const s=l.source||'—';bySrc[s]=bySrc[s]||{l:s,n:0,won:0,val:0};bySrc[s].n++;if(l.stage==='Won'){bySrc[s].won++;bySrc[s].val+=num(l.budget)}});
  const byEmp={};S.leads.forEach(l=>{const e=nameOf('employees',l.assignedTo)||'Unassigned';byEmp[e]=byEmp[e]||{l:e,n:0,q:0,won:0};byEmp[e].n++;if(['Quotation Sent','Negotiation','Won'].includes(l.stage))byEmp[e].q++;if(l.stage==='Won')byEmp[e].won++});
  const lost={};S.leads.filter(l=>l.stage==='Lost').forEach(l=>{const r=l.lostReason||'Not given';lost[r]=(lost[r]||0)+1});
  const age=S.leads.filter(l=>!['Won','Lost'].includes(l.stage)).map(l=>({l:l.name,v:Math.max(0,-daysTo((l.date||'').slice(0,10)))})).sort((a,b)=>b.v-a.v).slice(0,8);
  return `<div class="grid g2"><div class="card"><h2>Lead source</h2>${table([{l:'Source',k:'l'},{l:'Leads',n:1,k:'n'},{l:'Won',n:1,k:'won'},{l:'Conversion',n:1,h:r=>fq(r.n?r.won/r.n*100:0)+'%'}],Object.values(bySrc))}</div>
  <div class="card"><h2>Team performance</h2>${table([{l:'Employee',k:'l'},{l:'Leads',n:1,k:'n'},{l:'Quoted+',n:1,k:'q'},{l:'Won',n:1,k:'won'},{l:'Conversion',n:1,h:r=>fq(r.n?r.won/r.n*100:0)+'%'}],Object.values(byEmp))}</div>
  <div class="card"><h2>Lost reasons</h2>${Object.keys(lost).length?hbars(Object.entries(lost).map(([l,v])=>({l,v}))):'<div class="empty">No lost leads.</div>'}</div>
  <div class="card"><h2>Oldest open leads (days)</h2>${age.length?hbars(age):'<div class="empty">No open leads.</div>'}</div></div>`}
function findDup(v){const ph=(v.phone||'').replace(/\D/g,'').slice(-10),em=(v.email||'').toLowerCase().trim();
  const m=x=>(ph&&ph.length>=7&&(x.phone||'').replace(/\D/g,'').slice(-10)===ph)||(em&&(x.email||'').toLowerCase().trim()===em);
  return [...S.leads.filter(x=>x.id!==v.id&&m(x)).map(x=>'lead '+x.no+' ('+x.name+')'),...S.customers.filter(x=>m(x)).map(x=>'customer '+x.no+' ('+x.name+')')]}
function leadForm(l){
  let warned='';
  openForm({title:l?`Edit lead ${l.no}`:'New lead',fields:LEAD_F(),value:l||{},wide:1,async onSave(v){
    const d=findDup(v).join(', ');
    if(d&&warned!==d){warned=d;toast('Possible duplicate: '+d+'. Press Save again to keep it as a separate lead.',true);return false}
    await save('leads',{...v,dupOf:d||''})}})}
function leadDetail(l){
  const acts=(l.activities||[]).slice().reverse();
  modal({title:`${l.no} · ${l.name}`,sub:`${stPill(l.stage)} · ${esc(l.source||'')} · ${fdt(l.date)}`,wide:1,body:`
   ${l.dupOf?`<div class="banner warn">Possible duplicate of ${esc(l.dupOf)}</div>`:''}
   <div class="grid g2"><dl class="dl"><dt>Phone</dt><dd>${esc(l.phone||'—')}</dd><dt>Email</dt><dd>${esc(l.email||'—')}</dd><dt>Company</dt><dd>${esc(l.company||'—')}</dd><dt>Location</dt><dd>${esc([l.city,l.country].filter(Boolean).join(', ')||'—')}</dd><dt>Prefers</dt><dd>${esc(l.prefContact||'—')}</dd><dt>Assigned</dt><dd>${esc(nameOf('employees',l.assignedTo)||'—')}</dd><dt>Customer</dt><dd>${l.customer?esc(custName(l.customer)):'Not linked'}</dd></dl>
   <dl class="dl"><dt>Wants</dt><dd>${esc([l.qty,l.category,l.purity].filter(Boolean).join(' · ')||'—')}</dd><dt>Design</dt><dd>${esc(nameOf('designs',l.design)||'—')}</dd><dt>Budget</dt><dd>${l.budget?money(l.budget):'—'}</dd><dt>Needed by</dt><dd>${fdate(l.expectedDate)}</dd><dt>Next follow-up</dt><dd>${fdate(l.nextFollow)}</dd><dt>Campaign</dt><dd>${esc(l.campaign||'—')}</dd>${l.lostReason?`<dt>Lost reason</dt><dd>${esc(l.lostReason)}</dd>`:''}</dl></div>
   ${l.notes?`<div class="note">${esc(l.notes)}</div>`:''}
   <div><h3>Activity · calls, email, SMS</h3>${can('crm','edit')?`<div class="form" style="margin-bottom:10px"><div class="f"><label>Type</label><select id="aType"><option>Call (outgoing)</option><option>Call (incoming)</option><option>Email</option><option>SMS</option><option>WhatsApp</option><option>Note</option></select></div><div class="f"><label>Duration (min)</label><input id="aDur" type="number" step="any"></div><div class="f w2"><label>Outcome / notes</label><input id="aOut" placeholder="e.g. Sent 3 design options, wants 14K"></div><div class="f"><label>Next follow-up</label><input id="aNext" type="date"></div><div class="f"><label>Move stage to</label><select id="aStage"><option value="">(no change)</option>${LEAD_ST.map(s=>`<option>${s}</option>`).join('')}</select></div><div class="f w2" style="justify-content:flex-end"><label>&nbsp;</label><button class="btn pri" id="aAdd">Log activity</button></div></div>`:''}
   ${acts.length?`<ul class="timeline">${acts.map(a=>`<li><b>${esc(a.type)}</b>${a.dur?` · ${esc(a.dur)} min`:''} — ${esc(a.outcome||'')}<small>${fdt(a.ts)} · ${esc(userName(a.by))}</small></li>`).join('')}</ul>`:'<div class="note">No activity logged yet.</div>'}</div>`,
   foot:`${can('crm','edit')?`${btn('Edit','data-e')}${l.stage!=='Lost'?btn('Mark lost','data-lost','dng'):''}${!l.customer?btn('Create customer','data-cust'):''}${can('quotes','edit')?btn('Create quotation','data-q','pri'):''}`:''}`,
   onMount(ov,close){
    const q=s=>ov.querySelector(s);
    q('#aAdd')&&(q('#aAdd').onclick=async()=>{const a={type:q('#aType').value,dur:q('#aDur').value,outcome:q('#aOut').value,ts:nowISO(),by:ME.id};if(!a.outcome){toast('Add the outcome so the team knows what happened.',true);return}
      const nx={...l,activities:[...(l.activities||[]),a]};if(q('#aNext').value)nx.nextFollow=q('#aNext').value;if(q('#aStage').value)nx.stage=q('#aStage').value;else if(nx.stage==='New')nx.stage='Contacted';if(nx.stage==='Won')nx.wonAt=nowISO();
      const s=await save('leads',nx,{action:'activity',silent:1});close();leadDetail(s)});
    q('[data-e]')&&(q('[data-e]').onclick=()=>{close();leadForm(l)});
    q('[data-lost]')&&(q('[data-lost]').onclick=()=>{close();openForm({title:'Mark lead as lost',fields:[{k:'lostReason',l:'Reason',t:'sel',o:()=>SET.lostReasons,req:1},{k:'competitor',l:'Competitor (optional)'},{k:'nextFollow',l:'Re-contact on (optional)',t:'date'}],value:{},onSave:v=>save('leads',{...l,...v,stage:'Lost'},{action:'lost',reason:v.lostReason})})});
    q('[data-cust]')&&(q('[data-cust]').onclick=async()=>{const d=findDup(l).filter(x=>x.startsWith('customer'));if(d.length){toast('A customer with this phone/email exists: '+d[0]+'. Link it via Edit.',true);return}const c=await save('customers',{name:l.company||l.name,contact:l.name,phone:l.phone,email:l.email,city:l.city,country:l.country,type:l.company?'Company':'Individual',source:l.source});const s=await save('leads',{...l,customer:c.id},{silent:1});close();leadDetail(s)});
    q('[data-q]')&&(q('[data-q]').onclick=async()=>{let cust=l.customer;if(!cust){const c=await save('customers',{name:l.company||l.name,contact:l.name,phone:l.phone,email:l.email,city:l.city,country:l.country,type:l.company?'Company':'Individual',source:l.source});cust=c.id;await save('leads',{...l,customer:cust},{silent:1})}
      close();quoteForm({customer:cust,lead:l.id,date:today(),validTill:ymd(new Date(Date.now()+7*864e5)),taxPct:3,lines:[{desc:l.category||'',design:l.design||'',purity:l.purity||'',qty:l.qty||1,rate:l.purity?rateFor(l.purity):''}]})})}})}

/* ============ QUOTATIONS (brief §4.4) ============ */
const QL_COLS=()=>[{k:'desc',l:'Item / description',w:170},{k:'design',l:'Design',t:'ref',o:refOpts('designs',d=>d.code||d.no),w:110},{k:'purity',l:'Purity',t:'sel',o:purOpts,w:110},{k:'qty',l:'Qty',t:'num',w:60},{k:'wt',l:'Net wt (g)',t:'num',w:80},{k:'rate',l:'Rate / g',t:'num',w:80},{k:'making',l:'Making',t:'num',w:80},{k:'stone',l:'Stones',t:'num',w:80},{k:'other',l:'Other',t:'num',w:70},{k:'amt',l:'Amount',calc:lineAmt,fmt:money}];
function viewQuotes(){
  const rows=applyFil('quotes',S.quotes).sort((a,b)=>(b.no||'').localeCompare(a.no||''));
  return phead('Quotations','Versioned quotations with approval when discount exceeds '+SET.discLimitPct+'%. Accepted quotations convert to orders without retyping.',can('quotes','edit')?btn('+ New quotation','onclick="quoteForm()"','pri'):'')+filterBar('quotes',QUOTE_ST)+
  table([{l:'Quotation',h:r=>`<span class="ref">${esc(r.no)}</span> <span class="note">v${r.version||1}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Customer',h:r=>esc(custName(r.customer))},{l:'Items',n:1,h:r=>(r.lines||[]).length},{l:'Total',n:1,h:r=>money(quoteTotals(r).total)},{l:'Valid till',h:r=>fdate(r.validTill)},{l:'Status',h:r=>stPill(r.status||'Draft')},{l:'Order',h:r=>r.order?`<span class="ref">${esc(orderOf(r.order)?.no||'')}</span>`:''}],rows,{onClick:quoteView,empty:'No quotations yet',emptyHint:'Create one from a lead or here.'})}
function quoteForm(q){
  q=q||{date:today(),taxPct:3,lines:[{}]};
  const fields=[{k:'customer',l:'Customer',t:'ref',o:refOpts('customers'),req:1,w:2},{k:'lead',l:'From lead',t:'ref',o:refOpts('leads')},{k:'date',l:'Date',t:'date',d:today()},
   {k:'validTill',l:'Valid till',t:'date',req:1},{k:'channel',l:'Send via',t:'sel',o:['Email','WhatsApp','SMS','Phone','In person']},{k:'rateSource',l:'Metal rate source',d:'Company rate · '+today(),w:2},
   {k:'lines',l:'Line items',t:'lines',cols:QL_COLS()},
   {k:'discount',l:'Discount (amount)',t:'num'},{k:'taxPct',l:'GST / tax %',t:'num',d:3},{k:'subT',l:'Sub-total',ro:1,calc:v=>money(quoteTotals(v).sub)},{k:'totT',l:'Grand total',ro:1,calc:v=>money(quoteTotals(v).total)},
   {k:'overrideReason',l:'Rate override / discount reason',w:2,hint:'Required when rates differ from Setup or discount is above the limit.'},{k:'terms',l:'Terms & notes',t:'ta',w:2}];
  openForm({title:q.id?`Edit ${q.no} (will save as v${(q.version||1)+(['Sent','Approved','Accepted'].includes(q.status)?1:0)})`:'New quotation',fields,value:q,wide:1,async onSave(v){
    delete v.subT;delete v.totT;const t=quoteTotals(v);
    const rateDiff=(v.lines||[]).some(l=>l.purity&&num(l.rate)&&Math.abs(num(l.rate)-rateFor(l.purity))>0.01);
    if((t.discPct>SET.discLimitPct||rateDiff)&&!v.overrideReason){toast('Give a reason: discount is above '+SET.discLimitPct+'% or a rate differs from the company rate.',true);return false}
    if(q.id&&['Sent','Approved','Accepted'].includes(q.status)){const {versions,...snap}=q;v.versions=[...(q.versions||[]),{...snap,savedAt:nowISO()}];v.version=(q.version||1)+1}
    v.version=v.version||1;
    v.status=t.discPct>SET.discLimitPct&&!can('quotes','approve')?'Awaiting Approval':(q.id&&q.status&&!['Sent','Approved','Accepted'].includes(q.status)?q.status:(t.discPct>SET.discLimitPct?'Approved':'Draft'));
    if(t.discPct>SET.discLimitPct&&can('quotes','approve')){v.approvedBy=ME.id;v.approvedAt=nowISO()}
    const s=await save('quotes',v,{reason:v.overrideReason});
    if(v.lead){const l=byId('leads',v.lead);if(l&&!['Won','Quotation Sent','Negotiation'].includes(l.stage))await save('leads',{...l,stage:'Quotation Sent'},{silent:1,action:'stage'})}
    setTimeout(()=>quoteView(s),50)}})}
function quoteView(q){
  const t=quoteTotals(q);const st=q.status||'Draft';
  modal({title:`${q.no} · v${q.version||1}`,sub:`${stPill(st)} · ${esc(custName(q.customer))} · valid till ${fdate(q.validTill)}`,wide:1,body:`
   ${st==='Awaiting Approval'?`<div class="banner warn">Discount ${fq(t.discPct)}% is above the ${SET.discLimitPct}% limit. A manager or admin must approve before sending.</div>`:''}
   ${table([{l:'Item',k:'desc'},{l:'Design',h:r=>esc(nameOf('designs',r.design))},{l:'Purity',k:'purity'},{l:'Qty',n:1,k:'qty'},{l:'Wt (g)',n:1,h:r=>fw(r.wt)},{l:'Rate/g',n:1,h:r=>fq(r.rate)},{l:'Making',n:1,h:r=>fq(r.making)},{l:'Stones',n:1,h:r=>fq(r.stone)},{l:'Amount',n:1,h:r=>money(lineAmt(r))}],q.lines||[])}
   <dl class="dl" style="margin-left:auto"><dt>Sub-total</dt><dd class="num">${money(t.sub)}</dd><dt>Discount</dt><dd class="num">− ${money(t.disc)} (${fq(t.discPct)}%)</dd><dt>Tax ${fq(q.taxPct)}%</dt><dd class="num">${money(t.tax)}</dd><dt><b>Total</b></dt><dd class="num"><b>${money(t.total)}</b></dd></dl>
   <dl class="dl"><dt>Rate source</dt><dd>${esc(q.rateSource||'—')}</dd>${q.overrideReason?`<dt>Override reason</dt><dd>${esc(q.overrideReason)}</dd>`:''}${q.approvedBy?`<dt>Approved</dt><dd>${esc(userName(q.approvedBy))} · ${fdt(q.approvedAt)}</dd>`:''}${q.sentAt?`<dt>Sent</dt><dd>${fdt(q.sentAt)} via ${esc(q.channel||'')}</dd>`:''}${q.terms?`<dt>Terms</dt><dd>${esc(q.terms)}</dd>`:''}</dl>
   ${(q.versions||[]).length?`<div><h3>Version history</h3>${table([{l:'Version',h:r=>'v'+(r.version||1)},{l:'Saved',h:r=>fdt(r.savedAt)},{l:'Status',h:r=>stPill(r.status)},{l:'Total',n:1,h:r=>money(quoteTotals(r).total)}],q.versions)}</div>`:''}`,
   foot:[btn('Download (HTML)','data-dl'),can('quotes','edit')&&!q.order?btn('Edit','data-e'):'',st==='Awaiting Approval'&&can('quotes','approve')?btn('Approve','data-ap','good'):'',['Draft','Approved'].includes(st)&&can('quotes','edit')?btn('Mark sent','data-sent'):'',['Sent','Approved','Draft'].includes(st)&&can('quotes','edit')?btn('Rejected','data-rej','dng'):'',['Sent','Approved','Accepted'].includes(st)&&!q.order&&can('orders','edit')?btn('Accepted → create order','data-conv','pri'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-e]')&&(b('[data-e]').onclick=()=>{close();quoteForm(q)});
    b('[data-ap]')&&(b('[data-ap]').onclick=async()=>{close();await save('quotes',{...q,status:'Approved',approvedBy:ME.id,approvedAt:nowISO()},{action:'approve'})});
    b('[data-sent]')&&(b('[data-sent]').onclick=async()=>{close();await save('quotes',{...q,status:'Sent',sentAt:nowISO()},{action:'sent'})});
    b('[data-rej]')&&(b('[data-rej]').onclick=()=>{close();askReason('Quotation rejected','Why did the customer reject it?',r=>save('quotes',{...q,status:'Rejected',rejectReason:r},{action:'rejected',reason:r}))});
    b('[data-dl]').onclick=()=>downloadQuote(q);
    b('[data-conv]')&&(b('[data-conv]').onclick=async()=>{close();
      const o=await save('orders',{customer:q.customer,quote:q.id,lead:q.lead,date:today(),status:'Confirmed',priority:'Normal',estimate:t.sub,saleValue:t.total,salesBy:q.createdBy||ME.id,lines:(q.lines||[]).map(l=>({desc:l.desc,design:l.design,purity:l.purity,qty:l.qty||1,targetWt:l.wt,status:'Pending',route:Object.keys(SET.routes)[0]})),history:[{ts:nowISO(),by:ME.id,to:'Confirmed',note:'Converted from '+q.no}]});
      await save('quotes',{...q,status:'Accepted',order:o.id},{action:'converted',silent:1});
      if(q.lead){const l=byId('leads',q.lead);l&&await save('leads',{...l,stage:'Won',wonAt:nowISO()},{silent:1,action:'won'})}
      go('orders');setTimeout(()=>orderDetail(byId('orders',o.id)||o),80)})}})}
async function downloadQuote(q){
  const t=quoteTotals(q);const c=byId('customers',q.customer)||{};
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(q.no)}</title><style>body{font-family:Arial,sans-serif;margin:40px;color:#111}h1{margin:0}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{border:1px solid #ccc;padding:6px;text-align:left}td.n,th.n{text-align:right}.r{text-align:right}</style></head><body><h1>${esc(SET.company.name)}</h1><div>${esc(SET.company.address)} · ${esc(SET.company.phone)} · ${esc(SET.company.email)}${SET.company.gstin?' · GSTIN '+esc(SET.company.gstin):''}</div><hr><h2>Quotation ${esc(q.no)} (v${q.version||1})</h2><p>Date: ${esc(q.date)} · Valid till: ${esc(q.validTill)}<br>To: <b>${esc(c.name||'')}</b> ${esc(c.phone||'')} ${esc(c.email||'')}</p><table><tr><th>Item</th><th>Purity</th><th class="n">Qty</th><th class="n">Wt (g)</th><th class="n">Rate/g</th><th class="n">Making</th><th class="n">Stones</th><th class="n">Amount</th></tr>${(q.lines||[]).map(l=>`<tr><td>${esc(l.desc)}</td><td>${esc(l.purity)}</td><td class="n">${esc(l.qty)}</td><td class="n">${esc(l.wt)}</td><td class="n">${esc(l.rate)}</td><td class="n">${esc(l.making)}</td><td class="n">${esc(l.stone)}</td><td class="n">${money(lineAmt(l))}</td></tr>`).join('')}</table><p class="r">Sub-total ${money(t.sub)}<br>Discount − ${money(t.disc)}<br>Tax ${q.taxPct}%: ${money(t.tax)}<br><b>Total ${money(t.total)}</b></p><p>${esc(q.terms||'')}</p><p style="font-size:12px;color:#666">Metal rate: ${esc(q.rateSource||'')}</p></body></html>`;
  saveFile(q.no+'.html',html,'text/html')}

/* ============ ORDERS (brief §5) ============ */
function catOpts(){const base=(SET.categories||[]).slice();['Certified Diamonds','Custom Products'].forEach(x=>{if(!base.includes(x))base.push(x)});return [...base.map(c=>[c,c]),['__add__','➕ Add new category…']]}
function addCategory(selEl){openForm({title:'Add new category',fields:[{k:'name',l:'Category name',req:1}],value:{},async onSave(v){const name=(v.name||'').trim();if(!name)return false;const base=(SET.categories||[]).slice();
  if(!base.includes(name)){base.push(name);try{const r=await api('/api/settings',{settings:{...SET,categories:base}});SET.categories=(r.settings&&r.settings.categories)||base}catch(e){toast(e.message||'Only an admin / accountant can add categories.',true);return false}}
  document.querySelectorAll('select[data-c="category"]').forEach(s=>{if(![...s.options].some(o=>o.value===name)){const before=s.querySelector('option[value="__add__"]');const opt=document.createElement('option');opt.value=name;opt.textContent=name;s.insertBefore(opt,before)}});if(selEl)selEl.value=name;toast('Category "'+name+'" added')}})}
document.addEventListener('change',e=>{const s=e.target;if(s&&s.matches&&s.matches('select[data-c="category"]')&&s.value==='__add__'){s.value='';addCategory(s)}});
const OL_COLS=()=>[{k:'desc',l:'Product (short name)',w:170},{k:'category',l:'Category',t:'sel',o:catOpts,w:150},{k:'purity',l:'Metal purity',t:'sel',o:purOpts,w:130},{k:'diamondType',l:'Diamond type',t:'sel',o:['Lab-grown','Moissanite','Natural','Other'],w:120},{k:'qty',l:'Qty',t:'num',w:60},{k:'size',l:'Size',w:60},{k:'movement',l:'Movement (watch)',t:'sel',o:['Japanese movement','Swiss movement','Other'],w:150}];
function viewOrders(){
  const tab=TAB.orders||'list';
  let body;
  if(tab==='board'){body=`<div class="board">${ORDER_ST.filter(s=>!['Closed','Cancelled'].includes(s)).map(s=>{const os=S.orders.filter(o=>o.status===s);return `<div class="col ${os.length?'':'zero'}"><h4>${s}<span>${os.length}</span></h4>${os.map(o=>`<div class="tile ${o.dueDate&&daysTo(o.dueDate)<0&&!['Dispatched','Delivered'].includes(s)?'over':''}" onclick="orderDetail(byId('orders','${o.id}'))"><span class="ref">${esc(o.no)}</span> ${o.priority==='Urgent'?'<span class="pill bad">Urgent</span>':''}<div><b>${esc(custName(o.customer))}</b></div><div class="meta"><span>${(o.lines||[]).length} item(s)</span><span>Due ${fdate(o.dueDate)}</span></div></div>`).join('')}</div>`}).join('')}</div>`}
  else body=filterBar('orders',ORDER_ST)+table([{l:'Order',h:r=>`<span class="ref">${esc(r.no)}</span>${r.extRef?`<div class="note">${esc(r.extRef)}</div>`:''}`},{l:'Date',h:r=>fdate(r.date)},{l:'Customer',h:r=>esc(custName(r.customer))},{l:'Items',n:1,h:r=>(r.lines||[]).length},{l:'Sale value',n:1,h:r=>orderSaleRaw(r)?fcur(orderSaleRaw(r),ordCur(r)):''},{l:'Sales person',h:r=>esc(userName(orderSeller(r)))},{l:'Due',h:r=>{const d=daysTo(r.dueDate);return fdate(r.dueDate)+(d!=null&&d<0&&!['Dispatched','Delivered','Closed','Cancelled'].includes(r.status)?` <span class="pill bad">${-d}d late</span>`:'')}},{l:'Status',h:r=>stPill(r.status)}],applyFil('orders',S.orders).sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:orderDetail,empty:'No orders yet',emptyHint:'Convert an accepted quotation, or create an order directly.'});
  return phead('Orders','One order, many items — each item has its own design, route, QC and dispatch status.',can('orders','edit')?btn('+ New order','onclick="orderForm()"','pri'):'')+tabsHTML('orders',[['list','List'],['board','Status board']],tab)+body}
function nextOrderNo(){const nums=S.orders.map(o=>{const m=/^IVM0*(\d+)$/.exec(o.no||'');return m?+m[1]:0});return 'IVM'+String(Math.max(0,...nums)+1).padStart(2,'0')}
function orderForm(o){
  const isNew=!o;o=o||{currency:'USD',date:today(),status:'Confirmed',priority:'Normal',stage:'Order received',channel:'ivevar.com',lines:[{qty:1}]};
  const cu0=o.customer?byId('customers',o.customer):null;
  const val={...o,custName:o.customer?custName(o.customer):'',custCC:o.phoneCC||'+1',custPhone:o.phoneNum||'',custEmail:o.email||(cu0&&cu0.email)||'',custCountry:o.country||(cu0&&cu0.country)||'United States',addr1:o.addr1||'',addr2:o.addr2||'',city:o.city||'',state:o.state||'',zip:o.zip||''};
  if(val.custCountry==='USA'||val.custCountry==='US')val.custCountry='United States';if(val.custCountry==='UK')val.custCountry='United Kingdom';
  openForm({title:isNew?'New order':`Edit ${o.no}`,wide:1,value:val,fields:[
    {k:'currency',l:'Currency',t:'cur',req:1,d:'USD',w:2},
    {k:'custName',l:'Customer full name',t:'text',list:()=>S.customers.map(c=>[c.name,c.name]),req:1,w:2,hint:'Type the name — a new customer is created automatically if not found'},
    {k:'orderIdDisplay',l:'Order ID (auto)',ro:1,calc:v=>isNew?nextOrderNo():o.no},
    {k:'custCC',l:'Country code',t:'ccode',d:'+1'},{k:'custPhone',l:'WhatsApp / phone number',t:'tel',w:2},{k:'custEmail',l:'Customer email',t:'email',w:2},
    {k:'date',l:'Order date',t:'date',req:1},{k:'dueDate',l:'Promised delivery',t:'date',req:1},
    {k:'priority',l:'Priority',t:'sel',o:['Normal','High','Urgent']},{k:'status',l:'Status',t:'sel',o:ORDER_ST,ro:!isNew&&!can('orders','approve')},
    {k:'channel',l:'Sales channel',t:'sel',o:['ivevar.com','ivevar.us','ivevar.in','Etsy','Sales executive']},
    {k:'lines',l:'Items',t:'lines',cols:OL_COLS()},
    {k:'productFiles',l:'Product photo(s)',t:'file',accept:'image/*',max:15,btn:'Upload product photo',w:4},
    {k:'hrP',l:'Pricing & profit',t:'hr'},
    {k:'saleValue',l:'Total order value ($)',t:'num',req:1,hint:'What the customer pays'},
    {k:'usdRate',l:'Exchange rate → INR',ro:1,calc:v=>{const c=v.currency||'USD';return c==='INR'?'1.00 (INR)':fxRate(c).toFixed(2)+' ₹ / '+c},hint:'Admin-set rate — locked for this order'},
    {k:'makingCostINR',l:'Making / product cost (₹)',t:'num',hint:'Your buy/making cost in INR'},
    {k:'courierINR',l:'Courier expense (₹)',t:'num'},
    {k:'profitPreview',l:'Profit before marketing (₹)',ro:1,calc:v=>{const p=toINRat(num(v.saleValue),v.currency||'USD',fxRate(v.currency||'USD'))-num(v.makingCostINR)-num(v.courierINR);return money(p)}},
    {k:'sharePreview',l:'Sales share '+COMMISSION_PCT()+'% (₹)',ro:1,calc:v=>{const p=toINRat(num(v.saleValue),v.currency||'USD',fxRate(v.currency||'USD'))-num(v.makingCostINR)-num(v.courierINR);return money(r2(p*COMMISSION_PCT()/100))}},
    ...(isNew?[{k:'advance',l:'Advance / deposit received now ($)',t:'num',hint:'Optional — add its screenshot below; an admin confirms it'},{k:'payMethod',l:'Payment method (how it came)',t:'sel',o:PAY_METHODS},{k:'payMethodOther',l:'If "Other", specify which method'},{k:'paymentShot',l:'Payment screenshot',t:'file',accept:'image/*',max:1,btn:'Upload payment screenshot',w:2}]:[]),
    {k:'salesBy',l:'Sales executive',t:'sel',o:()=>USERS.filter(u=>u.active!==false).map(u=>[u.id,u.name]),d:ME.id},
    {k:'hrX',l:'Shipping address',t:'hr'},
    {k:'addr1',l:'Address line 1',w:2},{k:'addr2',l:'Address line 2 (optional)',w:2},
    {k:'custCountry',l:'Country',t:'sel',o:()=>COUNTRIES,d:'United States'},{k:'state',l:'State / province',list:()=>(C_STATES['United States']||[]).map(s=>[s,s])},{k:'city',l:'City',list:()=>[]},{k:'zip',l:'ZIP / postal code'},
    {k:'hrE',l:'Extras',t:'hr'},
    {k:'gift',l:'Is this a gift?',t:'bool',cl:'Yes, gift'},{k:'engraving',l:'Engraving (if any)'},{k:'followup',l:'Follow-up needed?',t:'bool',cl:'Yes'},
    {k:'instructions',l:'Special instructions / notes',t:'ta',w:2}],
   onChange(cur,form){const sym=curSym(cur.currency||'USD');
     const relabel=(k,base,req)=>{const el=form.querySelector(`[data-k="${k}"]`);if(!el)return;const lab=el.closest('.f').querySelector('label');if(lab)lab.innerHTML=base+' ('+sym+')'+(req?' <span class="rq">*</span>':'')};
     relabel('saleValue','Total order value',true);relabel('advance','Advance / deposit received now',false);
     const inpS=form.querySelector('[data-k="state"]');let country=cur.custCountry||'United States';if(country==='USA'||country==='US')country='United States';if(country==='UK')country='United Kingdom';
     if(inpS&&inpS.dataset.c!==country){inpS.dataset.c=country;const emb=C_STATES[country];if(emb){fillDL(inpS,emb)}else{fillDL(inpS,[]);geoFetchStates(country).then(st=>{if(inpS.dataset.c===country)fillDL(inpS,st)})}const inpC0=form.querySelector('[data-k="city"]');if(inpC0)inpC0.dataset.sc='';}
     const inpC=form.querySelector('[data-k="city"]');const stv=cur.state||'';
     if(inpC&&stv&&inpC.dataset.sc!==country+'|'+stv){inpC.dataset.sc=country+'|'+stv;fillDL(inpC,[]);geoFetchCities(country,stv).then(cs=>{if(inpC.dataset.sc===country+'|'+stv)fillDL(inpC,cs)})}},
   async onSave(v){
     const cn=(v.custName||'').trim();if(!cn){toast('Enter the customer name.',true);return false}
     if(!(v.lines||[]).length){toast('Add at least one item.',true);return false}
     const phone=((v.custCC||'')+' '+(v.custPhone||'')).trim();
     const shipTo=[cn,v.addr1,v.addr2,[v.city,v.state,v.zip].filter(Boolean).join(' '),v.custCountry,phone].filter(Boolean).join('\n');
     let cust=S.customers.find(c=>(c.name||'').toLowerCase()===cn.toLowerCase());
     if(!cust){try{cust=await save('customers',{name:cn,phone,email:v.custEmail||'',city:v.city||'',country:v.custCountry||'',address:shipTo,source:v.channel||'Website'},{silent:1})}catch(e){return false}}
     v.customer=cust.id;v.email=v.custEmail||v.email||'';v.phone=phone;v.phoneCC=v.custCC||'';v.phoneNum=v.custPhone||'';v.country=v.custCountry||'';v.shipTo=shipTo;
     delete v.custName;delete v.custEmail;delete v.custPhone;delete v.custCC;delete v.custCountry;delete v.orderIdDisplay;delete v.profitPreview;delete v.sharePreview;
     const adv=num(v.advance);delete v.advance;
     const prodFiles=Array.isArray(v.productFiles)?v.productFiles:[];delete v.productFiles;
     const payShot=(Array.isArray(v.paymentShot)?v.paymentShot:[])[0]||null;delete v.paymentShot;
     const payMethod=v.payMethod;delete v.payMethod;const payMethodOther=v.payMethodOther;delete v.payMethodOther;
     const payMethodFinal=(payMethod==='Other'?((payMethodOther||'').trim()||'Other'):payMethod)||'Advance / deposit';
     if(prodFiles.length)v.productPhotos=[...(v.productPhotos||[]),...prodFiles];
     if(!v.salesBy)v.salesBy=ME.id;
     v.usdRate=fxRate(v.currency||'USD');
     v.lines=v.lines.map(l=>({qty:1,status:'Pending',...l}));
     if(isNew)v.history=[{ts:nowISO(),by:ME.id,to:v.status,note:'Order created'}];
     else if(o.status!==v.status)v.history=[...(o.history||[]),{ts:nowISO(),by:ME.id,from:o.status,to:v.status,note:'Edited'}];
     let s=await save('orders',v);
     if(isNew&&adv>0){const pid=uid();const pay={pid,amount:adv,currency:v.currency,method:payMethodFinal,date:today(),verified:false,by:ME.id,createdAt:nowISO()};if(payShot)pay.screenshot=payShot;
       s=await save('orders',{...s,payments:[pay]},{silent:1,action:'advance payment'});toast('Advance '+fcur(adv,v.currency)+(payShot?' recorded with screenshot ✓':' recorded — admin will confirm it'));}
     setTimeout(()=>orderDetail(byId('orders',s.id)||s),60)}})}
/* --- order stage pipeline (sales can advance) --- */
function stageStepper(o){const cur=stageIdx(orderStage(o));
  return `<div class="stagebar">${ORDER_STAGE.map((s,i)=>`<div class="stg ${i<cur?'done':i===cur?'cur':''}" ${can('orders','edit')?`onclick="setStage('${o.id}','${esc(s)}')" title="Set stage"`:''}><span class="si">${STAGE_ICON[s]}</span><span class="sl">${esc(s)}</span></div>`).join('<span class="sarr">›</span>')}</div>`}
async function setStage(id,st){const o=orderOf(id);if(!o)return;if(o.stage===st)return;await save('orders',{...o,stage:st},{action:'stage',silent:1});toast('Stage: '+st);const open=$('.ov');if(open)setTimeout(()=>{$('.ov')&&$('.ov').remove();orderDetail(byId('orders',id))},40)}
/* --- payments with screenshot + verification --- */
function paymentsPanel(o){const pays=orderPayments(o);const cur=ordCur(o);const rate=ordRate(o);const sale=orderSaleRaw(o);const paid=orderPaidRaw(o);const pend=orderPaidPending(o);const bal=sale-paid;
  const fully=(sale>0&&bal<=0.5)||pays.some(p=>p.verified&&p.final);
  return `<div><h3>Payments <span class="note">(${esc(cur)})</span> ${fully?'<span class="pill good">Fully paid</span>':''}</h3>
   <dl class="dl"><dt>Order total</dt><dd>${dual(sale,cur,rate)}</dd><dt>Received (verified)</dt><dd style="color:var(--good)">${dual(paid,cur,rate)}</dd>${pend?`<dt>Pending verification</dt><dd style="color:var(--warn)">${fcur(pend,cur)}</dd>`:''}<dt><b>Balance to collect</b></dt><dd><b style="color:${bal>0.5?'var(--bad)':'var(--good)'}">${dual(bal,cur,rate)}</b></dd></dl>
   ${o.paidOnline?`<div class="note">Website paid online: ${fcur(o.paidOnline,cur)}</div>`:''}
   ${pays.length?`<div class="paylist">${pays.map(p=>`<div class="payrow"><div><b>${fcur(p.amount,p.currency||cur)}</b>${p.final?' <span class="pill good">Final</span>':''} <span class="note">${esc(p.method||'')} · ${fdate(p.date)}</span>${p.ref?`<div class="note">Ref: ${esc(p.ref)}</div>`:''}</div>${p.screenshot?`<a href="${esc(p.screenshot.url)}" target="_blank" rel="noopener" class="thumb"><img src="${esc(p.screenshot.url)}" alt="screenshot"></a>`:'<span class="note">no screenshot</span>'}<div class="payconf">${(can('accounts','approve')||can('orders','approve'))?`<span class="note">Confirmation by</span><select class="setsel" onchange="setPayConf('${o.id}','${p.pid}',this.value)"><option value="">Pending</option>${CONFIRMERS().map(u=>`<option value="${u.id}" ${p.verified&&p.verifiedBy===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select>`:`<span class="pill ${p.verified?'good':'warn'}">${p.verified?'Confirmed · '+esc(userName(p.verifiedBy)):'Pending'}</span>`}${can('orders','edit')?`<button class="btn sm dng" onclick="removePayment('${o.id}','${p.pid}')" title="Remove">✕</button>`:''}</div></div>`).join('')}</div>`:'<div class="note">No payments recorded yet.</div>'}</div>`}
function addPaymentForm(o){const cur=ordCur(o);
  openForm({title:'Record payment',sub:'Attach the payment screenshot. An accountant/admin verifies it.',fields:[{k:'amount',l:'Amount ('+curSym(cur)+' '+cur+')',t:'num',req:1},{k:'currency',l:'Currency',t:'cur',d:cur},{k:'method',l:'Payment method',t:'sel',o:PAY_METHODS,req:1},{k:'date',l:'Date',t:'date',d:today()},{k:'confBy',l:'Payment confirmation by',t:'sel',o:()=>[['','Pending — not confirmed yet'],...CONFIRMERS().map(u=>[u.id,u.name])],d:'',hint:'Who confirmed it reached our account'},{k:'ref',l:'Reference / txn id'},{k:'final',l:'Final payment?',t:'bool',cl:'Yes — order fully paid'},{k:'note',l:'Note',t:'ta',w:2}],value:{},onChange(cur2,form){const el=form.querySelector('[data-k="amount"]');if(el){const lab=el.closest('.f').querySelector('label');if(lab)lab.innerHTML='Amount ('+curSym(cur2.currency)+' '+esc(cur2.currency||cur)+') <span class="rq">*</span>'}},async onSave(v){
    let shot=null;
    const pid=uid();
    const pay={pid,amount:num(v.amount),currency:v.currency||cur,method:v.method,date:v.date,ref:v.ref,note:v.note,final:!!v.final,verified:!!v.confBy,verifiedBy:v.confBy||null,by:ME.id,createdAt:nowISO()};
    const s=await save('orders',{...o,payments:[...orderPayments(o),pay]},{action:'payment added',silent:1});
    toast('Payment added. Attach screenshot…');
    pickFiles(async files=>{const o2=byId('orders',o.id)||s;const ps=orderPayments(o2).map(p=>p.pid===pid?{...p,screenshot:files[0]}:p);await save('orders',{...o2,payments:ps},{action:'payment screenshot',silent:1});toast('Screenshot attached');const open=$('.ov');if(open){open.remove();orderDetail(byId('orders',o.id))}},'image/*',1);
  }})}
async function verifyPayment(oid,pid){const o=orderOf(oid);if(!o)return;const ps=orderPayments(o).map(p=>p.pid===pid?{...p,verified:true}:p);try{await save('orders',{...o,payments:ps},{action:'payment verified',silent:1});toast('Payment verified ✓');const open=$('.ov');if(open){open.remove();orderDetail(byId('orders',oid))}}catch(e){}}
const CONFIRMERS=()=>USERS.filter(u=>u.active!==false&&(u.role==='admin'||(u.title||'')==='CEO'));
async function setPayConf(oid,pid,val){const o=orderOf(oid);if(!o)return;const ps=orderPayments(o).map(p=>p.pid===pid?{...p,verified:!!val,verifiedBy:val||null}:p);try{await save('orders',{...o,payments:ps},{action:'payment confirmation',silent:1});toast(val?'Payment confirmed ✓':'Set to pending');const open=$('.ov');if(open){open.remove();orderDetail(byId('orders',oid))}}catch(e){}}
function removePayment(oid,pid){const o=orderOf(oid);if(!o)return;confirmBox('Remove payment','Remove this payment entry?',async()=>{const ps=orderPayments(o).filter(p=>p.pid!==pid);await save('orders',{...o,payments:ps},{action:'payment removed',silent:1});const open=$('.ov');if(open){open.remove();orderDetail(byId('orders',oid))}})}
/* --- QC photos shared with customer --- */
function qcPanel(o){const ph=o.qcPhotos||[];
  return `<div><h3>QC photos ${o.qcShared?'<span class="pill good">Shared with customer</span>':''}</h3>${ph.length?`<div class="files">${ph.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="${esc(f.name||'')}">${esc(f.name||'')}</a>`).join('')}</div>`:'<div class="note">No QC photos yet.</div>'}
   ${can('orders','edit')||can('qc','edit')?`<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" onclick="addQCPhotos('${o.id}')">+ QC photos</button>${ph.length&&!o.qcShared?`<button class="btn sm pri" onclick="shareQC('${o.id}')">Mark shared with customer</button>`:''}</div>`:''}</div>`}
function addQCPhotos(oid){const o=orderOf(oid);if(!o)return;const rem=MAX_PHOTOS-(o.qcPhotos||[]).length;if(rem<=0){toast('Photo limit ('+MAX_PHOTOS+') reached for this order.',true);return}pickFiles(async files=>{await save('orders',{...o,qcPhotos:[...(o.qcPhotos||[]),...files]},{action:'qc photos',silent:1});toast('QC photos added');const open=$('.ov');if(open){open.remove();orderDetail(byId('orders',oid))}},'image/*',rem)}
async function shareQC(oid){const o=orderOf(oid);if(!o)return;await save('orders',{...o,qcShared:true,qcSharedAt:nowISO(),stage:stageIdx(orderStage(o))<stageIdx('Quality check')?orderStage(o):orderStage(o)},{action:'qc shared',silent:1});toast('Marked as shared. (WhatsApp/email auto-send comes with the messaging API.)');const open=$('.ov');if(open){open.remove();orderDetail(byId('orders',oid))}}
/* --- product photos (what was ordered) --- */
function productPanel(o){const ph=o.productPhotos||[];
  return `<div><h3>Product photos</h3>${ph.length?`<div class="files">${ph.map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="${esc(f.name||'')}"></a>`).join('')}</div>`:'<div class="note">No product photos yet.</div>'}${can('orders','edit')?`<div style="margin-top:8px"><button class="btn sm" onclick="addProductPhotos('${o.id}')">+ Product photos</button></div>`:''}</div>`}
function addProductPhotos(oid){const o=orderOf(oid);if(!o)return;const rem=MAX_PHOTOS-(o.productPhotos||[]).length;if(rem<=0){toast('Photo limit ('+MAX_PHOTOS+') reached.',true);return}pickFiles(async files=>{await save('orders',{...o,productPhotos:[...(o.productPhotos||[]),...files]},{action:'product photos',silent:1});toast('Product photos added');const open=$('.ov');if(open){open.remove();orderDetail(byId('orders',oid))}},'image/*',rem)}

function orderDetail(o){
  o=byId('orders',o.id)||o;
  const jobs=S.jobs.filter(j=>j.order===o.id),dsp=S.dispatches.filter(d=>d.order===o.id),inv=S.invoices.filter(i=>i.order===o.id),cost=orderCost(o);
  const uUSD=inr=>fcur(r2(num(inr)/(ordRate(o)||88)),'USD');
  modal({title:`${o.no}${o.extRef?' · '+o.extRef:''} · ${custName(o.customer)}`,sub:`${o.channel?'<span class="pill info">'+esc(o.channel)+'</span> · ':''}${stPill(o.status)} · booked ${fdate(o.date)} · due ${fdate(o.dueDate)} · ${esc(o.priority||'')}`,wide:1,body:`
   ${o.instructions?`<div class="banner info">${esc(o.instructions)}</div>`:''}
   <h3>Order stage</h3>${stageStepper(o)}
   <div><h3>Items</h3>${table([{l:'#',h:(r)=>(o.lines.indexOf(r)+1)},{l:'Item',h:r=>`<b>${esc(r.desc||'')}</b>${r.free?' <span class="pill">Free gift</span>':''}<div class="note">${esc([r.variant||r.category,r.diamondType,r.movement&&r.movement!=='—'?r.movement:'',r.variant?'':r.size,r.sku?'SKU '+r.sku:''].filter(Boolean).join(' · '))}</div>${(r.props||[]).map(x=>`<div class="note" style="color:var(--accent)"><b>${esc(x.name)}:</b> ${esc(x.value)}</div>`).join('')}`},{l:'Price',n:1,h:r=>r.price!=null&&r.price!==''?money(r.price):''},{l:'Purity',k:'purity'},{l:'Qty',n:1,k:'qty'},{l:'Target wt',n:1,h:r=>fw(r.targetWt)},{l:'Status',h:r=>stPill(r.status)},{l:'QC',h:r=>{const s=lineQCState(o.id,o.lines.indexOf(r));return `<span class="pill ${s.ok?'good':s.rec?'warn':''}">${esc(s.label)}</span>`}},{l:'Dispatched',n:1,h:r=>`${fq(dispatchedQty(o.id,o.lines.indexOf(r)))}/${fq(r.qty||1)}`},{l:'',h:r=>can('production','edit')?`<button class="btn sm" data-mkjob="${o.lines.indexOf(r)}">+ Job card</button>`:''}],o.lines||[])}</div>
   <div class="grid g2">
    <div><h3>Profit sheet</h3><dl class="dl"><dt>Order value</dt><dd class="num" style="text-align:left">${fcur(orderSaleRaw(o),ordCur(o))} <span class="note">· ${money(orderValueINR(o))} @ ${fq(ordRate(o))}</span></dd><dt>Making / product cost</dt><dd class="num">− ${uUSD(orderMakingINR(o))} <span class="note">${money(orderMakingINR(o))}</span></dd><dt>Courier expense</dt><dd class="num">− ${uUSD(orderCourierINR(o))} <span class="note">${money(orderCourierINR(o))}</span></dd><dt><b>Profit before marketing</b></dt><dd class="num"><b style="color:${orderProfit(o)<0?'var(--bad)':'var(--good)'}">${uUSD(orderProfit(o))}</b> <span class="note">${money(orderProfit(o))}</span>${orderValueINR(o)?' ('+fq(orderProfit(o)/orderValueINR(o)*100)+'%)':''}</dd><dt>Sales share (${COMMISSION_PCT()}%)</dt><dd class="num" style="color:var(--accent)">${uUSD(orderCommission(o))} <span class="note">${money(orderCommission(o))}</span></dd><dt>Sales executive</dt><dd>${esc(userName(orderSeller(o)))}</dd></dl></div>
    ${paymentsPanel(o)}
    ${productPanel(o)}
    ${qcPanel(o)}
    <div><h3>Dispatches</h3>${dsp.length?table([{l:'No.',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Courier',h:r=>esc((r.courier||'')+' '+(r.tracking||''))},{l:'Status',h:r=>stPill(r.status)}],dsp,{onClick:dispatchForm}):'<div class="note">Nothing dispatched yet.</div>'}</div>
   </div>
   <div><h3>History</h3><ul class="timeline">${(o.history||[]).slice().reverse().map(h=>`<li>${h.from?esc(h.from)+' → ':''}<b>${esc(h.to||'')}</b> ${esc(h.note||'')}<small>${fdt(h.ts)} · ${esc(userName(h.by))}</small></li>`).join('')||'<li>Created</li>'}</ul></div>`,
   foot:[btn('🖨 Order print','data-print'),can('orders','edit')?btn('+ Payment','data-pay'):'',can('orders','edit')?btn('Edit','data-e'):'',can('orders','edit')?btn('Change status','data-st'):'',can('dispatch','edit')?btn('Pack & dispatch','data-dsp'):'',can('orders','approve')&&o.status!=='Closed'?btn('Close order','data-close-o','pri'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-print]').onclick=()=>printOrder(o);
    b('[data-pay]')&&(b('[data-pay]').onclick=()=>{close();addPaymentForm(o)});
    ov.querySelectorAll('[data-mkjob]').forEach(x=>x.onclick=()=>{close();const i=+x.dataset.mkjob;const l=o.lines[i];jobForm({order:o.id,line:i,design:l.design,product:l.desc||l.category,qty:l.qty||1,purity:l.purity,routeName:l.route||Object.keys(SET.routes)[0],mode:'In-house',status:'Waiting Material',priority:o.priority,plannedEnd:l.due||o.dueDate})});
    b('[data-e]')&&(b('[data-e]').onclick=()=>{close();orderForm(o)});
    b('[data-st]')&&(b('[data-st]').onclick=()=>{close();openForm({title:`Change status · ${o.no}`,fields:[{k:'to',l:'New status',t:'sel',o:ORDER_ST,req:1,d:o.status},{k:'note',l:'Note / reason',t:'ta',w:4,req:1}],value:{},onSave:v=>{if(v.to==='Cancelled'&&!can('orders','approve')){toast('Only managers can cancel orders.',true);return false}return save('orders',{...o,status:v.to,history:[...(o.history||[]),{ts:nowISO(),by:ME.id,from:o.status,to:v.to,note:v.note}]},{action:'status',reason:v.note})}})});
    b('[data-inv]')&&(b('[data-inv]').onclick=()=>{close();cashForm('Income',{type:'Income',order:o.id,party:custName(o.customer),category:'Sales (ivevar.com)',account:'Bank',date:today()})});
    b('[data-dsp]')&&(b('[data-dsp]').onclick=()=>{close();dispatchForm({order:o.id,date:today(),status:'Prepared'})});
    b('[data-close-o]')&&(b('[data-close-o]').onclick=()=>{
      const pend=o.lines.filter((l,i)=>dispatchedQty(o.id,i)<num(l.qty||1)).length;const notInv=false;const due=0;
      const issues=[pend?`${pend} item(s) not fully dispatched`:'',notInv?'no invoice raised':'',due>0.5?`${money(due)} still unpaid`:''].filter(Boolean);
      close();askReason('Close order '+o.no,issues.length?'Checks failed: '+issues.join('; ')+'. Reason for closing anyway:':'All checks passed. Closing note:',r=>save('orders',{...o,status:'Closed',closedAt:nowISO(),history:[...(o.history||[]),{ts:nowISO(),by:ME.id,from:o.status,to:'Closed',note:r}]},{action:'close',reason:r}),{required:!!issues.length})})}})}

/* ============ SALES DASHBOARD (staff) ============ */
let SD_P='month',DASH_CUR='USD';
function dmoney(inr){if(DASH_CUR==='USD')return fcur(r2(num(inr)/usdRate()),'USD');return money(inr)}
function curToggle(){return `<div class="seg" style="margin-left:8px">${['USD','INR'].map(c=>`<button class="${DASH_CUR===c?'on':''}" onclick="DASH_CUR='${c}';render()">${c==='INR'?'₹ INR':'$ USD'}</button>`).join('')}</div>`}
function salesTeamTable(){const from=today().slice(0,7)+'-01';const rows=USERS.filter(u=>u.active!==false).map(u=>({u,...salesStats(u.id,from)})).filter(r=>r.count||r.leads||r.u.role!=='admin');
  return table([{l:'Person',h:r=>esc(r.u.name)},{l:'Orders',n:1,k:'count'},{l:'Total sales',n:1,h:r=>money(r.sale)},{l:'Revenue (received)',n:1,h:r=>money(r.rev)},{l:'Profit',n:1,h:r=>`<span style="color:${r.profit<0?'var(--bad)':'var(--good)'}">${money(r.profit)}</span>`},{l:'Leads',n:1,k:'leads'},{l:'Won',n:1,k:'won'},{l:'Conversion',n:1,h:r=>fq(r.conv)+'%'}],rows,{empty:'No sales this month yet'})}
function viewSalesDash(){
  const wk=(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d)})();
  const from=SD_P==='today'?today():SD_P==='week'?wk:SD_P==='month'?today().slice(0,7)+'-01':SD_P==='year'?today().slice(0,4)+'-01-01':'';
  const st=salesStats(ME.id,from),all=salesStats(ME.id,'');const t=today();
  const hour=new Date().getHours();const hi=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  // quick actions — only what this person is allowed to do
  const qa=[can('crm','edit')&&['+ New lead','leadForm()','Customer enquiry'],can('orders','edit')&&['+ New order','orderForm()','Confirmed sale'],can('accounts','edit')&&['+ Money in',"cashForm('Income')",'Payment received'],can('accounts','edit')&&['− Money out',"cashForm('Expense')",'Expense paid']].filter(Boolean);
  // one to-do list for today
  const todo=[];
  S.leads.filter(l=>l.createdBy===ME.id&&!['Won','Lost'].includes(l.stage)&&l.nextFollow&&l.nextFollow<=t).forEach(l=>todo.push({sev:l.nextFollow<t?'bad':'warn',txt:`Call back <b>${esc(l.name)}</b>${l.phone?' · '+esc(l.phone):''}`,tag:l.nextFollow<t?'Overdue':'Today',go:`go('crm');setTimeout(()=>leadDetail(byId('leads','${l.id}')),80)`}));
  all.orders.filter(o=>!['Delivered','Closed','Cancelled','Dispatched'].includes(o.status)&&o.dueDate&&daysTo(o.dueDate)<=3).forEach(o=>{const d=daysTo(o.dueDate);todo.push({sev:d<0?'bad':'warn',txt:`Order <b>${esc(o.no)}</b> for ${esc(custName(o.customer))} is ${d<0?'late':'due soon'}`,tag:d<0?`${-d} day${d===-1?'':'s'} late`:d===0?'Today':`In ${d} day${d===1?'':'s'}`,go:`orderDetail(byId('orders','${o.id}'))`})});
  all.orders.filter(o=>orderSale(o)-orderReceived(o)>0.5&&['Dispatched','Delivered'].includes(o.status)).forEach(o=>todo.push({sev:'info',txt:`Collect <b>${money(orderSale(o)-orderReceived(o))}</b> from ${esc(custName(o.customer))} (${esc(o.no)})`,tag:'Payment',go:`orderDetail(byId('orders','${o.id}'))`}));
  S.quotes.filter(q=>q.createdBy===ME.id&&q.status==='Sent'&&q.validTill&&daysTo(q.validTill)<=2).forEach(q=>todo.push({sev:'warn',txt:`Quotation <b>${esc(q.no)}</b> for ${esc(custName(q.customer))} ${daysTo(q.validTill)<0?'has expired':'expires soon'}`,tag:'Quotation',go:`quoteView(byId('quotes','${q.id}'))`}));
  const big=(v,l,c='')=>`<div class="card sd-big ${c}"><span class="l">${esc(l)}</span><span class="v">${v}</span></div>`;
  const per=[['today','Today'],['week','Week'],['month','Month'],['year','Year'],['all','All']];
  const months=[];for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const m=ymd(d).slice(0,7);months.push({l:d.toLocaleDateString('en-IN',{month:'short'}),v:all.orders.filter(o=>(o.date||'').startsWith(m)).reduce((a,o)=>a+orderSale(o),0),f:money})}
  const hasHistory=months.some(m=>m.v>0);
  const recent=all.orders.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,8);
  const nothingYet=!all.count&&!S.leads.some(l=>l.createdBy===ME.id);
  return `<div class="sd-head"><div><h1>${hi}, ${esc((ME.name||'').split(' ')[0])}</h1><div class="note">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div>
   <div style="display:flex;align-items:center;flex-wrap:wrap"><div class="seg" role="tablist">${per.map(([k,l])=>`<button class="${SD_P===k?'on':''}" onclick="SD_P='${k}';render()">${l}</button>`).join('')}</div>${curToggle()}</div></div>
  ${qa.length?`<div class="sd-qa">${qa.map(([l,fn,sub])=>`<button class="sd-act" onclick="${fn}"><b>${l}</b><span>${sub}</span></button>`).join('')}</div>`:''}
  <div class="grid g2" style="margin-bottom:16px">${punchCard()}${taskTiles(false)}</div>
  <div style="margin-bottom:16px">${tasksCard(false)}</div>
  <div class="sd-kpis">${big(dmoney(st.sale),'Sales','gold')}${big(dmoney(st.rev),'Money received')}${big(`<span style="color:${st.profit<0?'var(--bad)':'var(--good)'}">${dmoney(st.profit)}</span>`,'Profit')}${big(st.count,'Orders')}</div>
  ${nothingYet?`<div class="card sd-empty"><h2>Let's get started</h2><p>Add your first customer enquiry as a lead, or record a confirmed sale as an order. Your sales, money received and profit will appear here automatically.</p><div class="sd-qa" style="margin:0">${qa.slice(0,3).map(([l,fn])=>`<button class="btn pri" onclick="${fn}">${l}</button>`).join(' ')}</div></div>`:''}
  <div class="grid g2" style="margin-top:16px">
   <div class="card"><h2>To do <span class="pill ${todo.length?'warn':'good'}">${todo.length}</span></h2>${todo.length?`<div class="alerts">${todo.slice(0,10).map(x=>`<div class="alert" onclick="${x.go}"><span class="sev ${x.sev}"></span><span style="flex:1">${x.txt}</span><span class="pill">${esc(x.tag)}</span></div>`).join('')}</div>`:'<div class="empty"><b>All done 👍</b>No calls, late orders or payments waiting.</div>'}</div>
   <div class="card"><h2>At a glance · ${esc(per.find(p=>p[0]===SD_P)[1])}</h2><dl class="dl sd-dl"><dt>Still to collect</dt><dd>${dmoney(st.due)}</dd><dt>Average order</dt><dd>${dmoney(st.avg)}</dd><dt>Leads</dt><dd>${st.leads} <span class="note">(${st.won} won · ${fq(st.conv)}%)</span></dd><dt>Quotations sent</dt><dd>${S.quotes.filter(q=>q.createdBy===ME.id&&(!from||(q.date||'')>=from)).length}</dd></dl>${hasHistory?`<h3 style="margin-top:14px">Sales · last 6 months</h3>${hbars(months)}`:''}</div>
  </div>
  ${recent.length?`<div class="card" style="margin-top:16px"><h2>My recent orders</h2>${table([{l:'Order',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Customer',h:r=>esc(custName(r.customer))},{l:'Sale',n:1,h:r=>dmoney(orderSale(r))},{l:'Received',n:1,h:r=>dmoney(orderReceived(r))},{l:'Profit',n:1,h:r=>`<span style="color:${orderProfit(r)<0?'var(--bad)':'var(--good)'}">${dmoney(orderProfit(r))}</span>`},{l:'Status',h:r=>stPill(r.status)}],recent,{onClick:can('orders','view')?orderDetail:null})}</div>`:''}`}

/* ============ ATTENDANCE (selfie + GPS + multiple sessions + shift rule) ============ */
const istDate=()=>new Date(Date.now()+330*60000).toISOString().slice(0,10);
const hm=iso=>iso?new Date(iso).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'—';
function hoursBetween(a,b){if(!a)return 0;return Math.max(0,((b?new Date(b):new Date())-new Date(a))/36e5)}
const fh=h=>`${Math.floor(h)}h ${String(Math.round((h%1)*60)).padStart(2,'0')}m`;
const sessOf=p=>(p&&Array.isArray(p.sessions))?p.sessions:(p&&p.in?[{in:p.in,out:p.out,report:p.report}]:[]);
function dayHours(p){return sessOf(p).reduce((t,s)=>t+(s.in?hoursBetween(s.in,s.out):0),0)}
function openSess(p){return sessOf(p).some(s=>s.in&&!s.out)}
function getShift(uid){if(uid===ME.id&&ME.shift)return ME.shift;const u=USERS.find(x=>x.id===uid);return (u&&u.shift)||null}
function shiftHours(sh){if(!sh||!sh.start||!sh.end)return 9;const mn=t=>{const[h,m]=String(t).split(':').map(Number);return h*60+(m||0)};let d=mn(sh.end)-mn(sh.start);if(d<=0)d+=1440;return d/60}
/* attendance verdict per the agreed rule: 5-min late or early-leave → half day, but full if total hours met */
function attStatus(p,uid){const sess=sessOf(p).filter(s=>s.in);if(!sess.length)return{code:'—',label:'Not marked'};
  const sh=getShift(uid);const need=shiftHours(sh);const hrs=dayHours(p);
  const lastOut=sess.filter(s=>s.out).slice(-1)[0];
  if(hrs>=need-0.02)return{code:'P',label:'Present',hrs};
  if(openSess(p))return{code:'IN',label:'Checked in',hrs};
  let late=false,early=false;
  if(sh&&sh.start&&sh.end){const mn=t=>{const[h,m]=String(t).split(':').map(Number);return h*60+(m||0)};const overnight=mn(sh.end)<=mn(sh.start);
    const inD=new Date(sess[0].in);const inMin=inD.getHours()*60+inD.getMinutes();
    if(!overnight){late=inMin>mn(sh.start)+5;if(lastOut){const oD=new Date(lastOut.out);const oMin=oD.getHours()*60+oD.getMinutes();early=oMin<mn(sh.end)-5}}}
  if(late||early)return{code:'H',label:'Half day'+(late?' (late in)':'')+(early?' (early out)':''),hrs};
  return{code:'P',label:'Present',hrs}}
function myPunch(){return S.punch.find(p=>p.user===ME.id&&p.date===istDate())}
/* capture a selfie (camera on mobile) then GPS, then punch */
function capturePunch(action,extra){
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.capture='user';
  inp.onchange=async()=>{const f=inp.files[0];if(!f){toast('A selfie is required to mark attendance.',true);return}
    toast('Uploading selfie…');let photo=null;try{const r=await uploadFile(f);photo={id:r.id,url:r.url}}catch(e){toast('Could not upload selfie: '+(e.message||''),true);return}
    toast('Getting location…');const coords=await new Promise(res=>{if(!navigator.geolocation)return res(null);navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy}),()=>res(null),{enableHighAccuracy:true,timeout:8000})});
    const body={action,photo,...(coords||{}),...(extra||{})};
    try{const r=await api('/api/punch',body);upsert('punch',r.doc);toast(action==='in'?'Checked in '+hm(r.doc.in)+(coords?' 📍':''):'Checked out '+hm(r.doc.out));render()}catch(e){toast(e.message,true)}};
  inp.click()}
function outForm(){const tt=today();const done=S.tasks.filter(t=>t.assignedTo===ME.id&&t.status==='Done'&&(t.doneAt||'').slice(0,10)===tt).map(t=>'✓ '+t.title);
  const mine=x=>x.createdBy===ME.id&&(x.createdAt||'').slice(0,10)===tt;const auto=[...done,...S.leads.filter(mine).map(l=>'New lead: '+l.name),...S.orders.filter(mine).map(o=>'New order: '+o.no),...S.quotes.filter(mine).map(q=>'Quotation: '+q.no)].join('\n');
  modal({title:'Check out · work report',sub:'A selfie + location will be captured after you submit.',body:`<div class="f"><label>What did you do? <span class="rq">*</span></label><textarea id="wrRep" style="min-height:140px" placeholder="e.g. Called 6 customers, sent 2 quotations, packed order JWL-2026-000012…">${esc(auto)}</textarea></div><div class="f"><label>Anything pending for next time?</label><textarea id="wrPen" placeholder="Optional"></textarea></div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="wrOk">Selfie & check out</button>`,
   onMount(ov,close){ov.querySelector('#wrOk').onclick=e=>{const rep=ov.querySelector('#wrRep').value.trim();if(rep.length<10){toast('Write what you did (at least a line).',true);return}close();capturePunch('out',{report:rep,pending:ov.querySelector('#wrPen').value})}}})}
function viewReport(pid){const p=byId('punch',pid);if(!p)return;const sess=sessOf(p);const stt=attStatus(p,p.user);
  const loc=l=>l?`<a href="https://maps.google.com/?q=${l.lat},${l.lng}" target="_blank" rel="noopener">📍 map</a>`:'';
  modal({title:`${userName(p.user)} · ${fdate(p.date)}`,sub:`${stPill(stt.code==='H'?'Half day':stt.code==='P'?'Present':stt.label)} · ${fh(dayHours(p))} · ${sess.length} session(s)`,wide:1,body:`
   <div class="tw"><table><thead><tr><th>In</th><th>Selfie</th><th>Loc</th><th>Out</th><th>Selfie</th><th>Loc</th><th>Hours</th><th>Report</th></tr></thead><tbody>${sess.map(s=>`<tr><td>${hm(s.in)}</td><td>${s.inPhoto?`<a href="${esc(s.inPhoto.url)}" target="_blank"><img src="${esc(s.inPhoto.url)}" style="width:40px;height:40px;object-fit:cover;border-radius:6px"></a>`:'—'}</td><td>${loc(s.inLoc)}</td><td>${hm(s.out)}</td><td>${s.outPhoto?`<a href="${esc(s.outPhoto.url)}" target="_blank"><img src="${esc(s.outPhoto.url)}" style="width:40px;height:40px;object-fit:cover;border-radius:6px"></a>`:'—'}</td><td>${loc(s.outLoc)}</td><td class="n">${s.in?fh(hoursBetween(s.in,s.out)):''}</td><td>${esc(s.report||'')}${s.pending?`<div class="note">Pending: ${esc(s.pending)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>`})}
async function doPunch(action){if(action==='out')return outForm();capturePunch('in')}
function punchCard(){const p=myPunch();const tm=iso=>iso?new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'--:--';
  const open=openSess(p);const sess=sessOf(p);const last=sess[sess.length-1]||{};
  const btn=open?`<button class="pbtn" onclick="doPunch('out')">OUT</button>`:`<button class="pbtn go" onclick="doPunch('in')">IN</button>`;
  const stt=attStatus(p,ME.id);const st=!sess.length?'Not marked':`${stt.label} · ${fh(dayHours(p))}`;
  const sh=getShift(ME.id);
  return `<div class="inout"><div class="d">${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}${sh?` <span class="note">Shift ${esc(sh.start)}–${esc(sh.end)}</span>`:''}</div><div><div class="lbl">${open?'IN time':'Last IN'}</div><div class="tm">${tm(open?last.in:(sess.filter(s=>s.in).slice(-1)[0]||{}).in)}</div><div class="st">${st}</div></div><div><div class="lbl">OUT time</div><div class="tm">${tm(last.out)}</div><div class="st">${sess.length>1?sess.length+' sessions':'&nbsp;'}</div></div>${btn}</div>`}
function attendanceToday(){const d=istDate();const rows=USERS.filter(u=>u.active!==false&&u.role!=='admin').map(u=>({u,p:S.punch.find(x=>x.user===u.id&&x.date===d)}));
  const marked=rows.filter(r=>r.p&&sessOf(r.p).length).length;
  return `<div class="card"><div class="cap">Today's attendance <span class="pill warn" style="margin-left:auto">${marked}/${rows.length}</span></div><div class="attlist">${rows.map(r=>{const stt=r.p?attStatus(r.p,r.u.id):{code:'—',label:'Not marked'};const cls=stt.code==='P'?'out':stt.code==='IN'||stt.code==='H'?'in':'';return `<div class="r" ${r.p?`style="cursor:pointer" onclick="viewReport('${r.p.id}')" title="View sessions & report"`:''}><span>${esc(r.u.name)}${r.p&&sessOf(r.p).some(s=>s.report)?' 📝':''}</span><span class="b ${cls}">${esc(stt.label)}</span></div>`}).join('')}</div><div style="margin-top:12px"><button class="btn sm" onclick="attendanceHistory()">View history</button></div></div>`}
function taskTiles(admin){const tt=today();const list=S.tasks.filter(t=>admin||t.assignedTo===ME.id);const open=list.filter(t=>t.status!=='Done');
  const n=[['Pending tasks',open.length,'#c47a0a'],['Overdue',open.filter(t=>t.due&&t.due<tt).length,'#c0392b'],['Urgent',open.filter(t=>t.priority==='Urgent').length,'#2457c5'],['Done today',list.filter(t=>t.status==='Done'&&(t.doneAt||'').slice(0,10)===tt).length,'#1d8a52']];
  return `<div class="tiles">${n.map(([l,v,c])=>`<div class="tile2" onclick="document.getElementById('mywork')?.scrollIntoView({behavior:'smooth'})"><div class="v" style="color:${c}">${v}</div><div class="l">${l}</div></div>`).join('')}</div>`}
function attendanceHistory(){let m=today().slice(0,7);
  const draw=()=>{const rows=S.punch.filter(p=>(p.date||'').startsWith(m)).sort((a,b)=>(b.date+(b.in||'')).localeCompare(a.date+(a.in||'')));
    const firstIn=p=>{const s=sessOf(p).filter(x=>x.in);return s.length?s[0].in:null};const lastOut=p=>{const s=sessOf(p).filter(x=>x.out);return s.length?s[s.length-1].out:null};
    return `<div class="tools"><input type="month" id="ahM" value="${m}"></div>`+table([{l:'Date',h:r=>fdate(r.date)},{l:'Name',h:r=>esc(userName(r.user))},{l:'First in',h:r=>hm(firstIn(r))},{l:'Last out',h:r=>hm(lastOut(r))},{l:'Sessions',n:1,h:r=>sessOf(r).length},{l:'Hours',n:1,h:r=>fh(dayHours(r))},{l:'Status',h:r=>{const s=attStatus(r,r.user);return `<span class="pill ${s.code==='P'?'good':s.code==='H'?'warn':''}">${esc(s.label)}</span>`}},{l:'',h:r=>sessOf(r).length?`<button class="btn sm" onclick="viewReport('${r.id}')">View</button>`:''}],rows,{empty:'No attendance this month'})+`<h3 style="margin-top:14px">Monthly summary</h3>`+table([{l:'Name',h:r=>esc(r.n)},{l:'Present',n:1,k:'P'},{l:'Half days',n:1,k:'H'},{l:'Total hours',n:1,h:r=>fh(r.h)}],USERS.filter(u=>u.role!=='admin').map(u=>{const ps=S.punch.filter(p=>p.user===u.id&&(p.date||'').startsWith(m));let P=0,H=0;ps.forEach(p=>{const s=attStatus(p,u.id);if(s.code==='P')P++;else if(s.code==='H')H++});return{n:u.name,P,H,h:ps.reduce((t,p)=>t+dayHours(p),0)}}).filter(r=>r.P||r.H||r.h))};
  modal({title:'Attendance history',wide:1,body:`<div id="ahBody">${draw()}</div>`,onMount(ov){ov.addEventListener('change',e=>{if(e.target.id==='ahM'){m=e.target.value;ov.querySelector('#ahBody').innerHTML=draw()}})}})}

/* ============ TASKS ============ */
function taskForm(t){const admin=ME.role==='admin';
  openForm({title:t&&t.id?'Edit task':'New task',value:t||{priority:'Normal',due:today(),assignedTo:ME.id},fields:[{k:'title',l:'What needs to be done',req:1,w:4},...(admin?[{k:'assignedTo',l:'Give to',t:'sel',o:()=>USERS.filter(u=>u.active!==false).map(u=>[u.id,u.name+(u.id===ME.id?' (me)':'')]),req:1}]:[]),{k:'due',l:'Due date',t:'date'},{k:'priority',l:'Priority',t:'sel',o:['Normal','High','Urgent']},{k:'note',l:'Details',t:'ta',w:4}],
   onSave:v=>save('tasks',{status:'Open',...v})})}
async function toggleTask(id){const t=byId('tasks',id);if(!t)return;await save('tasks',{...t,status:t.status==='Done'?'Open':'Done'},{silent:1});toast(t.status==='Done'?'Task reopened':'Task done ✓')}
function tasksCard(admin){const tt=today();let list=S.tasks.filter(t=>admin||t.assignedTo===ME.id);
  const open=list.filter(t=>t.status!=='Done').sort((a,b)=>({Urgent:0,High:1,Normal:2}[a.priority]-{Urgent:0,High:1,Normal:2}[b.priority])||(a.due||'9').localeCompare(b.due||'9'));
  const doneToday=list.filter(t=>t.status==='Done'&&(t.doneAt||'').slice(0,10)===tt);
  const row=t=>`<div class="task ${t.status==='Done'?'done':''}"><input type="checkbox" ${t.status==='Done'?'checked':''} onclick="toggleTask('${t.id}')" aria-label="Mark done"><div style="flex:1;min-width:0;cursor:pointer" onclick="taskForm(byId('tasks','${t.id}'))"><b>${esc(t.title)}</b>${t.note?`<div class="meta">${esc(t.note)}</div>`:''}<div class="meta">${admin?esc(userName(t.assignedTo))+' · ':''}${t.due?(t.due<tt&&t.status!=='Done'?'<span style="color:var(--bad)">Overdue · '+fdate(t.due)+'</span>':'Due '+fdate(t.due)):'No due date'}</div></div>${t.priority!=='Normal'?`<span class="pill ${t.priority==='Urgent'?'bad':'warn'}">${esc(t.priority)}</span>`:''}</div>`;
  return `<div class="card" id="mywork"><div class="cap">${admin?'All work':'My work'} <span class="pill ${open.length?'warn':'good'}">${open.length}</span><button class="btn sm pri" style="margin-left:auto;text-transform:none;letter-spacing:0" onclick="taskForm()">+ New task</button></div>${open.length||doneToday.length?`<div class="alerts">${open.slice(0,12).map(row).join('')}${doneToday.map(row).join('')}</div>`:'<div class="empty">No pending work 🎉</div>'}</div>`}

/* ============ ADMIN DASHBOARD ============ */
var EYE=false,SEYE=false;let AD_P='month';
function pendingPaymentsCard(){
  const rows=[];S.orders.forEach(o=>orderPayments(o).filter(p=>!p.verified).forEach(p=>rows.push({o,p})));
  if(!rows.length)return '';
  rows.sort((a,b)=>(b.p.createdAt||'').localeCompare(a.p.createdAt||''));
  const tm=iso=>{try{return iso?new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):''}catch(e){return ''}};
  const canOk=can('accounts','approve')||can('orders','approve');
  return `<div class="card" id="pendpay"><div class="cap">💳 Payments to confirm <span class="pill warn">${rows.length}</span></div><div class="paylist">${rows.map(({o,p})=>`<div class="payrow"><div style="flex:1;min-width:0"><b>${fcur(p.amount,p.currency||ordCur(o))}</b> · ${esc(custName(o.customer))} <span class="note">(${esc(o.no)})</span><div class="note">${esc(p.method||'Advance')} · by ${esc(userName(p.by))} · ${esc(tm(p.createdAt)||fdate(p.date))}</div></div>${p.screenshot?`<a href="${esc(p.screenshot.url)}" target="_blank" rel="noopener" class="thumb"><img src="${esc(p.screenshot.url)}" alt="screenshot"></a>`:'<span class="note">no screenshot yet</span>'}${canOk?`<button class="btn sm good" onclick="setPayConf('${o.id}','${p.pid}','${ME.id}')">Approve</button>`:''}<button class="btn sm" onclick="orderDetail(byId('orders','${o.id}'))">Open</button></div>`).join('')}</div></div>`}
function viewAdminDash(){
  const wk=(()=>{const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return ymd(d)})();
  const from=AD_P==='today'?today():AD_P==='week'?wk:AD_P==='month'?today().slice(0,7)+'-01':AD_P==='year'?today().slice(0,4)+'-01-01':'';
  const st=salesStats(null,from);const per=[['today','Today'],['week','Week'],['month','Month'],['year','Year'],['all','All']];
  const hour=new Date().getHours();const hi=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  // masked values: "₹ ******" with an eye icon beside it
  const STARS='******';
  const eyeBtn=(flag)=>`<button class="eyei" onclick="${flag}=!${flag};render()" aria-label="${window[flag]?'Hide':'Show'} amount" title="${window[flag]?'Hide':'Show'}">${window[flag]?'🙈':'👁'}</button>`;
  const cm=v=>EYE?money(v):(SET.currency||'₹')+' '+STARS;      // cash
  const sm=v=>SEYE?dmoney(v):(DASH_CUR==='USD'?'$':(SET.currency||'₹'))+' '+STARS;     // sales money (INR/USD toggle)
  const sn=v=>SEYE?v:STARS;                                    // sales counts
  const big=(v,l,c='')=>`<div class="card sd-big ${c}"><span class="l">${esc(l)}</span><span class="v mv">${v}${eyeBtn('SEYE')}</span></div>`;
  const months=[];for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const m=ymd(d).slice(0,7);months.push({l:d.toLocaleDateString('en-IN',{month:'short'}),v:SEYE?S.orders.filter(o=>!['Cancelled','Draft'].includes(o.status)&&(o.date||'').startsWith(m)).reduce((a,o)=>a+orderSale(o),0):0,f:v=>sm(v)})}
  const team=USERS.filter(u=>u.active!==false).map(u=>({u,...salesStats(u.id,from)})).filter(r=>r.count||r.leads);
  const al=alerts();
  return `<div class="sd-head"><div><h1>${hi}, ${esc((ME.name||'').split(' ')[0])}</h1><div class="note">${esc(roleLabel(ME))} · ${esc(SET.company.name)}</div></div></div>
  <div style="margin-bottom:16px">${taskTiles(true)}</div>
  ${(function(){var c=pendingPaymentsCard();return c?'<div style="margin-bottom:16px">'+c+'</div>':''})()}
  <div class="grid g2" style="margin-bottom:16px">${attendanceToday()}${tasksCard(true)}</div>
  <div class="card" style="margin-bottom:16px"><div class="cap">Cash balance</div>
   <div class="cashrow"><div><div class="note">Total</div><div class="kpi gold"><span class="v mv">${cm(cashBal())}${eyeBtn('EYE')}</span></div></div><div><div class="note">Cash</div><div class="kpi"><span class="v mv">${cm(cashBal('Cash'))}${eyeBtn('EYE')}</span></div></div><div><div class="note">Bank</div><div class="kpi"><span class="v mv">${cm(cashBal('Bank'))}${eyeBtn('EYE')}</span></div></div></div></div>
  <div class="sd-head" style="margin-bottom:12px"><div class="cap" style="margin:0">Sales report</div><div style="display:flex;align-items:center;flex-wrap:wrap"><div class="seg">${per.map(([k,l])=>`<button class="${AD_P===k?'on':''}" onclick="AD_P='${k}';render()">${l}</button>`).join('')}</div>${curToggle()}</div></div>
  <div class="sd-kpis">${big(sm(st.sale),'Total sales','gold')}${big(sm(st.rev),'Money received')}${big(SEYE?`<span style="color:${st.profit<0?'var(--bad)':'var(--good)'}">${money(st.profit)}</span>`:sm(0),'Profit')}${big(sn(st.count),'Orders')}</div>
  <div class="grid g2" style="margin-top:16px">
   <div class="card"><h2 style="display:flex;align-items:center;gap:8px">Sales by staff · ${esc(per.find(p=>p[0]===AD_P)[1])} <span style="margin-left:auto">${eyeBtn('SEYE')}</span></h2>${table([{l:'Person',h:r=>esc(r.u.name)+'<div class="note">'+esc(roleLabel(r.u))+'</div>'},{l:'Orders',n:1,h:r=>sn(r.count)},{l:'Sales',n:1,h:r=>sm(r.sale)},{l:'Received',n:1,h:r=>sm(r.rev)},{l:'Profit',n:1,h:r=>SEYE?`<span style="color:${r.profit<0?'var(--bad)':'var(--good)'}">${money(r.profit)}</span>`:sm(0)}],team,{empty:'No sales in this period',onClick:r=>staffReport(r.u)})}<div class="note" style="margin-top:8px">Click a person for their monthly / 3-month / yearly report. Still to collect: <b>${sm(st.due)}</b> · Leads: <b>${sn(st.leads)}</b></div></div>
   <div class="card"><h2 style="display:flex;align-items:center;gap:8px">Sales · last 6 months <span style="margin-left:auto">${eyeBtn('SEYE')}</span></h2>${hbars(months)}</div>
  </div>
  ${al.length?`<div class="card" style="margin-top:16px"><h2>System alerts <span class="pill bad">${al.length}</span></h2><div class="alerts">${al.slice(0,10).map(a=>`<div class="alert" onclick="go('${a.mod}');${a.id?`setTimeout(()=>openAlert('${a.mod}','${a.id}'),80)`:''}"><span class="sev ${a.sev}"></span><span>${esc(a.txt)}</span></div>`).join('')}</div></div>`:''}`}

/* ============ STAFF DRILL-DOWN REPORT (admin) ============ */
let SR_P='month';
function staffReport(u){
  const draw=()=>{const now=new Date();let from;
    if(SR_P==='month')from=today().slice(0,7)+'-01';
    else if(SR_P==='3m'){const d=new Date();d.setMonth(d.getMonth()-2);d.setDate(1);from=ymd(d)}
    else from=today().slice(0,4)+'-01-01';
    const st=salesStats(u.id,from);
    const profit=r2(st.orders.reduce((a,o)=>a+orderProfit(o),0));const share=r2(st.orders.reduce((a,o)=>a+orderCommission(o),0));
    const mkt=r2(S.cash.filter(e=>e.type==='Expense'&&/market/i.test(e.category||'')&&e.employee===u.id&&(e.date||'')>=from).reduce((a,e)=>a+num(e.amount),0));
    // attendance in period
    const ps=S.punch.filter(p=>p.user===u.id&&(p.date||'')>=from);let P=0,H=0,hrs=0;ps.forEach(p=>{const s=attStatus(p,u.id);if(s.code==='P')P++;else if(s.code==='H')H++;hrs+=dayHours(p)});
    const done=S.tasks.filter(t=>t.assignedTo===u.id&&t.status==='Done'&&(t.doneAt||'')>=from).length;
    const pieces=S.pieces.filter(p=>p.soldBy===u.id&&(p.soldDate||'')>=from);
    const big=(v,l,c='')=>`<div class="card sd-big ${c}"><span class="l">${esc(l)}</span><span class="v">${v}</span></div>`;
    return `<div class="seg" style="margin-bottom:14px">${[['month','This month'],['3m','Last 3 months'],['year','This year']].map(([k,l])=>`<button class="${SR_P===k?'on':''}" onclick="SR_P='${k}';document.getElementById('srB').innerHTML=window._srDraw()">${l}</button>`).join('')}</div>
    <div class="sd-kpis">${big(money(st.sale),'Order value','gold')}${big(money(st.rev),'Received')}${big(`<span style="color:${profit<0?'var(--bad)':'var(--good)'}">${money(profit)}</span>`,'Profit')}${big(st.count,'Orders')}</div>
    <div class="card" style="margin-top:14px"><h2>Commission · profit share</h2><dl class="dl sd-dl"><dt>Profit before marketing</dt><dd>${money(profit)}</dd><dt>Sales share (${COMMISSION_PCT()}%)</dt><dd>${money(share)}</dd><dt>Marketing expense</dt><dd>− ${money(mkt)}</dd><dt><b>Final payable to ${esc((u.name||'').split(' ')[0])}</b></dt><dd><b style="color:var(--accent)">${money(r2(share-mkt))}</b></dd></dl></div>
    <div class="grid g2" style="margin-top:14px">
     <div class="card"><h2>Attendance</h2><dl class="dl"><dt>Present days</dt><dd>${P}</dd><dt>Half days</dt><dd>${H}</dd><dt>Total hours</dt><dd>${fh(hrs)}</dd><dt>Tasks done</dt><dd>${done}</dd></dl></div>
     <div class="card"><h2>Pieces sold</h2>${pieces.length?table([{l:'Piece',h:r=>esc(r.name||r.sku)},{l:'Sold',n:1,h:r=>fcur(r.priceUSD,'USD')},{l:'Profit',n:1,h:r=>fcur(pieceProfit(r),'USD')}],pieces):'<div class="note">No pieces sold in this period.</div>'}</div>
    </div>
    <div class="card" style="margin-top:14px"><h2>Orders</h2>${st.orders.length?table([{l:'Order',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Customer',h:r=>esc(custName(r.customer))},{l:'Sale',n:1,h:r=>money(orderSale(r))},{l:'Profit',n:1,h:r=>`<span style="color:${orderProfit(r)<0?'var(--bad)':'var(--good)'}">${money(orderProfit(r))}</span>`},{l:'Status',h:r=>stPill(r.status)}],st.orders.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')),{onClick:orderDetail}):'<div class="note">No orders in this period.</div>'}</div>`};
  window._srDraw=draw;
  modal({title:`${u.name} · ${roleLabel(u)}`,sub:'Performance report',wide:1,body:`<div id="srB">${draw()}</div>`})}

/* employee commission rows (Ivevar 25% profit-share model, like the master sheet) */
function commissionRows(from){return USERS.filter(u=>u.active!==false&&u.role!=='admin').map(u=>{const st=salesStats(u.id,from);const profit=r2(st.orders.reduce((a,o)=>a+orderProfit(o),0));const share=r2(st.orders.reduce((a,o)=>a+orderCommission(o),0));const mkt=r2(S.cash.filter(e=>e.type==='Expense'&&/market/i.test(e.category||'')&&e.employee===u.id&&(!from||(e.date||'')>=from)).reduce((a,e)=>a+num(e.amount),0));return{id:u.id,name:u.name,orders:st.count,profit,share,marketing:mkt,payable:r2(share-mkt)}}).filter(r=>r.orders||r.profit)}

/* ============ ORDER PRINT ============ */
function printOrder(o){const c=byId('customers',o.customer)||{};const company=SET.company||{};
  const cur=ordCur(o);const rate=ordRate(o);const sale=orderSaleRaw(o);const paid=orderPaidRaw(o);const pend=orderPaidPending(o);const bal=r2(sale-paid);
  const pays=orderPayments(o);const abs=u=>!u?'':(/^https?:/.test(u)?u:location.origin+u);const photos=(o.productPhotos||[]).slice(0,8);
  const rows=(o.lines||[]).map((l,i)=>`<tr><td>${i+1}</td><td><b>${esc(l.desc||'')}</b>${l.free?' <span class="free">Free gift</span>':''}${l.category?`<div class="m">${esc(l.category)}</div>`:''}${l.diamondType?`<div class="m">Diamond: ${esc(l.diamondType)}</div>`:''}${l.movement&&l.movement!=='—'?`<div class="m">Movement: ${esc(l.movement)}</div>`:''}${l.sku?`<div class="m">SKU ${esc(l.sku)}</div>`:''}${(l.props||[]).map(x=>`<div class="m"><b>${esc(x.name)}:</b> ${esc(x.value)}</div>`).join('')}</td><td>${esc(l.metal||l.purity||'')}</td><td>${esc(l.size||'')}</td><td class="c">${esc(l.qty||1)}</td></tr>`).join('');
  const payRows=pays.length?pays.map(p=>`<tr><td>${esc(fdate(p.date))}</td><td>${esc(p.method||'')}${p.ref?`<div class="m">Ref: ${esc(p.ref)}</div>`:''}</td><td class="c">${p.verified?'<span class="ok">Verified</span>':'<span class="pend">Unverified</span>'}${p.final?' · Final':''}</td><td class="r">${fcur(p.amount,p.currency||cur)}</td></tr>`).join(''):`<tr><td colspan="4" class="m">No payments recorded yet.</td></tr>`;
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.no)} · ${esc(company.name||'Ivevar')}</title><style>
   *{box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;margin:0;padding:34px 40px;font-size:12.5px;line-height:1.5}
   .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #141a3a;padding-bottom:16px}
   .logo{height:44px}.co{font-size:11px;color:#555;margin-top:7px;max-width:270px;line-height:1.5}
   .doc{text-align:right}.doc .t{font-size:12px;letter-spacing:.18em;color:#999;text-transform:uppercase}.doc .no{font-size:26px;font-weight:800;color:#141a3a;line-height:1.05}.doc .mt{font-size:11.5px;color:#555;margin-top:5px}
   .pill{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10.5px;font-weight:600;background:#eef1f8;color:#141a3a;margin-top:3px}
   .two{display:flex;gap:30px;margin-top:22px}.two>div{flex:1}
   .lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#999;margin-bottom:5px}.nm{font-weight:700;font-size:13px}.ad{white-space:pre-wrap;color:#444;font-size:11.5px;margin-top:2px}
   table{width:100%;border-collapse:collapse;margin-top:10px}
   th{background:#141a3a;color:#fff;text-align:left;padding:8px 10px;font-size:10px;letter-spacing:.05em;text-transform:uppercase;font-weight:600}
   td{border-bottom:1px solid #e3e6ee;padding:9px 10px;vertical-align:top}td.c,th.c{text-align:center}td.r,th.r{text-align:right}
   .m{color:#777;font-size:10.5px;margin-top:2px}.free{background:#fff3cd;color:#8a6d00;padding:1px 6px;border-radius:4px;font-size:10px}
   .sec{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#141a3a;font-weight:700;margin:26px 0 2px}
   .tot{margin-top:14px;margin-left:auto;width:310px}.tot .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}
   .tot .bal{font-weight:800;font-size:15px;color:#141a3a;border-bottom:0;border-top:2px solid #141a3a;margin-top:4px;padding-top:9px}
   .ok{color:#1d8a52;font-weight:600}.pend{color:#c47a0a;font-weight:600}
   .gal{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}.gal img{width:150px;height:150px;object-fit:cover;border:1px solid #ddd;border-radius:8px}
   .sign{display:flex;gap:40px;margin-top:40px;color:#444}.sign>div{flex:1}
   .foot{margin-top:30px;border-top:1px solid #e3e6ee;padding-top:12px;text-align:center;color:#999;font-size:10.5px}
   @media print{body{padding:10px 0}.noprint{display:none}}</style></head><body>
   <button class="noprint" onclick="print()" style="float:right;padding:8px 16px;cursor:pointer;border:1px solid #141a3a;background:#141a3a;color:#fff;border-radius:7px">Print / Save PDF</button>
   <div class="hd"><div><img class="logo" src="${LOGO}" alt="Ivevar Luxury"><div class="co"><b>${esc(company.name||'')}</b><br>${esc(company.address||'')}<br>${esc(company.phone||'')}${company.email?' · '+esc(company.email):''}</div></div>
     <div class="doc"><div class="t">Order</div><div class="no">${esc(o.no)}</div><div class="mt">${esc(o.channel||'')}<br>Order date: <b>${esc(fdate(o.date)||o.date||'')}</b>${o.dueDate?`<br>Promised: <b>${esc(fdate(o.dueDate))}</b>`:''}<br><span class="pill">${esc(o.status||'')}</span></div></div></div>
   <div class="two"><div><div class="lbl">Bill to</div><div class="nm">${esc(c.name||'')}</div><div class="ad">${esc(o.email||c.email||'')}${(o.phone||c.phone)?' · '+esc(o.phone||c.phone):''}</div></div>
     <div><div class="lbl">Ship to</div><div class="ad">${esc(o.shipTo||c.address||'')}</div></div></div>
   <div class="sec">Items</div><table><thead><tr><th>#</th><th>Product &amp; details</th><th>Metal</th><th>Size</th><th class="c">Qty</th></tr></thead><tbody>${rows}</tbody></table>
   ${o.instructions?`<div class="sec">Special instructions</div><div class="ad">${esc(o.instructions)}</div>`:''}
   ${photos.length?`<div class="sec">Product photos</div><div class="gal">${photos.map(f=>`<img src="${esc(abs(f.url))}" alt="">`).join('')}</div>`:''}
   <div class="sec">Payments (${esc(cur)})</div><table><thead><tr><th>Date</th><th>Method</th><th class="c">Status</th><th class="r">Amount</th></tr></thead><tbody>${payRows}</tbody></table>
   <div class="tot"><div class="row"><span>Order total</span><b>${fcur(sale,cur)}</b></div><div class="row"><span>Received (verified)</span><b style="color:#1d8a52">${fcur(paid,cur)}</b></div>${pend?`<div class="row"><span>Pending verification</span><b style="color:#c47a0a">${fcur(pend,cur)}</b></div>`:''}<div class="row bal"><span>Balance due</span><span>${fcur(bal,cur)}</span></div></div>
   <div class="sign"><div>Sales person: <b>${esc(o.salesBy?userName(o.salesBy):(o.channel||''))}</b><br><br>Sent to factory: ________________</div><div>QC by: ________________<br><br>Received back: ________________</div></div>
   <div class="foot">${esc(company.name||'')} · ${esc(company.address||'')} · ${esc(company.phone||'')}${company.email?' · '+esc(company.email):''}</div>
   <script>(function(){function pr(){try{print()}catch(e){}}var imgs=[].slice.call(document.images),n=imgs.length,d=0;if(!n){setTimeout(pr,350);return}function chk(){if(++d>=n)setTimeout(pr,250)}imgs.forEach(function(im){if(im.complete)chk();else{im.onload=chk;im.onerror=chk}});setTimeout(pr,3500)})()</`+`script></body></html>`;
  const w=window.open('','_blank');if(!w){toast('Allow pop-ups for this site to print.',true);return}w.document.open();w.document.write(html);w.document.close()}
