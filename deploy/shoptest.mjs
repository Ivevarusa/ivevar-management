import puppeteer from 'puppeteer-core';
const B='http://127.0.0.1:8789';
const J=(p,b,t)=>fetch(B+p,{method:b?'POST':'GET',headers:{'content-type':'application/json',...(t?{authorization:'Bearer '+t}:{})},body:b?JSON.stringify(b):undefined}).then(r=>r.json().then(j=>({s:r.status,j})));
const a=(await J('/api/setup',{name:'Ankit',email:'owner@ivevar.com',password:'testpass123'})).j.token;
const hook=(await J('/api/shopify/hook',null,a)).j.url;console.log('hook url ok:',/\/api\/hook\/shopify\/[a-f0-9]{48}$/.test(hook));
const order={id:18957396771131,name:'IV-COM-1152',created_at:'2026-10-22T17:48:36Z',email:'will@example.com',phone:null,currency:'USD',total_price:'2961.00',financial_status:'paid',note:'Please engrave inside: W & J 2026',note_attributes:[{name:'Ring size confirmed',value:'Yes'}],order_status_url:'https://ivevar.com/x',
 customer:{first_name:'Will',last_name:'Marston',email:'will@example.com'},shipping_address:{name:'Will Marston',address1:'3591 S Lithium Dr',city:'West Valley City',province:'Utah',zip:'84119',country:'United States'},
 line_items:[{title:'1 CT Round Moissanite Pendant',quantity:1,price:'0.00',sku:'FREE PENDENT',product_id:1,variant_title:null,properties:[]},{title:'Marquise Cut Lab Diamond Bridal Set',quantity:1,price:'3525.00',sku:'IVRDLR143',product_id:2,variant_title:'18K Yellow Gold / 3.00',properties:[{name:'Engraving',value:'Forever W&J'},{name:'_hidden',value:'x'}]},{title:'Tip',quantity:1,price:'141.00',sku:null,product_id:null,variant_title:null,properties:[]}]};
const post=(u,b,h={})=>fetch(u,{method:'POST',headers:{'content-type':'application/json','x-shopify-shop-domain':'ivevarluxury.myshopify.com',...h},body:JSON.stringify(b)}).then(r=>r.json().then(j=>({s:r.status,j})));
console.log('wrong key:',(await post(B+'/api/hook/shopify/abc',order)).s);
console.log('create:',JSON.stringify((await post(hook,order)).j));
console.log('repeat (update):',JSON.stringify((await post(hook,{...order,financial_status:'paid'})).j));
const sy=(await J('/api/sync?since=0',null,a)).j;const o=sy.docs.find(d=>d.coll==='orders').body;
console.log('orders:',sy.docs.filter(d=>d.coll==='orders').length,'customers:',sy.docs.filter(d=>d.coll==='customers').length);
console.log('order:',o.no,o.extRef,o.channel,o.saleValue,o.paidOnline,'lines:',o.lines.map(l=>`${l.desc} | ${l.variant} | metal=${l.metal} size=${l.size} | ${JSON.stringify(l.props)}`).join(' || '));
console.log('notes:',JSON.stringify(o.instructions));
const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.setViewport({width:1400,height:900});await p.goto(B+'/',{waitUntil:'domcontentloaded'});await new Promise(x=>setTimeout(x,800));
await p.type('#lEmail','owner@ivevar.com');await p.type('#lPw','testpass123');await p.click('#lf button[type=submit]');await new Promise(x=>setTimeout(x,1500));
await p.evaluate(()=>orderDetail(S.orders[0]));await new Promise(x=>setTimeout(x,500));await p.screenshot({path:'shop_order.png'});
const [pop]=await Promise.all([new Promise(r=>b.once('targetcreated',t=>r(t.page()))),p.evaluate(()=>printOrder(S.orders[0]))]);await new Promise(x=>setTimeout(x,800));
await pop.evaluate(()=>{window.print=()=>{}});await pop.setViewport({width:900,height:1100});await pop.screenshot({path:'order_print.png'});
console.log('errors',errs);await b.close();
