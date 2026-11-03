/* Ivevar Management — Cloudflare Worker
 * Bindings required: DB (D1 database), FILES (R2 bucket)
 * Optional secrets: PEPPER (password pepper), LEAD_KEY (website enquiry hook key)
 * The web app HTML is injected at build time as __APP_HTML__.
 */
const APP_HTML = __APP_HTML__;
const PBKDF2_ITER = 25000; // kept moderate for the Workers free-plan CPU budget; a server-side pepper adds strength
const SESSION_DAYS = 7;

/* ---------- module / permission model (mirrors the web app) ---------- */
const MODS = ['dashboard','crm','quotes','orders','designs','purchase','inventory','production','karigars','wastage','qc','dispatch','accounts','hr','reports','masters','setup','audit'];
const LV = { none: 0, view: 1, edit: 2, approve: 3 };
const COLL_MOD = { tasks:'dashboard', punch:'dashboard', messages:'chat', cash:'accounts', leads:'crm', quotes:'quotes', orders:'orders', designs:'designs', pos:'purchase', vouchers:'inventory', pieces:'inventory', jobs:'production', karigars:'karigars', challans:'karigars', wastage:'wastage', qc:'qc', dispatches:'dispatch', invoices:'accounts', receipts:'accounts', bills:'accounts', payments:'accounts', expenses:'accounts', customers:'masters', suppliers:'masters', employees:'hr', attendance:'hr' };
// collections every signed-in user may read (reference data needed across screens)
const READ_ALL = ['customers','suppliers','karigars','designs','orders','jobs','qc','dispatches','challans','vouchers','pieces','employees','wastage'];
// extra modules whose EDIT right also allows writing this collection (workflow side-effects)
const WRITE_ALT = { orders:['production','qc','dispatch','quotes','accounts'], vouchers:['production','karigars','purchase','dispatch'], pieces:['orders','dispatch'], customers:['crm','quotes'], wastage:['production','karigars'], expenses:['hr','karigars'], cash:['hr'], leads:['quotes'], challans:['production'], qc:['production'] };
const NUMBERED = ['tasks','cash','leads','quotes','orders','designs','pos','vouchers','pieces','jobs','challans','wastage','qc','dispatches','invoices','receipts','bills','payments','expenses','customers','suppliers','karigars','employees'];
// ---------- job-title presets for Ivevar Office users (modules they get + modules they may approve) ----------
const OFFICE_MODS = MODS.filter(m => !['setup','audit'].includes(m));
const TITLE_MODS = {
  CEO: OFFICE_MODS,
  Accountant: ['dashboard','orders','purchase','inventory','accounts','hr','reports','masters','dispatch'],
  Sales: ['dashboard','quotes','orders','inventory','dispatch'],
  Courier: ['dashboard','orders','qc','dispatch','inventory'],
  Helper: ['dashboard','orders','dispatch','inventory']
};
const TITLE_APPROVE = {
  CEO: OFFICE_MODS,
  Accountant: ['purchase','inventory','accounts','hr','reports','masters'],
  Sales: [],
  Courier: ['dispatch'],
  Helper: []
};
function effMods(user) { return Array.isArray(user.modules) ? user.modules.slice() : []; } // what the admin ticked is exactly what they get
const OUT_TYPES = ['Issue to production','Issue to karigar','Dispatch','Transfer out','Refining out','Scrap out'];

function defaultPerms() {
  const all = v => Object.fromEntries(MODS.map(m => [m, v]));
  const p = { admin: all('approve'), office: { ...all('edit'), setup: 'none', audit: 'none' }, manager: all('approve'), employee: all('none'), accountant: all('none'), qc: all('none'), dispatch: all('none') };
  p.manager.setup = 'view'; p.manager.audit = 'view';
  Object.assign(p.employee, { dashboard:'view', crm:'edit', quotes:'edit', orders:'edit', designs:'edit', inventory:'view', production:'edit', karigars:'edit', qc:'view', dispatch:'view', masters:'view', reports:'view' });
  Object.assign(p.accountant, { dashboard:'view', orders:'view', purchase:'approve', inventory:'view', karigars:'view', wastage:'view', accounts:'approve', hr:'approve', reports:'view', masters:'edit' });
  Object.assign(p.qc, { dashboard:'view', orders:'view', designs:'view', production:'edit', qc:'approve', wastage:'edit' });
  Object.assign(p.dispatch, { dashboard:'view', orders:'view', qc:'view', dispatch:'approve', inventory:'view', accounts:'view' });
  return p;
}
const defaultNumbering = { leads:'LEAD', quotes:'QTN', orders:'JWL', designs:'DSN', pos:'PO', vouchers:'STK', pieces:'IVP', jobs:'JOB', challans:'CHL', wastage:'WST', qc:'QC', dispatches:'DSP', invoices:'INV', receipts:'RCP', bills:'BIL', payments:'PAY', expenses:'EXP', cash:'CB', tasks:'TSK', customers:'CUS', suppliers:'SUP', karigars:'KAR', employees:'EMP' };
const defaultPurities = [{n:'24K',p:99.9,m:'Gold'},{n:'22K',p:91.6,m:'Gold'},{n:'18K',p:75.0,m:'Gold'},{n:'14K',p:58.5,m:'Gold'},{n:'10K',p:41.7,m:'Gold'},{n:'925 Silver',p:92.5,m:'Silver'},{n:'999 Silver',p:99.9,m:'Silver'},{n:'PT950',p:95.0,m:'Platinum'}];

/* ---------- helpers ---------- */
const json = (o, status = 200, headers = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const err = (msg, status = 400) => json({ error: msg }, status);
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rid = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const r3 = v => Math.round(num(v) * 1000) / 1000;
async function sha256(s) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
async function hashPw(pw, salt, env) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw + '|' + (env.PEPPER || '')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITER }, key, 256);
  return hex(bits);
}
function safeEq(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

/* ---------- schema (created automatically on first request) ---------- */
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, created_at TEXT, last_login TEXT, failed INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER, last_seen INTEGER, ua TEXT)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS docs(coll TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(coll, id))`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS docs_upd ON docs(updated_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY, n INTEGER NOT NULL)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS config(k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at INTEGER)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT, user_id TEXT, user_name TEXT, coll TEXT, doc_id TEXT, ref_no TEXT, action TEXT, changes TEXT, reason TEXT)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS audit_coll ON audit(coll, id)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY, name TEXT, type TEXT, size INTEGER, user_id TEXT, created_at TEXT)`)
  ]);
  try { await env.DB.prepare(`ALTER TABLE users ADD COLUMN modules TEXT`).run(); } catch (e) { /* already added */ }
  try { await env.DB.prepare(`ALTER TABLE users ADD COLUMN meta TEXT`).run(); } catch (e) { /* already added */ }
  schemaReady = true;
}
async function getSettings(env) {
  const r = await env.DB.prepare(`SELECT v FROM config WHERE k='settings'`).first();
  return r ? JSON.parse(r.v) : null;
}
function permsOf(settings) { return (settings && settings.perms) || defaultPerms(); }
function can(user, settings, mod, lvl = 'view') {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'office') {
    if (mod === 'setup' || mod === 'audit') return false;
    // legacy office user (no title, no module list) keeps full edit access
    if (!user.title && !Array.isArray(user.modules)) { const p = defaultPerms().office; return (LV[p[mod] || 'none'] || 0) >= LV[lvl]; }
    if (mod === 'dashboard') return LV[lvl] <= LV.view;
    const ap = (user.title && TITLE_APPROVE[user.title]) || [];
    const em = effMods(user);
    if (lvl === 'approve') return ap.includes(mod) && em.includes(mod);
    return em.includes(mod);
  }
  if (Array.isArray(user.modules)) {
    if (mod === 'setup' || mod === 'audit') return false;
    if (mod === 'dashboard') return LV[lvl] <= LV.view;
    return user.modules.includes(mod) && LV[lvl] <= LV.edit;
  }
  const p = ((settings && settings.perms) || {})[user.role] || defaultPerms()[user.role] || {};
  return (LV[p[mod] || 'none'] || 0) >= LV[lvl];
}
function purityPct(settings, n) { const p = ((settings && settings.purities) || defaultPurities).find(x => x.n === n); return p ? num(p.p) : 0; }

/* ---------- auth ---------- */
const parseMods = v => { try { const a = JSON.parse(v || 'null'); return Array.isArray(a) ? a : null; } catch (e) { return null; } };
const parseMeta = v => { try { const o = JSON.parse(v || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };

function cookieToken(req) { const c = req.headers.get('cookie') || ''; const m = c.match(/(?:^|;\s*)erp_s=([a-f0-9]{64})/); return m ? m[1] : null; }
async function authUser(req, env) {
  const h = req.headers.get('authorization') || '';
  const url = new URL(req.url);
  const tok = (h.startsWith('Bearer ') ? h.slice(7).trim() : null) || cookieToken(req) || url.searchParams.get('t');
  if (!tok || !/^[a-f0-9]{64}$/.test(tok)) return null;
  const th = await sha256(tok);
  const s = await env.DB.prepare(`SELECT s.user_id, s.last_seen, u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`).bind(th).first();
  if (!s) return null;
  const now = Date.now();
  if (!s.active || now - s.last_seen > SESSION_DAYS * 864e5) { await env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(th).run(); return null; }
  if (now - s.last_seen > 10 * 60e3) await env.DB.prepare(`UPDATE sessions SET last_seen=? WHERE token_hash=?`).bind(now, th).run();
  const meta = parseMeta(s.meta);
  return { id: s.id, email: s.email, name: s.name, role: s.role, active: !!s.active, modules: s.role === 'admin' ? null : parseMods(s.modules), title: s.role === 'admin' ? '' : (meta.title || ''), shift: meta.shift || null, salary: num(meta.salary), phone: meta.phone || '', dept: meta.dept || '', commPct: num(meta.commPct), tokenHash: th };
}
async function newSession(env, user, req) {
  const tok = rid(32);
  await env.DB.prepare(`INSERT INTO sessions(token_hash,user_id,created_at,last_seen,ua) VALUES(?,?,?,?,?)`).bind(await sha256(tok), user.id, Date.now(), Date.now(), (req.headers.get('user-agent') || '').slice(0, 200)).run();
  await env.DB.prepare(`UPDATE users SET last_login=?, failed=0, locked_until=0 WHERE id=?`).bind(new Date().toISOString(), user.id).run();
  return tok;
}
const sessCookie = tok => `erp_s=${tok}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
const pubUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, modules: u.role === 'admin' ? null : (Array.isArray(u.modules) ? u.modules : parseMods(u.modules)), title: u.title || '', shift: u.shift || null, salary: num(u.salary), phone: u.phone || '', dept: u.dept || '', commPct: num(u.commPct) });

/* ---------- audit ---------- */
function diff(a, b) {
  const out = {}; const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    if (['updatedAt', 'updatedBy', 'id'].includes(k)) continue;
    const x = JSON.stringify((a || {})[k]), y = JSON.stringify((b || {})[k]);
    if (x !== y) { const cut = v => { const j = JSON.stringify(v); return j && j.length > 400 ? j.slice(0, 400) + '…' : v; }; out[k] = { old: cut((a || {})[k]) ?? null, new: cut((b || {})[k]) ?? null }; }
  }
  return out;
}
async function writeAudit(env, user, coll, docId, refNo, action, changes, reason) {
  await env.DB.prepare(`INSERT INTO audit(ts,user_id,user_name,coll,doc_id,ref_no,action,changes,reason) VALUES(?,?,?,?,?,?,?,?,?)`)
    .bind(new Date().toISOString(), user ? user.id : null, user ? user.name : 'System', coll, docId || '', refNo || '', action, JSON.stringify(changes || {}), (reason || '').slice(0, 1000)).run();
}

/* ---------- business-rule enforcement on save ---------- */
async function getDoc(env, coll, id) { const r = await env.DB.prepare(`SELECT body FROM docs WHERE coll=? AND id=? AND deleted=0`).bind(coll, id).first(); return r ? JSON.parse(r.body) : null; }
function changedKeys(a, b) { return Object.keys(diff(a, b)).filter(k => !['updatedAt', 'updatedBy', 'createdAt', 'createdBy', 'no'].includes(k)); }

async function enforce(env, user, settings, coll, before, doc) {
  const A = mod => can(user, settings, mod, 'approve');
  const isNew = !before;
  const ch = isNew ? [] : changedKeys(before, doc);
  if (coll === 'vouchers') {
    // fine weight is always recomputed on the server from the configured purity
    if (doc.purity && doc.net !== '' && doc.net != null) doc.fine = r3(num(doc.net) * purityPct(settings, doc.purity) / 100);
    if (isNew) {
      if (doc.vtype === 'Adjustment') { if (!doc.dir || !doc.reason) return 'Adjustments need a direction and a reason.'; doc.status = 'Pending'; }
      else doc.status = 'Approved';
      if (['Gold', 'Silver', 'Platinum'].includes(doc.category) && !doc.purity) return 'Metal vouchers need a purity.';
      if (!num(doc.net) && !num(doc.pcs) && !num(doc.carat)) return 'Enter net weight, pieces or carat.';
    } else {
      const allowed = ['status', 'approvedBy', 'approvedAt', 'rejectedBy'];
      if (ch.some(k => !allowed.includes(k))) return 'Stock vouchers cannot be edited. Post a reversal instead.';
      if (before.status !== 'Pending') return 'Only pending adjustments can be approved or rejected.';
      if (!A('inventory')) return 'You do not have approval rights for stock adjustments.';
      if (doc.status === 'Approved' && before.createdBy === user.id && user.role !== 'admin') return 'Maker-checker: another authorised user must approve this adjustment.';
      if (doc.status === 'Approved') { doc.approvedBy = user.id; doc.approvedAt = new Date().toISOString(); }
    }
  }
  if (coll === 'quotes') {
    let sub = 0; (doc.lines || []).forEach(l => sub += num(l.qty || 1) * (num(l.wt) * num(l.rate) + num(l.making) + num(l.stone) + num(l.other)));
    const pct = sub ? num(doc.discount) / sub * 100 : 0;
    const lim = num((settings && settings.discLimitPct) ?? 5);
    if (pct > lim && !A('quotes')) {
      if (['Approved', 'Sent', 'Accepted'].includes(doc.status) && (!before || before.approvedBy == null || ch.includes('discount') || ch.includes('lines'))) doc.status = 'Awaiting Approval';
    }
    if (doc.status === 'Approved' && (!before || before.status !== 'Approved') && pct > lim && !A('quotes')) return 'Only an approver can approve a discount above the limit.';
    if (doc.status === 'Approved' && (!before || before.status !== 'Approved') && A('quotes')) { doc.approvedBy = doc.approvedBy || user.id; }
  }
  if (coll === 'orders') {
    const uid2 = (user._real || user).id;
    // stage pipeline (sales can advance) — record stage history
    if (!isNew && doc.stage && before.stage !== doc.stage) {
      const sh = doc.stageHistory || before.stageHistory || []; const last = sh[sh.length - 1];
      if (!last || last.to !== doc.stage) doc.stageHistory = [...sh, { ts: new Date().toISOString(), by: uid2, from: before.stage || '', to: doc.stage }];
    }
    // payments: only an accounts/CEO approver may verify a payment screenshot; stamp the verifier
    if (Array.isArray(doc.payments)) {
      const canVerify = A('accounts') || A('orders');
      const bp = (before && before.payments) || [];
      for (const p of doc.payments) {
        const prev = bp.find(x => x && x.pid && x.pid === p.pid);
        if (p.verified && (!prev || !prev.verified)) {
          if (!canVerify) return 'Only an accountant or admin can verify a payment.';
          p.verifiedBy = uid2; p.verifiedAt = new Date().toISOString();
        }
        if (!p.verified) { p.verifiedBy = null; p.verifiedAt = null; }
      }
    }
    if (!isNew && ['Cancelled', 'Closed'].includes(doc.status) && doc.status !== before.status && !A('orders')) return 'Only managers can cancel or close orders.';
    if (!isNew && !can(user, settings, 'orders', 'edit')) {
      const ok = ['lines', 'status', 'history', 'stage', 'stageHistory', 'payments', 'qcPhotos', 'qcShared', 'qcApproved', 'productPhotos'];
      if (ch.some(k => !ok.includes(k))) return 'You can only update order progress (stage, payments, QC photos).';
    }
    if (!isNew && before.status !== doc.status) {
      const h = doc.history || []; const last = h[h.length - 1];
      if (!last || last.to !== doc.status) doc.history = [...h, { ts: new Date().toISOString(), by: uid2, from: before.status, to: doc.status, note: 'Status change' }];
    }
  }
  if (coll === 'pieces') {
    if (!doc.name && !doc.sku) return 'Give the piece a name or SKU.';
    if (doc.status === 'Sold' && !doc.soldDate) doc.soldDate = new Date().toISOString().slice(0, 10);
  }
  if (coll === 'messages') {
    const uid2 = (user._real || user).id;
    if (isNew) {
      doc.from = uid2; doc.at = new Date().toISOString();
      const ch = String(doc.channel || '');
      if (ch !== 'office' && !(ch.startsWith('dm:') && ch.slice(3).split('|').includes(uid2))) return 'You can only message the group or your own conversations.';
      doc.text = String(doc.text || '').slice(0, 4000);
      if (!doc.text.trim() && !doc.image) return 'Write a message.';
      doc.reactions = doc.reactions && typeof doc.reactions === 'object' ? doc.reactions : {};
    } else {
      // only the sender may edit/delete text; anyone in the channel may toggle their own reaction
      const changed = changedKeys(before, doc);
      const onlyReactions = changed.length > 0 && changed.every(k => k === 'reactions');
      if (!onlyReactions && before.from !== uid2) return 'You can only react to other people\'s messages.';
      doc.from = before.from; doc.at = before.at; doc.channel = before.channel; doc.createdBy = before.createdBy;
    }
  }
  if (coll === 'qc') {
    if (doc.released && !(before && before.released)) {
      if (!A('qc')) return 'Only QC approvers can release items for dispatch.';
      if (doc.result !== 'Pass') return 'Only passed items can be released.';
      doc.releasedBy = user.id; doc.releasedAt = new Date().toISOString();
    }
    if (isNew) doc.inspector = user.id;
  }
  if (coll === 'dispatches') {
    if (doc.status === 'Dispatched' && (!before || before.status !== 'Dispatched')) {
      if (!A('dispatch')) return 'Only dispatch approvers can release a shipment.';
      if (!doc.tracking && doc.courier !== 'Hand delivery') return 'Tracking number is required.';
      const { results } = await env.DB.prepare(`SELECT body FROM docs WHERE coll='qc' AND deleted=0`).all();
      const qcs = results.map(r => JSON.parse(r.body)).filter(q => q.order === doc.order);
      for (const l of doc.lines || []) {
        const recs = qcs.filter(q => String(q.line) === String(l.line)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        const last = recs[0];
        if (!last || last.result !== 'Pass' || !last.released) return `Item #${num(l.line) + 1} is not QC-released. Dispatch blocked.`;
      }
      doc.shippedBy = user.id; doc.shippedAt = new Date().toISOString();
    }
  }
  if (coll === 'wastage') {
    if (!isNew && before.status === 'Pending' && ['Approved', 'Rejected'].includes(doc.status)) {
      if (!A('wastage')) return 'Only approvers can decide on wastage.';
      const exp = num(doc.issuedFine) * num(doc.expectedPct) / 100;
      if (doc.status === 'Approved' && num(doc.variance) - exp > 0.0005 && !doc.explanation) return 'Explain the variance before approving it as wastage.';
      doc.decidedBy = user.id;
    }
    if (!isNew && before.status !== 'Pending' && ch.length) return 'Decided wastage records cannot be changed.';
    if (isNew) { doc.status = 'Pending'; doc.variance = r3(num(doc.issuedFine) - num(doc.accountedFine) - (doc.source === 'Karigar' ? num(doc.recovered) : num(doc.recovered))); }
  }
  if (coll === 'cash') {
    if (!['Income', 'Expense', 'Transfer'].includes(doc.type)) return 'Entry type must be Income, Expense or Transfer.';
    if (!(num(doc.amount) > 0)) return 'Amount must be more than 0.';
    if (!doc.account) return 'Choose the account.';
    if (doc.type === 'Transfer' && (!doc.to || doc.to === doc.account)) return 'A transfer needs two different accounts.';
    doc.amount = Math.round(num(doc.amount) * 100) / 100;
  }
  if (coll === 'pos') {
    if (doc.status === 'Approved' && (!before || before.status !== 'Approved') && !A('purchase')) doc.status = 'Awaiting Approval';
  }
  if (coll === 'designs') {
    if (doc.approvedRev != null && (!before || before.approvedRev !== doc.approvedRev)) {
      if (!A('designs')) return 'Only approvers can approve a design revision.';
      doc.approvedBy = user.id;
    }
    if (before && before.revisions) {
      // approved revision files can never be removed or replaced
      const ar = before.approvedRev; const o = (before.revisions || []).find(r => r.v === ar); const n = (doc.revisions || []).find(r => r.v === ar);
      if (o && (!n || JSON.stringify(o.files || []) !== JSON.stringify(n.files || []))) return 'An approved revision cannot be changed. Add a new revision.';
    }
  }
  if (coll === 'challans') {
    if (!isNew && (ch.includes('wageAdj') || (ch.includes('wagePaid') && doc.wagePaid)) && !(A('karigars') || can(user, settings, 'accounts', 'edit'))) return 'Only approvers or accounts can adjust or pay karigar wages.';
    if (!isNew && ch.includes('lines') && JSON.stringify(before.lines) !== JSON.stringify(doc.lines)) return 'Issued materials cannot be edited after the challan is posted.';
  }
  if (['invoices', 'receipts', 'bills', 'payments', 'expenses', 'cash'].includes(coll) && !isNew && ch.length && !A('accounts')) return 'Only an accounts approver can edit posted entries.';
  return null;
}

/* ---------- handlers ---------- */
async function saveTask(env, user, settings, t, action, reason) {
  const id = t.id && /^[A-Za-z0-9_.:-]{1,64}$/.test(t.id) ? t.id : null;
  const before = id ? await getDoc(env, 'tasks', id) : null;
  const admin = user.role === 'admin';
  if (!String(t.title || '').trim()) return err('Write what needs to be done.');
  if (!admin) {
    if (!before && t.assignedTo && t.assignedTo !== user.id) return err('Only the admin can give tasks to other people.', 403);
    if (before && before.assignedTo !== user.id && before.createdBy !== user.id) return err('This task is not yours.', 403);
    if (before && before.createdBy !== user.id) { const ch = changedKeys(before, t).filter(k => !['status', 'doneAt', 'doneNote', 'id'].includes(k)); if (ch.length) return err('You can only mark this task done.', 403); }
    if (!before) t.assignedTo = user.id;
  }
  if (t.status === 'Done' && (!before || before.status !== 'Done')) { t.doneAt = new Date().toISOString(); t.doneBy = user.id; }
  if (t.status !== 'Done') { t.doneAt = null; t.doneBy = null; }
  return handleSave(env, { ...user, role: 'admin', _real: user }, settings, { coll: 'tasks', doc: t, action: action || (before ? (t.status === 'Done' ? 'done' : 'update') : 'create'), reason }, true);
}
async function handleSave(env, user, settings, body, internal) {
  const { coll, doc: incoming, action, reason } = body || {};
  if (!COLL_MOD[coll]) return err('Unknown record type.');
  if (!incoming || typeof incoming !== 'object') return err('Nothing to save.');
  const mod = COLL_MOD[coll];
  if (coll === 'punch') return err('Use the Check in / Check out buttons.', 403);
  if (coll === 'tasks' && !internal) return saveTask(env, user, settings, incoming, action, reason);
  if (coll !== 'messages') {
    const mayWrite = can(user, settings, mod, 'edit') || (WRITE_ALT[coll] || []).some(m => can(user, settings, m, 'edit'));
    if (!mayWrite) return err('You do not have permission to change ' + coll + '.', 403);
  }
  const id = incoming.id && /^[A-Za-z0-9_.:-]{1,64}$/.test(incoming.id) ? incoming.id : null;
  const before = id ? await getDoc(env, coll, id) : null;
  const isNew = !before;
  const doc = { ...incoming };
  delete doc.id;
  const nowIso = new Date().toISOString();
  if (isNew) {
    doc.createdAt = nowIso; doc.createdBy = (user._real || user).id;
    if (NUMBERED.includes(coll) && !doc.no) {
      const yr = new Date().getFullYear();
      const pre = ((settings && settings.numbering) || defaultNumbering)[coll] || coll.slice(0, 3).toUpperCase();
      if (coll === 'orders') {
        // continuous Order ID: IVM01, IVM02, … (no year reset)
        const r = await env.DB.prepare(`INSERT INTO counters(name,n) VALUES('orders',1) ON CONFLICT(name) DO UPDATE SET n=n+1 RETURNING n`).first();
        doc.no = `IVM${String(r.n).padStart(2, '0')}`;
      } else {
        const r = await env.DB.prepare(`INSERT INTO counters(name,n) VALUES(?,1) ON CONFLICT(name) DO UPDATE SET n=n+1 RETURNING n`).bind(coll + ':' + yr).first();
        doc.no = `${pre}-${yr}-${String(r.n).padStart(6, '0')}`;
      }
    }
  } else {
    doc.createdAt = before.createdAt; doc.createdBy = before.createdBy; doc.no = before.no || doc.no;
  }
  doc.updatedAt = nowIso; doc.updatedBy = (user._real || user).id;
  const bad = await enforce(env, user, settings, coll, before, doc);
  if (bad) return err(bad, 403);
  const finalId = id || rid(8);
  const s = JSON.stringify(doc);
  if (s.length > 900000) return err('Record is too large.');
  await env.DB.prepare(`INSERT INTO docs(coll,id,body,updated_at,deleted) VALUES(?,?,?,?,0) ON CONFLICT(coll,id) DO UPDATE SET body=excluded.body, updated_at=excluded.updated_at, deleted=0`).bind(coll, finalId, s, Date.now()).run();
  if (coll !== 'attendance' || isNew) await writeAudit(env, user._real || user, coll, finalId, doc.no || doc.name || doc.date || '', action || (isNew ? 'create' : 'update'), diff(before, doc), reason);
  return json({ doc: { ...doc, id: finalId } });
}

async function handleSync(env, user, settings, url) {
  const since = parseInt(url.searchParams.get('since') || '0', 10) || 0;
  const start = Date.now();
  const { results } = await env.DB.prepare(`SELECT coll,id,body,deleted FROM docs WHERE updated_at > ? ORDER BY updated_at LIMIT 20000`).bind(since).all();
  const readable = c => READ_ALL.includes(c) || can(user, settings, COLL_MOD[c], 'view') ||
    (c === 'invoices' && can(user, settings, 'dispatch', 'view')) ||
    (c === 'cash' && can(user, settings, 'orders', 'view')) ||
    (c === 'expenses' && (can(user, settings, 'orders', 'view') || can(user, settings, 'karigars', 'view'))) ||
    (c === 'leads' && can(user, settings, 'quotes', 'view')) || (c === 'quotes' && can(user, settings, 'orders', 'view')) || (c === 'pos' && can(user, settings, 'inventory', 'view'));
  const hrOk = can(user, settings, 'hr', 'view');
  const accOk = can(user, settings, 'accounts', 'view');
  const docs = [], deleted = [];
  for (const r of results) {
    if (r.coll === 'tasks' || r.coll === 'punch') {
      if (user.role !== 'admin' && !r.deleted) { const t = JSON.parse(r.body); if (t.assignedTo !== user.id && t.createdBy !== user.id && t.user !== user.id) continue; }
    } else if (r.coll === 'messages') {
      if (!r.deleted) { const m = JSON.parse(r.body); const ch = String(m.channel || ''); if (ch !== 'office' && !(ch.startsWith('dm:') && ch.slice(3).split('|').includes(user.id))) continue; }
    } else if (!readable(r.coll)) continue;
    if (r.deleted) { deleted.push({ coll: r.coll, id: r.id }); continue; }
    let body = JSON.parse(r.body);
    if (r.coll === 'cash' && !accOk && !body.order) continue;
    if (r.coll === 'employees' && !hrOk) body = { no: body.no, name: body.name, dept: body.dept, designation: body.designation, status: body.status };
    docs.push({ coll: r.coll, id: r.id, body });
  }
  const out = { docs, deleted, now: start - 3000, me: pubUser(user) };
  if (since === 0 || (await env.DB.prepare(`SELECT updated_at FROM config WHERE k='settings'`).first())?.updated_at > since) {
    let s = settings || {};
    if (s.integrations && !can(user, settings, 'setup', 'view')) s = { ...s, integrations: { ...s.integrations, emailKey: '', waToken: '', waPhoneId: '' } };
    out.settings = s;
  }
  const { results: us } = await env.DB.prepare(`SELECT id,name,email,role,active,last_login,modules,meta FROM users ORDER BY name`).all();
  const seeHR = can(user, settings, 'hr', 'view') || can(user, settings, 'setup', 'view');
  out.users = us.map(u => { const m = parseMeta(u.meta); const base = { id: u.id, name: u.name, role: u.role, active: !!u.active, title: m.title || '', shift: m.shift || null, dept: m.dept || '' };
    if (can(user, settings, 'setup', 'view')) return { ...u, ...base, email: u.email, lastLogin: u.last_login, modules: parseMods(u.modules), salary: seeHR ? num(m.salary) : undefined, phone: m.phone || '', commPct: num(m.commPct) };
    if (seeHR) return { ...base, salary: num(m.salary), phone: m.phone || '' };
    return base; });
  return json(out);
}

async function handleUsers(env, user, settings, b) {
  if (!can(user, settings, 'setup', 'approve')) return err('Only admins can manage users.', 403);
  const ROLES = ['admin', 'office'];
  const email = String(b.email || '').trim().toLowerCase();
  if (!b.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('Name and a valid email are required.');
  if (!ROLES.includes(b.role)) return err('Unknown role.');
  if (b.role === 'admin' && user.role !== 'admin') return err('Only an admin can create another admin.', 403);
  if (b.password && String(b.password).length < 8) return err('Password must be at least 8 characters.');
  const okMods = MODS.filter(m => !['dashboard', 'chat', 'setup', 'audit'].includes(m));
  // explicit module list wins; otherwise fall back to the role preset
  const providedMods = Array.isArray(b.modules) ? b.modules : (b.title && TITLE_MODS[b.title] ? TITLE_MODS[b.title] : []);
  const mods = b.role === 'admin' ? null : JSON.stringify(providedMods.filter(m => okMods.includes(m)));
  const buildMeta = ex => { const m = ex ? parseMeta(ex.meta) : {};
    if (b.role === 'admin') { delete m.title; } else if (b.title != null) m.title = TITLE_MODS[b.title] || b.title === 'Custom' ? String(b.title).slice(0, 40) : (m.title || '');
    if (b.shiftStart != null || b.shiftEnd != null) m.shift = (b.shiftStart || b.shiftEnd) ? { start: String(b.shiftStart || '').slice(0, 5), end: String(b.shiftEnd || '').slice(0, 5) } : null;
    if (b.salary != null && b.salary !== '') m.salary = num(b.salary);
    if (b.commPct != null && b.commPct !== '') m.commPct = num(b.commPct); else if (b.commPct === '') delete m.commPct;
    if (b.phone != null) m.phone = String(b.phone).slice(0, 40);
    if (b.dept != null) m.dept = String(b.dept).slice(0, 40);
    return JSON.stringify(m); };
  if (b.id) {
    const ex = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(b.id).first();
    if (!ex) return err('User not found.', 404);
    if (ex.role === 'admin' && user.role !== 'admin') return err('Only an admin can change an admin.', 403);
    if (b.id === user.id && (!b.active || b.role !== user.role)) return err('You cannot deactivate yourself or change your own role.');
    const dupe = await env.DB.prepare(`SELECT id FROM users WHERE email=? AND id<>?`).bind(email, b.id).first();
    if (dupe) return err('Another user already uses this email.');
    await env.DB.prepare(`UPDATE users SET name=?, email=?, role=?, active=?, modules=?, meta=? WHERE id=?`).bind(b.name, email, b.role, b.active ? 1 : 0, mods, buildMeta(ex), b.id).run();
    if (b.password) { const salt = rid(16); await env.DB.prepare(`UPDATE users SET pw_hash=?, pw_salt=? WHERE id=?`).bind(await hashPw(b.password, salt, env), salt, b.id).run(); await env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(b.id).run(); }
    if (!b.active) await env.DB.prepare(`DELETE FROM sessions WHERE user_id=?`).bind(b.id).run();
    await writeAudit(env, user, 'users', b.id, b.name, 'update', diff({ name: ex.name, email: ex.email, role: ex.role, active: !!ex.active }, { name: b.name, email, role: b.role, active: !!b.active, ...(b.password ? { password: '(reset)' } : {}) }), '');
  } else {
    if (!b.password) return err('Set a password for the new user.');
    const dupe = await env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(email).first();
    if (dupe) return err('A user with this email already exists.');
    const id = 'u' + rid(6), salt = rid(16);
    await env.DB.prepare(`INSERT INTO users(id,email,name,role,active,pw_hash,pw_salt,created_at,modules,meta) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(id, email, b.name, b.role, b.active === false ? 0 : 1, await hashPw(b.password, salt, env), salt, new Date().toISOString(), mods, buildMeta(null)).run();
    await writeAudit(env, user, 'users', id, b.name, 'create', { name: { old: null, new: b.name }, email: { old: null, new: email }, role: { old: null, new: b.role }, title: { old: null, new: b.title || '' } }, '');
  }
  const { results } = await env.DB.prepare(`SELECT id,name,email,role,active,last_login,modules,meta FROM users ORDER BY name`).all();
  return json({ users: results.map(u => { const m = parseMeta(u.meta); return { id: u.id, name: u.name, email: u.email, role: u.role, active: !!u.active, lastLogin: u.last_login, modules: parseMods(u.modules), title: m.title || '', shift: m.shift || null, salary: num(m.salary), phone: m.phone || '', dept: m.dept || '', commPct: num(m.commPct) }; }) });
}

const ALLOWED_FILE = /^(image\/(png|jpe?g|webp|gif|heic|heif)|video\/.*|audio\/.*|application\/(pdf|zip|x-zip-compressed|octet-stream|sla|vnd\.ms-pki\.stl)|model\/.*|text\/plain|text\/csv)$/i;
const ALLOWED_EXT = /\.(png|jpe?g|webp|gif|heic|heif|mp4|mov|webm|m4v|avi|mkv|mp3|m4a|wav|ogg|aac|pdf|zip|stl|obj|3dm|step|stp|igs|iges|txt|csv|jcd|mgx)$/i;

async function route(req, env, ctx) {
  const url = new URL(req.url);
  const p = url.pathname;
  const sec = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };

  if (!p.startsWith('/api/') && !p.startsWith('/files/')) {
    if (p === '/healthz') return new Response('ok');
    if (p === '/sw.js' || p === '/service-worker.js') {
      // retire the previous app's offline service worker so every device loads the new ERP
      return new Response("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())await caches.delete(k);await self.registration.unregister();for(const c of await self.clients.matchAll({type:'window'}))c.navigate(c.url)})()));", { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (p === '/manifest.json' || p === '/manifest.webmanifest' || p === '/favicon.ico') return new Response('', { status: 404 });
    return new Response(APP_HTML, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-frame-options': 'SAMEORIGIN', ...sec,
      'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://flagcdn.com; connect-src 'self' https://countriesnow.space; frame-ancestors 'self'" } });
  }
  if (!env.DB) return err('Server is not connected to its database yet (D1 binding "DB" missing).', 500);
  await ensureSchema(env);
  const method = req.method;
  const body = async () => { try { return await req.json(); } catch (e) { return {}; } };

  /* public endpoints */
  if (p === '/api/status') { const c = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first(); return json({ needsSetup: !c.n, files: !!env.FILES }); }
  if (p === '/api/setup' && method === 'POST') {
    const c = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first();
    if (c.n) return err('Setup is already done. Please sign in.', 403);
    const b = await body(); const email = String(b.email || '').trim().toLowerCase();
    if (!b.name || !email || String(b.password || '').length < 8) return err('Enter your name, email and a password of at least 8 characters.');
    const id = 'u' + rid(6), salt = rid(16);
    await env.DB.prepare(`INSERT INTO users(id,email,name,role,active,pw_hash,pw_salt,created_at) VALUES(?,?,?,?,1,?,?,?)`).bind(id, email, b.name, 'admin', await hashPw(b.password, salt, env), salt, new Date().toISOString()).run();
    const user = { id, email, name: b.name, role: 'admin', active: true };
    await writeAudit(env, user, 'users', id, b.name, 'owner account created', {}, '');
    const tok = await newSession(env, user, req);
    return json({ token: tok, user: pubUser(user) }, 200, { 'set-cookie': sessCookie(tok) });
  }
  if (p === '/api/login' && method === 'POST') {
    const b = await body(); const email = String(b.email || '').trim().toLowerCase();
    const u = await env.DB.prepare(`SELECT * FROM users WHERE email=?`).bind(email).first();
    if (u && u.locked_until > Date.now()) return err('Too many wrong attempts. Try again in 15 minutes.', 429);
    const ok = u && u.active && safeEq(await hashPw(String(b.password || ''), u.pw_salt, env), u.pw_hash);
    if (!ok) {
      if (u) { const f = (u.failed || 0) + 1; await env.DB.prepare(`UPDATE users SET failed=?, locked_until=? WHERE id=?`).bind(f, f >= 5 ? Date.now() + 15 * 60e3 : 0, u.id).run(); }
      return err(u && !u.active ? 'This account is deactivated. Contact your admin.' : 'Wrong email or password.', 401);
    }
    const tok = await newSession(env, u, req);
    await writeAudit(env, u, 'auth', u.id, u.name, 'sign in', {}, (req.headers.get('user-agent') || '').slice(0, 120));
    return json({ token: tok, user: pubUser(u) }, 200, { 'set-cookie': sessCookie(tok) });
  }
  if (p.startsWith('/api/hook/shopify/') && method === 'POST') {
    // Shopify webhook: orders/create + orders/updated. Protected by a long random secret in the URL.
    const key = p.split('/').pop();
    const cfg = await env.DB.prepare(`SELECT v FROM config WHERE k='shopify_hook'`).first();
    if (!cfg || !key || !safeEq(key, cfg.v)) return err('Not allowed.', 403);
    let o; try { o = await req.json(); } catch (e) { return err('Bad JSON.'); }
    if (!o || !o.id || !o.line_items) return json({ ok: true, skipped: 'not an order' });
    const settings = await getSettings(env);
    const shop = req.headers.get('x-shopify-shop-domain') || '';
    const sys = { id: 'website', name: 'Website (Shopify)', role: 'admin', active: true };
    const docId = 'shp' + String(o.id).replace(/\D/g, '');
    const existing = await getDoc(env, 'orders', docId);
    const total = num(o.current_total_price || o.total_price);
    const paid = ['paid', 'partially_refunded'].includes(o.financial_status) ? total : (o.financial_status === 'partially_paid' ? total - num(o.total_outstanding) : 0);
    const cancelled = !!o.cancelled_at;
    if (existing) {
      const upd = { ...existing, id: docId, paidOnline: paid, financial: o.financial_status || '', shopNote: o.note || '', email: o.email || existing.email };
      if (cancelled && existing.status !== 'Cancelled') { upd.status = 'Cancelled'; upd.history = [...(existing.history || []), { ts: new Date().toISOString(), by: 'website', from: existing.status, to: 'Cancelled', note: 'Cancelled on Shopify' }]; }
      await handleSave(env, sys, settings, { coll: 'orders', doc: upd, action: 'shopify update' }, true);
      return json({ ok: true, updated: docId });
    }
    // customer: find by email, else create
    const c = o.customer || {}, sa = o.shipping_address || o.billing_address || {};
    const email = String(o.email || c.email || '').toLowerCase();
    const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || sa.name || email || 'Website customer';
    let custId = null;
    if (email) { const f = await env.DB.prepare(`SELECT id FROM docs WHERE coll='customers' AND deleted=0 AND lower(json_extract(body,'$.email'))=? LIMIT 1`).bind(email).first(); if (f) custId = f.id; }
    if (!custId) { const r = await handleSave(env, sys, settings, { coll: 'customers', doc: { name, email, phone: o.phone || c.phone || sa.phone || '', city: sa.city || '', country: sa.country || '', address: [sa.address1, sa.address2, sa.city, sa.province, sa.zip, sa.country].filter(Boolean).join(', '), type: 'Individual', source: 'Website' }, action: 'website order' }, true); custId = (await r.clone().json()).doc.id; }
    const lines = (o.line_items || []).filter(li => li.product_id || li.sku).map(li => {
      const v = String(li.variant_title || '');
      const metal = (v.match(/(10K|14K|18K|22K|24K|925|Silver|Platinum|PT950)[^/]*/i) || [''])[0].trim();
      const size = (v.split('/').map(x => x.trim()).find(x => /^\d+(\.\d+)?$/.test(x)) || '');
      const props = (li.properties || []).filter(x => x && x.name && !String(x.name).startsWith('_') && String(x.value || '').trim()).map(x => ({ name: String(x.name), value: String(x.value) }));
      return { desc: li.title || li.name || '', variant: v, metal, size, qty: num(li.quantity) || 1, price: num(li.price), sku: li.sku || '', props, productId: li.product_id || null, status: 'Pending', free: num(li.price) === 0 };
    });
    const notes = [o.note, ...(o.note_attributes || []).map(a => a && a.name ? `${a.name}: ${a.value}` : '')].filter(x => String(x || '').trim()).join('\n');
    const d = String(o.created_at || new Date().toISOString());
    const date = new Date(Date.parse(d) + 330 * 60000).toISOString().slice(0, 10);
    const doc = { id: docId, extRef: o.name || '', shopifyId: String(o.id), shop, channel: (shop.includes('ivevarluxury') || /ivevar\.com/i.test(o.order_status_url || '')) ? 'ivevar.com' : (shop || 'Website'),
      customer: custId, email, phone: o.phone || c.phone || sa.phone || '', date, dueDate: new Date(Date.parse(d) + 21 * 864e5 + 330 * 60000).toISOString().slice(0, 10),
      status: cancelled ? 'Cancelled' : 'Confirmed', priority: 'Normal', currency: o.currency || 'USD', saleValue: total, paidOnline: paid, financial: o.financial_status || '',
      shipTo: [sa.name, sa.address1, sa.address2, [sa.city, sa.province, sa.zip].filter(Boolean).join(' '), sa.country, sa.phone].filter(Boolean).join('\n'),
      instructions: notes, shopNote: o.note || '', lines, stage: 'Order received',
      history: [{ ts: new Date().toISOString(), by: 'website', to: 'Confirmed', note: 'Website order ' + (o.name || '') }] };
    await handleSave(env, sys, settings, { coll: 'orders', doc, action: 'website order' }, true);
    return json({ ok: true, created: docId });
  }
  if (p === '/api/lead' && method === 'POST') {
    // website enquiry form → CRM lead (requires the LEAD_KEY secret)
    if (!env.LEAD_KEY || req.headers.get('x-lead-key') !== env.LEAD_KEY) return err('Not allowed.', 403);
    const b = await body(); const settings = await getSettings(env);
    const sys = { id: 'system', name: 'Website', role: 'admin', active: true };
    if (!b.name || (!b.phone && !b.email)) return err('Name and phone or email are required.');
    const allowed = ['name', 'company', 'phone', 'email', 'city', 'country', 'category', 'qty', 'budget', 'notes', 'campaign', 'expectedDate'];
    const doc = { date: new Date().toISOString().slice(0, 16), source: b.source || 'Website', stage: 'New', priority: 'Warm' };
    allowed.forEach(k => { if (b[k] != null) doc[k] = String(b[k]).slice(0, 2000); });
    return handleSave(env, sys, settings, { coll: 'leads', doc, action: 'website enquiry' });
  }

  /* authenticated endpoints */
  const user = await authUser(req, env);
  if (!user) return err('Please sign in.', 401);
  const settings = await getSettings(env);

  if (p.startsWith('/files/')) {
    if (!env.FILES) return err('File storage is not connected.', 500);
    const id = p.slice(7).replace(/[^a-f0-9]/g, '');
    const obj = await env.FILES.get(id);
    if (!obj) return new Response('Not found', { status: 404 });
    const meta = await env.DB.prepare(`SELECT name,type FROM files WHERE id=?`).bind(id).first();
    return new Response(obj.body, { headers: { 'content-type': (meta && meta.type) || 'application/octet-stream', 'cache-control': 'private, max-age=86400', 'content-disposition': `inline; filename="${((meta && meta.name) || id).replace(/[^\w.\- ]/g, '_')}"`, ...sec } });
  }
  if (p === '/api/logout') { await env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(user.tokenHash).run(); return json({ ok: true }, 200, { 'set-cookie': 'erp_s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' }); }
  if (p === '/api/me') return json({ user: pubUser(user) });
  if (p === '/api/sync') return handleSync(env, user, settings, url);
  if (p === '/api/save' && method === 'POST') return handleSave(env, user, settings, await body());
  if (p === '/api/punch' && method === 'POST') {
    const b = await body(); const now = new Date(); const iso = now.toISOString();
    const date = new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
    const id = user.id + '_' + date;
    const ex = await getDoc(env, 'punch', id);
    // normalise to a sessions[] model (migrates older single in/out docs)
    let sessions = ex && Array.isArray(ex.sessions) ? ex.sessions.slice() : (ex && ex.in ? [{ in: ex.in, out: ex.out || null, report: ex.report || '', pending: ex.pending || '' }] : []);
    const loc = b.lat != null && b.lng != null ? { lat: num(b.lat), lng: num(b.lng), acc: num(b.acc) } : null;
    const photo = b.photo && (b.photo.url || b.photo.id) ? { url: String(b.photo.url || '').slice(0, 200), id: String(b.photo.id || '').slice(0, 40) } : null;
    const open = sessions.findIndex(s => s.in && !s.out);
    if (b.action === 'in') {
      if (open >= 0) return err('You are already checked in. Check out first.');
      sessions.push({ in: iso, inLoc: loc, inPhoto: photo });
    } else if (b.action === 'out') {
      if (open < 0) return err('Check in first.');
      const rep = String(b.report || '').trim(); if (rep.length < 10) return err('Write what you did (at least a line) before checking out.');
      sessions[open] = { ...sessions[open], out: iso, outLoc: loc, outPhoto: photo, report: rep.slice(0, 4000), pending: String(b.pending || '').trim().slice(0, 2000) };
    } else return err('Unknown action.');
    const doc = { user: user.id, date, sessions, createdAt: (ex && ex.createdAt) || iso, createdBy: (ex && ex.createdBy) || user.id, updatedAt: iso, updatedBy: user.id };
    // keep flat in/out of first & last for older views
    doc.in = sessions[0] && sessions[0].in; doc.out = (sessions[sessions.length - 1] || {}).out || null;
    await env.DB.prepare(`INSERT INTO docs(coll,id,body,updated_at,deleted) VALUES('punch',?,?,?,0) ON CONFLICT(coll,id) DO UPDATE SET body=excluded.body, updated_at=excluded.updated_at, deleted=0`).bind(id, JSON.stringify(doc), Date.now()).run();
    await writeAudit(env, user, 'punch', id, date, b.action === 'in' ? 'check in' : 'check out', {}, '');
    return json({ doc: { ...doc, id } });
  }
  if (p === '/api/delete' && method === 'POST') {
    const b = await body();
    if (user.role !== 'admin' && !(b.coll === 'cash' && can(user, settings, 'accounts', 'approve'))) return err('Only an admin can delete records. Use cancel or reverse instead.', 403);
    if (['vouchers', 'invoices', 'receipts', 'bills', 'payments'].includes(b.coll)) return err('Financial and stock records cannot be deleted. Post a reversal or credit entry.', 403);
    const before = await getDoc(env, b.coll, b.id); if (!before) return err('Not found.', 404);
    await env.DB.prepare(`UPDATE docs SET deleted=1, updated_at=? WHERE coll=? AND id=?`).bind(Date.now(), b.coll, b.id).run();
    await writeAudit(env, user, b.coll, b.id, before.no || before.name || '', 'delete', diff(before, {}), b.reason);
    return json({ ok: true });
  }
  if (p === '/api/settings' && method === 'POST') {
    if (!can(user, settings, 'setup', 'approve') && !can(user, settings, 'masters', 'edit')) return err('You cannot change settings.', 403);
    const b = await body(); const next = b.settings || {};
    const prev = settings || {};
    if (!can(user, settings, 'setup', 'approve')) {
      // masters editors may only change the simple lists
      const lists = ['categories', 'materials', 'departments', 'locations', 'leadSources', 'lostReasons', 'qcChecks', 'defects', 'expenseCats', 'couriers'];
      const d = Object.keys(diff(prev, next)).filter(k => !lists.includes(k));
      if (Object.keys(prev).length && d.length) return err('Only admins can change ' + d.join(', ') + '.', 403);
    }
    if (JSON.stringify(prev.perms || null) !== JSON.stringify(next.perms || null) && Object.keys(prev).length && user.role !== 'admin') return err('Only an admin can change permissions.', 403);
    await env.DB.prepare(`INSERT INTO config(k,v,updated_at) VALUES('settings',?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at`).bind(JSON.stringify(next), Date.now()).run();
    await writeAudit(env, user, 'config', 'settings', 'Settings', 'update', diff(prev, next), b.reason);
    return json({ settings: next });
  }
  if (p === '/api/users' && method === 'POST') return handleUsers(env, user, settings, await body());
  if (p === '/api/shopify/hook') {
    if (user.role !== 'admin') return err('Only admin.', 403);
    let r = await env.DB.prepare(`SELECT v FROM config WHERE k='shopify_hook'`).first();
    if (!r) { const k = rid(24); await env.DB.prepare(`INSERT INTO config(k,v,updated_at) VALUES('shopify_hook',?,?)`).bind(k, Date.now()).run(); r = { v: k }; await writeAudit(env, user, 'config', 'shopify_hook', 'Website orders', 'webhook address created', {}, ''); }
    return json({ url: new URL(req.url).origin + '/api/hook/shopify/' + r.v });
  }
  if (p === '/api/password' && method === 'POST') {
    const b = await body(); const u = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(user.id).first();
    if (!safeEq(await hashPw(String(b.old || ''), u.pw_salt, env), u.pw_hash)) return err('Current password is wrong.', 403);
    if (String(b.password || '').length < 8) return err('New password must be at least 8 characters.');
    const salt = rid(16);
    await env.DB.prepare(`UPDATE users SET pw_hash=?, pw_salt=? WHERE id=?`).bind(await hashPw(b.password, salt, env), salt, user.id).run();
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id=? AND token_hash<>?`).bind(user.id, user.tokenHash).run();
    await writeAudit(env, user, 'users', user.id, user.name, 'password changed', {}, '');
    return json({ ok: true });
  }
  if (p === '/api/upload' && method === 'POST') {
    if (!env.FILES) return err('File storage (R2 binding "FILES") is not connected yet.', 500);
    const fd = await req.formData(); const f = fd.get('file');
    if (!f || typeof f === 'string') return err('No file received.');
    if (f.size > 25 * 1024 * 1024) return err('File is larger than 25 MB.');
    if (!ALLOWED_FILE.test(f.type || '') && !ALLOWED_EXT.test(f.name || '')) return err('This file type is not allowed. Use images, PDF, CAD (STL/3DM/OBJ/STEP) or ZIP.');
    const id = rid(16);
    await env.FILES.put(id, f.stream(), { httpMetadata: { contentType: f.type || 'application/octet-stream' } });
    await env.DB.prepare(`INSERT INTO files(id,name,type,size,user_id,created_at) VALUES(?,?,?,?,?,?)`).bind(id, f.name, f.type, f.size, user.id, new Date().toISOString()).run();
    await writeAudit(env, user, 'files', id, f.name, 'upload', {}, '');
    return json({ id, url: '/files/' + id, type: f.type, name: f.name });
  }
  if (p === '/api/audit') {
    if (!can(user, settings, 'audit', 'view')) return err('No access to the audit log.', 403);
    const coll = url.searchParams.get('coll') || '', q = url.searchParams.get('q') || '';
    let sql = `SELECT * FROM audit WHERE 1=1`; const args = [];
    if (coll) { sql += ` AND coll=?`; args.push(coll); }
    if (q) { sql += ` AND (ref_no LIKE ? OR user_name LIKE ?)`; args.push('%' + q + '%', '%' + q + '%'); }
    sql += ` ORDER BY id DESC LIMIT 400`;
    const { results } = await env.DB.prepare(sql).bind(...args).all();
    return json({ rows: results });
  }
  if (p === '/api/log' && method === 'POST') { const b = await body(); await writeAudit(env, user, String(b.coll || 'reports').slice(0, 40), '', String(b.no || '').slice(0, 80), String(b.action || 'log').slice(0, 40), {}, String(b.reason || '')); return json({ ok: true }); }
  if (p === '/api/export') {
    if (!can(user, settings, 'setup', 'approve')) return err('Only admins can download a full backup.', 403);
    const { results } = await env.DB.prepare(`SELECT coll,id,body FROM docs WHERE deleted=0`).all();
    const data = {}; results.forEach(r => { (data[r.coll] = data[r.coll] || []).push({ id: r.id, ...JSON.parse(r.body) }); });
    await writeAudit(env, user, 'reports', '', 'Full backup', 'export', {}, results.length + ' records');
    return json({ exportedAt: new Date().toISOString(), settings, data });
  }
  return err('Not found.', 404);
}

export default {
  async fetch(req, env, ctx) {
    try { return await route(req, env, ctx); }
    catch (e) { console.error(e && e.stack || e); return err('Server error: ' + (e && e.message || e), 500); }
  }
};
