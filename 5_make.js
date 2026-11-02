
/* ============ FILE ATTACHMENTS ============ */
const MAX_PHOTOS=15;            // per record (piece / QC / dispatch proof…)
const MAX_FILE_MB=25;
function pickFiles(cb,accept,max){
  const inp=document.createElement('input');inp.type='file';inp.multiple=(max!==1);if(accept)inp.accept=accept;
  inp.onchange=async()=>{let files=[...inp.files];
    if(max!=null&&max<=0){toast('Limit reached — remove some before adding more.',true);return}
    if(max!=null&&files.length>max){toast(`You can add only ${max} more — the first ${max} will be used.`,true);files=files.slice(0,max)}
    const out=[];for(const f of files){
      if(f.size>MAX_FILE_MB*1024*1024){toast(f.name+' is larger than '+MAX_FILE_MB+' MB — skipped.',true);continue}
      try{toast('Uploading '+f.name+'…');const r=await uploadFile(f);out.push({id:r.id,url:r.url,name:f.name,type:r.type||f.type})}catch(e){toast('Could not upload '+f.name+': '+(e.message||e.code),true)}}
    if(out.length)cb(out)};inp.click()}
function filesHTML(arr){if(!arr||!arr.length)return '<span class="note">No files.</span>';
  return `<div class="files">${arr.map(f=>(f.type||'').startsWith('image/')?`<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt="${esc(f.name)}">${esc(f.name)}</a>`:`<a href="${esc(f.url)}" target="_blank" rel="noopener"><div style="width:110px;height:84px;display:grid;place-items:center;border:1px solid var(--line);border-radius:6px;background:var(--surface2);font-family:var(--f-num)">${esc((f.name.split('.').pop()||'FILE').toUpperCase())}</div>${esc(f.name)}</a>`).join('')}</div>`}

/* ============ DESIGNS (brief §6) ============ */
function viewDesigns(){
  const rows=applyFil('designs',S.designs).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  return phead('Designs','Design master with revisions V1, V2, V3… Approved files are never overwritten.',can('designs','edit')?btn('+ New design','onclick="designForm()"','pri'):'')+filterBar('designs',['Draft','Awaiting Approval','Approved','Archived'])+
  table([{l:'',h:r=>{const im=(r.revisions||[]).flatMap(v=>v.files||[]).find(f=>(f.type||'').startsWith('image/'));return im?`<img src="${esc(im.url)}" alt="" style="width:44px;height:44px;object-fit:cover;border-radius:6px">`:''}},{l:'Code',h:r=>`<span class="ref">${esc(r.code||r.no)}</span>`},{l:'Name',k:'name'},{l:'Category',k:'category'},{l:'Purity',k:'purity'},{l:'Est. wt (g)',n:1,h:r=>r.estWt?fw(r.estWt):''},{l:'Rev.',h:r=>'V'+((r.revisions||[]).length||1)},{l:'Status',h:r=>stPill(r.status||'Draft')}],rows,{onClick:designDetail,empty:'No designs yet',emptyHint:'Add your CAD designs with images and revisions.'})}
function designForm(d){
  openForm({title:d?`Edit design ${d.code}`:'New design',wide:1,value:d||{status:'Draft'},fields:[{k:'code',l:'Design code',req:1},{k:'name',l:'Name',w:2},{k:'category',l:'Category',t:'sel',o:()=>SET.categories},{k:'productType',l:'Product type',t:'sel',o:['Fine jewellery','Hip-hop','Bridal','Custom','Watch','Loose stone']},{k:'customer',l:'Customer (if custom)',t:'ref',o:refOpts('customers')},{k:'tags',l:'Tags',w:2},
   {k:'hr',l:'Material estimate / BOM',t:'hr'},{k:'purity',l:'Metal / purity',t:'sel',o:purOpts},{k:'estWt',l:'Expected net wt (g)',t:'num'},{k:'estFine',l:'Expected fine (g)',ro:1,calc:v=>fw(fineOf(v.estWt,v.purity))},{k:'size',l:'Size range'},
   {k:'bom',l:'Stones & findings',t:'lines',cols:[{k:'item',l:'Item',t:'sel',o:()=>SET.materials,w:140},{k:'spec',l:'Shape / size / grade',w:160},{k:'pcs',l:'Pcs',t:'num',w:60},{k:'ct',l:'Carat',t:'num',w:70}]},
   {k:'notes',l:'Notes',t:'ta',w:4}],
   async onSave(v){delete v.estFine;if(S.designs.some(x=>x.code&&x.code.toLowerCase()===String(v.code).toLowerCase()&&x.id!==v.id)){toast('Design code already exists.',true);return false}
     if(!v.revisions||!v.revisions.length)v.revisions=[{v:1,ts:nowISO(),by:ME.id,notes:'Initial',files:[]}];
     const s=await save('designs',v);setTimeout(()=>designDetail(byId('designs',s.id)||s),60)}})}
function designDetail(d){
  d=byId('designs',d.id)||d;const revs=d.revisions||[];const links={q:S.quotes.filter(q=>(q.lines||[]).some(l=>l.design===d.id)),o:S.orders.filter(o=>(o.lines||[]).some(l=>l.design===d.id)),j:S.jobs.filter(j=>j.design===d.id)};
  modal({title:`${d.code} · ${d.name||''}`,sub:`${stPill(d.status||'Draft')} · ${esc(d.category||'')} · ${esc(d.purity||'')} · est ${d.estWt?fw(d.estWt)+' g':'—'}`,wide:1,body:`
   ${d.approvedRev?`<div class="banner info">Approved revision: V${d.approvedRev} by ${esc(userName(d.approvedBy))} on ${fdate(d.approvedAt)}${d.approvalRef?' · customer ref '+esc(d.approvalRef):''}</div>`:''}
   ${(d.bom||[]).length?`<div><h3>Stones & findings</h3>${table([{l:'Item',k:'item'},{l:'Spec',k:'spec'},{l:'Pcs',n:1,k:'pcs'},{l:'Carat',n:1,k:'ct'}],d.bom)}</div>`:''}
   <div><h3>Revisions</h3>${revs.slice().reverse().map(r=>`<div class="card" style="margin-bottom:8px"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><b>V${r.v}</b>${d.approvedRev===r.v?'<span class="pill good">Approved</span>':''}<span class="note">${fdt(r.ts)} · ${esc(userName(r.by))}</span>${can('designs','edit')&&d.approvedRev!==r.v?`<button class="btn sm" data-up="${r.v}" style="margin-left:auto">+ Files</button>`:''}${can('designs','approve')&&d.approvedRev!==r.v?`<button class="btn sm good" data-apr="${r.v}">Approve V${r.v}</button>`:''}</div><div class="note" style="margin-bottom:6px">${esc(r.notes||'')}</div>${filesHTML(r.files)}</div>`).join('')}</div>
   <div class="note">Used in ${links.q.length} quotation(s), ${links.o.length} order(s), ${links.j.length} job card(s).</div>`,
   foot:[can('designs','edit')?btn('Edit details','data-e'):'',can('designs','edit')?btn('+ New revision','data-rev','pri'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-e]')&&(b('[data-e]').onclick=()=>{close();designForm(d)});
    b('[data-rev]')&&(b('[data-rev]').onclick=()=>{close();openForm({title:`New revision V${revs.length+1}`,fields:[{k:'notes',l:'What changed?',t:'ta',w:4,req:1}],value:{},onSave:async v=>{const s=await save('designs',{...d,status:d.status==='Approved'?'Awaiting Approval':d.status,revisions:[...revs,{v:revs.length+1,ts:nowISO(),by:ME.id,notes:v.notes,files:[]}]},{action:'revision'});setTimeout(()=>designDetail(s),60)}})});
    ov.querySelectorAll('[data-up]').forEach(x=>x.onclick=()=>pickFiles(async files=>{const v=+x.dataset.up;const nr=revs.map(r=>r.v===v?{...r,files:[...(r.files||[]),...files]}:r);const s=await save('designs',{...d,revisions:nr},{action:'files'});close();designDetail(s)}));
    ov.querySelectorAll('[data-apr]').forEach(x=>x.onclick=()=>{close();openForm({title:`Approve V${x.dataset.apr}`,fields:[{k:'approvalRef',l:'Customer approval reference (email / message)',w:4}],value:{},onSave:v=>save('designs',{...d,status:'Approved',approvedRev:+x.dataset.apr,approvedBy:ME.id,approvedAt:nowISO(),approvalRef:v.approvalRef},{action:'approve',reason:v.approvalRef})})})}})}

/* ============ PURCHASE (brief §3.6) ============ */
function viewPurchase(){
  return phead('Purchase','Purchase orders → goods receipt with purity check → stock. Supplier bills are entered in Accounts.',can('purchase','edit')?btn('+ New purchase order','onclick="poForm()"','pri'):'')+filterBar('pos',['Draft','Awaiting Approval','Approved','Partially Received','Received','Cancelled'])+
  table([{l:'PO',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Supplier',h:r=>esc(nameOf('suppliers',r.supplier))},{l:'Lines',n:1,h:r=>(r.lines||[]).length},{l:'Value',n:1,h:r=>money((r.lines||[]).reduce((s,l)=>s+num(l.qty||l.net)*num(l.rate),0))},{l:'Expected',h:r=>fdate(r.expected)},{l:'Status',h:r=>stPill(r.status)}],applyFil('pos',S.pos).sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:poForm,empty:'No purchase orders yet'})}
function poForm(p){
  const locked=p&&['Received','Partially Received'].includes(p.status);
  const fields=[{k:'supplier',l:'Supplier',t:'ref',o:refOpts('suppliers'),req:1,w:2},{k:'date',l:'Date',t:'date',d:today()},{k:'expected',l:'Expected',t:'date'},
    {k:'lines',l:'Items',t:'lines',cols:[{k:'category',l:'Material',t:'sel',o:()=>SET.materials,w:140},{k:'purity',l:'Purity',t:'sel',o:purOpts,w:100},{k:'desc',l:'Spec / description',w:150},{k:'qty',l:'Qty / wt / ct',t:'num',w:80},{k:'unit',l:'Unit',t:'sel',o:['g','ct','pcs','kg','set'],w:70},{k:'rate',l:'Rate',t:'num',w:80},{k:'amt',l:'Amount',calc:l=>num(l.qty)*num(l.rate),fmt:money}]},
    {k:'notes',l:'Notes',t:'ta',w:4}];
  if(p&&p.id&&(locked||!can('purchase','edit'))){poView(p);return}
  openForm({title:p&&p.id?`Edit ${p.no}`:'New purchase order',wide:1,fields,value:p||{date:today()},async onSave(v){v.status=can('purchase','approve')?'Approved':'Awaiting Approval';const s=await save('pos',v);setTimeout(()=>poView(s),60)}})}
function poView(p){
  modal({title:`${p.no} · ${nameOf('suppliers',p.supplier)}`,sub:`${stPill(p.status)} · ${fdate(p.date)}`,wide:1,body:table([{l:'Material',k:'category'},{l:'Purity',k:'purity'},{l:'Spec',k:'desc'},{l:'Ordered',n:1,h:r=>fq(r.qty)+' '+esc(r.unit||'')},{l:'Received',n:1,h:r=>fq(r.recd||0)},{l:'Rate',n:1,h:r=>fq(r.rate)}],p.lines||[])+((p.grn||[]).length?`<h3>Goods receipts</h3>${table([{l:'Date',h:r=>fdate(r.date)},{l:'Vouchers',h:r=>esc((r.vouchers||[]).join(', '))},{l:'By',h:r=>esc(userName(r.by))},{l:'Note',k:'note'}],p.grn)}`:''),
   foot:[can('purchase','edit')&&!['Received'].includes(p.status)?btn('Edit','data-e'):'',p.status==='Awaiting Approval'&&can('purchase','approve')?btn('Approve','data-ap','good'):'',['Approved','Partially Received'].includes(p.status)&&can('inventory','edit')?btn('Receive goods','data-grn','pri'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-e]')&&(b('[data-e]').onclick=()=>{close();openForm({title:`Edit ${p.no}`,wide:1,value:p,fields:[{k:'supplier',l:'Supplier',t:'ref',o:refOpts('suppliers'),req:1,w:2},{k:'expected',l:'Expected',t:'date'},{k:'lines',l:'Items',t:'lines',cols:[{k:'category',l:'Material',t:'sel',o:()=>SET.materials},{k:'purity',l:'Purity',t:'sel',o:purOpts},{k:'desc',l:'Spec'},{k:'qty',l:'Qty',t:'num'},{k:'unit',l:'Unit',t:'sel',o:['g','ct','pcs','kg','set']},{k:'rate',l:'Rate',t:'num'}]}],onSave:v=>save('pos',{...v,status:can('purchase','approve')?'Approved':'Awaiting Approval'})})});
    b('[data-ap]')&&(b('[data-ap]').onclick=async()=>{close();await save('pos',{...p,status:'Approved',approvedBy:ME.id},{action:'approve'})});
    b('[data-grn]')&&(b('[data-grn]').onclick=()=>{close();grnForm(p)})}})}
function grnForm(p){
  const rows=(p.lines||[]).map((l,i)=>({...l,i}));
  modal({title:`Receive goods · ${p.no}`,wide:1,body:`<div class="note">Enter what physically arrived. Measured purity is checked against ordered purity; a mismatch is flagged.</div><div class="tw"><table class="lines"><thead><tr><th>Item</th><th>Ordered</th><th>Gross</th><th>Net / qty</th><th>Carat</th><th>Pcs</th><th>Measured purity</th><th>Lot</th><th>Location</th></tr></thead><tbody>${rows.map(l=>`<tr data-i="${l.i}"><td>${esc(l.category)} ${esc(l.purity||'')}<div class="note">${esc(l.desc||'')}</div></td><td class="calc">${fq(num(l.qty)-num(l.recd))} ${esc(l.unit||'')}</td><td><input type="number" step="any" data-g></td><td><input type="number" step="any" data-n></td><td><input type="number" step="any" data-c></td><td><input type="number" step="any" data-p></td><td><select data-pu><option value="">Select…</option>${purOpts().map(([k,lab])=>`<option ${k===l.purity?'selected':''} value="${esc(k)}">${esc(lab)}</option>`).join('')}</select></td><td><input data-l placeholder="Lot / parcel"></td><td><select data-loc>${SET.locations.map(x=>`<option>${esc(x)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><div class="f"><label>Note</label><input id="gNote"></div>`,
   foot:`<button class="btn" data-close>Cancel</button><button class="btn pri" id="gOk">Post receipt to stock</button>`,
   onMount(ov,close){ov.querySelector('#gOk').onclick=async e=>{e.target.disabled=true;const made=[];const lines=JSON.parse(JSON.stringify(p.lines));const flags=[];
     try{for(const tr of ov.querySelectorAll('tbody tr')){const i=+tr.dataset.i;const l=lines[i];const g=v=>tr.querySelector(v).value;
       const n=num(g('[data-n]')),c=num(g('[data-c]')),pc=num(g('[data-p]'));if(!n&&!c&&!pc)continue;
       const pur=g('[data-pu]');if(l.purity&&pur&&pur!==l.purity)flags.push(`${l.category}: ordered ${l.purity}, measured ${pur}`);
       const v=await save('vouchers',{date:today(),vtype:'Purchase receipt',category:l.category,purity:pur,desc:l.desc,lot:g('[data-l]'),location:g('[data-loc]'),gross:num(g('[data-g]'))||n,net:n,fine:pur?fineOf(n,pur):'',carat:c,pcs:pc,amount:r2((n||c||pc)*num(l.rate)),po:p.id,supplier:p.supplier,status:'Approved',note:'GRN against '+p.no},{silent:1});
       made.push(v.no);l.recd=num(l.recd)+(n||c||pc)}
      if(!made.length){toast('Enter at least one received quantity.',true);return}
      const full=lines.every(l=>num(l.recd)>=num(l.qty)-0.0005);
      await save('pos',{...p,lines,status:full?'Received':'Partially Received',grn:[...(p.grn||[]),{date:today(),by:ME.id,vouchers:made,note:ov.querySelector('#gNote').value+(flags.length?' · PURITY MISMATCH: '+flags.join('; '):'')}]},{action:'grn'});
      if(flags.length)toast('Purity mismatch flagged: '+flags.join('; '),true);close()}finally{e.target.disabled=false}}}})}

/* ============ UNIQUE-PIECE INVENTORY (every piece is different) ============ */
const PIECE_ST=['In stock','Reserved','Sold','With customer (approval)','Returned','Lost / written off'];
function pieceCard(p){const img=(p.photos||[])[0];const prof=pieceProfit(p);
  return `<div class="pcard" onclick="pieceDetail(byId('pieces','${p.id}'))">
   <div class="pimg">${img?`<img src="${esc(img.url)}" alt="">`:'<span>no photo</span>'}<span class="pbadge ${p.status==='Sold'?'bad':p.status==='Reserved'?'warn':'good'}">${esc(p.status||'In stock')}</span></div>
   <div class="pbody"><div class="pname">${esc(p.name||'Untitled piece')}</div><div class="psku">${esc(p.sku||p.no||'')}</div>
   <div class="pmeta">${esc([p.metal,p.stone].filter(Boolean).join(' · ')||'—')}</div>
   <div class="pcost"><span>Cost</span><b>${fcur(p.costUSD,'USD')}</b></div>
   ${p.status==='Sold'?`<div class="pcost"><span>Sold</span><b>${fcur(p.priceUSD,'USD')}</b></div><div class="pcost"><span>Profit</span><b style="color:${prof<0?'var(--bad)':'var(--good)'}">${fcur(prof,'USD')}</b></div>`:`<div class="pcost"><span>List</span><b>${p.priceUSD?fcur(p.priceUSD,'USD'):'—'}</b></div>`}
   </div></div>`}
function viewPieces(){
  const f=FIL.pieces||(FIL.pieces={q:'',st:''});
  const rows=applyFil('pieces',S.pieces).sort((a,b)=>(b.no||'').localeCompare(a.no||''));
  const st=pieceStats();
  const kp=(v,l,c='')=>`<div class="card kpi ${c}"><span class="v">${v}</span><span class="l">${esc(l)}</span></div>`;
  return `<div class="grid g4" style="margin-bottom:14px">${kp(st.inStock,'Pieces in stock','gold')}${kp(fcur(st.stockCostUSD,'USD'),'Stock value (cost)')}${kp(st.sold,'Pieces sold')}${kp(fcur(st.soldProfitUSD,'USD'),'Profit on sold',st.soldProfitUSD<0?'alert':'')}</div>`+
   filterBar('pieces',PIECE_ST)+(rows.length?`<div class="pgrid">${rows.map(pieceCard).join('')}</div>`:'<div class="tw"><div class="empty"><b>No pieces yet</b>Add each unique item with a photo, metal, stone and cost.</div></div>')}
function pieceForm(p){
  const isNew=!p||!p.id;p=p||{status:'In stock'};
  openForm({title:isNew?'Add piece':`Edit ${p.sku||p.no||'piece'}`,wide:1,value:p,fields:[
    {k:'name',l:'Piece name',req:1,w:2,hint:'e.g. 2ct Oval Solitaire Ring'},{k:'sku',l:'SKU / code',hint:'Leave blank for auto number'},{k:'status',l:'Status',t:'sel',o:PIECE_ST,d:'In stock'},
    {k:'metal',l:'Metal',t:'sel',o:()=>SET.pieceMetals},{k:'stone',l:'Main stone',t:'sel',o:()=>SET.pieceStones},{k:'stoneDetail',l:'Stone detail',w:2,hint:'e.g. 2.01ct Oval E VS1 IGI'},
    {k:'weight',l:'Gross weight (g)',t:'num'},{k:'size',l:'Size'},{k:'location',l:'Location',t:'sel',o:()=>[...(SET.locations||[]),'Showroom','Safe','With customer']},
    {k:'hr1',l:'Cost & price',t:'hr'},
    {k:'costUSD',l:'Making / buy cost (USD)',t:'num',req:1},{k:'costINR',l:'Cost (INR) — auto',ro:1,calc:v=>v.costUSD?money(toINR(v.costUSD,'USD')):'',hint:'Auto from USD × rate (set in Setup)'},{k:'priceUSD',l:'Selling price (USD)',t:'num'},{k:'priceINR',l:'Price (INR) — auto',ro:1,calc:v=>v.priceUSD?money(toINR(v.priceUSD,'USD')):''},
    {k:'description',l:'Description',t:'ta',w:4}],
   async onSave(v){v.costINR=r2(toINR(v.costUSD,'USD'));delete v.priceINR;
     v.photos=(p&&p.photos)||[];
     const s=await save('pieces',v);setTimeout(()=>pieceDetail(byId('pieces',s.id)||s),50)}})}
function pieceDetail(p){p=byId('pieces',p.id)||p;const prof=pieceProfit(p);const ord=p.soldOrder?orderOf(p.soldOrder):null;
  modal({title:`${p.sku||p.no||''} · ${p.name||''}`,sub:`${stPill(p.status||'In stock')} · ${esc([p.metal,p.stone].filter(Boolean).join(' · '))}`,wide:1,body:`
   <div class="grid g2">
    <div><div class="pimgbig">${(p.photos||[]).length?(p.photos||[]).map(f=>`<a href="${esc(f.url)}" target="_blank" rel="noopener"><img src="${esc(f.url)}" alt=""></a>`).join(''):'<div class="empty">No photos</div>'}</div>${can('inventory','edit')?`<button class="btn sm" data-ph style="margin-top:8px">+ Add photos</button>`:''}</div>
    <div><dl class="dl"><dt>Metal</dt><dd>${esc(p.metal||'—')}</dd><dt>Stone</dt><dd>${esc(p.stone||'—')}</dd><dt>Stone detail</dt><dd>${esc(p.stoneDetail||'—')}</dd><dt>Weight / size</dt><dd>${p.weight?fw(p.weight)+' g':'—'} ${p.size?' · '+esc(p.size):''}</dd><dt>Location</dt><dd>${esc(p.location||'—')}</dd>
    <dt>Cost</dt><dd>${fcur(p.costUSD,'USD')} <span class="note">· ${money(p.costINR||toINR(p.costUSD,'USD'))}</span></dd>
    <dt>Selling price</dt><dd>${p.priceUSD?fcur(p.priceUSD,'USD')+' <span class="note">· '+money(toINR(p.priceUSD,'USD'))+'</span>':'—'}</dd>
    ${p.status==='Sold'?`<dt>Sold for</dt><dd><b>${fcur(p.priceUSD,'USD')}</b></dd><dt>Profit</dt><dd style="color:${prof<0?'var(--bad)':'var(--good)'}"><b>${fcur(prof,'USD')}</b></dd><dt>Sold by</dt><dd>${esc(userName(p.soldBy))}</dd><dt>Sold on</dt><dd>${fdate(p.soldDate)}</dd><dt>Order</dt><dd>${ord?esc(ord.no):'—'}</dd>`:''}</dl>
    ${p.description?`<div class="note">${esc(p.description)}</div>`:''}</div></div>`,
   foot:[can('inventory','edit')?btn('Edit','data-e'):'',p.status!=='Sold'&&can('inventory','edit')?btn('Mark sold','data-sold','pri'):'',p.status==='Sold'&&can('inventory','edit')?btn('Return to stock','data-back'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-e]')&&(b('[data-e]').onclick=()=>{close();pieceForm(p)});
    b('[data-ph]')&&(b('[data-ph]').onclick=()=>pickFiles(async files=>{const s=await save('pieces',{...p,photos:[...(p.photos||[]),...files]},{action:'photos'});close();pieceDetail(s)},'image/*',MAX_PHOTOS-(p.photos||[]).length));
    b('[data-back]')&&(b('[data-back]').onclick=async()=>{close();await save('pieces',{...p,status:'In stock',soldOrder:null,soldBy:null,soldDate:null},{action:'return to stock'})});
    b('[data-sold]')&&(b('[data-sold]').onclick=()=>{close();openForm({title:`Sell ${p.name||p.sku}`,fields:[{k:'priceUSD',l:'Sold price (USD)',t:'num',req:1,d:p.priceUSD},{k:'soldOrder',l:'Order (optional)',t:'ref',o:refOpts('orders',o=>o.no+' · '+custName(o.customer))},{k:'soldBy',l:'Sold by',t:'sel',o:()=>USERS.filter(u=>u.active!==false).map(u=>[u.id,u.name]),d:ME.id},{k:'soldDate',l:'Sold on',t:'date',d:today()}],value:{},onSave:v=>save('pieces',{...p,...v,status:'Sold'},{action:'sold'})})})}})}

/* ============ INVENTORY (metal vouchers — secondary) ============ */
const V_TYPES=[...IN_TYPES,...OUT_TYPES,'Adjustment'];
function viewInventory(){
  const tab=TAB.inv||'pieces';let body='';
  if(tab==='pieces')return phead('Inventory','Every piece is unique — photo, metal, stone, cost and sale profit tracked individually.',can('inventory','edit')?btn('+ Add piece','onclick="pieceForm()"','pri'):'')+tabsHTML('inv',[['pieces','Pieces'],['bal','Metal stock'],['metal','Metal by purity'],['led','Voucher ledger']],tab)+viewPieces();
  const bal=stockBalances().filter(b=>Math.abs(b.net)>0.0005||Math.abs(b.pcs)>0||Math.abs(b.carat)>0.0005);
  if(tab==='bal'){const f=FIL.invc||'';
    body=`<div class="tools"><select onchange="FIL.invc=this.value;render()"><option value="">All materials</option>${SET.materials.map(m=>`<option ${f===m?'selected':''}>${esc(m)}</option>`).join('')}</select></div>`+
    table([{l:'Material',k:'category'},{l:'Purity',k:'purity'},{l:'Lot / batch',k:'lot'},{l:'Gross (g)',n:1,h:r=>fw(r.gross)},{l:'Net (g)',n:1,h:r=>fw(r.net)},{l:'Fine (g)',n:1,h:r=>r.purity?`<span class="fine">${fw(r.fine)}</span>`:''},{l:'Pcs',n:1,h:r=>fq(r.pcs)},{l:'Carat',n:1,h:r=>r.carat?fw(r.carat):''},{l:'By location',h:r=>esc(Object.entries(r.loc).filter(([k,v])=>Math.abs(v)>0.0005).map(([k,v])=>k+': '+fq(v)).join(' · '))}],bal.filter(b=>!f||b.category===f).sort((a,b)=>(a.category+a.purity).localeCompare(b.category+b.purity)),{empty:'No stock yet',emptyHint:'Post an opening-stock voucher or receive a purchase.'})}
  else if(tab==='metal'){const m=metalByPurity();body=`<div class="banner info">${esc(SET.rateNote)}</div><div style="margin-top:10px">${table([{l:'Purity',k:'purity'},{l:'Metal',h:r=>esc(purityMetal(r.purity))},{l:'Purity %',n:1,h:r=>fq(purityPct(r.purity))},{l:'Net (g)',n:1,h:r=>fw(r.net)},{l:'Fine (g)',n:1,h:r=>`<span class="fine">${fw(r.fine)}</span>`},{l:'Rate / g fine',n:1,h:r=>fq(rateFor(r.purity))},{l:'Value',n:1,h:r=>money(r.fine*rateFor(r.purity))}],m,{empty:'No metal in stock'})}</div><div class="note" style="margin-top:8px">Purities are never mixed: 18K and 22K are separate balances. With karigars: ${fw(S.challans.filter(c=>c.status!=='Closed').reduce((s,c)=>s+challanCalc(c).withKarigar,0))} g fine (see Karigars).</div>`}
  else if(tab==='led'){body=filterBar('vch',V_TYPES)+table([{l:'Voucher',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Type',h:r=>`${esc(r.vtype)}${r.vtype==='Adjustment'?' ('+esc(r.dir)+')':''}`},{l:'Material',h:r=>esc(r.category+' '+(r.purity||''))},{l:'Lot',k:'lot'},{l:'In/Out',h:r=>vSign(r)>0?'<span class="pill good">IN</span>':'<span class="pill bad">OUT</span>'},{l:'Net (g)',n:1,h:r=>fw(r.net)},{l:'Fine (g)',n:1,h:r=>r.purity?fw(r.fine):''},{l:'Pcs / ct',n:1,h:r=>[r.pcs?fq(r.pcs)+' pc':'',r.carat?fw(r.carat)+' ct':''].filter(Boolean).join(' ')},{l:'Ref',h:r=>esc([orderOf(r.order)?.no,byId('jobs',r.job)?.no,byId('challans',r.challan)?.no].filter(Boolean).join(' '))},{l:'Status',h:r=>stPill(r.status||'Approved')}],applyFil('vch',S.vouchers,'vtype').sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:voucherView,empty:'No vouchers yet'})}
  else if(tab==='pend'){body=table([{l:'Voucher',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Date',h:r=>fdate(r.date)},{l:'Material',h:r=>esc(r.category+' '+(r.purity||''))},{l:'Direction',k:'dir'},{l:'Net (g)',n:1,h:r=>fw(r.net)},{l:'Reason',k:'reason'},{l:'Entered by',h:r=>esc(userName(r.createdBy))}],S.vouchers.filter(v=>v.status==='Pending'),{onClick:voucherView,empty:'No adjustments waiting',emptyHint:'Stock corrections always need approval — nothing is edited silently.'})}
  else if(tab==='phys'){body=`<div class="note" style="margin-bottom:10px">Enter the physically weighed/counted balance. Differences post as adjustment vouchers that need approval.</div><div class="tw"><table class="lines"><thead><tr><th>Material</th><th>Purity</th><th>Lot</th><th class="num">System net</th><th>Physical net</th><th class="num">Variance</th><th></th></tr></thead><tbody>${bal.map((b,i)=>`<tr><td>${esc(b.category)}</td><td>${esc(b.purity)}</td><td>${esc(b.lot)}</td><td class="calc">${fw(b.net||b.carat||b.pcs)}</td><td><input type="number" step="any" data-phys="${i}"></td><td class="calc" data-var="${i}">—</td><td>${can('inventory','edit')?`<button class="btn sm" data-post="${i}">Post</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
    setTimeout(()=>{$$('[data-phys]').forEach(inp=>inp.oninput=()=>{const b=bal[+inp.dataset.phys];const sys=b.net||b.carat||b.pcs;$(`[data-var="${inp.dataset.phys}"]`).textContent=inp.value===''?'—':fw(num(inp.value)-sys)});
      $$('[data-post]').forEach(x=>x.onclick=()=>{const i=+x.dataset.post;const b=bal[i];const inp=$(`[data-phys="${i}"]`);if(inp.value===''){toast('Enter the physical figure first.',true);return}const sys=b.net||b.carat||b.pcs;const d=r3(num(inp.value)-sys);if(!d){toast('No variance — nothing to post.');return}
        askReason('Physical stock variance',`${b.category} ${b.purity} ${b.lot}: variance ${fw(d)}. Explain the difference:`,r=>{const isWt=!!b.net;const amt=Math.abs(d);return save('vouchers',{date:today(),vtype:'Adjustment',dir:d>0?'in':'out',category:b.category,purity:b.purity,lot:b.lot,net:isWt?amt:'',gross:isWt?amt:'',fine:isWt&&b.purity?fineOf(amt,b.purity):'',carat:!isWt&&b.carat?amt:'',pcs:!isWt&&!b.carat?amt:'',reason:'Physical count: '+r,status:'Pending',location:SET.locations[0]},{reason:r})})})})}
  return phead('Inventory','Metal stock ledger (for making). For finished unique pieces use the Pieces tab.',can('inventory','edit')?btn('+ Stock voucher','onclick="voucherForm()"','pri'):'')+tabsHTML('inv',[['pieces','Pieces'],['bal','Metal stock'],['metal','Metal by purity'],['led','Voucher ledger'],['pend',`Pending (${S.vouchers.filter(v=>v.status==='Pending').length})`],['phys','Physical count']],tab)+body}
function voucherForm(pre){
  pre=pre||{date:today(),vtype:'Opening stock'};
  openForm({title:'New stock voucher',wide:1,value:pre,fields:[{k:'vtype',l:'Voucher type',t:'sel',o:V_TYPES,req:1},{k:'date',l:'Date',t:'date',req:1},{k:'dir',l:'Adjustment direction',t:'sel',o:[['in','Increase (in)'],['out','Decrease (out)']],hint:'Only for Adjustment'},{k:'location',l:'Location / dept',t:'sel',o:()=>[...SET.locations,...SET.departments]},
    {k:'category',l:'Material',t:'sel',o:()=>SET.materials,req:1},{k:'purity',l:'Purity (metals)',t:'sel',o:purOpts},{k:'desc',l:'Item / spec',w:2,hint:'e.g. 18K casting grain, 1.0 ct oval E VS1'},
    {k:'lot',l:'Lot / batch / parcel'},{k:'cert',l:'Certificate ref'},{k:'pcs',l:'Pieces',t:'num'},{k:'carat',l:'Carat wt',t:'num'},
    {k:'gross',l:'Gross wt (g)',t:'num'},{k:'net',l:'Net wt (g)',t:'num'},{k:'fine',l:'Fine wt (g) — auto',ro:1,calc:v=>v.purity&&v.net!==''?fineOf(v.net,v.purity):''},{k:'amount',l:'Value',t:'num',hint:'For stones / other material costing'},
    {k:'order',l:'Order',t:'ref',o:refOpts('orders',o=>o.no+' · '+custName(o.customer))},{k:'job',l:'Job card',t:'ref',o:refOpts('jobs',j=>j.no)},{k:'reason',l:'Reason / note',w:2,hint:'Required for adjustments'}],
   async onSave(v){
     if(v.vtype==='Adjustment'&&(!v.dir||!v.reason)){toast('Adjustments need a direction and a reason.',true);return false}
     if(!num(v.net)&&!num(v.pcs)&&!num(v.carat)){toast('Enter net weight, pieces or carat.',true);return false}
     if(v.gross!==''&&v.net!==''&&num(v.net)>num(v.gross)+0.0005){toast('Net weight cannot exceed gross weight.',true);return false}
     if(['Gold','Silver','Platinum'].includes(v.category)&&!v.purity){toast('Choose a purity for metal — purities are kept separate.',true);return false}
     v.fine=v.purity&&v.net!==''?fineOf(v.net,v.purity):'';
     v.status=v.vtype==='Adjustment'?'Pending':'Approved';
     if(vSign(v)<0&&v.purity){const b=stockBalances().filter(x=>x.category===v.category&&x.purity===v.purity&&(!v.lot||x.lot===v.lot)).reduce((s,x)=>s+x.net,0);if(num(v.net)>b+0.0005)toast(`Warning: only ${fw(b)} g ${v.purity} in stock — balance will go negative.`,true)}
     await save('vouchers',v,{reason:v.reason})}})}
function voucherView(v){
  modal({title:`${v.no} · ${v.vtype}`,sub:`${stPill(v.status||'Approved')} · ${fdate(v.date)} · entered by ${esc(userName(v.createdBy))}`,body:`<dl class="dl"><dt>Material</dt><dd>${esc(v.category)} ${esc(v.purity||'')}</dd><dt>Item</dt><dd>${esc(v.desc||'—')}</dd><dt>Lot</dt><dd>${esc(v.lot||'—')}</dd><dt>Location</dt><dd>${esc(v.location||'—')}</dd><dt>Gross / net</dt><dd class="num" style="text-align:left">${fw(v.gross)} / ${fw(v.net)} g</dd><dt>Fine</dt><dd class="num fine" style="text-align:left">${v.purity?fw(v.fine)+' g':'—'}</dd><dt>Pcs / carat</dt><dd>${fq(v.pcs)} / ${fw(v.carat)}</dd><dt>Value</dt><dd>${v.amount?money(v.amount):'—'}</dd><dt>Order / job</dt><dd>${esc([orderOf(v.order)?.no,byId('jobs',v.job)?.no,byId('challans',v.challan)?.no].filter(Boolean).join(' · ')||'—')}</dd><dt>Reason</dt><dd>${esc(v.reason||v.note||'—')}</dd>${v.approvedBy?`<dt>Approved</dt><dd>${esc(userName(v.approvedBy))} · ${fdt(v.approvedAt)}</dd>`:''}</dl><div class="note">Vouchers cannot be edited. To correct one, post a reversal (it goes for approval).</div>`,
   foot:[v.status==='Pending'&&can('inventory','approve')?btn('Reject','data-rj','dng')+btn('Approve','data-ap','good'):'',v.status!=='Pending'&&v.status!=='Rejected'&&can('inventory','edit')?btn('Reverse','data-rev'):''].join(''),
   onMount(ov,close){const b=s=>ov.querySelector(s);
    b('[data-ap]')&&(b('[data-ap]').onclick=async()=>{if(v.createdBy===ME.id&&ME.role!=='admin'){toast('Maker-checker: someone other than the person who entered it must approve.',true);return}close();await save('vouchers',{...v,status:'Approved',approvedBy:ME.id,approvedAt:nowISO()},{action:'approve'})});
    b('[data-rj]')&&(b('[data-rj]').onclick=()=>{close();askReason('Reject adjustment','Reason',r=>save('vouchers',{...v,status:'Rejected',rejectedBy:ME.id},{action:'reject',reason:r}))});
    b('[data-rev]')&&(b('[data-rev]').onclick=()=>{close();askReason('Reverse '+v.no,'Why is this voucher being reversed?',r=>save('vouchers',{...v,id:undefined,no:undefined,createdAt:undefined,vtype:'Adjustment',dir:vSign(v)>0?'out':'in',reason:`Reversal of ${v.no}: ${r}`,status:'Pending',reverses:v.id,date:today()},{reason:r}))})}})}

/* ============ PRODUCTION (brief §8) ============ */
function viewProduction(){
  const tab=TAB.prod||'board';const active=S.jobs.filter(j=>!['Completed','Cancelled'].includes(j.status));let body='';
  if(tab==='board'){body=`<div class="board">${SET.departments.map(d=>{const js=active.filter(j=>(j.route||[])[j.step||0]===d);return `<div class="col ${js.length?'':'zero'}"><h4>${esc(d)}<span>${js.length}</span></h4>${js.map(j=>`<div class="tile ${j.status==='Blocked'||(j.plannedEnd&&j.plannedEnd<today())?'over':''}" onclick="jobDetail(byId('jobs','${j.id}'))"><span class="ref">${esc(j.no)}</span> ${stPill(j.status)}<div><b>${esc(j.product||'')}</b> × ${fq(j.qty)}</div><div class="meta"><span>${esc(orderOf(j.order)?.no||'')}</span><span>${j.mode==='Outside karigar'?'⇢ '+esc(nameOf('karigars',j.karigar)):esc(nameOf('employees',j.assignee)||'')}</span></div></div>`).join('')}</div>`}).join('')}</div>`}
  else body=filterBar('jobs',JOB_ST)+table([{l:'Job',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Order',h:r=>esc(orderOf(r.order)?.no||'')},{l:'Product',h:r=>esc(r.product)+' × '+fq(r.qty)},{l:'Stage',h:r=>esc((r.route||[])[r.step||0]||'')+` <span class="note">${(r.step||0)+1}/${(r.route||[]).length}</span>`},{l:'Mode',h:r=>r.mode==='Outside karigar'?esc('Karigar: '+nameOf('karigars',r.karigar)):'In-house'},{l:'Planned end',h:r=>fdate(r.plannedEnd)},{l:'Status',h:r=>stPill(r.status)}],applyFil('jobs',tab==='done'?S.jobs.filter(j=>['Completed','Cancelled'].includes(j.status)):active).sort((a,b)=>(b.no||'').localeCompare(a.no||'')),{onClick:jobDetail,empty:'No job cards',emptyHint:'Open an order and click “+ Job card” on an item.'});
  return phead('Production','Job cards follow a configurable route. Choose in-house or outside karigar for each job.',can('production','edit')?btn('+ Job card','onclick="jobForm()"','pri'):'')+tabsHTML('prod',[['board','Department queue'],['list','Active jobs'],['done','Completed']],tab)+body}
function jobForm(j){
  const isNew=!j||!j.id;j=j||{status:'Waiting Material',mode:'In-house',routeName:Object.keys(SET.routes)[0],qty:1};
  openForm({title:isNew?'New job card':`Edit ${j.no}`,wide:1,value:j,fields:[{k:'order',l:'Order',t:'ref',o:refOpts('orders',o=>o.no+' · '+custName(o.customer)),req:1,w:2},{k:'line',l:'Order item #',t:'sel',o:()=>{const o=orderOf(j.order);return o?(o.lines||[]).map((l,i)=>[String(i),`#${i+1} ${l.desc||l.category||''}`]):[['0','#1']]}},{k:'priority',l:'Priority',t:'sel',o:['Normal','High','Urgent']},
   {k:'product',l:'Product',req:1,w:2},{k:'design',l:'Design',t:'ref',o:refOpts('designs',d=>d.code)},{k:'qty',l:'Quantity',t:'num',req:1},
   {k:'purity',l:'Purity',t:'sel',o:purOpts},{k:'targetWt',l:'Target wt (g)',t:'num'},{k:'routeName',l:'Production route',t:'sel',o:()=>Object.keys(SET.routes),req:1,w:2},
   {k:'mode',l:'Work done by',t:'sel',o:['In-house','Outside karigar'],req:1},{k:'karigar',l:'Karigar (if outside)',t:'ref',o:refOpts('karigars')},{k:'assignee',l:'Assigned employee',t:'ref',o:empOpts},{k:'status',l:'Status',t:'sel',o:JOB_ST},
   {k:'plannedStart',l:'Planned start',t:'date'},{k:'plannedEnd',l:'Planned end',t:'date'},{k:'notes',l:'Notes',t:'ta',w:2}],
   async onSave(v){if(v.mode==='Outside karigar'&&!v.karigar){toast('Pick the karigar for outside job work.',true);return false}
     v.line=num(v.line);if(isNew||v.routeName!==j.routeName){v.route=SET.routes[v.routeName]||[];v.step=0;v.steps=[]}
     const s=await save('jobs',v);
     const o=orderOf(v.order);if(o){const lines=JSON.parse(JSON.stringify(o.lines||[]));if(lines[v.line]&&lines[v.line].status==='Pending')lines[v.line].status='In Production';const st=['Confirmed','Material Planning','Awaiting Approval'].includes(o.status)?'In Production':o.status;if(st!==o.status||JSON.stringify(lines)!==JSON.stringify(o.lines))await save('orders',{...o,lines,status:st,history:st!==o.status?[...(o.history||[]),{ts:nowISO(),by:ME.id,from:o.status,to:st,note:'Job '+s.no+' created'}]:o.history},{silent:1,action:'status'})}
     setTimeout(()=>jobDetail(byId('jobs',s.id)||s),60)}})}
function jobDetail(j){
  j=byId('jobs',j.id)||j;const o=orderOf(j.order);const route=j.route||[];const cur=route[j.step||0];
  const vs=S.vouchers.filter(v=>v.job===j.id),chs=S.challans.filter(c=>c.job===j.id),qcs=S.qc.filter(q=>q.job===j.id);
  const issuedFine=vs.filter(vLive).reduce((s,v)=>s+(['Issue to production'].includes(v.vtype)?num(v.fine):v.vtype==='Return from production'?-num(v.fine):0),0);
  modal({title:`${j.no} · ${j.product} × ${fq(j.qty)}`,sub:`${stPill(j.status)} · ${esc(o?.no||'')} ${esc(custName(o?.customer))} · ${j.mode==='Outside karigar'?'Karigar: '+esc(nameOf('karigars',j.karigar)):'In-house'}${j.assignee?' · '+esc(nameOf('employees',j.assignee)):''}`,wide:1,body:`
   ${j.status==='Blocked'?`<div class="banner bad">Blocked: ${esc(j.blockReason||'')}</div>`:''}
   <div class="route">${route.map((s,i)=>`<span class="${i<(j.step||0)||j.status==='Completed'?'done':i===(j.step||0)?'cur':''}">${esc(s)}</span>`).join('')}</div>
   <div class="grid g3"><dl class="dl"><dt>Design</dt><dd>${esc(nameOf('designs',j.design)||'—')}</dd><dt>Purity</dt><dd>${esc(j.purity||'—')}</dd><dt>Target wt</dt><dd>${j.targetWt?fw(j.targetWt)+' g':'—'}</dd></dl><dl class="dl"><dt>Planned</dt><dd>${fdate(j.plannedStart)} → ${fdate(j.plannedEnd)}</dd><dt>Actual start</dt><dd>${fdt(j.actualStart)}</dd><dt>Actual end</dt><dd>${fdt(j.actualEnd)}</dd></dl><dl class="dl"><dt>Net metal issued</dt><dd class="fine">${fw(issuedFine)} g fine</dd><dt>Output / accepted</dt><dd>${fq(j.output)} / ${fq(j.accepted)}</dd><dt>Rejected / rework</dt><dd>${fq(j.rejected)} / ${fq(j.rework)}</dd></dl></div>
   <div><h3>Stage log</h3>${(j.steps||[]).length?table([{l:'Stage',k:'stage'},{l:'Done',h:r=>fdt(r.ts)},{l:'By',h:r=>esc(userName(r.by))},{l:'In wt',n:1,h:r=>r.inWt?fw(r.inWt):''},{l:'Out wt',n:1,h:r=>r.outWt?fw(r.outWt):''},{l:'Out / ok / rej / rework',n:1,h:r=>[r.output,r.accepted,r.rejected,r.rework].map(fq).join(' / ')},{l:'Remarks',k:'note'}],j.steps):'<div class="note">No stages completed yet.</div>'}</div>
   <div class="grid g2"><div><h3>Material movements</h3>${vs.length?table([{l:'Voucher',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Type',k:'vtype'},{l:'Material',h:r=>esc(r.category+' '+(r.purity||''))},{l:'Net',n:1,h:r=>fw(r.net)},{l:'Fine',n:1,h:r=>r.purity?fw(r.fine):''}],vs,{onClick:voucherView}):'<div class="note">No material issued yet.</div>'}</div>
   <div><h3>Karigar challans & QC</h3>${chs.length?table([{l:'Challan',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Karigar',h:r=>esc(nameOf('karigars',r.karigar))},{l:'Status',h:r=>stPill(r.status)}],chs,{onClick:challanDetail}):''}${qcs.length?table([{l:'QC',h:r=>`<span class="ref">${esc(r.no)}</span>`},{l:'Result',h:r=>stPill(r.result)},{l:'Released',h:r=>r.released?'Yes':'No'}],qcs,{onClick:qcForm}):''}${!chs.length&&!qcs.length?'<div class="note">None yet.</div>':''}</div></div>
   ${j.notes?`<div class="note">${esc(j.notes)}</div>`:''}`,
   foot:can('production','edit')&&!['Completed','Cancelled'].includes(j.status)?[btn('Edit','data-e'),btn('Issue material','data-iss'),btn('Return material','data-ret'),j.mode==='Outside karigar'&&can('karigars','edit')?btn('Karigar challan','data-chl'):'',j.status==='Blocked'?btn('Unblock','data-unb'):btn('Block','data-blk','dng'),cur==='Quality Control'||cur==='Final Weight / Purity'?btn('Record QC','data-qc'):'',(j.step||0)<route.length-1?btn(`Complete “${esc(cur)}” →`,'data-next','pri'):btn('Finish job','data-fin','pri')].join(''):'',
   onMount(ov,close){const b=s=>ov.querySelector(s),on=(s,f)=>{const x=b(s);x&&(x.onclick=()=>{close();f()})};
    on('[data-e]',()=>jobForm(j));
    on('[data-iss]',()=>voucherForm({date:today(),vtype:'Issue to production',job:j.id,order:j.order,purity:j.purity,category:purityMetal(j.purity)||'Gold',location:cur}));
    on('[data-ret]',()=>voucherForm({date:today(),vtype:'Return from production',job:j.id,order:j.order,purity:j.purity,category:purityMetal(j.purity)||'Gold',location:SET.locations[0]}));
    on('[data-chl]',()=>challanForm({karigar:j.karigar,job:j.id,order:j.order,date:today(),lines:[{category:purityMetal(j.purity)||'Gold',purity:j.purity}]}));
    on('[data-blk]',()=>askReason('Block job '+j.no,'What is blocking it? (material, approval, machine, karigar…)',r=>save('jobs',{...j,status:'Blocked',blockReason:r},{action:'block',reason:r})));
    on('[data-unb]',()=>save('jobs',{...j,status:'In Progress',blockReason:''},{action:'unblock'}));
    on('[data-qc]',()=>qcForm({order:j.order,line:j.line,job:j.id,date:today()}));
    const stageForm=(fin)=>openForm({title:fin?`Finish ${j.no}`:`Complete stage: ${cur}`,value:{output:j.qty,accepted:j.qty,rejected:0,rework:0,finalPurity:j.purity},fields:[{k:'inWt',l:'Input wt (g)',t:'num'},{k:'outWt',l:'Output wt (g)',t:'num',req:!!fin},{k:'output',l:'Output qty',t:'num'},{k:'accepted',l:'Accepted',t:'num'},{k:'rejected',l:'Rejected',t:'num'},{k:'rework',l:'Rework',t:'num'},...(fin?[{k:'finalGross',l:'Final gross wt (g)',t:'num',req:1},{k:'finalPurity',l:'Verified purity',t:'sel',o:purOpts,req:1}]:[]),{k:'note',l:'Remarks',t:'ta',w:4}],
      async onSave(v){
        if(cur==='Quality Control'||(fin&&route.includes('Quality Control'))){const q=lineQCState(j.order,j.line);if(!['Pass','Released'].includes(q.label)&&!q.ok&&!(q.rec&&q.rec.result==='Pass')){toast('This item has no passing QC record yet. Record QC first.',true);return false}}
        const steps=[...(j.steps||[]),{stage:cur,ts:nowISO(),by:ME.id,...v}];
        const nx={...j,steps,actualStart:j.actualStart||nowISO(),output:v.output,accepted:v.accepted,rejected:num(j.rejected)+num(v.rejected),rework:num(j.rework)+num(v.rework)};
        if(fin){nx.status='Completed';nx.actualEnd=nowISO();nx.finalNet=v.outWt;nx.finalGross=v.finalGross;nx.finalPurity=v.finalPurity;
          await save('vouchers',{date:today(),vtype:'Finished goods receipt',category:'Finished Goods',purity:v.finalPurity,desc:j.product,gross:v.finalGross,net:v.outWt,fine:fineOf(v.outWt,v.finalPurity),pcs:v.accepted,order:j.order,job:j.id,location:'Dispatch Desk',status:'Approved',note:'Job completed'},{silent:1});
          const inF=issuedFine;const outF=fineOf(v.outWt,v.finalPurity);const d=r3(inF-outF);
          if(inF>0&&Math.abs(d)>0.0005)await save('wastage',{date:today(),source:'In-house process',ref:j.id,refNo:j.no,order:j.order,dept:cur,issuedFine:r3(inF),accountedFine:outF,recovered:0,variance:d,expectedPct:SET.wastageTolPct,status:'Pending'},{silent:1});
        }else{nx.step=(j.step||0)+1;nx.status='In Progress'}
        const s=await save('jobs',nx,{action:fin?'complete':'stage',reason:v.note});
        const o=orderOf(j.order);if(o){const lines=JSON.parse(JSON.stringify(o.lines||[]));const L=lines[j.line];if(L){const nextStage=route[nx.step||0];if(fin)L.status=lineQCState(o.id,j.line).ok?'Ready':'QC';else if(nextStage==='Quality Control')L.status='QC';}if(JSON.stringify(lines)!==JSON.stringify(o.lines))await save('orders',{...o,lines},{silent:1,action:'line status'})}
        setTimeout(()=>jobDetail(byId('jobs',s.id)||s),60)}});
    on('[data-next]',()=>stageForm(false));on('[data-fin]',()=>stageForm(true))}})}
