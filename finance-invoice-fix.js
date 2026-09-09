/* v35: enforce invoice PDF template and clean finance classification */
(function(){
 // Remove payroll from expense classification and add cafeteria/buffet.
 if(typeof EXPENSE_CATS!=='undefined'){
   for(let i=EXPENSE_CATS.length-1;i>=0;i--) if(EXPENSE_CATS[i]==='رواتب وأجور') EXPENSE_CATS.splice(i,1);
   if(!EXPENSE_CATS.includes('بوفيه')) EXPENSE_CATS.push('بوفيه');
 }
 // One-time migration: old payroll expense rows become employee salary-payment records.
 if(!STORE._payroll_expenses_migrated){
   STORE.salary_payments=STORE.salary_payments||[];
   const old=(STORE.expenses||[]).filter(e=>e.category==='رواتب وأجور');
   old.forEach(e=>STORE.salary_payments.push({id:uid('salary'),doc_no:'SAL-LEGACY-'+e.id,date:e.date,period_from:e.date,period_to:e.date,base_salary:Number(e.amount||0),advances_deducted:0,overtime_total:0,deductions_total:0,net_paid:Number(e.amount||0),note:'منقول تلقائيًا من المصروفات القديمة'}));
   STORE.expenses=(STORE.expenses||[]).filter(e=>e.category!=='رواتب وأجور');
   STORE._payroll_expenses_migrated=true;saveStore();
 }
 // Guard: every new expense is explicitly tagged as an expense and can never become a purchase.
 const oldAddExpense=window.addExpense;window.addExpense=function(x){x={...x,type:'expense',category:x.category==='رواتب وأجور'?'أخرى':x.category};return oldAddExpense(x)};
 // Ensure the dedicated HR salary/advances area remains the payroll source of truth.
 if(typeof SECTIONS!=='undefined'&&SECTIONS.hr){const sub=SECTIONS.hr.subs.find(s=>s.key==='advances');if(sub)sub.label='الرواتب والسلف وكشف المرتب'}
 // Replace legacy PDF exporters so the professional invoice/estimate layout is used by the PDF button too.
 const build=window.buildProfessionalInvoice;
 if(build){window.exportSaleInvoicePdf=function(id){const t=(STORE.custom_txns||[]).find(x=>x.id===id);if(!t)return;const a=getAllAccountsLight().find(x=>x.sheet===t.sheet);const html=build('فاتورة بيع',t,t.items||[]);exportHtmlAsPDF(html,safeFileName(a?.name||'عميل')+' - فاتورة '+(t.doc_no||'')+'.pdf')};window.exportMaintenanceEstimatePdf=function(id){const m=(STORE.maintenance_estimates||[]).find(x=>x.id===id);if(!m)return;const t={...m,amount:m.total_with_vat||m.total,subtotal:m.subtotal||m.total,vat:m.vat||0};const html=build('مقايسة صيانة',t,m.items||m.units||[]);exportHtmlAsPDF(html,safeFileName(m.customer_name||'عميل')+' - مقايسة صيانة '+(m.doc_no||'')+'.pdf')}}
})();
