document.querySelectorAll('[data-route]').forEach(el=>{
 el.addEventListener('click',e=>{
  e.preventDefault();
  const r=e.target.dataset.route;
  if(!r)return;
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('visible',p.dataset.page===r));
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.dataset.route===r));
 });
});
