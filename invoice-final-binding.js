/* v36: final binding for all invoice and maintenance print/PDF actions */
(function(){
 function professional(id,title,isMnt){
   const build=window.buildProfessionalInvoice;if(!build)return null;
   if(isMnt){const m=(STORE.maintenance_estimates||[]).find(x=>x.id===id);if(!m)return null;const t={...m,amount:m.total_with_vat||m.total,subtotal:m.subtotal||m.total,vat:m.vat||0};return {html:build(title,t,m.items||m.units||[]),name:m.customer_name||'عميل',doc:m.doc_no||''}}
   const t=(STORE.custom_txns||[]).find(x=>x.id===id);if(!t)return null;const a=getAllAccountsLight().find(x=>x.sheet===t.sheet);return {html:build(title,t,t.items||[]),name:a?.name||t.customer_name||'عميل',doc:t.doc_no||''}
 }
 window.viewSaleInvoice=function(id){const r=professional(id,'فاتورة بيع',false);if(!r)return;const content=document.getElementById('statement-content');if(!content)return;content.innerHTML=`<button class="close" onclick="closeStatement()">×</button><div class="toolbar" style="margin-bottom:10px"><button class="btn" id="professional-print-invoice">🖨️ طباعة الفاتورة / PDF</button></div>${r.html}`;document.getElementById('professional-print-invoice').onclick=()=>printReport('فاتورة بيع '+r.doc,r.html);document.getElementById('statement-modal').classList.add('show')};
 window.exportSaleInvoicePdf=function(id){const r=professional(id,'فاتورة بيع',false);if(r)exportHtmlAsPDF(r.html,safeFileName(r.name)+' - فاتورة '+r.doc+'.pdf')};
 window.printMaintenanceEstimate=function(id){const r=professional(id,'مقايسة صيانة',true);if(r)printReport('مقايسة صيانة '+r.doc,r.html)};
 window.exportMaintenanceEstimatePdf=function(id){const r=professional(id,'مقايسة صيانة',true);if(r)exportHtmlAsPDF(r.html,safeFileName(r.name)+' - مقايسة صيانة '+r.doc+'.pdf')};
 window.__invoiceTemplateStatus={loaded:true,version:'v36',build:typeof window.buildProfessionalInvoice==='function'};
})();
