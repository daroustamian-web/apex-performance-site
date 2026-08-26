(function(){
  const body=document.body;
  const toggle=document.querySelector('[data-menu-toggle]');
  const menu=document.querySelector('[data-mobile-menu]');
  if(toggle&&menu){
    toggle.addEventListener('click',()=>{
      const open=toggle.getAttribute('aria-expanded')!=='true';
      toggle.setAttribute('aria-expanded',String(open));
      menu.classList.toggle('open',open);
      menu.setAttribute('aria-hidden',String(!open));
      body.classList.toggle('menu-open',open);
    });
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      toggle.setAttribute('aria-expanded','false');menu.classList.remove('open');menu.setAttribute('aria-hidden','true');body.classList.remove('menu-open');
    }));
  }
  document.querySelectorAll('.faq-question').forEach(button=>{
    button.addEventListener('click',()=>{
      const expanded=button.getAttribute('aria-expanded')==='true';
      button.setAttribute('aria-expanded',String(!expanded));
    });
  });
  document.querySelectorAll('[data-year]').forEach(el=>{el.textContent=new Date().getFullYear()});
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.querySelectorAll('.hero-video').forEach(video=>{video.pause();video.removeAttribute('autoplay')});
  }
  fetch('/site-config.json').then(r=>r.ok?r.json():Promise.reject()).then(config=>{
    const slug=body.dataset.service;
    const url=(config.serviceBookingUrls&&config.serviceBookingUrls[slug])||config.defaultBookingUrl;
    if(!url)return;
    document.querySelectorAll('[data-booking-cta]').forEach(button=>{
      button.disabled=false;
      button.removeAttribute('aria-disabled');
      button.addEventListener('click',()=>{window.location.href=url});
    });
    document.querySelectorAll('[data-booking-note]').forEach(note=>{note.hidden=true});
  }).catch(()=>{});
})();
