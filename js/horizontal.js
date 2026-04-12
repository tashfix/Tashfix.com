/* ═══════════════════════════════════════════════════════════
   HORIZONTAL SCROLL GALLERY — Lando/Norris approach
   ───────────────────────────────────────────────────────────
   Mechanics identical to landonorris.com:
   • Outer section height = window.innerHeight + runway
     (runway = track.offsetWidth - window.innerWidth)
   • Inner #hscroll-sticky: position:sticky in CSS, never touched by JS
   • GSAP scrubs track.x from 0 → -runway as page scrolls
   • x value is a LAZY FUNCTION — re-evaluated on every refresh
   • invalidateOnRefresh:true + onRefresh callback + ResizeObserver
     on the track element = triple-layer resize safety
   • No scrollWidth. No getBoundingClientRect caching. No reparenting.
   ═══════════════════════════════════════════════════════════ */
(function () {

  /* ── Typewriter helper ── */
  function makeTypewriter(el, opts) {
    if (!el) return null;
    el.style.maxWidth   = 'none';
    el.style.visibility = 'hidden';
    el.style.position   = 'absolute';
    var fullWidth = el.scrollWidth + 2;
    el.style.maxWidth   = '0';
    el.style.visibility = '';
    el.style.position   = '';

    var chars    = el.textContent.length;
    var steps    = Math.max(10, chars);
    var duration = opts.duration || 0.8;
    var delay    = opts.delay    || 0.1;

    return function fire() {
      if (el.classList.contains('done')) return;
      gsap.to(el, {
        maxWidth: fullWidth,
        ease: 'steps(' + steps + ')',
        duration: duration,
        delay: delay,
        onComplete: function () {
          el.classList.add('done');
          el.style.maxWidth = 'none';
        }
      });
    };
  }

  /* ── Intro spacer reveal ── */
  var introSpacer = document.getElementById('hscroll-intro');
  var emblem      = introSpacer ? introSpacer.querySelector('.hscroll__emblem')   : null;
  var heroText    = introSpacer ? introSpacer.querySelector('.hscroll__hero-text') : null;

  if (emblem && heroText) {
    gsap.set([emblem, heroText], { autoAlpha: 0, y: 28 });
    gsap.timeline({
      scrollTrigger: { trigger: introSpacer, start: 'center 85%', once: true }
    })
    .to(emblem,   { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0)
    .to(heroText, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 0.2);
  }

  /* ── TashBrand namespace ── */
  window.TashBrand = window.TashBrand || {};

  /* ═══════════════════════════════════
     DESKTOP — Lando horizontal scroll
     ═══════════════════════════════════ */
  var mm = gsap.matchMedia();

  mm.add('(min-width: 769px)', function () {

    var section  = document.getElementById('hscroll-gallery');
    var sticky   = document.getElementById('hscroll-sticky');
    var track    = document.getElementById('hscroll-track');
    var dotsEl   = document.getElementById('carousel-dots');
    if (!section || !sticky || !track) return;

    var items      = gsap.utils.toArray('#hscroll-track .hscroll__item');
    var totalItems = items.length;
    var lastIndex  = totalItems - 1;

    /* Expose for video-expand.js.
       carouselIndex is updated by onUpdate below.
       Starts at lastIndex — when the spacer fires, we're always at the end. */
    window.TashBrand.carouselIndex = lastIndex;
    window.TashBrand.carouselTotal = totalItems;

    /* ── Typewriter setup ── */
    var typewriterFired = {};
    var typewriterFns   = {};
    items.forEach(function (item, i) {
      var tw = item.querySelector('.hscroll__typewriter-text');
      if (tw) typewriterFns[i] = makeTypewriter(tw, { duration: 0.8, delay: 0.1 });
    });
    /* Fire first item immediately (it's in view on load) */
    if (typewriterFns[0]) { typewriterFns[0](); typewriterFired[0] = true; }

    /* ── Dot indicator ── */
    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (var d = 0; d < totalItems; d++) {
        var dot = document.createElement('div');
        dot.className = 'carousel__dot';
        dot.setAttribute('data-index', d);
        dotsEl.appendChild(dot);
      }
    }
    var dots = dotsEl ? gsap.utils.toArray('.carousel__dot') : [];

    function updateDots(idx) {
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === idx);
      });
    }

    /* Dot click → scroll to that item's position in the runway */
    if (dotsEl) {
      dotsEl.addEventListener('click', function (e) {
        var dot = e.target.closest('.carousel__dot');
        if (!dot) return;
        var idx = parseInt(dot.getAttribute('data-index'), 10);
        if (isNaN(idx)) return;
        var pct    = lastIndex > 0 ? idx / lastIndex : 0;
        var runway = getRunway();
        /* section.offsetTop is where the section starts in the document */
        var target = section.offsetTop + Math.round(pct * runway);
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
    }

    /* ── Runway helpers ──
       THE KEY: offsetWidth (live), never scrollWidth, never cached. */
    function getRunway() {
      return Math.max(0, track.offsetWidth - window.innerWidth);
    }

    /* Set outer section height = one full viewport + the runway distance.
       One viewport height means the section first fully enters view,
       then the runway scroll translates the track to the end. */
    function setHeight() {
      var runway = getRunway();
      section.style.height = (window.innerHeight + runway) + 'px';
    }

    /* ── Progress handler: dots, typewriter, color-active ── */
    function onScrollProgress(progress) {
      var rawIdx    = progress * lastIndex;
      var activeIdx = Math.max(0, Math.min(lastIndex, Math.round(rawIdx)));

      /* Sync carouselIndex for video-expand.js */
      window.TashBrand.carouselIndex = activeIdx;

      updateDots(activeIdx);

      /* Typewriter — fire once per item on first reach */
      if (!typewriterFired[activeIdx] && typewriterFns[activeIdx]) {
        typewriterFns[activeIdx]();
        typewriterFired[activeIdx] = true;
      }

      /* Videos: play current, pause others (loop videos only) */
      items.forEach(function (item, i) {
        var vid = item.querySelector('video[loop]');
        if (!vid) return;
        if (i === activeIdx) {
          var p = vid.play();
          if (p && p.catch) p.catch(function () {});
        } else {
          vid.pause();
        }
      });
    }

    /* ── Build the GSAP scroll animation ── */
    var trackTween = null;
    var st         = null;

    function buildScrollTrigger() {
      /* Kill previous instances before rebuilding */
      if (st)         { st.kill();         st = null; }
      if (trackTween) { trackTween.kill(); trackTween = null; }

      /* Compute and set section height before creating ST */
      setHeight();

      /* The animation: translate track from x=0 to x=-runway.
         Value is a FUNCTION so GSAP re-evaluates it on every invalidateOnRefresh. */
      trackTween = gsap.to(track, {
        x: function () { return -getRunway(); },
        ease: 'none',
        paused: true
      });

      st = ScrollTrigger.create({
        animation: trackTween,
        trigger:   section,
        start:     'top top',
        end:       function () { return '+=' + getRunway(); },
        scrub:     1,
        pin:       sticky,
        pinSpacing: false,       /* section height is set manually — no GSAP spacer needed */
        anticipatePin: 1,
        invalidateOnRefresh: true,

        onRefresh: function () {
          /* Called on every ScrollTrigger.refresh() — reset height with live measurements */
          setHeight();
        },

        onUpdate: function (self) {
          onScrollProgress(self.progress);
        },

        onEnter: function () {
          section.classList.add('color-active');
          if (dotsEl) dotsEl.classList.add('visible');
        },
        onLeaveBack: function () {
          section.classList.remove('color-active');
          if (dotsEl) dotsEl.classList.remove('visible');
        },
        onLeave: function () {
          /* Scrolled past the section — hide dots */
          if (dotsEl) dotsEl.classList.remove('visible');
        },
        onEnterBack: function () {
          section.classList.add('color-active');
          if (dotsEl) dotsEl.classList.add('visible');
        }
      });
    }

    buildScrollTrigger();

    /* ── ResizeObserver on the track ──
       Catches changes from images loading, font changes, etc.
       This is the same technique landonorris.com uses. */
    var ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () {
        setHeight();
        ScrollTrigger.refresh();
      });
      ro.observe(track);
    }

    /* ── Window resize ──
       Debounced — ScrollTrigger.refresh() triggers onRefresh callbacks. */
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        setHeight();
        ScrollTrigger.refresh();
      }, 150);
    }
    window.addEventListener('resize', onResize);

    /* ── Safari autoplay unlock ──
       On first user gesture, play all loop videos. */
    var safariUnlocked = false;
    function unlockSafari() {
      if (safariUnlocked) return;
      safariUnlocked = true;
      items.forEach(function (item) {
        var vid = item.querySelector('video[loop]');
        if (!vid) return;
        var p = vid.play();
        if (p && p.catch) p.catch(function () {});
      });
    }
    document.addEventListener('touchstart', unlockSafari, { once: true, capture: true });
    document.addEventListener('scroll',     unlockSafari, { once: true, capture: true });

    /* ── matchMedia cleanup ── */
    return function () {
      window.removeEventListener('resize', onResize);
      if (ro)         ro.disconnect();
      if (st)         st.kill();
      if (trackTween) trackTween.kill();
    };

  }); /* end desktop */

  /* ═══════════════════
     MOBILE — vertical stack, no pinning
     ═══════════════════ */
  mm.add('(max-width: 768px)', function () {
    var items = gsap.utils.toArray('#hscroll-track .hscroll__item');
    items.forEach(function (item) {
      var tw = item.querySelector('.hscroll__typewriter-text');
      gsap.fromTo(item,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none none',
            onEnter: function () {
              if (tw && !tw.classList.contains('done')) {
                var fire = makeTypewriter(tw, { duration: 1.2, delay: 0.3 });
                if (fire) fire();
              }
            }
          }
        }
      );
    });

    window.TashBrand = window.TashBrand || {};
    window.TashBrand.mobileCollapseFullscreen = function () {};
  });

})();
