const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'change-this-secret-in-railway';
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
const ALL_PERMISSIONS = ['overview.view','sales.view','sales.invoice.create','sales.targets.edit','customers.view','customers.edit','purchases.view','purchases.receipt.create','production.view','production.order.create','finance.view','finance.edit','inventory.view','inventory.edit','hr.view','hr.edit','crm.view','crm.edit','products.view','products.edit','users.manage'];
const ADMIN_PERMISSIONS = Object.fromEntries(ALL_PERMISSIONS.map(k => [k, true]));
app.use(express.json({ limit: '25mb' })); app.use(cookieParser());
async function dbReady() {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  await pool.query(`CREATE TABLE IF NOT EXISTS app_users (id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, display_name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'staff', permissions JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb`);
  await pool.query(`CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY DEFAULT 1, state JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS app_state_history (id SERIAL PRIMARY KEY, state JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}
async function maybeSnapshot(state) {
  // نسخة احتياطية تلقائية: أول حفظة كل يوم بتتسجل كنسخة تاريخية، والنسخ الأقدم من 60 يوم بتتنضف تلقائي
  const last = await pool.query(`SELECT created_at FROM app_state_history ORDER BY created_at DESC LIMIT 1`);
  const lastDay = last.rows[0] ? new Date(last.rows[0].created_at).toDateString() : null;
  if (lastDay !== new Date().toDateString()) {
    await pool.query(`INSERT INTO app_state_history(state) VALUES($1)`, [JSON.stringify(state)]);
    await pool.query(`DELETE FROM app_state_history WHERE created_at < NOW() - INTERVAL '60 days'`);
  }
}
function sign(user) { return jwt.sign({ id:user.id, username:user.username, displayName:user.display_name, role:user.role, permissions:user.role==='admin'?ADMIN_PERMISSIONS:(user.permissions||{}) }, jwtSecret, {expiresIn:'7d'}); }
function currentUser(req) { try { return jwt.verify(req.cookies.erp_session || '', jwtSecret); } catch (_) { return null; } }
function requireAuth(req,res,next) { const user=currentUser(req); if(!user) return res.status(401).json({error:'غير مسجل الدخول'}); req.user=user; next(); }
function requireAdmin(req,res,next) { requireAuth(req,res,()=> req.user.role==='admin' ? next() : res.status(403).json({error:'هذه العملية للمدير فقط'})); }
function safeUser(row) { return {id:row.id,username:row.username,displayName:row.display_name,role:row.role,permissions:row.role==='admin'?ADMIN_PERMISSIONS:(row.permissions||{})}; }
app.get('/api/health',async(_req,res)=>{try{await dbReady();res.json({ok:true,database:true})}catch(e){res.status(503).json({ok:false,database:false,error:e.message})}});
app.get('/api/auth/status',async(_req,res)=>{try{await dbReady();const r=await pool.query('SELECT COUNT(*)::int AS count FROM app_users');res.json({setupRequired:r.rows[0].count===0})}catch(e){res.status(500).json({error:'تعذر الاتصال بقاعدة البيانات'})}});
app.get('/api/auth/me',(req,res)=>{const u=currentUser(req);res.json({user:u||null})});
app.post('/api/auth/setup',async(req,res)=>{try{await dbReady();const count=await pool.query('SELECT COUNT(*)::int AS count FROM app_users');if(count.rows[0].count>0)return res.status(409).json({error:'تم إعداد النظام بالفعل'});const username=String(req.body.username||'').trim().toLowerCase(),password=String(req.body.password||''),displayName=String(req.body.displayName||username).trim();if(!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<8)return res.status(400).json({error:'اسم المستخدم يجب أن يكون 3 أحرف على الأقل وكلمة المرور 8 أحرف على الأقل'});const hash=await bcrypt.hash(password,12);const r=await pool.query('INSERT INTO app_users(username,password_hash,display_name,role,permissions) VALUES($1,$2,$3,$4,$5) RETURNING *',[username,hash,displayName,'admin',JSON.stringify(ADMIN_PERMISSIONS)]);res.cookie('erp_session',sign(r.rows[0]),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000});res.json({user:safeUser(r.rows[0])})}catch(e){res.status(500).json({error:'تعذر إنشاء حساب المدير'})}});
app.post('/api/auth/login',async(req,res)=>{try{await dbReady();const username=String(req.body.username||'').trim().toLowerCase(),password=String(req.body.password||'');const r=await pool.query('SELECT * FROM app_users WHERE username=$1',[username]);if(!r.rows[0]||!(await bcrypt.compare(password,r.rows[0].password_hash)))return res.status(401).json({error:'اسم المستخدم أو كلمة المرور غير صحيحة'});res.cookie('erp_session',sign(r.rows[0]),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000});res.json({user:safeUser(r.rows[0])})}catch(e){res.status(500).json({error:'تعذر تسجيل الدخول'})}});
app.post('/api/auth/logout',(_req,res)=>{res.clearCookie('erp_session');res.json({ok:true})});
app.get('/api/users',requireAdmin,async(_req,res)=>{try{await dbReady();const r=await pool.query('SELECT id,username,display_name,role,permissions,created_at FROM app_users ORDER BY id');res.json({users:r.rows.map(safeUser)})}catch(e){res.status(500).json({error:'تعذر تحميل المستخدمين'})}});
app.post('/api/users',requireAdmin,async(req,res)=>{try{await dbReady();const username=String(req.body.username||'').trim().toLowerCase(),password=String(req.body.password||''),displayName=String(req.body.displayName||username).trim(),role=req.body.role==='admin'?'admin':'staff',permissions=req.body.permissions&&typeof req.body.permissions==='object'?req.body.permissions:{};if(!/^[a-z0-9._-]{3,40}$/.test(username)||password.length<8)return res.status(400).json({error:'اسم المستخدم إنجليزي 3 أحرف على الأقل وكلمة المرور 8 أحرف على الأقل'});const hash=await bcrypt.hash(password,12);const r=await pool.query('INSERT INTO app_users(username,password_hash,display_name,role,permissions) VALUES($1,$2,$3,$4,$5) RETURNING id,username,display_name,role,permissions',[username,hash,displayName,role,JSON.stringify(role==='admin'?ADMIN_PERMISSIONS:permissions)]);res.json({user:safeUser(r.rows[0])})}catch(e){res.status(e.code==='23505'?409:500).json({error:e.code==='23505'?'اسم المستخدم موجود بالفعل':'تعذر إنشاء المستخدم'})}});
app.put('/api/users/:id',requireAdmin,async(req,res)=>{try{await dbReady();const id=Number(req.params.id),displayName=String(req.body.displayName||'').trim(),role=req.body.role==='admin'?'admin':'staff',permissions=req.body.permissions&&typeof req.body.permissions==='object'?req.body.permissions:{};const fields=['display_name=$1','role=$2','permissions=$3'],vals=[displayName,role,JSON.stringify(role==='admin'?ADMIN_PERMISSIONS:permissions),id];if(req.body.password){if(String(req.body.password).length<8)return res.status(400).json({error:'كلمة المرور 8 أحرف على الأقل'});fields.push('password_hash=$4');vals.splice(3,0,await bcrypt.hash(String(req.body.password),12));}const r=await pool.query(`UPDATE app_users SET ${fields.join(',')} WHERE id=$${vals.length} RETURNING id,username,display_name,role,permissions`,vals);res.json({user:safeUser(r.rows[0])})}catch(e){res.status(500).json({error:'تعذر تعديل المستخدم'})}});
app.delete('/api/users/:id',requireAdmin,async(req,res)=>{try{await dbReady();if(Number(req.params.id)===req.user.id)return res.status(400).json({error:'لا يمكن حذف المستخدم الحالي'});await pool.query('DELETE FROM app_users WHERE id=$1',[Number(req.params.id)]);res.json({ok:true})}catch(e){res.status(500).json({error:'تعذر حذف المستخدم'})}});
app.get('/api/state',requireAuth,async(_req,res)=>{try{await dbReady();const r=await pool.query('SELECT state FROM app_state WHERE id=1');res.json({state:r.rows[0]?.state||null})}catch(e){res.status(500).json({error:'تعذر تحميل البيانات'})}});
app.put('/api/state',requireAuth,async(req,res)=>{try{await dbReady();const state=req.body.state;if(!state||typeof state!=='object'||Array.isArray(state))return res.status(400).json({error:'بيانات غير صالحة'});await maybeSnapshot(state);await pool.query(`INSERT INTO app_state(id,state,updated_at) VALUES(1,$1,NOW()) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW()`,[JSON.stringify(state)]);res.json({ok:true,updatedAt:new Date().toISOString()})}catch(e){res.status(500).json({error:'تعذر حفظ البيانات'})}});
app.get('/api/state/history',requireAdmin,async(_req,res)=>{try{await dbReady();const r=await pool.query('SELECT id,created_at FROM app_state_history ORDER BY created_at DESC');res.json({backups:r.rows})}catch(e){res.status(500).json({error:'تعذر تحميل النسخ الاحتياطية'})}});
app.post('/api/state/restore/:id',requireAdmin,async(req,res)=>{try{await dbReady();const r=await pool.query('SELECT state FROM app_state_history WHERE id=$1',[Number(req.params.id)]);if(!r.rows[0])return res.status(404).json({error:'نسخة غير موجودة'});const state=r.rows[0].state;await pool.query(`INSERT INTO app_state_history(state) SELECT state FROM app_state WHERE id=1`);await pool.query(`INSERT INTO app_state(id,state,updated_at) VALUES(1,$1,NOW()) ON CONFLICT(id) DO UPDATE SET state=EXCLUDED.state,updated_at=NOW()`,[JSON.stringify(state)]);res.json({ok:true})}catch(e){res.status(500).json({error:'تعذر استرجاع النسخة'})}});
app.post('/api/ai/summarize',requireAuth,async(req,res)=>{
  try{
    const key = process.env.GEMINI_API_KEY;
    if(!key) return res.status(503).json({error:'مفتاح الذكاء الاصطناعي غير مضبوط على السيرفر بعد'});
    const prompt = String(req.body.prompt||'').slice(0,8000);
    if(!prompt) return res.status(400).json({error:'لا يوجد نص لتحليله'});
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+encodeURIComponent(key), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
    });
    const d = await r.json();
    if(!r.ok) return res.status(502).json({error: d?.error?.message || 'تعذر الاتصال بخدمة الذكاء الاصطناعي'});
    const text = d?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
    if(!text) return res.status(502).json({error:'لم يرجع رد من خدمة الذكاء الاصطناعي'});
    res.json({text});
  }catch(e){ res.status(500).json({error:'خطأ غير متوقع: '+e.message}); }
});
app.get('*',(_req,res)=>res.sendFile(path.join(__dirname,'index.html')));
(async()=>{try{if(pool)await dbReady();app.listen(port,()=>console.log(`ERP server listening on ${port}`))}catch(e){console.error(e);process.exit(1)}})();
