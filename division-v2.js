/* v30: real division tagging for new records; legacy data remains central */
(function(){
 const scoped=['custom_txns','custom_accounts','inventory_items','inventory_moves','purchase_orders','production_orders','equipment_receipts','maintenance_estimates','quotes','temp_workers','worker_payments'];
 function ids(){const out=new Set();scoped.forEach(k=>(Array.isArray(STORE[k])?STORE[k]:[]).forEach(x=>x&&(x.id||x.sheet||x.name)&&out.add(x.id||x.sheet||x.name)));return out}
 function tagNew(){if(!STORE._division_known_ids){STORE._division_known_ids=Array.from(ids());return}const known=new Set(STORE._division_known_ids);const d=typeof CURRENT_DIVISION==='string'?CURRENT_DIVISION:'all';scoped.forEach(k=>{if(!Array.isArray(STORE[k]))return;STORE[k].forEach(x=>{const key=x&&(x.id||x.sheet||x.name);if(!key)return;if(!known.has(key)){x.division=d;known.add(key)}})});STORE._division_known_ids=Array.from(known)}
 const originalSave=saveStore;saveStore=function(){tagNew();return originalSave.apply(this,arguments)};
 const originalGoTo=goTo;goTo=function(tab){const d=typeof CURRENT_DIVISION==='string'?CURRENT_DIVISION:'all';if(d==='all')return originalGoTo(tab);const backups={};scoped.forEach(k=>{if(Array.isArray(STORE[k])){backups[k]=STORE[k];STORE[k]=STORE[k].filter(x=>x&&x.division===d)}});try{return originalGoTo(tab)}finally{Object.keys(backups).forEach(k=>STORE[k]=backups[k])}};
 window.setDivisionReal=function(div){CURRENT_DIVISION=div;document.querySelectorAll('.division-chip').forEach(c=>c.classList.toggle('active',c.dataset.div===div));const b=document.querySelector('#nav button.active');if(b)goTo(b.dataset.tab);};
 setTimeout(()=>{document.querySelectorAll('.division-chip').forEach(c=>{c.onclick=()=>window.setDivisionReal(c.dataset.div)});},0);
})();
