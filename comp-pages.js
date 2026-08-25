/* Apex service pages — interaction layer for the comp-driven templates. */
(function () {
  'use strict';

  /* mobile menu ---------------------------------------------------------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-mobile-menu]');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('is-open', !open);
      menu.setAttribute('aria-hidden', String(open));
      document.body.classList.toggle('menu-open', !open);
    });
    menu.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) toggle.click();
    });
  }

  /* protocols dropdown — keyboard/touch parity with the hover state ------- */
  var drop = document.querySelector('.nav-drop');
  if (drop) {
    var btn = drop.querySelector('button');
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      drop.classList.toggle('is-open', !open);
    });
    document.addEventListener('click', function (ev) {
      if (!drop.contains(ev.target)) {
        btn.setAttribute('aria-expanded', 'false');
        drop.classList.remove('is-open');
      }
    });
  }

  /* FAQ accordion -------------------------------------------------------- */
  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      q.setAttribute('aria-expanded',
        q.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
  });

  /* video lightbox ------------------------------------------------------- */
  var box = document.querySelector('[data-lightbox]');
  var stage = document.querySelector('[data-lightbox-stage]');
  var closeBtn = document.querySelector('[data-lightbox-close]');
  var lastTrigger = null;

  function closeBox() {
    if (!box || box.hidden) return;
    stage.innerHTML = '';
    box.hidden = true;
    document.body.classList.remove('lightbox-open');
    if (lastTrigger) lastTrigger.focus();
  }

  function openBox(src, kind, title, poster) {
    if (!box) return;
    stage.innerHTML = '';
    var el;
    if (kind === 'youtube') {
      el = document.createElement('iframe');
      el.src = src;
      el.title = title || 'Video';
      el.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      el.setAttribute('allowfullscreen', '');
    } else {
      el = document.createElement('video');
      el.src = src;
      el.controls = true;
      el.autoplay = true;
      el.playsInline = true;
      if (poster) el.poster = poster;
      if (title) el.setAttribute('aria-label', title);
    }
    stage.appendChild(el);
    box.hidden = false;
    document.body.classList.add('lightbox-open');
    closeBtn.focus();
  }

  document.querySelectorAll('[data-video]').forEach(function (t) {
    t.addEventListener('click', function () {
      lastTrigger = t;
      openBox(t.dataset.video, t.dataset.videoKind, t.dataset.videoTitle, t.dataset.videoPoster);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeBox);
  if (box) {
    box.addEventListener('click', function (ev) {
      if (ev.target === box) closeBox();
    });
  }
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') closeBox();
  });

  /* footer year ---------------------------------------------------------- */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
