/* previte — movimento. GSAP + ScrollTrigger, ospitati in locale.
   Senza script o con "riduci movimento" la pagina resta com'è: niente viene nascosto dal CSS. */
(function () {
  var W = window, D = document;
  var CSS =
    '.mv-h{position:relative;width:fit-content;max-width:100%;' +
    'clip-path:inset(-.25em calc(100% - var(--mvb,100%)) -.25em 0)}' +
    '.mv-h::after{content:"";position:absolute;left:0;right:0;top:-.24em;bottom:-.1em;' +
    'background:var(--red,#E5352B);clip-path:inset(0 0 0 var(--mva,100%));pointer-events:none}';

  function all(sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }
  var done = typeof WeakSet === 'function' ? new WeakSet() : null;
  function fresh(els) {
    return els.filter(function (e) {
      if (!done || done.has(e)) return false;
      done.add(e);
      return true;
    });
  }

  var io = null, jobs = typeof WeakMap === 'function' ? new WeakMap() : null;
  function seen(el, fn) {
    if (!io) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          var f = jobs.get(e.target);
          if (f) { jobs.delete(e.target); f(e.target); }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    }
    jobs.set(el, fn);
    io.observe(el);
  }

  var parallaxDone = false;

  function init(root) {
    var gsap = W.gsap;
    if (!gsap || !jobs || !('IntersectionObserver' in W)) return;
    if (W.matchMedia && W.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    root = root || D;

    /* Tastiera: se il focus arriva su qualcosa non ancora animato, lo mostra subito */
    if (!W.__mvFocus) {
      W.__mvFocus = true;
      D.addEventListener('focusin', function (ev) {
        for (var e = ev.target; e && e !== D.body; e = e.parentElement) {
          var f = jobs.get(e);
          if (f) { jobs.delete(e); if (io) io.unobserve(e); f(e); }
          if (e.style && e.style.opacity === '0') gsap.set(e, { opacity: 1, clearProps: 'transform' });
        }
      }, true);
    }

    if (!D.getElementById('mv-css')) {
      var st = D.createElement('style');
      st.id = 'mv-css';
      st.textContent = CSS;
      D.head.appendChild(st);
    }

    /* 1. Titoli: un blocco rosso attraversa la riga e scopre il testo */
    fresh(all('h2.h, h2.h2b, h2.h2, h2.sfh, .cta2 h2', root), 'h').forEach(function (h) {
      h.style.opacity = '0';
      seen(h, function () {
        h.classList.add('mv-h');
        h.style.setProperty('--mva', '0%');
        h.style.setProperty('--mvb', '0%');
        h.style.opacity = '';
        gsap.timeline({
          onComplete: function () {
            h.classList.remove('mv-h');
            h.style.removeProperty('--mva');
            h.style.removeProperty('--mvb');
          }
        })
          .to(h, { '--mvb': '100%', duration: 0.5, ease: 'power3.inOut' })
          .to(h, { '--mva': '100%', duration: 0.55, ease: 'power3.inOut' }, '>-0.02');
      });
    });

    /* 2. Griglie e righe: entrano in sequenza, i quadratini rossi si timbrano */
    var groups = [
      ['.cd', ':scope > div'], ['.places', ':scope > *'], ['.ex', ':scope > *'],
      ['.wl', ':scope > .wi'], ['.cells', ':scope > .cell'], ['.nl', ':scope > .ni'],
      ['.oth', ':scope > *'], ['.sf', ':scope > *']
    ];
    groups.forEach(function (g) {
      fresh(all(g[0], root), 'g').forEach(function (box) {
        var kids = all(g[1], box);
        if (!kids.length) return;
        var dots = all('.wi > i', box);
        var nums = all('.num', box);
        var finals = nums.map(function (n) { return n.textContent; });
        gsap.set(kids, { opacity: 0, y: 34 });
        if (dots.length) gsap.set(dots, { scale: 0 });
        nums.forEach(function (n) { if (/^\d+$/.test(n.textContent.trim())) n.textContent = '0'; });
        seen(box, function () {
          gsap.to(kids, {
            opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.09,
            clearProps: 'opacity,transform'
          });
          if (dots.length) gsap.to(dots, {
            scale: 1, duration: 0.5, ease: 'back.out(2.6)', stagger: 0.09, delay: 0.25,
            clearProps: 'transform'
          });
          nums.forEach(function (n, i) {
            var end = parseInt(finals[i], 10);
            if (!/^\d+$/.test(finals[i].trim())) return;
            var o = { v: 0 };
            gsap.to(o, {
              v: end, duration: 1.5, ease: 'power3.out', delay: 0.1 + i * 0.09,
              onUpdate: function () { n.textContent = String(Math.round(o.v)); },
              onComplete: function () { n.textContent = finals[i]; }
            });
          });
        });
      });
    });

    /* 3. Novità: le righe salgono una dopo l'altra */
    var rows = fresh(all('.n', root), 'n');
    if (rows.length) {
      var first = rows[0].parentNode;
      gsap.set(rows, { opacity: 0, y: 26 });
      seen(first, function () {
        gsap.to(rows, {
          opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.06,
          clearProps: 'opacity,transform'
        });
      });
    }

    /* 4. Piede: il grande "previte" sale, il quadrato rosso arriva per ultimo */
    fresh(all('.big2', root), 'b').forEach(function (b) {
      var sq = b.querySelector('i');
      gsap.set(b, { yPercent: 38, opacity: 0 });
      if (sq) gsap.set(sq, { scale: 0 });
      seen(b, function () {
        var tl = gsap.timeline();
        tl.to(b, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', clearProps: 'opacity,transform' });
        if (sq) tl.to(sq, { scale: 1, duration: 0.5, ease: 'back.out(3)', clearProps: 'transform' }, '-=0.45');
      });
    });

    /* 5. Apertura: scorrendo, la scritta e le foto restano indietro (solo schermi larghi) */
    var ST = W.ScrollTrigger;
    var hero = (root.querySelector ? root : D).querySelector('.hero#top, section.hero .wall');
    if (ST && hero && !parallaxDone) {
      if (!hero.id) hero = hero.parentNode;
      var wall = hero.querySelector('.wall'), duo = hero.querySelector('.duo');
      if (wall && duo) {
        parallaxDone = true;
        gsap.registerPlugin(ST);
        gsap.matchMedia().add('(min-width:901px)', function () {
          var t = ST.create({
            trigger: hero, start: 'top top', end: 'bottom top',
            onUpdate: function (s) {
              var p = s.progress;
              wall.style.translate = '0 ' + (p * 22).toFixed(2) + 'vh';
              duo.style.translate = '0 ' + (p * 9).toFixed(2) + 'vh';
            }
          });
          return function () { t.kill(); wall.style.translate = ''; duo.style.translate = ''; };
        });
      }
    }
  }

  W.PreviteMotion = { init: init };
  if (D.currentScript && D.currentScript.getAttribute('data-auto') !== 'off') {
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { init(); });
    else init();
  }
})();
