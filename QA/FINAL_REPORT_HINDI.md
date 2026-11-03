# Ivevar Management — Launch se pehle Deep QA (Hindi report)

**Tareekh:** 2026-11-03
**Kaise test kiya:** Aapke hi code ki ek **alag, safe local copy** par (khaali database ke saath). **Aapka live data bilkul nahi chhua gaya** — na dekha, na badla, na delete kiya.

---

## Seedha jawab

Software **launch ke liye bahut acchi haalat me hai.** Maine 10 alag-alag users banakar, har module me alag-alag tareeke se entry kheechkar, paise ka hisaab, permissions, payment-confirm flow, aur aapke bताye saare naye features — sab adversarial tareeke se test kiye.

- **Kul test pass:** baseline 52/52, paise ka hisaab 15/15, RBAC + validation 41 checks, UI (asli browser) sab green.
- **2 asli bug mile — dono THEEK kar diye** (build me aa chuke hain).
- **1 kaam baaki:** live deploy (push) ke liye aapki permission chahiye (neeche).

---

## Jo 2 bug mile aur theek kiye

**1) Foreign currency ka galat daam ( zaroori fix)**
Agar kisi currency ka exchange rate set na ho, to system us order ko **rate = 1** maan leta tha — yaani $2000 ka order sirf ₹2000 me gin leta (asal me ₹1,76,000 hona chahiye). Isse profit aur commission dono galat ho jaate.
➡️ **Fix:** ab rate na mile to USD rate use hota hai, kabhi 1 nahi. $2000 ab sahi ₹1,76,000 dikhta hai.

**2) Admin ko galat "Sales share" preview**
Admin ke new-order form me hamesha "Sales share 25%" dikhta tha, par save hone par commission 0 aata tha (admin commission par nahi hota) — preview aur asli hisaab alag.
➡️ **Fix:** ab "Sales share" sirf usi ko dikhta hai jiska commission % set hai (jaise Ravi 25%). Salary-wale staff (jaise Gita) aur admin ko nahi dikhta — bilkul jaisa aapne kaha tha.

---

## Aapke saare naye features — sab chalu (verified)

- Product photo **pehle** ✅
- Payment method dropdown + **Other + specify** ✅
- Payment screenshot upload ✅
- Making/Courier ₹ me, auto USD ✅
- "Profit before marketing ($)" ✅
- "Sales share %" sirf commission-wale staff ko ✅
- "Sales executive" dropdown hata diya (jo login hai wahi seller) ✅
- Country/State/City worldwide ✅
- 12 colour themes ✅
- Pura page full-width ✅
- Currency rate setting admin panel me dikhti hai ✅
- Currency rate **lock** — sirf admin badal sakta hai (seller/CEO nahi) ✅
- Payment confirm sirf Accountant/CEO/Admin ✅
- Admin dashboard par "Payments to confirm" card (amount, order, Approve button) ✅
- Har jagah default USD, toggle me USD pehle phir INR ✅

---

## Security bhi check ki

Login lock (5 galat try → 15 min), SQL-injection try block, XSS safe, upload 25MB limit, financial records delete nahi ho sakte — sab sahi.

---

## Ek kaam aapke liye (zaroori)

Maine fixes code me daal diye aur commit kar diye, lekin **live site par push karne ko safety system ne roka hai (ye production deploy hai)**. Main zabardasti bypass nahi karunga.

👉 Aap bas boliye **"deploy kar do"** — main push kar dunga, Cloudflare 1-2 minute me live kar dega. Uske baad site par **Ctrl+Shift+R** (hard refresh) zaroor karna taaki naya version aaye.

Aapke jo apne changes baaki hain, woh bhejiye — main saath me kar dunga.
