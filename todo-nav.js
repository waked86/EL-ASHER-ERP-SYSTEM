/* v29: prominent universal To-Do List section */
(function(){
 const btn=document.createElement('button');btn.dataset.tab='todo';btn.dataset.public='1';btn.innerHTML='<span class="ic">✅</span> To-Do List';document.getElementById('nav')?.insertBefore(btn,document.getElementById('nav').firstElementChild?.nextSibling||null);
 setTimeout(()=>{if(typeof SECTIONS!=='undefined'&&typeof renderUserTasks==='function'){SECTIONS.todo={title:'To-Do List',sub:'مهامك الشخصية والتنبيهات حتى الإكمال',standalone:true,render:renderUserTasks};btn.addEventListener('click',()=>{document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');goTo('todo')})}},0);
})();
