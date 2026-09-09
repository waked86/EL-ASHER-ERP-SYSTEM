/* v37: prevent native customer list from opening before search */
(function(){
 const ids=[['sale-customer','dl-sale-customers'],['mnt-customer','dl-mnt-customers'],['coll-customer','dl-coll-customers']];
 function listFor(id){return typeof getAllAccountsLight==='function'?getAllAccountsLight().filter(a=>a.type==='customer'):[]}
 function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
 function prepare(input,list){if(!input||!list)return;input.removeAttribute('list');list.innerHTML='';input.dataset.lazyCustomer='1'}
 function update(input,list){const q=(input.value||'').trim().toLowerCase();if(q.length<2){input.removeAttribute('list');list.innerHTML='';return}const rows=listFor().filter(a=>(a.name||'').toLowerCase().includes(q)||String(a.code||'').toLowerCase().includes(q)).slice(0,12);list.innerHTML=rows.map(a=>`<option value="${esc(a.name)}">${esc(a.code||'')} | ${esc(a.name)}</option>`).join('');if(rows.length)input.setAttribute('list',list.id);else input.removeAttribute('list')}
 function bind(){ids.forEach(([ii,li])=>{const input=document.getElementById(ii),list=document.getElementById(li);prepare(input,list)})}
 document.addEventListener('focusin',e=>{if(ids.some(x=>x[0]===e.target.id)){const list=document.getElementById(ids.find(x=>x[0]===e.target.id)[1]);prepare(e.target,list)}},true);
 document.addEventListener('input',e=>{const pair=ids.find(x=>x[0]===e.target.id);if(pair){const list=document.getElementById(pair[1]);update(e.target,list)}},true);
 setTimeout(bind,0);setTimeout(bind,150);setTimeout(bind,500);
})();
