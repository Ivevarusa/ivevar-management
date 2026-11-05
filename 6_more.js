
/* ============ MASTERS (customers, suppliers, karigars, employees) ============ */
const MASTER_F={
 customers:[{k:'name',l:'Customer / company name',req:1,w:2},{k:'type',l:'Type',t:'sel',o:['Individual','Company','Retailer','Wholesaler']},{k:'contact',l:'Contact person'},{k:'phone',l:'Phone',t:'tel'},{k:'email',l:'Email',t:'email'},{k:'city',l:'City'},{k:'country',l:'Country'},{k:'address',l:'Billing address',t:'ta',w:2},{k:'shipAddress',l:'Shipping address',t:'ta',w:2},{k:'gstin',l:'GSTIN / tax ID'},{k:'lang',l:'Preferred language',t:'sel',o:['English','Hindi','Gujarati']},{k:'creditDays',l:'Credit days',t:'num'},{k:'source',l:'Source',t:'sel',o:()=>SET.leadSources},{k:'notes',l:'Notes',t:'ta',w:4}],
 suppliers:[{k:'name',l:'Supplier name',req:1,w:2},{k:'supplies',l:'Supplies',t:'sel',o:()=>SET.materials},{k:'contact',l:'Contact person'},{k:'phone',l:'Phone',t:'tel'},{k:'email',l:'Email',t:'email'},{k:'city',l:'City'},{k:'gstin',l:'GSTIN'},{k:'address',l:'Address',t:'ta',w:2},{k:'payTerms',l:'Payment terms'},{k:'notes',l:'Notes',t:'ta',w:2}],
 karigars:[{k:'name',l:'Karigar / job worker',req:1,w:2},{k:'phone',l:'Phone',t:'tel'},{k:'workType',l:'Work type',t:'sel',o:()=>SET.departments},{k:'rateBasis',l:'Wage basis',t:'sel',o:['Per piece','Per gram','Per operation','Fixed job'],req:1},{k:'rate',l:'Rate',t:'num'},{k:'status',l:'Status',t:'sel',o:['Active','Inactive'],d:'Active'},{k:'idProof',l:'ID / PAN ref'},{k:'address',l:'Address',t:'ta',w:2},{k:'notes',l:'Rate terms & notes',t:'ta',w:2}],
 employees:[{k:'name',l:'Employee name',req:1,w:2},{k:'phone',l:'Phone',t:'tel'},{k:'dept',l:'Department',t:'sel',o:()=>[...SET.departments,'Sales / CRM','Accounts','Admin']},{k:'designation',l:'Designation'},{k:'salary',l:'Monthly salary',t:'num'},{k:'joinDate',l:'Joining date',t:'date'},{k:'status',l:'Status',t:'sel',o:['Active','Inactive'],d:'Active'},{k:'bank',l:'Salary account note'},{k:'notes',l:'Notes',t:'ta',w:4}]};
function masterForm(c,x){const mod=c==='karigars'?'karigars':c==='employees'?'hr':'masters';
  if(x&&x.id&&!can(mod,'edit')){modal({title:x.name,body:`<dl class="dl">${MASTER_F[c].map(f=>`<dt>${esc(f.l)}</dt><dd>${esc(x[f.k]??'—')}</dd>`).join('')}</dl>`});return}
  openForm({title:x&&x.id?`Edit ${x.no||''} ${x.name}`:'New '+({customers:'customer',suppliers:'supplier',karigars:'karigar',employees:'employee'}[c]),fields:MASTER_F[c],value:x||{},wide:1,onSave:v=>save(c,v)})}
function masterTable(c){const cols={customers:[{l:'Code',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Name',k:'name'},{l:'Type',k:'type'},{l:'Phone',k:'phone'},{l:'Email',k:'email'},{l:'City',h:r=>esc([r.city,r.country].filter(Boolean).join(', '))},{l:'Outstanding',n:1,h:r=>money(invoiced(r.id)-received(r.id))}],
  suppliers:[{l:'Code',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Name',k:'name'},{l:'Supplies',k:'supplies'},{l:'Phone',k:'phone'},{l:'City',k:'city'},{l:'Payable',n:1,h:r=>money(S.bills.filter(b=>b.supplier===r.id).reduce((s,b)=>s+num(b.total)-billPaid(b),0))}],
  employees:[{l:'Code',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Name',k:'name'},{l:'Department',k:'dept'},{l:'Designation',k:'designation'},{l:'Phone',k:'phone'},{l:'Status',h:r=>stPill(r.status||'Active')}]}[c];
  return filterBar(c)+table(cols,applyFil(c,S[c]).sort((a,b)=>(a.name||'').localeCompare(b.name||'')),{onClick:x=>masterForm(c,x),empty:'None added yet'})}

/* ============ KARIGARS (brief §8.3) ============ */
function viewKarigars(){
  const tab=TAB.kar||'list';let body='';
  if(tab==='list')body=filterBar('karigars',['Active','Inactive'])+table([{l:'Code',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Karigar',k:'name'},{l:'Work type',k:'workType'},{l:'Wage basis',h:r=>esc((r.rateBasis||'')+' @ '+fq(r.rate))},{l:'Open challans',n:1,h:r=>S.challans.filter(c=>c.karigar===r.id&&c.status!=='Closed').length},{l:'Metal with karigar (fine g)',n:1,h:r=>`<span class="fine">${fw(S.challans.filter(c=>c.karigar===r.id&&c.status!=='Closed').reduce((s,c)=>s+challanCalc(c).withKarigar,0))}</span>`},{l:'Wages payable',n:1,h:r=>money(S.challans.filter(c=>c.karigar===r.id&&c.status==='Closed'&&!c.wagePaid).reduce((s,c)=>s+karigarWage(c),0))},{l:'Status',h:r=>stPill(r.status||'Active')}],applyFil('karigars',S.karigars),{onClick:karigarDetail,empty:'No karigars yet',emptyHint:'Add outside karigars and job workers here.'});
  else if(tab==='ch')body=filterBar('challans',['Open','Partially Received','Closed'])+table([{l:'Challan',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Karigar',h:r=>esc(nameOf('karigars',r.karigar))},{l:'Job / order',h:r=>esc([byId('jobs',r.job)?.no,orderOf(r.order)?.no].filter(Boolean).join(' · '))},{l:'Issued fine',n:1,h:r=>fw(challanCalc(r).issued.fine)},{l:'Variance',n:1,h:r=>{const v=challanCalc(r).variance;return r.status==='Closed'?`<span style="color:${Math.abs(v)>0.0005?'var(--bad)':'inherit'}">${fw(v)}</span>`:'—'}},{l:'Return due',h:r=>fdate(r.expectedReturn)},{l:'Status',h:r=>stPill(r.status)}],applyFil('challans',S.challans).sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:challanDetail,empty:'No challans yet'});
  else body=table([{l:'Challan',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Karigar',h:r=>esc(nameOf('karigars',r.karigar))},{l:'Basis',h:r=>esc(r.wageBasis||byId('karigars',r.karigar)?.rateBasis||'')},{l:'Finished pcs',n:1,h:r=>fq(challanCalc(r).back.pcs)},{l:'Wage',n:1,h:r=>money(karigarWage(r))},{l:'Status',h:r=>r.wagePaid?stPill('Paid'):r.status==='Closed'?stPill('Unpaid'):stPill('Open')}],S.challans.filter(c=>(c.receipts||[]).length).sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:challanDetail,empty:'No wages yet'});
  return phead('Karigars','No karigar login — staff record every issue, receipt, variance and wage.',[can('karigars','edit')?btn('+ Karigar',`onclick="masterForm('karigars')"`):'',can('karigars','edit')?btn('+ Issue challan','onclick="challanForm()"','pri'):''].join(''))+tabsHTML('kar',[['list','Karigars'],['ch','Challans'],['wage','Wages']],tab)+body}
function karigarDetail(k){const chs=S.challans.filter(c=>c.karigar===k.id);
  modal({title:`${k.no} · ${k.name}`,sub:`${stPill(k.status||'Active')} · ${esc(k.workType||'')} · ${esc(k.rateBasis||'')} @ ${fq(k.rate)}`,wide:1,body:`<dl class="dl"><dt>Phone</dt><dd>${esc(k.phone||'—')}</dd><dt>Address</dt><dd>${esc(k.address||'—')}</dd><dt>Terms</dt><dd>${esc(k.notes||'—')}</dd><dt>Metal with karigar</dt><dd class="fine">${fw(chs.filter(c=>c.status!=='Closed').reduce((s,c)=>s+challanCalc(c).withKarigar,0))} g fine</dd><dt>Total variance (closed)</dt><dd>${fw(chs.filter(c=>c.status==='Closed').reduce((s,c)=>s+challanCalc(c).variance,0))} g fine</dd><dt>Wages unpaid</dt><dd>${money(chs.filter(c=>c.status==='Closed'&&!c.wagePaid).reduce((s,c)=>s+karigarWage(c),0))}</dd></dl><h3>Material ledger</h3>${table([{l:'Challan',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Issued fine',n:1,h:r=>fw(challanCalc(r).issued.fine)},{l:'Returned fine',n:1,h:r=>fw(challanCalc(r).back.fine)},{l:'Scrap fine',n:1,h:r=>fw(challanCalc(r).back.scrapFine)},{l:'Balance / variance',n:1,h:r=>fw(challanCalc(r).variance)},{l:'Status',h:r=>stPill(r.status)}],chs,{onClick:c=>challanDetail(c),empty:'No challans'})}`,
   foot:can('karigars','edit')?btn('Edit','data-e')+btn('Issue challan','data-c','pri'):'',onMount(ov,close){const b=s=>ov.querySelector(s);b('[data-e]')&&(b('[data-e]').onclick=()=>{close();masterForm('karigars',k)});b('[data-c]')&&(b('[data-c]').onclick=()=>{close();challanForm({karigar:k.id,date:today(),wageBasis:k.rateBasis,wageRate:k.rate})})}})}
function challanForm(pre){
  pre=pre||{date:today(),lines:[{}]};
  openForm({title:'Issue challan to karigar',wide:1,value:pre,fields:[{k:'karigar',l:'Karigar',t:'ref',o:()=>S.karigars.filter(k=>k.status!=='Inactive').map(k=>[k.id,k.name]),req:1,w:2},{k:'date',l:'Issue date',t:'date',req:1},{k:'expectedReturn',l:'Expected return',t:'date',req:1},
   {k:'job',l:'Job card',t:'ref',o:refOpts('jobs',j=>j.no+' · '+(j.product||''))},{k:'order',l:'Order',t:'ref',o:refOpts('orders',o=>o.no)},{k:'issuer',l:'Issued by (employee)',t:'ref',o:empOpts},{k:'receiverName',l:'Received by (karigar side)'},
   {k:'lines',l:'Materials issued',t:'lines',cols:[{k:'category',l:'Material',t:'sel',o:()=>SET.materials,w:130},{k:'purity',l:'Purity',t:'sel',o:purOpts,w:100},{k:'desc',l:'Spec',w:120},{k:'lot',l:'Lot',w:80},{k:'pcs',l:'Pcs',t:'num',w:60},{k:'gross',l:'Gross g',t:'num',w:75},{k:'net',l:'Net g',t:'num',w:75},{k:'carat',l:'Carat',t:'num',w:65},{k:'fine',l:'Fine g',calc:l=>l.purity?fineOf(l.net,l.purity):0,fmt:fw}]},
   {k:'wageBasis',l:'Wage basis',t:'sel',o:['Per piece','Per gram','Per operation','Fixed job']},{k:'wageRate',l:'Wage rate',t:'num'},{k:'operations',l:'Operations (if per op.)',t:'num'},{k:'confirm',l:'Karigar confirmed receipt',t:'bool',cl:'Signature / confirmation taken'},{k:'notes',l:'Work instructions',t:'ta',w:4}],
   async onSave(v){if(!(v.lines||[]).length){toast('Add the materials you are issuing.',true);return false}
     if(v.lines.some(l=>['Gold','Silver','Platinum'].includes(l.category)&&!l.purity)){toast('Pick purity for every metal line.',true);return false}
     v.lines=v.lines.map(l=>({...l,fine:l.purity?fineOf(l.net,l.purity):''}));v.status='Open';
     const c=await save('challans',v);
     for(const l of v.lines)await save('vouchers',{date:v.date,vtype:'Issue to karigar',category:l.category,purity:l.purity,desc:l.desc,lot:l.lot,pcs:l.pcs,gross:l.gross,net:l.net,fine:l.fine,carat:l.carat,location:'With Karigar',challan:c.id,job:v.job,order:v.order,status:'Approved',note:'Challan '+c.no+' · '+nameOf('karigars',v.karigar)},{silent:1});
     setTimeout(()=>challanDetail(byId('challans',c.id)||c),60)}})}
function challanDetail(c){
  c=byId('challans',c.id)||c;const calc=challanCalc(c);const wage=karigarWage(c);
  modal({title:`${c.no} · ${nameOf('karigars',c.karigar)}`,sub:`${stPill(c.status)} · issued ${fdate(c.date)} · return due ${fdate(c.expectedReturn)} ${c.confirm?'· receipt confirmed':''}`,wide:1,body:`
   <div class="grid g4"><div class="card kpi gold"><span class="v">${fw(calc.issued.fine)}</span><span class="l">Fine issued (g)</span></div><div class="card kpi"><span class="v">${fw(calc.back.fine)}</span><span class="l">Fine returned in goods + metal</span></div><div class="card kpi"><span class="v">${fw(calc.back.scrapFine)}</span><span class="l">Fine in scrap / residue</span></div><div class="card kpi ${c.status==='Closed'&&Math.abs(calc.variance)>0.0005?'alert':''}"><span class="v">${fw(calc.variance)}</span><span class="l">${c.status==='Closed'?'Unexplained variance':'Still with karigar'} (g fine)</span></div></div>
   <div><h3>Issued</h3>${table([{l:'Material',k:'category'},{l:'Purity',k:'purity'},{l:'Spec',k:'desc'},{l:'Lot',k:'lot'},{l:'Pcs',n:1,k:'pcs'},{l:'Net g',n:1,h:r=>fw(r.net)},{l:'Fine g',n:1,h:r=>fw(fineOf(r.net,r.purity))},{l:'Carat',n:1,h:r=>r.carat?fw(r.carat):''}],c.lines||[])}</div>
   <div><h3>Receipts</h3>${(c.receipts||[]).length?table([{l:'Date',h:r=>fdate(r.date)},{l:'Finished pcs',n:1,k:'finishedPcs'},{l:'Finished net',n:1,h:r=>fw(r.finishedNet)+' '+esc(r.finishedPurity||'')},{l:'Metal returned',n:1,h:r=>fw(r.returnedNet)+' '+esc(r.returnedPurity||'')},{l:'Scrap',n:1,h:r=>fw(r.scrapNet)},{l:'Stones ct',n:1,h:r=>fw(r.stonesCt)},{l:'Damaged ct',n:1,h:r=>fw(r.stonesDamaged)},{l:'Rejected',n:1,k:'rejectedPcs'},{l:'Note',k:'note'}],c.receipts):'<div class="note">Nothing received yet.</div>'}</div>
   <dl class="dl"><dt>Wage</dt><dd>${esc(c.wageBasis||'')} @ ${fq(c.wageRate)} ${num(c.wageAdj)?' + adj '+fq(c.wageAdj):''} = <b>${money(wage)}</b> ${c.wagePaid?stPill('Paid'):''}</dd><dt>Instructions</dt><dd>${esc(c.notes||'—')}</dd></dl>`,
   foot:[can('karigars','edit')?btn('Print challan (HTML)','data-dl'):'',c.status!=='Closed'&&can('karigars','edit')?btn('Record receipt','data-r','pri'):'',c.status==='Closed'&&!c.wagePaid&&(can('accounts','edit')||can('karigars','approve'))?btn('Wage adjustment','data-adj')+btn('Mark wage paid','data-pay','good'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-dl]')&&(b('[data-dl]').onclick=()=>saveFile(c.no+'.html',`<!doctype html><meta charset="utf-8"><title>${esc(c.no)}</title><style>body{font-family:Arial;margin:30px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:5px}</style><h2>${esc(SET.company.name)} — Karigar issue challan ${esc(c.no)}</h2><p>Karigar: <b>${esc(nameOf('karigars',c.karigar))}</b> · Date ${esc(c.date)} · Return by ${esc(c.expectedReturn)} · Job ${esc(byId('jobs',c.job)?.no||'')} · Order ${esc(orderOf(c.order)?.no||'')}</p><table><tr><th>Material</th><th>Purity</th><th>Spec</th><th>Lot</th><th>Pcs</th><th>Gross</th><th>Net</th><th>Fine</th><th>Carat</th></tr>${(c.lines||[]).map(l=>`<tr><td>${esc(l.category)}</td><td>${esc(l.purity)}</td><td>${esc(l.desc)}</td><td>${esc(l.lot)}</td><td>${esc(l.pcs)}</td><td>${esc(l.gross)}</td><td>${esc(l.net)}</td><td>${fw(fineOf(l.net,l.purity))}</td><td>${esc(l.carat)}</td></tr>`).join('')}</table><p>${esc(c.notes||'')}</p><br><br><p>Issued by: ____________________ &nbsp;&nbsp;&nbsp; Received by (karigar): ____________________</p>`,'text/html'));
    b('[data-adj]')&&(b('[data-adj]').onclick=()=>{close();openForm({title:'Wage adjustment',fields:[{k:'wageAdj',l:'Adjustment amount (+/−)',t:'num',req:1},{k:'reason',l:'Reason',req:1,w:2}],value:{wageAdj:c.wageAdj},onSave:v=>save('challans',{...c,wageAdj:v.wageAdj},{action:'wage adjustment',reason:v.reason})})});
    b('[data-pay]')&&(b('[data-pay]').onclick=()=>{close();openForm({title:`Pay ${money(wage)} to ${nameOf('karigars',c.karigar)}`,fields:[{k:'date',l:'Date',t:'date',d:today()},{k:'mode',l:'Mode',t:'sel',o:['Cash','Bank transfer','UPI','Cheque'],req:1},{k:'ref',l:'Reference'}],value:{},onSave:async v=>{await save('expenses',{date:v.date,category:'Karigar job work',amount:wage,karigar:c.karigar,order:c.order,mode:v.mode,ref:v.ref,notes:'Wage for '+c.no},{silent:1});await save('challans',{...c,wagePaid:true,wagePaidOn:v.date},{action:'wage paid'})}})});
    b('[data-r]')&&(b('[data-r]').onclick=()=>{close();const pur=(c.lines||[]).find(l=>l.purity)?.purity||'';
      openForm({title:`Receive from karigar · ${c.no}`,wide:1,value:{date:today(),finishedPurity:pur,returnedPurity:pur,scrapPurity:pur},fields:[{k:'date',l:'Date',t:'date',req:1},{k:'finishedPcs',l:'Finished pieces',t:'num'},{k:'finishedNet',l:'Finished net wt (g)',t:'num'},{k:'finishedPurity',l:'Finished purity',t:'sel',o:purOpts},
       {k:'returnedNet',l:'Unused metal returned (g)',t:'num'},{k:'returnedPurity',l:'Returned purity',t:'sel',o:purOpts},{k:'scrapNet',l:'Scrap / residue (g)',t:'num'},{k:'scrapPurity',l:'Scrap purity (est.)',t:'sel',o:purOpts},
       {k:'stonesCt',l:'Stones returned / set (ct)',t:'num'},{k:'stonesDamaged',l:'Stones damaged (ct)',t:'num'},{k:'rejectedPcs',l:'Rejected pieces',t:'num'},{k:'close',l:'Close challan',t:'bool',cl:'All work and material returned'},{k:'note',l:'Remarks',t:'ta',w:4}],
       async onSave(v){const rec={...v};delete rec.close;const nc={...c,receipts:[...(c.receipts||[]),{...rec,by:ME.id}]};
        const calc2=challanCalc(nc);nc.status=v.close?'Closed':'Partially Received';
        const base={date:v.date,challan:c.id,job:c.job,order:c.order,status:'Approved',location:SET.locations[0],note:'Receipt '+c.no};
        if(num(v.finishedNet))await save('vouchers',{...base,vtype:'Return from karigar',category:purityMetal(v.finishedPurity)||'Gold',purity:v.finishedPurity,desc:'Finished pieces in metal',net:v.finishedNet,gross:v.finishedNet,fine:fineOf(v.finishedNet,v.finishedPurity),pcs:v.finishedPcs},{silent:1});
        if(num(v.returnedNet))await save('vouchers',{...base,vtype:'Return from karigar',category:purityMetal(v.returnedPurity)||'Gold',purity:v.returnedPurity,desc:'Unused metal',net:v.returnedNet,gross:v.returnedNet,fine:fineOf(v.returnedNet,v.returnedPurity)},{silent:1});
        if(num(v.scrapNet))await save('vouchers',{...base,vtype:'Scrap receipt',category:'Scrap / Residue',purity:v.scrapPurity,desc:'Karigar scrap',net:v.scrapNet,gross:v.scrapNet,fine:fineOf(v.scrapNet,v.scrapPurity)},{silent:1});
        const stoneLine=(c.lines||[]).find(l=>num(l.carat));if(num(v.stonesCt)&&stoneLine)await save('vouchers',{...base,vtype:'Return from karigar',category:stoneLine.category,lot:stoneLine.lot,carat:v.stonesCt,desc:'Stones returned / set'},{silent:1});
        const s=await save('challans',nc,{action:v.close?'receipt + close':'receipt',reason:v.note});
        if(v.close&&Math.abs(calc2.variance)>0.0005)await save('wastage',{date:v.date,source:'Karigar',ref:c.id,refNo:c.no,karigar:c.karigar,order:c.order,issuedFine:calc2.issued.fine,accountedFine:r3(calc2.back.fine),recovered:r3(calc2.back.scrapFine),variance:calc2.variance,expectedPct:SET.wastageTolPct,status:'Pending'},{silent:1});
        if(v.close&&Math.abs(calc2.variance)>0.0005)toast(`Variance of ${fw(calc2.variance)} g fine sent to Wastage for approval.`,true);
        setTimeout(()=>challanDetail(byId('challans',s.id)||s),60)}})})}})}

/* ============ WASTAGE & RECOVERY (brief §9) ============ */
function viewWastage(){
  const pend=S.wastage.filter(w=>w.status==='Pending');
  const tot=s=>S.wastage.filter(w=>w.status===s).reduce((a,w)=>a+num(w.variance),0);
  return phead('Wastage & Recovery','Expected loss, measured difference and recovered scrap are kept separate. Unexplained differences are never closed as wastage automatically.',can('wastage','edit')?btn('+ Process loss record','onclick="wastageForm()"','pri'):'')+
  `<div class="grid g4" style="margin-bottom:14px"><div class="card kpi ${pend.length?'alert':''}"><span class="v">${pend.length}</span><span class="l">Awaiting approval</span></div><div class="card kpi"><span class="v">${fw(pend.reduce((a,w)=>a+num(w.variance),0))}</span><span class="l">Pending variance (g fine)</span></div><div class="card kpi gold"><span class="v">${fw(tot('Approved'))}</span><span class="l">Approved wastage (g fine)</span></div><div class="card kpi"><span class="v">${fw(S.wastage.reduce((a,w)=>a+num(w.recovered),0))}</span><span class="l">Recovered in scrap (g fine)</span></div></div>`+
  filterBar('wastage',['Pending','Approved','Rejected'])+table([{l:'No.',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Source',k:'source'},{l:'Ref',k:'refNo'},{l:'Karigar / dept',h:r=>esc(nameOf('karigars',r.karigar)||r.dept||'')},{l:'Issued fine',n:1,h:r=>fw(r.issuedFine)},{l:'Accounted',n:1,h:r=>fw(r.accountedFine)},{l:'Variance',n:1,h:r=>`<b>${fw(r.variance)}</b>`},{l:'Expected loss',n:1,h:r=>fw(num(r.issuedFine)*num(r.expectedPct)/100)},{l:'Status',h:r=>stPill(r.status)}],applyFil('wastage',S.wastage).sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:wastageForm,empty:'No variance records',emptyHint:'Records appear automatically when a karigar challan or job closes with a metal difference.'})}
function wastageForm(w){
  if(w&&w.id){const exp=r3(num(w.issuedFine)*num(w.expectedPct)/100);const over=num(w.variance)-exp;
    modal({title:`${w.no} · ${w.source}`,sub:`${stPill(w.status)} · ${esc(w.refNo||'')} · ${fdate(w.date)}`,body:`<dl class="dl"><dt>Fine issued</dt><dd>${fw(w.issuedFine)} g</dd><dt>Fine in output / returns</dt><dd>${fw(w.accountedFine)} g</dd><dt>Recovered in scrap</dt><dd>${fw(w.recovered)} g</dd><dt>Measured variance</dt><dd><b>${fw(w.variance)} g</b></dd><dt>Expected process loss (${fq(w.expectedPct)}%)</dt><dd>${fw(exp)} g</dd><dt>Above expected</dt><dd style="color:${over>0.0005?'var(--bad)':'var(--good)'}">${fw(over)} g · ${money(over*num(SET.rates.Gold))}</dd><dt>Responsible</dt><dd>${esc(nameOf('karigars',w.karigar)||w.dept||w.responsible||'—')}</dd><dt>Explanation</dt><dd>${esc(w.explanation||'Not explained yet')}</dd>${w.decidedBy?`<dt>Decision</dt><dd>${esc(userName(w.decidedBy))} · ${esc(w.decision||'')}</dd>`:''}</dl>${filesHTML(w.files)}`,
     foot:w.status==='Pending'?[can('wastage','edit')?btn('Add explanation','data-x'):'',can('wastage','edit')?btn('+ Evidence','data-f'):'',can('wastage','approve')?btn('Reject → recover from responsible','data-rj','dng')+btn('Approve as wastage','data-ap','good'):''].join(''):'',
     onMount(ov,close){const b=s=>ov.querySelector(s);
      b('[data-x]')&&(b('[data-x]').onclick=()=>{close();openForm({title:'Explain variance',fields:[{k:'explanation',l:'Explanation',t:'ta',w:4,req:1},{k:'responsible',l:'Responsible person / dept',w:2}],value:w,onSave:v=>save('wastage',{...w,...v},{action:'explain'})})});
      b('[data-f]')&&(b('[data-f]').onclick=()=>pickFiles(async f=>{close();const s=await save('wastage',{...w,files:[...(w.files||[]),...f]},{action:'evidence'});wastageForm(s)}));
      b('[data-ap]')&&(b('[data-ap]').onclick=()=>{if(over>0.0005&&!w.explanation){toast('Variance is above the expected loss — add an explanation before approving.',true);return}close();askReason('Approve wastage','Approval note',r=>save('wastage',{...w,status:'Approved',decidedBy:ME.id,decision:r},{action:'approve',reason:r}))});
      b('[data-rj]')&&(b('[data-rj]').onclick=()=>{close();askReason('Reject wastage','How will the metal be recovered?',r=>save('wastage',{...w,status:'Rejected',decidedBy:ME.id,decision:r},{action:'reject',reason:r}))})}});return}
  openForm({title:'Process loss / recovery record',wide:1,value:{date:today(),source:'In-house process',expectedPct:SET.wastageTolPct},fields:[{k:'date',l:'Date',t:'date'},{k:'source',l:'Source',t:'sel',o:['In-house process','Karigar','Refining','Physical count']},{k:'dept',l:'Department',t:'sel',o:()=>SET.departments},{k:'order',l:'Order',t:'ref',o:refOpts('orders',o=>o.no)},{k:'refNo',l:'Reference (job / batch)'},{k:'issuedFine',l:'Fine issued (g)',t:'num',req:1},{k:'accountedFine',l:'Fine in output + returns (g)',t:'num',req:1},{k:'recovered',l:'Fine recovered in scrap (g)',t:'num'},{k:'variance',l:'Variance (g) — auto',ro:1,calc:v=>r3(num(v.issuedFine)-num(v.accountedFine)-num(v.recovered))},{k:'expectedPct',l:'Expected loss %',t:'num'},{k:'explanation',l:'Explanation',t:'ta',w:2}],
   onSave:v=>save('wastage',{...v,variance:r3(num(v.issuedFine)-num(v.accountedFine)-num(v.recovered)),status:'Pending'})})}

/* ============ QUALITY CONTROL (brief §10) ============ */
function viewQC(){
  const open=S.qc.filter(q=>['Fail','Hold','Rework'].includes(q.result)&&!q.closed);const await_=S.qc.filter(q=>q.result==='Pass'&&!q.released);
  const tab=TAB.qc||'open';const rows=tab==='open'?open:tab==='rel'?await_:applyFil('qc',S.qc,'result');
  return phead('Quality Control','Failed or held items cannot be dispatched until re-inspected and released by an authorised user.',can('qc','edit')?btn('+ Inspection','onclick="qcForm()"','pri'):'')+tabsHTML('qc',[['open',`Fail / hold / rework (${open.length})`],['rel',`Awaiting release (${await_.length})`],['all','All inspections']],tab)+(tab==='all'?filterBar('qc',['Pass','Fail','Hold','Rework']):'')+
  table([{l:'QC',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Order · item',h:r=>{const o=orderOf(r.order);return esc((o?.no||'')+' · #'+(num(r.line)+1)+' '+(o?.lines?.[r.line]?.desc||''))}},{l:'Job',h:r=>esc(byId('jobs',r.job)?.no||'')},{l:'Result',h:r=>stPill(r.result)},{l:'Defect',k:'defect'},{l:'Inspector',h:r=>esc(userName(r.inspector))},{l:'Released',h:r=>r.released?'<span class="pill good">Released</span>':''}],rows.sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:qcForm,empty:tab==='open'?'No failed or held items':'Nothing here'})}
function qcForm(q){
  if(q&&q.id){const o=orderOf(q.order);
    modal({title:`${q.no} · ${o?.no||''} item #${num(q.line)+1}`,sub:`${stPill(q.result)} · ${fdate(q.date)} · inspector ${esc(userName(q.inspector))}${q.released?' · released by '+esc(userName(q.releasedBy)):''}`,wide:1,body:`<div class="grid g2"><div><h3>Checklist</h3>${(SET.qcChecks||[]).map(c=>`<div>${(q.checks||[]).includes(c)?'✓':'✗'} ${esc(c)}</div>`).join('')}</div><dl class="dl"><dt>Gross / net</dt><dd>${fw(q.gross)} / ${fw(q.net)} g</dd><dt>Purity</dt><dd>${esc(q.purity||'—')}</dd><dt>Stones</dt><dd>${fq(q.stonePcs)} pcs · ${fw(q.stoneCt)} ct</dd><dt>Defect</dt><dd>${esc(q.defect||'—')}</dd><dt>Notes</dt><dd>${esc(q.notes||'—')}</dd></dl></div><div><h3>Photos</h3>${filesHTML(q.files)}</div>`,
     foot:[can('qc','edit')?btn('+ Photos','data-f'):'',['Fail','Hold','Rework'].includes(q.result)&&!q.closed&&can('qc','edit')?btn('Re-inspect','data-re','pri'):'',q.result==='Pass'&&!q.released&&can('qc','approve')?btn('Release for dispatch','data-rel','good'):''].join(''),
     onMount(ov,close){const b=s=>ov.querySelector(s);
      b('[data-f]')&&(b('[data-f]').onclick=()=>pickFiles(async f=>{close();const s=await save('qc',{...q,files:[...(q.files||[]),...f]},{action:'photos'});qcForm(s)},'image/*'));
      b('[data-re]')&&(b('[data-re]').onclick=()=>{close();qcForm({order:q.order,line:q.line,job:q.job,date:today(),reinspectOf:q.id})});
      b('[data-rel]')&&(b('[data-rel]').onclick=async()=>{close();await save('qc',{...q,released:true,releasedBy:ME.id,releasedAt:nowISO()},{action:'release'});await setLineStatus(q.order,q.line,'Ready')})}});return}
  q=q||{date:today()};
  openForm({title:q.reinspectOf?'Re-inspection':'New QC inspection',wide:1,value:{checks:[],...q},fields:[{k:'order',l:'Order',t:'ref',o:refOpts('orders',o=>o.no+' · '+custName(o.customer)),req:1,w:2},{k:'line',l:'Item',t:'sel',o:()=>{const o=orderOf(q.order);return o?(o.lines||[]).map((l,i)=>[String(i),`#${i+1} ${l.desc||''}`]):[['0','#1'],['1','#2'],['2','#3'],['3','#4']]},req:1},{k:'job',l:'Job card',t:'ref',o:refOpts('jobs',j=>j.no)},
   {k:'checks',l:'Checks passed',t:'chk',o:()=>SET.qcChecks,w:4},{k:'gross',l:'Gross wt (g)',t:'num'},{k:'net',l:'Net wt (g)',t:'num'},{k:'purity',l:'Purity verified',t:'sel',o:purOpts},{k:'stonePcs',l:'Stone count',t:'num'},{k:'stoneCt',l:'Stone carat',t:'num'},
   {k:'result',l:'Result',t:'sel',o:['Pass','Fail','Hold','Rework'],req:1},{k:'defect',l:'Defect code',t:'sel',o:()=>SET.defects},{k:'dept',l:'Responsible dept / vendor',t:'sel',o:()=>SET.departments},{k:'notes',l:'Notes',t:'ta',w:4}],
   async onSave(v){v.line=num(v.line);v.inspector=ME.id;if(v.result!=='Pass'&&!v.defect){toast('Choose a defect code for Fail / Hold / Rework.',true);return false}
     if(v.result==='Pass'&&(v.checks||[]).length<(SET.qcChecks||[]).length&&!v.notes){toast('Not every check is ticked — add a note explaining why it still passes.',true);return false}
     const s=await save('qc',v);
     if(v.result==='Pass')for(const old of S.qc.filter(x=>x.order===v.order&&num(x.line)===v.line&&x.id!==s.id&&!x.closed&&x.result!=='Pass'))await save('qc',{...old,closed:true,closedBy:s.id},{silent:1,action:'closed by re-inspection'});
     await setLineStatus(v.order,v.line,v.result==='Pass'?'QC':'QC Hold');
     setTimeout(()=>qcForm(byId('qc',s.id)||s),60)}})}
async function setLineStatus(orderId,idx,st){const o=orderOf(orderId);if(!o)return;const lines=JSON.parse(JSON.stringify(o.lines||[]));if(!lines[idx]||lines[idx].status===st)return;lines[idx].status=st;
  let os=o.status;const all=lines.map(l=>l.status);
  if(all.every(s=>s==='Ready'))os='Ready to Pack';else if(all.some(s=>['QC','QC Hold'].includes(s))&&!['Partially Dispatched','Dispatched'].includes(os))os='QC';
  await save('orders',{...o,lines,status:os,history:os!==o.status?[...(o.history||[]),{ts:nowISO(),by:ME.id,from:o.status,to:os,note:'Auto: item #'+(idx+1)+' '+st}]:o.history},{silent:1,action:'line status'})}

/* ============ PACKING & DISPATCH (brief §11) ============ */
function viewDispatch(){
  const ready=[];S.orders.filter(o=>!['Closed','Cancelled','Delivered'].includes(o.status)).forEach(o=>(o.lines||[]).forEach((l,i)=>{const rem=num(l.qty||1)-dispatchedQty(o.id,i);if(rem>0&&lineQCState(o.id,i).ok)ready.push({o,l,i,rem})}));
  const tab=TAB.dsp||'ready';
  return phead('Packing & Dispatch','Only QC-released items can be packed. Dispatch needs an invoice and tracking number. Partial dispatch is supported.','')+tabsHTML('dsp',[['ready',`Ready to pack (${ready.length})`],['list','Dispatches']],tab)+
  (tab==='ready'?table([{l:'Order',h:r=>`<span class="ref">${esc(r.o.no)}</span>`},{l:'Customer',h:r=>esc(custName(r.o.customer))},{l:'Item',h:r=>'#'+(r.i+1)+' '+esc(r.l.desc||'')},{l:'Qty left',n:1,h:r=>fq(r.rem)},{l:'Due',h:r=>fdate(r.o.dueDate)},{l:'',h:r=>can('dispatch','edit')?`<button class="btn sm pri" onclick="dispatchForm({order:'${r.o.id}',date:today(),status:'Prepared'})">Pack</button>`:''}],ready,{empty:'Nothing ready',emptyHint:'Items appear here after QC release.'})
  :filterBar('dsp',DSP_ST)+table([{l:'No.',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Order',h:r=>esc(orderOf(r.order)?.no||'')},{l:'Customer',h:r=>esc(custName(orderOf(r.order)?.customer))},{l:'Pkgs',n:1,k:'packages'},{l:'Courier / tracking',h:r=>esc([r.courier,r.tracking].filter(Boolean).join(' · '))},{l:'Invoice',h:r=>esc(byId('invoices',r.invoice)?.no||'')},{l:'Status',h:r=>stPill(r.status)}],applyFil('dsp',S.dispatches).sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:dispatchForm,empty:'No dispatches yet'}))}
function dispatchForm(d){
  if(d&&d.id)return dispatchView(byId('dispatches',d.id)||d);
  const o=orderOf(d.order);if(!o){toast('Open an order first.',true);return}
  const rows=(o.lines||[]).map((l,i)=>({l,i,rem:num(l.qty||1)-dispatchedQty(o.id,i),qc:lineQCState(o.id,i)}));
  const cust=byId('customers',o.customer)||{};
  modal({title:`Pack order ${o.no}`,sub:esc(custName(o.customer)),wide:1,body:`<div class="tw"><table class="lines"><thead><tr><th>Item</th><th>QC</th><th class="num">Remaining</th><th>Pack qty</th></tr></thead><tbody>${rows.map(r=>`<tr><td>#${r.i+1} ${esc(r.l.desc||'')}<div class="note">${esc(r.l.purity||'')} ${r.l.targetWt?fw(r.l.targetWt)+' g':''}</div></td><td><span class="pill ${r.qc.ok?'good':'bad'}">${esc(r.qc.label)}</span></td><td class="calc">${fq(r.rem)}</td><td><input type="number" step="any" min="0" data-q="${r.i}" value="${r.qc.ok&&r.rem>0?r.rem:0}" ${r.qc.ok&&r.rem>0?'':'disabled'}></td></tr>`).join('')}</tbody></table></div>
   <div class="form"><div class="f"><label>Date</label><input type="date" id="dDate" value="${today()}"></div><div class="f"><label>Packages</label><input type="number" id="dPk" value="1"></div><div class="f"><label>Package gross wt (g)</label><input type="number" step="any" id="dWt"></div><div class="f"><label>Invoice / bill no.</label><input id="dInv"></div>
   <div class="f"><label>Courier company</label><select id="dCo"><option value="">Select…</option>${COURIERS.map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="f"><label>Forwarding agency</label><select id="dAg"><option value="">Select…</option>${(SET.courierAgencies||[]).map(c=>`<option>${esc(c)}</option>`).join('')}</select></div><div class="f"><label>Tracking no.</label><input id="dTr"></div><div class="f"><label>Courier assistant / person</label><input id="dCp" placeholder="Who handled pickup"></div><div class="f"><label>Insured value</label><input type="number" id="dIns"></div><div class="f"><label>Packed by</label><select id="dBy"><option value="">Select…</option>${empOpts().map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('')}</select></div>
   <div class="f w4"><label>Ship to</label><textarea id="dAd">${esc(o.shipTo||cust.shipAddress||cust.address||'')}</textarea></div>
   <div class="f w4"><label>Packing checklist</label><div class="chk" id="dChk">${['Items match packing list','Certificates / QC cards included','Invoice copy included','Sealed & labelled','Insurance arranged'].map(c=>`<label><input type="checkbox" value="${esc(c)}"> ${esc(c)}</label>`).join('')}</div></div></div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="dSave">Save packing list</button>`,
   onMount(ov,close){ov.querySelector('#dSave').onclick=async()=>{const g=s=>ov.querySelector(s).value;const lines=[];
     for(const r of rows){const q=num(ov.querySelector(`[data-q="${r.i}"]`).value);if(!q)continue;if(!r.qc.ok){toast(`Item #${r.i+1} is not QC-released.`,true);return}if(q>r.rem+1e-9){toast(`Item #${r.i+1}: only ${r.rem} left to dispatch.`,true);return}lines.push({line:r.i,qty:q,desc:r.l.desc,purity:r.l.purity})}
     if(!lines.length){toast('Choose at least one item to pack.',true);return}
     close();const s=await save('dispatches',{order:o.id,date:g('#dDate'),lines,packages:num(g('#dPk')),weight:num(g('#dWt')),invoice:g('#dInv'),courier:g('#dCo'),agency:g('#dAg'),courierPerson:g('#dCp'),tracking:g('#dTr'),insured:num(g('#dIns')),packedBy:g('#dBy'),address:g('#dAd'),checklist:[...ov.querySelectorAll('#dChk input:checked')].map(i=>i.value),status:'Prepared'});
     setTimeout(()=>dispatchView(byId('dispatches',s.id)||s),60)}}})}
function trackTimeline(d){const h=d.trackHistory||[];if(!h.length&&!d.trackStatus)return '<div class="note">No tracking updates yet.</div>';
  return `<ul class="timeline">${h.slice().reverse().map(x=>`<li><b>${esc(x.status)}</b> ${esc(x.location||'')}<small>${fdt(x.ts)}${x.by?' · '+esc(userName(x.by)):''}${x.note?' · '+esc(x.note):''}</small></li>`).join('')||`<li><b>${esc(d.trackStatus||d.status)}</b></li>`}</ul>`}
function updateTracking(d){openForm({title:`Update tracking · ${d.no}`,fields:[{k:'status',l:'Status',t:'sel',o:()=>SET.trackStatuses,req:1,d:d.trackStatus},{k:'location',l:'Location (optional)'},{k:'note',l:'Note',t:'ta',w:2}],value:{},async onSave(v){
  const entry={status:v.status,location:v.location,note:v.note,ts:nowISO(),by:ME.id};
  const nd={...d,trackStatus:v.status,trackHistory:[...(d.trackHistory||[]),entry]};
  if(v.status==='Delivered'){nd.status='Delivered';nd.deliveredAt=nowISO();}
  else if(['Picked up','Export customs','In transit','Import customs','Out for delivery'].includes(v.status)&&d.status==='Dispatched')nd.status='In Transit';
  const s=await save('dispatches',nd,{action:'tracking '+v.status});
  const o=orderOf(d.order);if(o){let stg=orderStage(o);if(v.status==='Delivered')stg='Delivered';else if(stageIdx(stg)<stageIdx('Dispatched'))stg='Dispatched';if(stg!==orderStage(o))await save('orders',{...o,stage:stg},{silent:1,action:'stage'})}
  setTimeout(()=>dispatchView(byId('dispatches',s.id)||s),50)}})}
function courierReport(d){const o=orderOf(d.order);const c=byId('customers',o?.customer)||{};
  const html=`<!doctype html><meta charset="utf-8"><title>${esc(d.no)} courier report</title><style>body{font-family:Arial,sans-serif;margin:30px;color:#111;font-size:13px}h1{font-size:19px;margin:0}table{border-collapse:collapse;width:100%;margin:10px 0}td,th{border:1px solid #999;padding:6px;text-align:left}th{background:#eee}.r{display:grid;grid-template-columns:1fr 1fr;gap:10px}@media print{button{display:none}}</style><button onclick="print()" style="float:right;padding:8px 14px">Print / Save PDF</button>
  <h1>IVEVAR — Courier report</h1><div style="color:#555">${esc(SET.company.name)}</div><hr>
  <div class="r"><div><b>Dispatch</b> ${esc(d.no)}<br><b>Order</b> ${esc(o?.no||'')} ${esc(o?.extRef||'')}<br><b>Date</b> ${esc(d.date||'')}</div>
  <div><b>Courier</b> ${esc(d.courier||'')}<br><b>Agency</b> ${esc(d.agency||'')}<br><b>Tracking</b> ${esc(d.tracking||'')}<br><b>Assistant</b> ${esc(d.courierPerson||'')}</div></div>
  <div class="r" style="margin-top:8px"><div><b>Customer</b><br>${esc(c.name||'')}<br>${esc(o?.email||c.email||'')}</div><div><b>Ship to</b><br><span style="white-space:pre-line">${esc(d.address||'')}</span></div></div>
  <table><tr><th>#</th><th>Item</th><th>Qty</th></tr>${(d.lines||[]).map(l=>`<tr><td>${l.line+1}</td><td>${esc(l.desc||'')}</td><td>${esc(l.qty)}</td></tr>`).join('')}</table>
  <p>Packages: ${esc(d.packages||1)} · Weight: ${esc(d.weight||'')} g · Insured: ${esc(d.insured||'')}</p>
  <h3>Tracking history</h3><table><tr><th>Status</th><th>Location</th><th>When</th><th>Note</th></tr>${(d.trackHistory||[]).map(x=>`<tr><td>${esc(x.status)}</td><td>${esc(x.location||'')}</td><td>${esc(fdt(x.ts))}</td><td>${esc(x.note||'')}</td></tr>`).join('')||'<tr><td colspan=4>No updates</td></tr>'}</table>`;
  const w=window.open('','_blank');if(!w){toast('Allow pop-ups to view the report.',true);return}w.document.write(html);w.document.close()}
function dispatchView(d){d=byId('dispatches',d.id)||d;const o=orderOf(d.order);
  modal({title:`${d.no} · ${o?.no||''}`,sub:`${stPill(d.trackStatus||d.status)} · ${esc(custName(o?.customer))} · ${fdate(d.date)}`,wide:1,body:`${table([{l:'Item',h:r=>'#'+(r.line+1)+' '+esc(r.desc||'')},{l:'Purity',k:'purity'},{l:'Qty',n:1,k:'qty'}],d.lines||[])}<dl class="dl"><dt>Packages</dt><dd>${fq(d.packages)} · ${fw(d.weight)} g</dd><dt>Courier company</dt><dd>${esc(d.courier||'—')}</dd><dt>Forwarding agency</dt><dd>${esc(d.agency||'—')}</dd><dt>Tracking no.</dt><dd>${esc(d.tracking||'—')}</dd><dt>Courier assistant</dt><dd>${esc(d.courierPerson||'—')}</dd><dt>Ship to</dt><dd style="white-space:pre-line">${esc(d.address||'')}</dd><dt>Checklist</dt><dd>${esc((d.checklist||[]).join(' · ')||'—')}</dd>${d.shippedBy?`<dt>Shipped by</dt><dd>${esc(userName(d.shippedBy))} · ${fdt(d.shippedAt)}</dd>`:''}</dl>
   <div><h3>Tracking status</h3>${trackTimeline(d)}</div>
   <div><h3>Proof of dispatch</h3>${filesHTML(d.files)}</div>`,
   foot:[btn(ic('clipboard')+' Courier report','data-cr'),btn('Packing list','data-pl'),can('dispatch','edit')?btn('+ Proof','data-f'):'',['Dispatched','In Transit'].includes(d.status)&&can('dispatch','edit')?btn('Update tracking','data-track','pri'):'',d.status==='Prepared'&&can('dispatch','approve')?btn('Mark dispatched','data-go','pri'):'',['Dispatched','In Transit'].includes(d.status)&&can('dispatch','edit')?btn('Delivered','data-dv','good')+btn('Failed / returned','data-rt','dng'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-cr]')&&(b('[data-cr]').onclick=()=>courierReport(d));
    b('[data-track]')&&(b('[data-track]').onclick=()=>{close();updateTracking(d)});
    b('[data-pl]').onclick=()=>saveFile(d.no+'-packing.html',`<!doctype html><meta charset="utf-8"><title>${esc(d.no)}</title><style>body{font-family:Arial;margin:30px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:5px}</style><h2>${esc(SET.company.name)} — Packing list ${esc(d.no)}</h2><p>Order ${esc(o?.no||'')} · ${esc(custName(o?.customer))} · ${esc(d.date)}</p><p style="white-space:pre-line">${esc(d.address||'')}</p><table><tr><th>#</th><th>Item</th><th>Purity</th><th>Qty</th></tr>${(d.lines||[]).map(l=>`<tr><td>${l.line+1}</td><td>${esc(l.desc)}</td><td>${esc(l.purity)}</td><td>${esc(l.qty)}</td></tr>`).join('')}</table><p>Packages: ${esc(d.packages)} · Weight ${esc(d.weight)} g · ${esc(d.courier||'')} ${esc(d.tracking||'')}</p>`,'text/html');
    b('[data-f]')&&(b('[data-f]').onclick=()=>pickFiles(async f=>{close();const s=await save('dispatches',{...d,files:[...(d.files||[]),...f]},{action:'proof'});dispatchView(s)}));
    const st=(s,extra={})=>async()=>{close();await save('dispatches',{...d,...extra,status:s},{action:s})};
    b('[data-it]')&&(b('[data-it]').onclick=st('In Transit'));b('[data-dv]')&&(b('[data-dv]').onclick=async()=>{await st('Delivered',{deliveredAt:nowISO()})();const ds=S.dispatches.filter(x=>x.order===d.order);if(o&&o.lines.every((l,i)=>dispatchedQty(o.id,i)>=num(l.qty||1))&&ds.every(x=>x.status==='Delivered'||x.id===d.id))await save('orders',{...o,status:'Delivered',history:[...(o.history||[]),{ts:nowISO(),by:ME.id,from:o.status,to:'Delivered',note:d.no}]},{silent:1,action:'status'})});
    b('[data-rt]')&&(b('[data-rt]').onclick=()=>{close();askReason('Delivery failed / returned','What happened?',r=>save('dispatches',{...d,status:'Delivery Failed / Returned',returnReason:r},{action:'returned',reason:r}))});
    b('[data-go]')&&(b('[data-go]').onclick=async()=>{if(!d.tracking&&d.courier!=='Hand delivery'){toast('Tracking number is required.',true);return}
      if((d.lines||[]).some(l=>!lineQCState(d.order,l.line).ok)){toast('An item lost its QC release. Re-inspect first.',true);return}
      close();await save('dispatches',{...d,status:'Dispatched',shippedBy:ME.id,shippedAt:nowISO()},{action:'dispatch'});
      for(const l of d.lines||[]){const fg=S.vouchers.filter(v=>v.vtype==='Finished goods receipt'&&v.order===d.order&&byId('jobs',v.job)&&num(byId('jobs',v.job).line)===num(l.line));const tot=fg.reduce((s,v)=>s+num(v.net),0),pcs=fg.reduce((s,v)=>s+num(v.pcs),0)||1;const pur=fg[0]?.purity||l.purity;const net=r3(tot/pcs*num(l.qty));
        await save('vouchers',{date:today(),vtype:'Dispatch',category:'Finished Goods',purity:pur,desc:l.desc,net,gross:net,fine:fineOf(net,pur),pcs:l.qty,order:d.order,location:'Dispatch Desk',status:'Approved',note:d.no},{silent:1})}
      const oo=orderOf(d.order);if(oo){const lines=JSON.parse(JSON.stringify(oo.lines));lines.forEach((L,i)=>{const dq=dispatchedQty(oo.id,i);L.status=dq>=num(L.qty||1)?'Dispatched':dq>0?'Partially Dispatched':L.status});const all=lines.every(L=>L.status==='Dispatched');const ns=all?'Dispatched':'Partially Dispatched';await save('orders',{...oo,lines,status:ns,history:[...(oo.history||[]),{ts:nowISO(),by:ME.id,from:oo.status,to:ns,note:d.no+' '+(d.courier||'')+' '+(d.tracking||'')}]},{silent:1,action:'status'})}})}})}

/* ============ ACCOUNTS (brief §12) ============ */
const ACC_F={
 invoices:[{k:'customer',l:'Customer',t:'ref',o:refOpts('customers'),req:1,w:2},{k:'order',l:'Order',t:'ref',o:refOpts('orders',o=>o.no+' · '+custName(o.customer))},{k:'date',l:'Invoice date',t:'date',req:1,d:today()},{k:'amount',l:'Taxable amount',t:'num',req:1},{k:'taxPct',l:'GST %',t:'num',d:3},{k:'tax',l:'Tax',ro:1,calc:v=>r2(num(v.amount)*num(v.taxPct)/100)},{k:'total',l:'Invoice total',ro:1,calc:v=>r2(num(v.amount)*(1+num(v.taxPct)/100))},{k:'dueDate',l:'Due date',t:'date'},{k:'currency',l:'Currency',t:'sel',o:['INR','USD','EUR','GBP','AED']},{k:'notes',l:'Notes',t:'ta',w:2}],
 receipts:[{k:'customer',l:'Customer',t:'ref',o:refOpts('customers'),req:1,w:2},{k:'invoice',l:'Against invoice',t:'ref',o:refOpts('invoices',i=>i.no+' · '+money(i.total))},{k:'date',l:'Date',t:'date',req:1,d:today()},{k:'amount',l:'Amount received',t:'num',req:1},{k:'mode',l:'Mode',t:'sel',o:['Bank transfer','UPI','Card','Cash','Cheque','Wise','PayPal','Shopify Payments','Etsy payout'],req:1},{k:'ref',l:'Reference / UTR'},{k:'notes',l:'Notes',t:'ta',w:2}],
 bills:[{k:'supplier',l:'Supplier',t:'ref',o:refOpts('suppliers'),req:1,w:2},{k:'po',l:'Purchase order',t:'ref',o:refOpts('pos',p=>p.no)},{k:'billNo',l:'Supplier bill no.',req:1},{k:'date',l:'Bill date',t:'date',req:1,d:today()},{k:'amount',l:'Taxable amount',t:'num',req:1},{k:'taxPct',l:'GST %',t:'num',d:3},{k:'total',l:'Bill total',ro:1,calc:v=>r2(num(v.amount)*(1+num(v.taxPct)/100))},{k:'dueDate',l:'Due date',t:'date'},{k:'notes',l:'Notes',t:'ta',w:4}],
 payments:[{k:'supplier',l:'Supplier',t:'ref',o:refOpts('suppliers'),req:1,w:2},{k:'bill',l:'Against bill',t:'ref',o:refOpts('bills',b=>b.no+' · '+(b.billNo||'')+' · '+money(b.total))},{k:'date',l:'Date',t:'date',req:1,d:today()},{k:'amount',l:'Amount paid',t:'num',req:1},{k:'mode',l:'Mode',t:'sel',o:['Bank transfer','UPI','Cash','Cheque','Wise'],req:1},{k:'ref',l:'Reference'},{k:'notes',l:'Notes',t:'ta',w:2}],
 expenses:[{k:'date',l:'Date',t:'date',req:1,d:today()},{k:'category',l:'Category',t:'sel',o:()=>SET.expenseCats,req:1},{k:'amount',l:'Amount',t:'num',req:1},{k:'mode',l:'Paid via',t:'sel',o:['Cash','Bank transfer','UPI','Card']},{k:'paidTo',l:'Paid to',w:2},{k:'order',l:'Order (for costing)',t:'ref',o:refOpts('orders',o=>o.no)},{k:'karigar',l:'Karigar',t:'ref',o:refOpts('karigars')},{k:'notes',l:'Notes',t:'ta',w:4}]};
function accForm(c,x){openForm({title:x&&x.id?`Edit ${x.no}`:'New '+({invoices:'sales invoice',receipts:'customer receipt',bills:'supplier bill',payments:'supplier payment',expenses:'expense'}[c]),fields:ACC_F[c],value:x||{},wide:1,async onSave(v){
  ['tax','total'].forEach(k=>{const f=ACC_F[c].find(f=>f.k===k);if(f&&f.calc)v[k]=f.calc(v)});
  if(c==='receipts'&&v.invoice){const inv=byId('invoices',v.invoice);if(inv&&inv.customer!==v.customer){toast('That invoice belongs to another customer.',true);return false}if(inv&&num(v.amount)>num(inv.total)-invPaid(inv)+(x&&x.id?num(x.amount):0)+0.5)toast('Note: amount is more than the invoice balance — the extra stays as advance.',true)}
  if(x&&x.id&&!can('accounts','approve')){toast('Only an approver can edit posted accounting entries.',true);return false}
  await save(c,v,{reason:x&&x.id?'edit':''})}})}
const INCOME_CATS=['Sales (ivevar.com)','Sales (ivevar.in)','Sales (Etsy)','Sales (other)','Customer advance','Opening balance','Other income'];
/* ---- Bank & cash accounts (user-managed, Vyapar-style: many banks + cash) ---- */
const ACCT_CURS=['INR','USD','USDT','BTC','ETH','AUD','GBP','EUR','CAD','AED'];
const BANK_ACCTS=()=>(Array.isArray(SET.bankAccounts)&&SET.bankAccounts.length?SET.bankAccounts:(SET.cashAccounts||['Cash','Bank']).map(n=>({name:n,type:/cash/i.test(n)?'Cash':'Bank',currency:'INR'})));
const cashAccts=()=>BANK_ACCTS().map(a=>a.name);
const acctOf=n=>BANK_ACCTS().find(a=>a.name===n)||{name:n,type:'Bank',currency:'INR'};
const acctCur=n=>acctOf(n).currency||'INR';
const acctBal=n=>curSym(acctCur(n))+' '+num(cashBal(n)).toLocaleString('en-IN',{maximumFractionDigits:0});
/* balances / money-flows grouped by currency, e.g. {INR:450000, USD:12000} */
function balGroup(){const g={};BANK_ACCTS().forEach(a=>{const c=a.currency||'INR';g[c]=(g[c]||0)+cashBal(a.name)});return g}
function flowGroup(month,type){const g={};S.cash.forEach(e=>{if(type==='Income'&&(e.type!=='Income'||e.category==='Opening balance'))return;if(type==='Expense'&&e.type!=='Expense')return;if(month&&!(e.date||'').startsWith(month))return;const c=acctCur(e.account);g[c]=(g[c]||0)+num(e.amount)});return g}
const fxOf=c=>c==='INR'?1:(num(SET.fxRates&&SET.fxRates[c])||usdRate());
const fmtGroup=g=>{const ks=Object.keys(g).filter(c=>Math.abs(g[c])>0.5||c==='INR').sort((a,b)=>a==='INR'?-1:b==='INR'?1:a.localeCompare(b));return (ks.length?ks:['INR']).map(c=>curSym(c)+' '+num(g[c]||0).toLocaleString('en-IN',{maximumFractionDigits:0})).join('  ·  ')};
const combineINR=g=>Object.keys(g).reduce((t,c)=>t+num(g[c])*fxOf(c),0);
const isMultiCur=()=>Object.keys(balGroup()).some(c=>c!=='INR');
function balByCur(){return fmtGroup(balGroup())}
/* USD & crypto → ₹ rates. Auto-updated from live market every morning; manual override here. */
function acctRateForm(){
  const fx=SET.fxRates||{};const upd=SET.ratesAt?new Date(SET.ratesAt):null;
  const strip=`<div class="note" style="margin-bottom:8px">${upd?'Live · updated '+upd.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Not fetched yet'}: <b>$1 = ₹${fq(usdRate())}</b>${fx.USDT?` · USDT ₹${fq(fx.USDT)}`:''}${fx.BTC?` · BTC ₹${fq(fx.BTC)}`:''}${fx.ETH?` · ETH ₹${fq(fx.ETH)}`:''}</div><div style="margin-bottom:10px"><button type="button" class="btn sm" onclick="refreshRatesNow()">↻ Refresh from live market now</button></div>`;
  openForm({title:'Conversion rates',sub:'Dollar & crypto → ₹. Har subah live market rate apne aap aata hai; yahan manual bhi set kar sakte ho.',extra:strip,
   value:{auto:SET.ratesAuto!==false,usd:usdRate(),usdt:num(fx.USDT)||'',btc:num(fx.BTC)||'',eth:num(fx.ETH)||''},fields:[
   {k:'auto',l:'Auto-update every morning (live market rate)',t:'bool',d:true},
   {k:'usd',l:'1 USD = ₹',t:'num',req:1},{k:'usdt',l:'1 USDT = ₹',t:'num'},{k:'btc',l:'1 BTC = ₹',t:'num'},{k:'eth',l:'1 ETH = ₹',t:'num'}],
   async onSave(v){const r=num(v.usd)||usdRate();const fxN={...(SET.fxRates||{}),USD:r,INR:1};if(num(v.usdt))fxN.USDT=num(v.usdt);if(num(v.btc))fxN.BTC=num(v.btc);if(num(v.eth))fxN.ETH=num(v.eth);await saveSettings({usdInr:r,fxRates:fxN,ratesAuto:!!v.auto},'conversion rates')}})}
function cashSigned(e,acct){if(e.type==='Transfer')return acct?(e.to===acct?num(e.amount):e.account===acct?-num(e.amount):0):0;const v=num(e.amount);return e.type==='Income'?v:-v}
function cashBal(acct){return S.cash.filter(e=>!acct||e.account===acct||e.to===acct).reduce((t,e)=>t+cashSigned(e,acct),0)}
let CASH_M=today().slice(0,7),CASH_A='';
function cashForm(type,x){
  const isT=type==='Transfer';
  const isE=type==='Entry';
  const fields=isT?[{k:'date',l:'Date',t:'date',req:1,d:today()},{k:'amount',l:'Amount',t:'num',req:1},{k:'account',l:'From',t:'sel',o:cashAccts,req:1},{k:'to',l:'To',t:'sel',o:cashAccts,req:1},{k:'note',l:'Note',w:4}]
   :isE?[{k:'io',l:'Type',t:'sel',o:['Money in','Money out'],req:1,d:'Money in'},{k:'date',l:'Date',t:'date',req:1,d:today()},{k:'amount',l:'Amount',t:'num',req:1},{k:'account',l:'Account',t:'sel',o:cashAccts,req:1,d:'Cash'},
     {k:'category',l:'Category',list:()=>[...INCOME_CATS,...(SET.expenseCats||[])],req:1,hint:'Pick or type a category'},{k:'party',l:'Party (received from / paid to)',w:2},{k:'order',l:'Order (optional)',t:'ref',o:refOpts('orders',o=>o.no+' · '+custName(o.customer))},{k:'ref',l:'Reference / UTR'},{k:'note',l:'Note',t:'ta',w:4}]
   :[{k:'date',l:'Date',t:'date',req:1,d:today()},{k:'amount',l:'Amount ('+SET.currency+')',t:'num',req:1},{k:'category',l:'Category',t:'sel',o:()=>type==='Income'?INCOME_CATS:SET.expenseCats,req:1},{k:'account',l:type==='Income'?'Received in':'Paid from',t:'sel',o:cashAccts,req:1,d:'Cash'},
     {k:'party',l:type==='Income'?'Received from':'Paid to',w:2},{k:'order',l:'Order (optional)',t:'ref',o:refOpts('orders',o=>o.no+' · '+custName(o.customer))},{k:'ref',l:'Reference / UTR'},{k:'note',l:'Note',t:'ta',w:4}];
  const title=isE?(x&&x.id?'Edit entry':'New entry'):(x&&x.id?'Edit ':'')+({Income:'Money in',Expense:'Money out',Transfer:'Move money between accounts'}[type]);
  openForm({title,fields,value:x||{type:isE?'Income':type,account:'Cash',io:'Money in'},async onSave(v){
    const ty=isE?(v.io==='Money out'?'Expense':'Income'):type;if(isE)delete v.io;
    if(num(v.amount)<=0){toast('Amount must be more than 0.',true);return false}
    if(isT&&v.account===v.to){toast('Pick two different accounts.',true);return false}
    if(!isT&&ty==='Expense'){const bal=cashBal(v.account)+(x&&x.id&&x.account===v.account?num(x.amount):0);if(num(v.amount)>bal+0.5)toast(`Note: ${v.account} balance will go below zero (${money(bal-num(v.amount))}).`,true)}
    await save('cash',{...v,type:ty})}})}
function cashView(e){
  modal({title:`${e.no} · ${e.type==='Income'?'Money in':e.type==='Expense'?'Money out':'Transfer'}`,sub:`${fdate(e.date)} · ${esc(userName(e.createdBy))}`,body:`<dl class="dl"><dt>Amount</dt><dd><b style="color:${e.type==='Income'?'var(--good)':e.type==='Expense'?'var(--bad)':'inherit'}">${money(e.amount)}</b></dd>${e.type==='Transfer'?`<dt>From → To</dt><dd>${esc(e.account)} → ${esc(e.to)}</dd>`:`<dt>Category</dt><dd>${esc(e.category||'')}</dd><dt>${e.type==='Income'?'Received in':'Paid from'}</dt><dd>${esc(e.account||'')}</dd><dt>${e.type==='Income'?'From':'To'}</dt><dd>${esc(e.party||'—')}</dd><dt>Order</dt><dd>${esc(orderOf(e.order)?.no||'—')}</dd><dt>Reference</dt><dd>${esc(e.ref||'—')}</dd>`}<dt>Note</dt><dd>${esc(e.note||'—')}</dd></dl>`,
   foot:can('accounts','approve')?btn('Delete','data-del','dng')+btn('Edit','data-e','pri'):'',
   onMount(ov,close){const b=s=>ov.querySelector(s);b('[data-e]')&&(b('[data-e]').onclick=()=>{close();cashForm(e.type,e)});b('[data-del]')&&(b('[data-del]').onclick=()=>{close();askReason('Delete '+e.no,'Why is this entry being deleted?',r=>remove('cash',e,r))})}})}
function viewAccounts(){
  const tab=TAB.acc||'book';const inM=e=>(e.date||'').startsWith(CASH_M);
  const mIn=S.cash.filter(e=>inM(e)&&e.type==='Income'&&e.category!=='Opening balance').reduce((t,e)=>t+num(e.amount),0),mOut=S.cash.filter(e=>inM(e)&&e.type==='Expense').reduce((t,e)=>t+num(e.amount),0);
  const kp=(v,l,c='')=>`<div class="card kpi ${c}"><span class="v">${v}</span><span class="l">${esc(l)}</span></div>`;
  const gBal=balGroup(),gIn=flowGroup(CASH_M,'Income'),gOut=flowGroup(CASH_M,'Expense');
  const gNet={};[...new Set([...Object.keys(gIn),...Object.keys(gOut)])].forEach(c=>gNet[c]=(gIn[c]||0)-(gOut[c]||0));
  const multi=isMultiCur();const rate=usdRate();
  const sub=g=>multi?`<div class="note" style="font-size:10px;font-weight:600;margin-top:2px">≈ ${money(combineINR(g))} @ ₹${fq(rate)}/$</div>`:'';
  const tiles=`<div class="grid g4" style="margin-bottom:12px">${kp(fmtGroup(gBal)+sub(gBal),'Total balance','gold')}${kp('<span style="color:var(--good)">'+fmtGroup(gIn)+'</span>'+sub(gIn),'Money in · '+CASH_M)}${kp('<span style="color:var(--bad)">'+fmtGroup(gOut)+'</span>'+sub(gOut),'Money out · '+CASH_M)}${kp(fmtGroup(gNet)+sub(gNet),'Net · '+CASH_M,combineINR(gNet)<-0.5?'alert':'')}</div>
   <div class="grid g4" style="margin-bottom:14px">${BANK_ACCTS().map(a=>`<div class="card kpi ${cashBal(a.name)<-0.5?'alert':''}"><span class="v" style="font-size:15px">${acctBal(a.name)}</span><span class="l">${esc(a.name)} · ${esc(a.type)}</span></div>`).join('')}</div>`;
  const tools=`<div class="tools"><input type="month" value="${CASH_M}" onchange="CASH_M=this.value;render()"><select onchange="CASH_A=this.value;render()"><option value="">All accounts</option>${cashAccts().map(a=>`<option ${CASH_A===a?'selected':''}>${esc(a)}</option>`).join('')}</select>${filterBar('cash').replace('<div class="tools">','').replace(/<\/div>$/,'')}</div>`;
  let body='';
  if(tab==='book'){
    // running balance: everything before this month is the opening balance
    const all=S.cash.filter(e=>!CASH_A||e.account===CASH_A||e.to===CASH_A).sort((a,b)=>((a.date||'')+(a.createdAt||'')).localeCompare((b.date||'')+(b.createdAt||'')));
    let run=all.filter(e=>(e.date||'')<CASH_M+'-01').reduce((t,e)=>t+cashSigned(e,CASH_A),0);const opening=run;
    const rows=applyFil('cash',all.filter(inM)).map(e=>{const v=cashSigned(e,CASH_A);run+=v;return{...e,_in:v>0?v:0,_out:v<0?-v:0,_bal:run}});
    body=`<div class="note" style="margin-bottom:8px">Opening balance on 1st: <b>${money(opening)}</b> · Closing: <b>${money(run)}</b></div>`+table([{l:'Date',h:r=>fdate(r.date)},{l:'No.',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Details',h:r=>r.type==='Transfer'?`Transfer ${esc(r.account)} → ${esc(r.to)}`:`<b>${esc(r.category||'')}</b>${r.party?' · '+esc(r.party):''}${r.note?`<div class="note">${esc(r.note)}</div>`:''}`},{l:'Account',h:r=>esc(r.type==='Transfer'?'':r.account)},{l:'Money in',n:1,h:r=>r._in?`<span style="color:var(--good)">${money(r._in)}</span>`:''},{l:'Money out',n:1,h:r=>r._out?`<span style="color:var(--bad)">${money(r._out)}</span>`:''},{l:'Balance',n:1,h:r=>`<b>${money(r._bal)}</b>`}],rows.reverse(),{onClick:cashView,empty:'No entries this month',emptyHint:'Start with “+ Money in” → category “Opening balance” for the cash you have today.'})}
  else if(tab==='in'||tab==='out'){const ty=tab==='in'?'Income':'Expense';const rows=applyFil('cash',S.cash.filter(e=>e.type===ty&&inM(e)&&(!CASH_A||e.account===CASH_A))).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const byCat={};rows.forEach(e=>byCat[e.category||'—']=(byCat[e.category||'—']||0)+num(e.amount));
    body=`<div class="grid g2"><div>${table([{l:'Date',h:r=>fdate(r.date)},{l:'Category',k:'category'},{l:ty==='Income'?'From':'To',k:'party'},{l:'Account',k:'account'},{l:'Amount',n:1,h:r=>money(r.amount)}],rows,{onClick:cashView,empty:'Nothing this month'})}</div><div class="card"><h2>By category · ${CASH_M}</h2>${Object.keys(byCat).length?hbars(Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l,v,f:money}))):'<div class="empty">—</div>'}</div></div>`}
  else{const months=[...new Set(S.cash.map(e=>(e.date||'').slice(0,7)).filter(Boolean))].sort().reverse().slice(0,12);
    body=table([{l:'Month',k:'m'},{l:'Money in',n:1,h:r=>`<span style="color:var(--good)">${money(r.i)}</span>`},{l:'Money out',n:1,h:r=>`<span style="color:var(--bad)">${money(r.o)}</span>`},{l:'Net',n:1,h:r=>`<b style="color:${r.i-r.o<0?'var(--bad)':'var(--good)'}">${money(r.i-r.o)}</b>`}],months.map(m=>{const x=S.cash.filter(e=>(e.date||'').startsWith(m));return{m,i:x.filter(e=>e.type==='Income'&&e.category!=='Opening balance').reduce((t,e)=>t+num(e.amount),0),o:x.filter(e=>e.type==='Expense').reduce((t,e)=>t+num(e.amount),0)}}),{empty:'No entries yet'})+`<div class="note" style="margin-top:8px">Opening balance entries are not counted as income here.</div>`}
  const acts=can('accounts','edit')?btn(ic('building')+' Accounts','onclick="accountsManager()"')+btn(ic('swap')+' Rate ₹'+fq(rate)+'/$','onclick="acctRateForm()"')+btn('⇄ Transfer',`onclick="cashForm('Transfer')"`)+btn('+ Entry',`onclick="cashForm('Entry')"`,'pri'):'';
  return phead('Accounts','Money in, money out and your cash / bank balance.',acts)+tiles+tabsHTML('acc',[['book','Cash book'],['in','Income'],['out','Expenses'],['sum','Monthly summary']],tab)+(tab!=='sum'?tools:'')+body}

/* ---- Accounts manager: add/edit/remove bank & cash accounts ---- */
function accountsManager(){
  const list=BANK_ACCTS();
  const rows=list.map(a=>`<tr><td><b>${esc(a.name)}</b>${a.bank||a.number?`<div class="note">${esc([a.bank,a.number].filter(Boolean).join(' · '))}</div>`:''}</td><td>${stPill(a.type||'Bank')}</td><td>${esc(a.currency||'INR')}</td><td class="num"><b>${acctBal(a.name)}</b></td><td>${can('accounts','edit')?`<button class="btn sm" data-edit="${esc(a.name)}">Edit</button> <button class="btn sm" data-del="${esc(a.name)}">Remove</button>`:''}</td></tr>`).join('');
  modal({title:'Bank & cash accounts',sub:'Add every bank and cash account you use — balances, money in / out and transfers calculate automatically.',wide:1,
    body:`<div class="tw"><table><thead><tr><th>Account</th><th>Type</th><th>Currency</th><th class="num">Balance</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="note">No accounts yet — add your banks and cash.</td></tr>'}</tbody></table></div>`,
    foot:(can('accounts','edit')?`<button class="btn pri" data-add>+ Add account</button>`:'')+`<button class="btn" data-close>Close</button>`,
    onMount(ov,close){
      const add=ov.querySelector('[data-add]');add&&(add.onclick=()=>{close();accountForm()});
      ov.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const n=b.getAttribute('data-edit');close();accountForm(acctOf(n))});
      ov.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const n=b.getAttribute('data-del');close();delAccount(n)});
    }})}
function accountForm(a){
  const isNew=!a;const prev=a?a.name:'';
  openForm({title:isNew?'Add account':`Edit ${a.name}`,pro:1,value:a||{type:'Bank',currency:'INR'},fields:[
   {k:'h1',t:'hr',l:'Account',icon:ic('building')},
   {k:'name',l:'Account name',req:1,w:2,ro:!isNew,hint:isNew?'e.g. HDFC Bank · US Bank · Cash in hand':'Name is used on every entry and cannot be changed'},
   {k:'type',l:'Type',t:'sel',o:['Bank','Cash','Wallet'],req:1,d:'Bank'},{k:'currency',l:'Currency',t:'sel',o:ACCT_CURS,req:1,d:'INR'},
   {k:'h2',t:'hr',l:'Details (optional)',icon:ic('clipboard')},
   {k:'bank',l:'Bank name'},{k:'number',l:'Account number'},
   {k:'opening',l:'Opening balance',t:'num',hint:isNew?'Balance in this account today (optional)':'Add/adjust later with a money-in / money-out entry'}],
   async onSave(v){
     const list=BANK_ACCTS().map(x=>({...x}));
     const rec={name:isNew?String(v.name||'').trim():prev,type:v.type||'Bank',currency:v.currency||'INR',bank:(v.bank||'').trim(),number:(v.number||'').trim()};
     if(!rec.name){toast('Enter an account name.',true);return false}
     if(isNew&&list.some(x=>(x.name||'').toLowerCase()===rec.name.toLowerCase())){toast('An account with that name already exists.',true);return false}
     const i=list.findIndex(x=>x.name===prev);if(i>=0)list[i]=rec;else list.push(rec);
     await saveSettings({bankAccounts:list,cashAccounts:list.map(x=>x.name)},isNew?'add account':'edit account');
     if(isNew&&num(v.opening)>0){try{await save('cash',{type:'Income',category:'Opening balance',account:rec.name,amount:num(v.opening),date:today(),note:'Opening balance'},{silent:1})}catch(e){}}
     accountsManager();
   }})}
function delAccount(name){
  if(S.cash.some(e=>e.account===name||e.to===name)){toast('This account has entries — it can’t be removed. Rename or keep it.',true);accountsManager();return}
  confirmBox('Remove account',`Remove “${esc(name)}”? This only removes the empty account.`,async()=>{const list=BANK_ACCTS().filter(x=>x.name!==name);await saveSettings({bankAccounts:list,cashAccounts:list.map(x=>x.name)},'remove account');accountsManager()},'Remove')}

/* ============ HR & PAYROLL (brief §3.15) ============ */
let ATT_DATE=today(),PAY_MONTH=today().slice(0,7);
function attDoc(d){return S.attendance.find(a=>a.id==='d'+d)||{id:'d'+d,date:d,marks:{}}}
function viewHR(){
  const tab=TAB.hr||'att';let body='';
  if(tab==='emp')body=masterTable('employees');
  else if(tab==='att'){const rows=salaryRows(PAY_MONTH);const d=istDate();
    body=`<div class="tools"><input type="month" value="${PAY_MONTH}" onchange="PAY_MONTH=this.value;render()"><button class="btn sm" onclick="attendanceHistory()">Day-by-day history</button><span class="note">Attendance is marked by staff with a selfie + location. Shift & late rules apply automatically.</span></div>`+
     table([{l:'Staff',k:'name'},{l:'Role',k:'role'},{l:'Shift',h:r=>esc(r.shift||'—')},{l:'Present days',n:1,k:'P'},{l:'Half days',n:1,k:'H'},{l:'Total hours',n:1,h:r=>fh(r.hrs)},{l:'Today',h:r=>{const p=S.punch.find(x=>x.user===r.id&&x.date===d);const s=p?attStatus(p,r.id):{label:'Not marked'};return `<span class="pill ${p?(s.code==='P'?'good':'warn'):''}">${esc(s.label)}</span>`}}],rows,{empty:'No staff / attendance yet'})}
  else if(tab==='pay'){const rows=salaryRows(PAY_MONTH);const [y,mm]=PAY_MONTH.split('-').map(Number);const days=new Date(y,mm,0).getDate();
    body=`<div class="tools"><input type="month" value="${PAY_MONTH}" onchange="PAY_MONTH=this.value;render()"><span class="note">Salary = monthly ÷ ${days} days × (present + ½ half-days), from selfie attendance. Confirm your payroll rules.</span>${can('reports','view')?`<button class="btn sm pri" onclick="exportXLS('Salary '+PAY_MONTH,window._R?window._R.find(r=>r[1]==='attsal')[2]:[],salaryRows(PAY_MONTH))">Excel</button>`:''}</div>`+
     table([{l:'Staff',h:r=>esc(r.name)+'<div class="note">'+esc(r.role)+'</div>'},{l:'Monthly',n:1,h:r=>money(r.salary)},{l:'Present',n:1,k:'P'},{l:'Half',n:1,k:'H'},{l:'Paid days',n:1,h:r=>fq(r.paidDays)},{l:'Payable',n:1,h:r=>`<b>${money(r.payable)}</b>`},{l:'',h:r=>{const done=S.cash.find(x=>x.category==='Wages (in-house)'&&x.employee===r.id&&x.month===PAY_MONTH);return done?stPill('Paid'):can('hr','approve')?`<button class="btn sm" onclick="payUserSalary('${r.id}',${r.payable})">Record paid</button>`:''}}],rows,{empty:'No staff'})}
  return phead('HR & Payroll','Staff attendance (selfie + GPS) and monthly salary. Add/edit staff and their shift & salary in Setup → Users.',tab==='emp'&&can('hr','edit')?btn('+ Other staff',`onclick="masterForm('employees')"`,'pri'):'')+tabsHTML('hr',[['att','Attendance'],['pay','Payroll'],['emp','Other staff / karigars']],tab)+body}
async function markAtt(emp,s){const a=attDoc(ATT_DATE);await save('attendance',{...a,marks:{...(a.marks||{}),[emp]:s}},{silent:1})}
async function markAll(){const a=attDoc(ATT_DATE);const m={...(a.marks||{})};S.employees.filter(e=>e.status!=='Inactive'&&!m[e.id]).forEach(e=>m[e.id]='P');await save('attendance',{...a,marks:m})}
function payUserSalary(uid,amt){const u=USERS.find(x=>x.id===uid)||{name:''};openForm({title:`Salary ${PAY_MONTH} · ${u.name}`,value:{amount:amt,date:today()},fields:[{k:'amount',l:'Amount (incl. incentives/deductions)',t:'num',req:1},{k:'date',l:'Paid on',t:'date'},{k:'mode',l:'Mode',t:'sel',o:['Bank transfer','Cash']},{k:'notes',l:'Note',w:2}],onSave:v=>save('cash',{...v,type:'Expense',category:'Wages (in-house)',account:v.mode==='Cash'?'Cash':'Bank',employee:uid,month:PAY_MONTH,party:u.name,note:v.notes})})}

/* ============ REPORTS (brief §13) ============ */
function salaryRows(m){const [y,mo]=m.split('-').map(Number);const days=new Date(y,mo,0).getDate();
  return USERS.filter(u=>u.role!=='admin'&&u.active!==false).map(u=>{const ps=S.punch.filter(p=>p.user===u.id&&(p.date||'').startsWith(m));let P=0,H=0,hrs=0;ps.forEach(p=>{const s=attStatus(p,u.id);if(s.code==='P')P++;else if(s.code==='H')H++;hrs+=dayHours(p)});
    const paidDays=P+H*0.5;const sal=num(u.salary);const payable=r2(days?sal/days*paidDays:0);
    return{id:u.id,name:u.name,role:roleLabel(u),shift:u.shift&&u.shift.start?u.shift.start+'–'+u.shift.end:'',P,H,hrs:r2(hrs),salary:sal,payable,days,paidDays}})}
function viewReports(){
  const R=[
   ['Orders','orders',[{l:'Order',k:'no'},{l:'Date',k:'date'},{l:'Customer',x:r=>custName(r.customer)},{l:'Items',x:r=>(r.lines||[]).length},{l:'Due',k:'dueDate'},{l:'Status',k:'status'},{l:'Days late',x:r=>r.dueDate&&!['Dispatched','Delivered','Closed'].includes(r.status)?Math.max(0,-daysTo(r.dueDate)):''}],()=>S.orders],
   ['Production / job cards','jobs',[{l:'Job',k:'no'},{l:'Order',x:r=>orderOf(r.order)?.no},{l:'Product',k:'product'},{l:'Qty',k:'qty'},{l:'Stage',x:r=>(r.route||[])[r.step||0]},{l:'Mode',k:'mode'},{l:'Status',k:'status'},{l:'Planned end',k:'plannedEnd'},{l:'Cycle days',x:r=>r.actualStart&&r.actualEnd?Math.round((new Date(r.actualEnd)-new Date(r.actualStart))/864e5*10)/10:''},{l:'On time',x:r=>r.actualEnd&&r.plannedEnd?(r.actualEnd.slice(0,10)<=r.plannedEnd?'Yes':'No'):''},{l:'Rework',k:'rework'}],()=>S.jobs],
   ['Stock balances','stock',[{l:'Material',k:'category'},{l:'Purity',k:'purity'},{l:'Lot',k:'lot'},{l:'Gross g',x:r=>r3(r.gross)},{l:'Net g',x:r=>r3(r.net)},{l:'Fine g',x:r=>r3(r.fine)},{l:'Pcs',k:'pcs'},{l:'Carat',x:r=>r3(r.carat)},{l:'Value',x:r=>r.purity?r2(r.fine*rateFor(r.purity)):''}],()=>stockBalances()],
   ['Stock voucher ledger','vouchers',[{l:'Voucher',k:'no'},{l:'Date',k:'date'},{l:'Type',k:'vtype'},{l:'Material',k:'category'},{l:'Purity',k:'purity'},{l:'Lot',k:'lot'},{l:'In/Out',x:r=>vSign(r)>0?'IN':'OUT'},{l:'Gross',k:'gross'},{l:'Net',k:'net'},{l:'Fine',k:'fine'},{l:'Pcs',k:'pcs'},{l:'Carat',k:'carat'},{l:'Order',x:r=>orderOf(r.order)?.no},{l:'Job',x:r=>byId('jobs',r.job)?.no},{l:'Status',k:'status'},{l:'Entered by',x:r=>userName(r.createdBy)}],()=>S.vouchers],
   ['Karigar ledger','karigar',[{l:'Challan',k:'no'},{l:'Karigar',x:r=>nameOf('karigars',r.karigar)},{l:'Date',k:'date'},{l:'Issued fine',x:r=>challanCalc(r).issued.fine},{l:'Returned fine',x:r=>r3(challanCalc(r).back.fine)},{l:'Scrap fine',x:r=>r3(challanCalc(r).back.scrapFine)},{l:'Variance',x:r=>challanCalc(r).variance},{l:'Wage',x:r=>karigarWage(r)},{l:'Wage paid',x:r=>r.wagePaid?'Yes':'No'},{l:'Status',k:'status'}],()=>S.challans],
   ['Wastage & recovery','wastage',[{l:'No.',k:'no'},{l:'Date',k:'date'},{l:'Source',k:'source'},{l:'Ref',k:'refNo'},{l:'Responsible',x:r=>nameOf('karigars',r.karigar)||r.dept||r.responsible},{l:'Issued fine',k:'issuedFine'},{l:'Accounted',k:'accountedFine'},{l:'Recovered',k:'recovered'},{l:'Variance',k:'variance'},{l:'Status',k:'status'},{l:'Explanation',k:'explanation'}],()=>S.wastage],
   ['Quality control','qc',[{l:'QC',k:'no'},{l:'Date',k:'date'},{l:'Order',x:r=>orderOf(r.order)?.no},{l:'Item',x:r=>num(r.line)+1},{l:'Result',k:'result'},{l:'Defect',k:'defect'},{l:'Dept / vendor',k:'dept'},{l:'Released',x:r=>r.released?'Yes':'No'},{l:'Inspector',x:r=>userName(r.inspector)}],()=>S.qc],
   ['Dispatch / courier','dispatch',[{l:'No.',k:'no'},{l:'Date',k:'date'},{l:'Order',x:r=>orderOf(r.order)?.no},{l:'Customer',x:r=>custName(orderOf(r.order)?.customer)},{l:'Items',x:r=>(r.lines||[]).reduce((s,l)=>s+num(l.qty),0)},{l:'Courier',k:'courier'},{l:'Agency',k:'agency'},{l:'Tracking',k:'tracking'},{l:'Assistant',k:'courierPerson'},{l:'Track status',x:r=>r.trackStatus||r.status},{l:'Status',k:'status'},{l:'Delivered',x:r=>(r.deliveredAt||'').slice(0,10)}],()=>S.dispatches],
   ['Finished pieces (inventory)','pieces',[{l:'No.',k:'no'},{l:'SKU',k:'sku'},{l:'Name',k:'name'},{l:'Metal',k:'metal'},{l:'Stone',k:'stone'},{l:'Status',k:'status'},{l:'Cost USD',x:r=>r2(r.costUSD)},{l:'Cost INR',x:r=>r2(r.costINR||toINR(r.costUSD,'USD'))},{l:'Price USD',x:r=>r2(r.priceUSD)},{l:'Profit USD',x:r=>r.status==='Sold'?pieceProfit(r):''},{l:'Sold by',x:r=>userName(r.soldBy)},{l:'Sold date',k:'soldDate'}],()=>S.pieces],
   ['Order payments','orderpay',[{l:'Order',x:r=>r._ono},{l:'Customer',x:r=>r._cust},{l:'Date',k:'date'},{l:'Method (mode)',k:'method'},{l:'Amount',x:r=>fcur(r.amount,r.currency||'USD')},{l:'Status',x:r=>r.verified?'Confirmed':'Pending'},{l:'Confirmed by',x:r=>r.verified?userName(r.verifiedBy):'—'},{l:'Final',x:r=>r.final?'Yes':''},{l:'Reference',k:'ref'}],()=>S.orders.flatMap(o=>orderPayments(o).map(p=>({...p,_ono:o.no,_cust:custName(o.customer)})))],
   ['Attendance & salary (this month)','attsal',[{l:'Name',k:'name'},{l:'Role',k:'role'},{l:'Shift',k:'shift'},{l:'Present',k:'P'},{l:'Half days',k:'H'},{l:'Hours',x:r=>r2(r.hrs)},{l:'Monthly salary',x:r=>r.salary},{l:'Paid days',x:r=>r.paidDays},{l:'Payable',x:r=>r.payable}],()=>salaryRows(today().slice(0,7))],
   ['CRM leads','leads',[{l:'Lead',k:'no'},{l:'Date',k:'date'},{l:'Source',k:'source'},{l:'Campaign',k:'campaign'},{l:'Name',k:'name'},{l:'Phone',k:'phone'},{l:'Email',k:'email'},{l:'Category',k:'category'},{l:'Budget',k:'budget'},{l:'Assigned',x:r=>nameOf('employees',r.assignedTo)},{l:'Stage',k:'stage'},{l:'Lost reason',k:'lostReason'}],()=>S.leads],
   ['Order profitability','profit',[{l:'Order',k:'no'},{l:'Date',k:'date'},{l:'Customer',x:r=>custName(r.customer)},{l:'Sales exec',x:r=>userName(orderSeller(r))},{l:'Currency',x:r=>ordCur(r)},{l:'Order value',x:r=>orderSaleRaw(r)},{l:'USD→INR',x:r=>ordRate(r)},{l:'Value INR',x:r=>orderValueINR(r)},{l:'Making INR',x:r=>orderMakingINR(r)},{l:'Courier INR',x:r=>orderCourierINR(r)},{l:'Profit INR',x:r=>orderProfit(r)},{l:'Share '+COMMISSION_PCT()+'% INR',x:r=>orderCommission(r)},{l:'Received INR',x:r=>r2(orderReceived(r))},{l:'Balance INR',x:r=>r2(orderValueINR(r)-orderReceived(r))},{l:'Status',k:'status'}],()=>S.orders.filter(o=>!['Cancelled'].includes(o.status))],
   ['Employee commission (this month)','commission',[{l:'Sales executive',k:'name'},{l:'Orders',k:'orders'},{l:'Profit before marketing (INR)',x:r=>r.profit},{l:'Share '+COMMISSION_PCT()+'% (INR)',x:r=>r.share},{l:'Marketing (INR)',x:r=>r.marketing},{l:'Final payable (INR)',x:r=>r.payable}],()=>commissionRows(today().slice(0,7)+'-01')],
   ['Account balances','acctbal',[{l:'Account',k:'name'},{l:'Type',k:'type'},{l:'Currency',x:r=>r.currency||'INR'},{l:'Balance',x:r=>r._bal},{l:'Balance in INR (@ ₹'+fq(usdRate())+'/$)',x:r=>r._inr}],()=>BANK_ACCTS().map(a=>({...a,_bal:r2(cashBal(a.name)),_inr:r2(cashBal(a.name)*fxOf(a.currency||'INR'))}))],
   ['Cash book','cashbook',[{l:'No.',k:'no'},{l:'Date',k:'date'},{l:'Type',k:'type'},{l:'Category',k:'category'},{l:'Account',k:'account'},{l:'Currency',x:r=>acctCur(r.account)},{l:'To account',k:'to'},{l:'Party',k:'party'},{l:'Amount',k:'amount'},{l:'Amount in INR',x:r=>r2(num(r.amount)*fxOf(acctCur(r.account)))},{l:'Order',x:r=>orderOf(r.order)?.no},{l:'Reference',k:'ref'},{l:'Note',k:'note'},{l:'Entered by',x:r=>userName(r.createdBy)}],()=>S.cash.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''))]];
  const R2=R.filter(r=>!['jobs','karigar','wastage'].includes(r[1]));R.length=0;R.push(...R2);window._R=R;
  return phead('Reports','Download any report as Excel or PDF, or click a report to view it on screen. Every export is logged.','')+`<div class="grid g3">${R.map((r,i)=>`<div class="card repcard" onclick="showReport(${i})" style="cursor:pointer" title="Click to view on screen"><h2>${esc(r[0])}</h2><div class="note" style="margin-bottom:10px">${r[3]().length} rows</div><div onclick="event.stopPropagation()" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" onclick="showReport(${i})">View</button>${can('reports','view')?`<button class="btn sm pri" onclick="exportXLS(_R[${i}][0],_R[${i}][2],_R[${i}][3]())">Excel</button><button class="btn sm" onclick="exportPDF(_R[${i}][0],_R[${i}][2],_R[${i}][3]())">PDF</button><button class="btn sm" onclick="exportCSV(_R[${i}][1],_R[${i}][2],_R[${i}][3]())">CSV</button>`:''}</div></div>`).join('')}</div>`}
function showReport(i){const r=window._R[i];modal({title:r[0],wide:1,body:table(r[2].map(c=>({l:c.l,h:x=>{const v=c.x?c.x(x):x[c.k];return esc(typeof v==='number'?fq(v):v??'')}})),r[3]())})}

/* ============ MASTERS VIEW ============ */
const LIST_KEYS=[['categories','Product categories'],['materials','Materials'],['departments','Departments / processes'],['locations','Stock locations'],['leadSources','Lead sources'],['lostReasons','Lost reasons'],['qcChecks','QC checklist'],['defects','Defect codes'],['expenseCats','Expense categories'],['couriers','Couriers']];
function viewMasters(){
  if(!['customers','suppliers','employees'].includes(TAB.mas))TAB.mas='customers';
  const tab=TAB.mas;let body='';
  if(['customers','suppliers','employees'].includes(tab))body=masterTable(tab);
  else if(tab==='lists')body=`<div class="grid g3">${LIST_KEYS.map(([k,l])=>`<div class="card"><h2>${esc(l)}</h2><textarea data-list="${k}" style="width:100%;min-height:150px;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface2)" ${can('masters','edit')?'':'readonly'}>${esc((SET[k]||[]).join('\n'))}</textarea></div>`).join('')}</div>${can('masters','edit')?`<div style="margin-top:12px"><button class="btn pri" onclick="saveLists()">Save lists</button> <span class="note">One item per line. Renaming an item does not change records already saved.</span></div>`:''}`;
  else if(tab==='pur')body=`<div class="banner warn">Confirm the fine-weight formula, rounding and tolerances with your accountant. Current rule: ${esc(SET.rateNote)}</div><div class="card" style="margin-top:12px"><h2>Purities</h2><textarea id="purTxt" style="width:100%;min-height:180px;font-family:var(--f-num);padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface2)" ${can('setup','approve')?'':'readonly'}>${esc(SET.purities.map(p=>`${p.n} | ${p.p} | ${p.m}`).join('\n'))}</textarea><div class="note">Format: name | purity % | metal</div><h2 style="margin-top:14px">Rates per gram of fine metal (${esc(SET.currency)})</h2><div class="form">${Object.keys(SET.rates).map(m=>`<div class="f"><label>${esc(m)}</label><input type="number" step="any" data-rate="${esc(m)}" value="${esc(SET.rates[m])}" ${can('setup','approve')?'':'readonly'}></div>`).join('')}<div class="f"><label>Expected wastage tolerance %</label><input type="number" step="any" id="wTol" value="${esc(SET.wastageTolPct)}"></div><div class="f"><label>Discount approval limit %</label><input type="number" step="any" id="dLim" value="${esc(SET.discLimitPct)}"></div></div>${can('setup','approve')?`<div style="margin-top:10px"><button class="btn pri" onclick="savePurities()">Save purities & rates</button></div>`:''}</div>`;
  else if(tab==='routes')body=`<div class="note" style="margin-bottom:10px">One route per block: first line is the route name, then one process per line, in order. Leave a blank line between routes. Processes must match the departments list.</div><textarea id="rtTxt" style="width:100%;min-height:360px;padding:10px;border:1px solid var(--line);border-radius:6px;background:var(--surface2);font-family:var(--f-num)" ${can('setup','approve')?'':'readonly'}>${esc(Object.entries(SET.routes).map(([n,s])=>n+'\n'+s.join('\n')).join('\n\n'))}</textarea>${can('setup','approve')?`<div style="margin-top:10px"><button class="btn pri" onclick="saveRoutes()">Save routes</button></div>`:''}`;
  const add={customers:'customers',suppliers:'suppliers',employees:'employees'}[tab];
  return phead('Masters','Customers, suppliers, employees and every list the system uses — nothing is hard-coded.',add&&can('masters','edit')?btn('+ Add',`onclick="masterForm('${add}')"`,'pri'):'')+tabsHTML('mas',[['customers','Customers'],['suppliers','Suppliers'],['employees','Employees']],tab)+body}
function saveLists(){const n={};$$('[data-list]').forEach(t=>n[t.dataset.list]=t.value.split('\n').map(s=>s.trim()).filter(Boolean));saveSettings(n,'lists updated')}
function savePurities(){const p=$('#purTxt').value.split('\n').map(l=>l.split('|').map(s=>s.trim())).filter(a=>a[0]&&a[1]).map(([n,p,m])=>({n,p:num(p),m:m||'Gold'}));if(p.some(x=>x.p<=0||x.p>100)){toast('Purity % must be between 0 and 100.',true);return}const rates={};$$('[data-rate]').forEach(i=>rates[i.dataset.rate]=num(i.value));p.forEach(x=>{if(!(x.m in rates))rates[x.m]=0});askReason('Change purities / rates','Reason (e.g. today\'s gold rate)',r=>saveSettings({purities:p,rates,wastageTolPct:num($('#wTol').value),discLimitPct:num($('#dLim').value)},r))}
function saveRoutes(){const r={};$('#rtTxt').value.split(/\n\s*\n/).forEach(b=>{const l=b.split('\n').map(s=>s.trim()).filter(Boolean);if(l.length>1)r[l[0]]=l.slice(1)});const bad=Object.values(r).flat().filter(s=>!SET.departments.includes(s));if(bad.length){toast('Not in departments list: '+[...new Set(bad)].join(', '),true);return}saveSettings({routes:r},'routes updated')}

/* ============ SETUP & USERS ============ */
function viewSetup(){
  const tab=TAB.set||'users';let body='';
  if(tab==='users'){const eff=r=>r.role==='admin'?null:(r.modules||[]);
    body=table([{l:'Name',k:'name'},{l:'Email (login ID)',k:'email'},{l:'Role',h:r=>`<span class="pill info">${esc(roleLabel(r))}</span>`},{l:'Department',h:r=>esc(r.dept||'—')},{l:'Shift',h:r=>r.shift&&r.shift.start?esc(r.shift.start+'–'+r.shift.end):'—'},{l:'Can open',h:r=>r.role==='admin'?'Everything':esc((eff(r)||[]).filter(m=>!HIDDEN_MODS.includes(m)).map(m=>(MODS.find(x=>x[0]===m)||[0,m])[1]).join(', ')||'Dashboard only')},{l:'Status',h:r=>stPill(r.active?'Active':'Inactive')},{l:'Last login',h:r=>fdt(r.lastLogin)},{l:'',h:r=>can('setup','approve')?`<button class="btn sm" onclick="userForm('${r.id}')">Edit</button>`:''}],USERS,{empty:'No users'})+`<div class="note" style="margin-top:8px">Every person gets their own login (their email) — never share accounts. Deactivating a user blocks login but keeps their history.</div>`}
  else if(tab==='perm'){const P={...defaultPerms(),...(SET.perms||{})};const ed=ME.role==='admin';
    body=`<div class="tw perm"><table><thead><tr><th>Module</th>${Object.keys(ROLES).filter(r=>r!=='admin').map(r=>`<th>${esc(ROLES[r])}</th>`).join('')}</tr></thead><tbody>${MODS.map(([k,l])=>`<tr><td>${esc(l)}</td>${Object.keys(ROLES).filter(r=>r!=='admin').map(r=>`<td><select data-p="${r}|${k}" ${ed?'':'disabled'}>${Object.keys(LV).map(v=>`<option ${(P[r]||{})[k]===v?'selected':''}>${v}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="note" style="margin-top:8px">view = read only · edit = create and change · approve = also approve, release, cancel and correct. Admin always has full access. The server enforces these on every request.</div>${ed?`<div style="margin-top:10px"><button class="btn pri" onclick="savePerms()">Save permissions</button></div>`:''}`}
  else if(tab==='co'){const c=SET.company;body=`<div class="form">${[['name','Company name'],['address','Address'],['gstin','GSTIN'],['phone','Phone'],['email','Email']].map(([k,l])=>`<div class="f w2"><label>${l}</label><input data-co="${k}" value="${esc(c[k]||'')}"></div>`).join('')}<div class="f"><label>Currency symbol</label><input id="curSym" value="${esc(SET.currency)}"></div><div class="f"><label>USD → INR rate</label><input type="number" step="any" id="usdInr" value="${esc(SET.usdInr||88)}"></div><div class="f"><label>Sales commission %</label><input type="number" step="any" id="commPct" value="${esc(SET.commissionPct||25)}"></div></div><h3 style="margin-top:16px">Departments</h3><div class="note" style="margin-bottom:6px">One per line. Assign each staff member to a department in Users.</div><textarea id="deptTxt" style="width:100%;min-height:120px;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--surface2)" ${can('setup','approve')?'':'readonly'}>${esc((SET.staffDepts||[]).join('\n'))}</textarea><h3 style="margin-top:16px">Reference numbering (prefix-YEAR-000001)</h3><div class="form">${Object.entries(SET.numbering).map(([k,v])=>`<div class="f"><label>${esc(k)}</label><input data-num="${k}" value="${esc(v)}"></div>`).join('')}</div>${can('setup','approve')?`<div style="margin-top:12px"><button class="btn pri" onclick="saveCompany()">Save</button></div>`:''}`}
  else{const ig=SET.integrations||{};body=`<div class="grid g2">
   <div class="card"><h2>Website orders (Shopify)</h2><p class="note">New orders from ivevar.com arrive here automatically through a Shopify webhook.</p><button class="btn" onclick="showHook()">Show webhook address</button><div id="hookBox" class="note" style="margin-top:8px;overflow-wrap:anywhere"></div></div>
   <div class="card"><h2>${ic('mail')} Email <span class="pill warn">Connect later</span></h2><p class="note">For sending order updates, QC photos and invoices to customers by email. The feature is built in — add your email provider's details when ready (SendGrid / Resend / SMTP).</p><div class="form"><div class="f w2"><label>From name</label><input data-ig="emailName" value="${esc(ig.emailName||SET.company.name)}" ${can('setup','approve')?'':'readonly'}></div><div class="f w2"><label>From address</label><input data-ig="emailFrom" placeholder="hello@ivevar.com" value="${esc(ig.emailFrom||'')}" ${can('setup','approve')?'':'readonly'}></div><div class="f w4"><label>Provider API key (stored for later)</label><input data-ig="emailKey" type="password" placeholder="Paste when you have a provider" value="${esc(ig.emailKey||'')}" ${can('setup','approve')?'':'readonly'}></div></div><div class="note" style="margin-top:6px">Status: <b>${ig.emailKey?'Key saved — activation pending':'Not connected'}</b></div></div>
   <div class="card"><h2>${ic('chat')} WhatsApp <span class="pill warn">Connect later</span></h2><p class="note">For sending order confirmations, QC photos, tracking and delivery updates on WhatsApp. Built in — add your WhatsApp Business API details when ready.</p><div class="form"><div class="f w2"><label>Business number</label><input data-ig="waNumber" placeholder="+91…" value="${esc(ig.waNumber||'')}" ${can('setup','approve')?'':'readonly'}></div><div class="f w2"><label>Phone number ID</label><input data-ig="waPhoneId" value="${esc(ig.waPhoneId||'')}" ${can('setup','approve')?'':'readonly'}></div><div class="f w4"><label>Access token (stored for later)</label><input data-ig="waToken" type="password" placeholder="Paste when you have the API" value="${esc(ig.waToken||'')}" ${can('setup','approve')?'':'readonly'}></div></div><div class="note" style="margin-top:6px">Status: <b>${ig.waToken?'Token saved — activation pending':'Not connected'}</b></div></div>
   <div class="card"><h2>Backup</h2><p class="note">Cloudflare D1 keeps automatic point-in-time recovery for 30 days. You can also download a full copy of all records at any time.</p><button class="btn" onclick="backup()">Download full backup (JSON)</button></div>
   <div class="card"><h2>Languages</h2><p class="note">Menu and buttons switch between English, हिंदी and ગુજરાતી from the top bar. Changing language never alters saved data.</p></div>
   <div class="card"><h2>Security</h2><p class="note">Passwords are hashed (PBKDF2), sessions expire after 7 days of inactivity, every request is permission-checked on the server, and every change is written to the audit log.</p></div></div>
   ${can('setup','approve')?`<div style="margin-top:12px"><button class="btn pri" onclick="saveIntegrations()">Save email & WhatsApp settings</button> <span class="note">Keys are stored now and used once the connectors are switched on.</span></div>`:''}`;}
  return phead('Staff & Users','Add staff, set their role, department, shift, salary and login. Manage company settings, email/WhatsApp and backup.',tab==='users'&&can('setup','approve')?btn('+ Add user','onclick="userForm()"','pri'):'')+tabsHTML('set',[['users','Users'],['co','Company & departments'],['sys','Backup & system']],tab)+body}
function userForm(id){const u=USERS.find(x=>x.id===id);
  const accNow=u?(u.role==='admin'?'admin':(u.title||'Custom')):'Sales';
  const sh=u&&u.shift||{};
  openForm({title:u?`Edit ${u.name}`:'Add user',wide:1,
   value:u?{...u,acc:accNow,active:u.active?'Active':'Inactive',modules:u.modules||[],shiftStart:sh.start||'',shiftEnd:sh.end||'',salary:u.salary||'',commPct:u.commPct||'',phone:u.phone||'',dept:u.dept||''}:{acc:'Sales',active:'Active',modules:[...TITLE_MODS.Sales]},
   fields:[
    {k:'name',l:'Full name',req:1,w:2},{k:'email',l:'Login email (this is their login ID)',t:'email',req:1,w:2,hint:'They sign in with this email and the password below.'},
    {k:'acc',l:'Role / access',t:'sel',o:[['admin','Super Admin — full control'],...TITLES.map(t=>[t,TITLE_LABEL[t]])],req:1},
    {k:'dept',l:'Department',t:'sel',o:()=>SET.staffDepts||[]},{k:'active',l:'Status',t:'sel',o:['Active','Inactive']},{k:'phone',l:'Phone / WhatsApp',t:'tel'},
    {k:'hrS',l:'Shift & salary',t:'hr'},
    {k:'shiftStart',l:'Shift start',t:'time',hint:'e.g. 09:00'},{k:'shiftEnd',l:'Shift end',t:'time',hint:'Night shift ok, e.g. 23:00–06:00'},{k:'salary',l:'Monthly salary (₹)',t:'num'},{k:'commPct',l:'Sales commission % (0 = salary only)',t:'num',hint:'25 = this person earns 25% profit share on their orders. Leave 0 for salary-only staff.'},
    {k:'modules',l:'Sections this person can open (pick a role to auto-fill — you can still tweak)',t:'chk',w:4,o:()=>MODS.filter(m=>!['dashboard','chat','setup','audit'].includes(m[0])&&!HIDDEN_MODS.includes(m[0])).map(m=>[m[0],m[1]])},
    {k:'password',l:u?'Reset password (leave blank to keep)':'Password',req:!u,w:2,hint:'At least 8 characters. Share email + password privately; they can change it after signing in.'}],
   onChange(cur,form){const box=form.querySelector('[data-k="modules"]');if(!box)return;
     const changed=form._initDone&&cur.acc!==form._lastAcc;
     if(cur.acc==='admin'){box.querySelectorAll('input').forEach(i=>{if(changed)i.checked=true;i.disabled=true})}
     else{box.querySelectorAll('input').forEach(i=>i.disabled=false);if(changed){const pre=TITLE_MODS[cur.acc];if(pre)box.querySelectorAll('input').forEach(i=>i.checked=pre.includes(i.value))}}
     box.closest('.f').style.opacity=cur.acc==='admin'?'.5':'1';form._lastAcc=cur.acc;form._initDone=true},
   async onSave(v){if(v.password&&v.password.length<8){toast('Password must be at least 8 characters.',true);return false}
     const role=v.acc==='admin'?'admin':'office';const title=v.acc==='admin'?'':v.acc;
     const mods=role==='admin'?null:(v.modules||[]);
     if(role==='office'&&!(v.modules||[]).length){toast('Tick at least one section for this person.',true);return false}
     if((v.shiftStart&&!v.shiftEnd)||(!v.shiftStart&&v.shiftEnd)){toast('Enter both shift start and end (or leave both blank).',true);return false}
     try{const r=await api('/api/users',{id:u&&u.id,name:v.name,email:v.email,role,title,active:v.active==='Active',password:v.password||undefined,modules:mods,shiftStart:v.shiftStart||'',shiftEnd:v.shiftEnd||'',salary:v.salary,commPct:v.commPct,phone:v.phone,dept:v.dept||''});USERS=r.users;toast('User saved');render();
       if(!u&&v.password)setTimeout(()=>confirmBox('User created','Share these login details privately:<br><br><b>Login (email):</b> '+esc(v.email)+'<br><b>Password:</b> '+esc(v.password)+'<br><br>They can change the password after signing in.',()=>{},'Done'),200);
     }catch(e){toast(e.message,true);return false}}})}
function savePerms(){const P=JSON.parse(JSON.stringify({...defaultPerms(),...(SET.perms||{})}));$$('[data-p]').forEach(s=>{const [r,k]=s.dataset.p.split('|');P[r]=P[r]||{};P[r][k]=s.value});askReason('Change permissions','Reason for change',r=>saveSettings({perms:P},r))}
function saveCompany(){const c={...SET.company};$$('[data-co]').forEach(i=>c[i.dataset.co]=i.value.trim());const n={...SET.numbering};$$('[data-num]').forEach(i=>n[i.dataset.num]=i.value.trim().toUpperCase()||n[i.dataset.num]);const depts=($('#deptTxt')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);saveSettings({company:c,numbering:n,currency:$('#curSym').value||'₹',usdInr:num($('#usdInr')?.value)||88,commissionPct:num($('#commPct')?.value)||25,staffDepts:depts.length?depts:SET.staffDepts},'company settings')}
async function backup(){try{const j=await api('/api/export');saveFile(`ivevar-erp-backup-${today()}.json`,JSON.stringify(j,null,1),'application/json')}catch(e){toast(e.message,true)}}

/* ============ AUDIT LOG ============ */
let AUD={rows:[],coll:'',loaded:false,q:''};
async function loadAudit(){try{const j=await api('/api/audit?coll='+encodeURIComponent(AUD.coll)+'&q='+encodeURIComponent(AUD.q));AUD.rows=j.rows;AUD.loaded=true;render()}catch(e){toast(e.message,true)}}
function viewAudit(){if(!AUD.loaded){loadAudit();return phead('Audit Log')+'<div class="empty">Loading…</div>'}
  return phead('Audit Log','Immutable history of every change: who, when, old value, new value and reason. Nobody can edit or delete it.',btn('Refresh','onclick="AUD.loaded=false;render()"'))+`<div class="tools"><select onchange="AUD.coll=this.value;AUD.loaded=false;render()"><option value="">All records</option>${[...COLLS,'config','users','reports','auth'].map(c=>`<option ${AUD.coll===c?'selected':''}>${c}</option>`).join('')}</select><input type="search" placeholder="Reference no. e.g. JWL-2026-000004" value="${esc(AUD.q)}" onchange="AUD.q=this.value;AUD.loaded=false;render()"></div>`+
  table([{l:'When',h:r=>fdt(r.ts)},{l:'User',h:r=>esc(r.user_name||userName(r.user_id))},{l:'Record',h:r=>`${esc(r.coll)} <span class="ref">${esc(r.ref_no||'')}</span>`},{l:'Action',h:r=>`<span class="pill">${esc(r.action)}</span>`},{l:'Changes',h:r=>{let c={};try{c=JSON.parse(r.changes||'{}')}catch(e){}const k=Object.keys(c);return k.length?`<details><summary>${k.length} field(s): ${esc(k.slice(0,4).join(', '))}${k.length>4?'…':''}</summary><div class="note" style="max-width:520px;overflow-wrap:anywhere">${k.map(f=>`<div><b>${esc(f)}</b>: ${esc(JSON.stringify(c[f].old)??'')} → ${esc(JSON.stringify(c[f].new)??'')}</div>`).join('')}</div></details>`:''}},{l:'Reason',k:'reason'}],AUD.rows,{empty:'No entries'})}

/* ============ INTERNAL CHAT ============ */
let CHAT_CH='office',CHAT_OPEN=false;
const EMOJIS=['😀','😁','😂','🤣','😊','😍','😎','🤩','😘','😅','🙂','😉','🤔','😐','😴','😇','🥳','😢','😭','😮','😡','👍','👎','👌','🙏','👏','💪','🙌','🤝','👋','✅','❌','⭐','🔥','💯','🎉','❤️','💛','💰','📦','🚚','💎','📸','⏰','✍️','📞','📧','💬','🕐','☕'];
function dmId(other){return 'dm:'+[ME.id,other].sort().join('|')}
function chMsgs(ch){return S.messages.filter(m=>m.channel===ch).sort((a,b)=>(a.at||'').localeCompare(b.at||''))}
function chLastRead(ch){try{return localStorage.getItem('chatrd_'+ch)||''}catch(e){return ''}}
function chMarkRead(ch){try{const ms=chMsgs(ch);localStorage.setItem('chatrd_'+ch,ms.length?ms[ms.length-1].at:nowISO())}catch(e){}}
function chUnread(ch){const rd=chLastRead(ch);return chMsgs(ch).filter(m=>m.from!==ME.id&&(m.at||'')>rd).length}
function chatUnread(){let n=chUnread('office');USERS.forEach(u=>{if(u.id!==ME.id&&u.active!==false)n+=chUnread(dmId(u.id))});return n}
function chName(ch){if(ch==='office')return 'Office group';const o=ch.slice(3).split('|').find(x=>x!==ME.id);return userName(o)}
function chLast(ch){const ms=chMsgs(ch);const m=ms[ms.length-1];return m?{txt:(m.from===ME.id?'You: ':'')+(m.text||'📷 Photo'),at:m.at}:null}
function fchatT(at){if(!at)return '';const d=new Date(at),t=new Date();return d.toDateString()===t.toDateString()?d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
function avtColor(id){const cols=['#e8820c','#2458a6','#1d7447','#b0281f','#8e44ad','#16a085','#c0392b','#2c3e50','#d35400'];let h=0;for(const c of String(id||'?'))h=(h*31+c.charCodeAt(0))>>>0;return cols[h%cols.length]}
function msgBubble(m){const mine=m.from===ME.id;const reacts=m.reactions||{};const rk=Object.keys(reacts).filter(k=>reacts[k]&&reacts[k].length);
  return `<div class="msg ${mine?'me':''}">${!mine&&CHAT_CH==='office'?`<div class="mfrom" style="color:${avtColor(m.from)}">${esc(userName(m.from))}</div>`:''}<div class="bubwrap"><div class="bub">${esc(m.text||'')}<span class="mt">${fchatT(m.at)}</span></div><span class="rxadd" onclick="this.parentNode.querySelector('.rxpick').classList.toggle('show')">☺</span><span class="rxpick">${['👍','❤️','😂','🎉','🙏','✅'].map(e=>`<span onclick="chReact('${m.id}','${e}')">${e}</span>`).join('')}</span></div>${rk.length?`<div class="mreact">${rk.map(k=>`<span class="rx ${reacts[k].includes(ME.id)?'on':''}" onclick="chReact('${m.id}','${k}')">${k} ${reacts[k].length}</span>`).join('')}</div>`:''}</div>`}
function chLi(ch,name,u,grp){const l=chLast(ch);const un=chUnread(ch);
  return `<div class="chli ${CHAT_CH===ch?'on':''}" onclick="chOpen('${ch}')"><div class="avt ${grp?'grp':''}" style="${grp?'':'background:'+avtColor(u.id)}">${grp?'👥':esc((name||'?')[0].toUpperCase())}</div><div class="cli"><div class="clrow"><b>${esc(name)}</b><span class="clt">${l?fchatT(l.at):''}</span></div><div class="clsub"><span>${l?esc(l.txt.slice(0,38)):(grp?'Everyone in the office':esc(roleLabel(u)))}</span>${un?`<span class="unread">${un}</span>`:''}</div></div></div>`}
function chThreadHTML(){const ms=chMsgs(CHAT_CH);const other=CHAT_CH==='office'?null:CHAT_CH.slice(3).split('|').find(x=>x!==ME.id);
  return `<div class="chatmain"><div class="chhead"><button class="btn sm chback" onclick="CHAT_OPEN=false;render()">←</button><div class="avt ${CHAT_CH==='office'?'grp':''}" style="${CHAT_CH==='office'?'':'background:'+avtColor(other)}">${CHAT_CH==='office'?'👥':esc((chName(CHAT_CH)||'?')[0].toUpperCase())}</div><div><b>${esc(chName(CHAT_CH))}</b><div class="note">${CHAT_CH==='office'?USERS.filter(u=>u.active!==false).length+' members':esc(roleLabel(USERS.find(u=>u.id===other)||{}))}</div></div></div>
   <div class="chthread" id="chThread">${ms.length?ms.map(msgBubble).join(''):'<div class="empty" style="margin:auto"><b>No messages yet</b>Say hello 👋</div>'}</div>
   <div class="chcomp"><button class="emo" onclick="document.getElementById('chEmo').classList.toggle('show')">😊</button><div class="emopick" id="chEmo">${EMOJIS.map(e=>`<span onclick="chEmoji('${e}')">${e}</span>`).join('')}</div><textarea id="chIn" rows="1" placeholder="Type a message…" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();chSend()}"></textarea><button class="btn pri send" onclick="chSend()">Send</button></div></div>`}
function viewChat(){const users=USERS.filter(u=>u.id!==ME.id&&u.active!==false);
  const withLast=users.map(u=>({u,ch:dmId(u.id),last:chLast(dmId(u.id))})).sort((a,b)=>((b.last&&b.last.at)||'').localeCompare((a.last&&a.last.at)||''));
  const list=`<div class="chatlist">${chLi('office','Office group',null,true)}<div class="chsec">Staff (private)</div>${withLast.map(x=>chLi(x.ch,x.u.name,x.u,false)).join('')||'<div class="note" style="padding:12px">No other staff yet — add them in Staff & Users.</div>'}</div>`;
  return phead('Chat','Group and private chats with your team.','')+`<div class="chatwrap ${CHAT_OPEN?'showthread':''}">${list}${chThreadHTML()}</div>`}
function chOpen(ch){CHAT_CH=ch;CHAT_OPEN=true;chMarkRead(ch);render()}
function chEmoji(e){const inp=document.getElementById('chIn');if(inp){inp.value+=e;inp.focus()}}
async function chSend(){const inp=document.getElementById('chIn');if(!inp)return;const t=(inp.value||'').trim();if(!t)return;inp.value='';try{await save('messages',{channel:CHAT_CH,text:t},{silent:1});chMarkRead(CHAT_CH)}catch(e){toast(e.message,true)}}
async function chReact(mid,emoji){const m=byId('messages',mid);if(!m)return;const r={...(m.reactions||{})};const s=new Set(r[emoji]||[]);s.has(ME.id)?s.delete(ME.id):s.add(ME.id);r[emoji]=[...s];if(!r[emoji].length)delete r[emoji];try{await save('messages',{...m,reactions:r},{silent:1})}catch(e){}}
function scrollChatBottom(){const el=document.getElementById('chThread');if(el)el.scrollTop=el.scrollHeight;if(ROUTE==='chat')chMarkRead(CHAT_CH)}
setInterval(()=>{if(ROUTE==='chat'&&!document.hidden&&TOKEN)sync()},4000);

/* ============ SETTINGS (appearance, notifications, account) ============ */
function viewSettings(){
  const theme=PREF.get('theme','ivory');const size=PREF.get('size','normal');const on=(k,d)=>PREF.get(k,d)==='1';
  const push='Notification'in window?(Notification.permission==='granted'?'On':Notification.permission==='denied'?'Blocked':'Allow'):'n/a';
  const c=SET.company||{};const digits=(c.phone||'').replace(/[^0-9]/g,'');const site=SET.website||'https://ivevar.com';const admin=can('setup','approve');
  return phead('Settings','App look, notifications, office and your account.','')+`<div class="setwrap">
   <div class="card setcard"><div class="cap2">${ic('palette')} Appearance</div>
    <div class="setrow"><div><b>Theme</b><div class="note">Pick a colour theme for the app</div></div><div class="swatches">${THEMES.map(([id,name,ac,bg])=>`<button class="swatch ${theme===id?'on':''}" onclick="setTheme('${id}')"><span class="sw" style="background:${bg}"><i style="background:${ac}"></i></span>${name}</button>`).join('')}</div></div>
    <div class="setrow"><div><b>Text size</b><div class="note">Make the text bigger across the app</div></div><div class="seg">${[['normal','Normal'],['large','Large'],['larger','Larger']].map(([k,l])=>`<button class="${size===k?'on':''}" onclick="setSizePref('${k}')">${l}</button>`).join('')}</div></div>
    <div class="setrow"><div><b>Language</b><div class="note">Choose your preferred language</div></div><select class="setsel" onchange="LANG=this.value;try{localStorage.setItem('erp_lang',LANG)}catch(e){};render()"><option value="en" ${LANG==='en'?'selected':''}>English</option><option value="hi" ${LANG==='hi'?'selected':''}>हिंदी</option><option value="gu" ${LANG==='gu'?'selected':''}>ગુજરાતી</option></select></div>
   </div>
   <div class="card setcard"><div class="cap2">${ic('bell')} Notifications</div>
    <div class="setrow"><div><b>Sound for new chat messages</b><div class="note">A short sound when a message arrives while the app is open</div></div><label class="swt"><input type="checkbox" ${on('sound','1')?'checked':''} onchange="PREF.set('sound',this.checked?'1':'0');this.checked&&beep()"><span></span></label></div>
    <div class="setrow"><div><b>Vibrate for new messages</b><div class="note">On phones</div></div><label class="swt"><input type="checkbox" ${on('vibrate','1')?'checked':''} onchange="PREF.set('vibrate',this.checked?'1':'0')"><span></span></label></div>
    <div class="setrow"><div><b>Pop-up notifications</b><div class="note">Get an alert when the app is in the background</div></div>${push==='Allow'?`<button class="btn pri" onclick="askPush()">Allow</button>`:`<span class="pill ${push==='On'?'good':'warn'}">${push}</span>`}</div>
   </div>
   <div class="card setcard"><div class="cap2">${ic('chat')} Chat &amp; media</div>
    <div class="setrow"><div><b>Save photos, videos &amp; voice notes</b><div class="note">Tap ⬇ Save under any photo, video or voice message in a chat to download it to your device.</div></div></div>
    <div class="setrow link" onclick="go('chat')"><div><b>Open chat</b><div class="note">Team &amp; customer messages</div></div><span class="chev">›</span></div>
   </div>
   ${admin?`<div class="card setcard"><div class="cap2">${ic('building')} Office</div>
    <div class="setrow link" onclick="companyForm()"><div><b>Company profile</b><div class="note">Name &amp; address on order slips, commission %</div></div><span class="chev">›</span></div>
    <div class="setrow link" onclick="accountsManager()"><div><b>${ic('building')} Bank &amp; cash accounts</b><div class="note">Add your banks and cash accounts — balances &amp; money in/out calculate automatically</div></div><span class="chev">›</span></div>
    <div class="setrow link" onclick="mapsKeyForm()"><div><b>${ic('globe')} Google Maps (Shikari auto-find)</b><div class="note">Places API key — buyers/wholesalers auto-find karne ke liye</div></div><span class="chev">›</span></div>
    <div class="setrow link" onclick="fxForm()"><div><b>${ic('swap')} Currency rates</b><div class="note">Set USD, AUD, GBP… → ₹ (locked onto each new order)</div></div><span class="chev">›</span></div>
    <div class="setrow link" onclick="jewelRatesForm()"><div><b>${ic('gem')} Jewellery rates</b><div class="note">Gold / silver / platinum / diamond rates + labour for the quotation price calculator</div></div><span class="chev">›</span></div>
    <div class="setrow link" onclick="go('setup')"><div><b>Staff &amp; users</b><div class="note">Add team members and set their permissions</div></div><span class="chev">›</span></div>
   </div>`:''}
   <div class="card setcard"><div class="cap2">${ic('user')} Account</div>
    <div class="setrow"><div><b>${esc(ME.name)}</b><div class="note">${esc(ME.email)} · ${esc(roleLabel(ME))}</div></div></div>
    <div class="setrow link" onclick="pwForm()"><div><b>Change password</b></div><span class="chev">›</span></div>
    <div class="setrow link" onclick="logout()"><div><b>Sign out</b><div class="note">Log out of this account</div></div><span class="chev">›</span></div>
   </div>
   <div class="card setcard"><div class="cap2">${ic('smartphone')} App</div>
    <div class="setrow"><div><b>Refresh app</b><div class="note">Load the latest version</div></div><button class="btn" onclick="location.reload(true)">Refresh</button></div>
    <div class="setrow"><div><b>About</b><div class="note">Ivevar Management office software By Ivevar Jewel LLP</div></div></div>
   </div>
   <div class="sethint">Like an app on your phone: browser menu → “Add to Home screen”</div>
   <div class="card setcard"><div class="cap2">${ic('lifebuoy')} Contact / support</div>
    <div class="setrow setcontact"><div><b>${esc(c.name||'')}</b><div class="note">${esc(c.address||'')}</div></div>
     <div class="cbtns">${c.phone?`<a class="btn" href="tel:${esc(c.phone.replace(/\s/g,''))}">${ic('phone')} Call</a>`:''}${digits?`<a class="btn" href="https://wa.me/${digits}" target="_blank" rel="noopener">WhatsApp</a>`:''}${c.email?`<a class="btn" href="mailto:${esc(c.email)}">✉️ Email</a>`:''}<a class="btn" href="${esc(site)}" target="_blank" rel="noopener">🌐 Website</a></div>
    </div>
   </div>
  </div>`}
function companyForm(){const c=SET.company||{};const fx=SET.fxRates||{};const FXC=['USD','AUD','GBP','EUR','CAD','AED','SGD','NZD'];
  const fxFields=FXC.map(cc=>({k:'fx_'+cc,l:cc+' → ₹',t:'num'}));const fxVals={};FXC.forEach(cc=>fxVals['fx_'+cc]=num(fx[cc])||'');
  openForm({title:'Company profile',wide:1,fields:[
  {k:'name',l:'Company name (on order slips)',req:1,w:2},
  {k:'address',l:'Address',t:'ta',w:2},
  {k:'phone',l:'Phone / WhatsApp'},
  {k:'email',l:'Email',t:'email'},
  {k:'website',l:'Website'},
  {k:'commissionPct',l:'Sales commission %',t:'num',d:25},
  {k:'fxHr',l:'Currency → INR rates — you fix these; each new order locks the rate for its currency',t:'hr'},
  ...fxFields
],value:{name:c.name||'',address:c.address||'',phone:c.phone||'',email:c.email||'',website:SET.website||'https://ivevar.com',commissionPct:SET.commissionPct||25,...fxVals},async onSave(v){
  const company={...SET.company,name:(v.name||'').trim(),address:(v.address||'').trim(),phone:(v.phone||'').trim(),email:(v.email||'').trim()};
  const fxRates={...(SET.fxRates||{}),INR:1};FXC.forEach(cc=>{if(num(v['fx_'+cc]))fxRates[cc]=num(v['fx_'+cc])});
  await saveSettings({company,website:(v.website||'').trim(),usdInr:num(v['fx_USD'])||num(SET.usdInr)||88,commissionPct:num(v.commissionPct)||25,fxRates},'company profile');
}})}
function fxForm(){const fx=SET.fxRates||{};const FXC=['USD','AUD','GBP','EUR','CAD','AED','SGD','NZD','CHF','JPY','HKD','ZAR','SAR'];
  openForm({title:'Currency → INR rates',sub:'You set these. Each new order automatically locks the rate for its currency.',wide:1,
   fields:FXC.map(cc=>({k:'fx_'+cc,l:cc+' → ₹',t:'num'})),
   value:Object.fromEntries(FXC.map(cc=>['fx_'+cc,num(fx[cc])||''])),
   async onSave(v){const fxRates={...(SET.fxRates||{}),INR:1};FXC.forEach(cc=>{if(num(v['fx_'+cc]))fxRates[cc]=num(v['fx_'+cc])});await saveSettings({fxRates,usdInr:num(v['fx_USD'])||num(SET.usdInr)||88},'currency rates')}})}
function jewelRatesForm(){const j=JW();
  openForm({title:'Jewellery rates (price calculator)',sub:'All in ₹ unless noted. Used to auto-price quotations across every metal.',wide:1,pro:1,value:j,fields:[
   {k:'hrM',l:'Metal & dollar',t:'hr',icon:ic('coin')},
   {k:'dollar',l:'USD → ₹ (dollar rate)',t:'num'},{k:'gold24',l:'24K Gold / gram (₹)',t:'num'},{k:'silver',l:'Silver / gram (₹)',t:'num'},{k:'platinum',l:'Platinum / gram (₹)',t:'num'},
   {k:'goldLabor',l:'Gold labour / gram (₹)',t:'num'},{k:'platLabor',l:'Platinum labour / gram (₹)',t:'num'},{k:'shipping',l:'Shipping & box (₹)',t:'num'},{k:'profit',l:'Default profit %',t:'num'},
   {k:'hrL',l:'Lab-grown diamond',t:'hr',icon:ic('gem')},
   {k:'labMain',l:'Main diamond rate (₹)',t:'num'},{k:'labSide',l:'Side diamond rate (₹)',t:'num'},{k:'labCompare',l:'Compare-at markup %',t:'num'},
   {k:'hrMo',l:'Moissanite',t:'hr',icon:ic('gem')},
   {k:'moisMain',l:'Main stone rate (₹)',t:'num'},{k:'moisSide',l:'Side stone rate (₹)',t:'num'},{k:'moisCompare',l:'Compare-at markup %',t:'num'}],
   async onSave(v){const jewel={};Object.keys(JW()).forEach(k=>{jewel[k]=num(v[k])});await saveSettings({jewel},'jewellery rates')}})}
function mapsKeyForm(){
  openForm({title:'Google Maps API key',sub:'Shikari auto-find ke liye. Google Cloud Console → "Places API (New)" enable karke API key banao, phir yahan paste karo.',value:{key:SET.mapsKey||''},fields:[
   {k:'key',l:'API key',req:1,w:4,hint:'AIza… se shuru hoti hai'}],
   async onSave(v){await saveSettings({mapsKey:(v.key||'').trim()},'google maps key')}})}
function setTheme(t){PREF.set('theme',t);applyPrefs();render()}
function setSizePref(s){PREF.set('size',s);applyPrefs();render()}
function askPush(){if(!('Notification'in window)){toast('Notifications are not supported here.',true);return}Notification.requestPermission().then(p=>{toast(p==='granted'?'Notifications turned on ✓':'Not allowed');render()})}

/* ============ RENDER & BOOT ============ */
const VIEWS={dashboard:viewDashboard,chat:viewChat,prefs:viewSettings,crm:viewCRM,quotes:viewQuotes,orders:viewOrders,shikari:viewShikari,vendors:viewVendors,buying:viewBuying,designs:viewDesigns,purchase:viewPurchase,inventory:viewInventory,production:viewProduction,karigars:viewKarigars,wastage:viewWastage,qc:viewQC,dispatch:viewDispatch,accounts:viewAccounts,hr:viewHR,reports:viewReports,masters:viewMasters,setup:viewSetup,audit:viewAudit};
function render(){
  if(!TOKEN){renderLogin();return}
  if(!LOADED){return}
  $('#app').hidden=false;$('#loginRoot').hidden=true;
  renderNav();
  $('#who').innerHTML='';
  if(!VIEWS[ROUTE])ROUTE='dashboard';
  if(!can(ROUTE)){const first=MODS.find(m=>can(m[0]));$('#view').innerHTML=first?`<div class="empty"><b>No access to this module</b>Ask an admin if you need it.</div>`:`<div class="empty"><b>No modules assigned</b>Ask an admin to set your role.</div>`;return}
  const y=window.scrollY;$('#view').innerHTML=VIEWS[ROUTE]();window.scrollTo(0,y);if(ROUTE==='chat')setTimeout(scrollChatBottom,30)}
function renderLogin(setup){
  $('#app').hidden=true;const L=$('#loginRoot');L.hidden=false;
  L.innerHTML=`<div class="loginwrap"><div class="loginbox"><div class="loginbrand" style="flex-direction:column;gap:4px"><img class="loginlogo" src="${LOGO}" alt="Ivevar Luxury"><div class="brandsub">Office Management</div></div>
   <div class="note" style="margin:4px 0 16px">${setup?'First-time setup — create the owner (Super Admin) account.':'Sign in with your email and password.'}</div>
   <form id="lf" class="form" style="grid-template-columns:1fr;gap:12px">${setup?'<div class="f"><label>Your name</label><input id="lName" required autocomplete="name" placeholder="e.g. Ankit Koshiya"></div>':''}
   <div class="f"><label>Email (your login ID)</label><input id="lEmail" type="email" required autocomplete="username" placeholder="you@ivevar.com"></div>
   <div class="f"><label>Password ${setup?'(min 8 characters)':''}</label><input id="lPw" type="password" required autocomplete="${setup?'new-password':'current-password'}" placeholder="••••••••"></div>
   <button class="btn pri" type="submit" style="width:100%;padding:12px;font-size:15px">${setup?'Create owner account':'Sign in'}</button>
   <div class="note" id="lErr" style="color:var(--bad)"></div></form>
   <div class="loginfoot">Forgot your password? Ask your admin to reset it.</div></div></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();$('#lErr').textContent='';
    try{const j=await api(setup?'/api/setup':'/api/login',{name:setup?$('#lName').value:undefined,email:$('#lEmail').value.trim(),password:$('#lPw').value},{noAuthRedirect:true});TOKEN=j.token;try{localStorage.setItem('erp_token',TOKEN)}catch(x){}Object.assign(ME,j.user);SINCE=0;LOADED=false;await sync();render()}
    catch(x){$('#lErr').textContent=x.message}}}
async function logout(expired){try{if(!expired&&TOKEN)await api('/api/logout',{},{noAuthRedirect:true})}catch(e){}TOKEN=null;try{localStorage.removeItem('erp_token')}catch(e){}COLLS.forEach(c=>S[c]=[]);LOADED=false;SINCE=0;renderLogin()}
function pwForm(){openForm({title:'Change your password',fields:[{k:'old',l:'Current password',req:1,w:4},{k:'pw',l:'New password (min 8)',req:1,w:4}],value:{},async onSave(v){if(v.pw.length<8){toast('At least 8 characters.',true);return false}try{await api('/api/password',{old:v.old,password:v.pw});toast('Password changed')}catch(e){toast(e.message,true);return false}}})}
try{if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if(window.caches)caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{})}}catch(e){}
/* daily morning auto-refresh of live FX + crypto rates (server also guards against duplicate fetches) */
async function maybeRefreshRates(){try{if(SET.ratesAuto===false)return;if(SET.ratesDate===today())return;const r=await api('/api/rates',{});if(r&&r.settings){SET={...defaultSettings(),...r.settings};scheduleRender()}}catch(e){}}
async function refreshRatesNow(){try{const r=await api('/api/rates',{force:true});if(r&&r.settings){SET={...defaultSettings(),...r.settings};toast('Rates updated from live market ✓');scheduleRender()}else toast('Could not fetch rates right now.',true)}catch(e){toast('Could not fetch rates right now.',true)}}
(async function boot(){
  ROUTE=(location.hash||'#dashboard').slice(1)||'dashboard';
  $('#langSel').value=LANG;
  if(!TOKEN){try{const s=await api('/api/status',null,{noAuthRedirect:true});renderLogin(s.needsSetup)}catch(e){renderLogin();$('#lErr')&&($('#lErr').textContent=e.message)}return}
  await sync();if(LOADED){render();maybeRefreshRates()}else logout(true)})();

async function showHook(){try{const r=await api('/api/shopify/hook');$('#hookBox').innerHTML=`<code>${esc(r.url)}</code><div>Keep this address private.</div>`}catch(e){toast(e.message,true)}}
function saveIntegrations(){const ig={...(SET.integrations||{})};$$('[data-ig]').forEach(i=>ig[i.dataset.ig]=i.value.trim());saveSettings({integrations:ig},'integration settings')}
