(function(){
  const style = document.createElement('style');
  style.textContent = '#erp-auth{position:fixed;inset:0;background:#F4FAFB;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}#erp-auth .box{background:#fff;border:1px solid #E7E1D3;border-radius:16px;padding:28px;max-width:440px;width:100%;box-shadow:0 12px 40px #0B3D4522;direction:rtl}#erp-auth h2{font-family:Tajawal,Cairo,sans-serif;color:#0B3D45;margin:0 0 8px}#erp-auth p{font-size:13px;color:#6B7280;line-height:1.8}#erp-auth input{display:block;width:100%;margin:10px 0;padding:11px;border:1px solid #E7E1D3;border-radius:8px;font-family:Cairo;font-size:14px}#erp-auth button{width:100%;border:0;border-radius:8px;background:#0B3D45;color:#fff;padding:11px;font-family:Cairo;font-weight:700;cursor:pointer}#erp-auth .err{color:#C1443D;font-size:12px;margin:8px 0;min-height:18px}.cloud-user{font-size:11px;color:#6FC3D6;margin-top:4px}';
  document.head.appendChild(style);
  const auth = document.createElement('div'); auth.id='erp-auth';
  auth.innerHTML='<div class="box"><h2>نظام مصنع العاشر</h2><p id="erp-auth-note">جاري الاتصال بالنظام المركزي...</p><div id="erp-auth-form"></div><div class="err" id="erp-auth-error"></div></div>';
  document.body.appendChild(auth);
  const form = document.getElementById('erp-auth-form'), note = document.getElementById('erp-auth-note'), error = document.getElementById('erp-auth-error');
  let syncTimer;
  function setForm(setup){
    note.textContent = setup ? 'أنشئ حساب المدير الأول للنظام. بعد ذلك يمكنك إضافة باقي المستخدمين.' : 'سجّل الدخول للوصول إلى بيانات المصنع من أي جهاز.';
    form.innerHTML = (setup ? '<input id="erp-name" placeholder="اسم المدير" autocomplete="name">' : '') + '<input id="erp-user" placeholder="اسم المستخدم" autocomplete="username">' + '<input id="erp-pass" type="password" placeholder="كلمة المرور" autocomplete="current-password">' + '<button id="erp-submit">'+(setup?'إنشاء حساب المدير':'تسجيل الدخول')+'</button>';
    document.getElementById('erp-submit').onclick = async function(){
      error.textContent=''; const username=document.getElementById('erp-user').value.trim(), password=document.getElementById('erp-pass').value; const body={username,password}; if(setup) body.displayName=document.getElementById('erp-name').value.trim()||username;
      try { const r=await fetch(setup?'/api/auth/setup':'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'تعذر التنفيذ'); await beginSync(d.user); } catch(e){ error.textContent=e.message; }
    };
  }
  async function beginSync(user){
    try { const r=await fetch('/api/state'); const d=await r.json(); if(!r.ok) throw new Error(d.error||'تعذر تحميل البيانات');
      const local = STORE; if(d.state && typeof d.state==='object' && Object.keys(d.state).length){ STORE=Object.assign({custom_txns:[],custom_accounts:[],expenses:[]},d.state); localStorage.setItem(STORE_KEY,JSON.stringify(STORE)); }
      else if(local && (local.custom_txns?.length || local.custom_accounts?.length || local.expenses?.length)){ await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:local})}); }
      auth.remove(); document.body.dataset.user=user.username; const title=document.querySelector('#topbar .sub'); if(title){ const badge=document.createElement('div'); badge.className='cloud-user'; badge.textContent='متصل: '+user.displayName; title.appendChild(badge); }
      if(typeof goTo==='function'){ const active=document.querySelector('#nav button.active'); goTo(active?.dataset.tab||'overview'); }
    } catch(e){ error.textContent=e.message; setForm(false); }
  }
  window.saveStore = function(){ try{ localStorage.setItem(STORE_KEY,JSON.stringify(STORE)); clearTimeout(syncTimer); syncTimer=setTimeout(async()=>{ try{ await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state:STORE})}); }catch(e){ console.error('تعذر مزامنة البيانات',e); } },300); }catch(e){ console.error('تعذر الحفظ',e); } };
  fetch('/api/auth/status').then(r=>r.json()).then(d=>setForm(!!d.setupRequired)).catch(()=>{ error.textContent='تعذر الوصول للخادم. تأكد أن Railway أنهى التشغيل ثم أعد تحميل الصفحة.'; setForm(false); });
})();
