/* ═══════════════════════════════════════════════════════════
   HORIZONTAL SCROLL GALLERY
   ───────────────────────────────────────────────────────────
   • GSAP pin:true on the section — pins it and manages its own spacer
   • x: () => lazy function — re-evaluated on every invalidateOnRefresh
   • end: () => lazy function — runway always live
   • ResizeObserver on track → ScrollTrigger.refresh()
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
    var track    = document.getElementById('hscroll-track');
    var dotsEl   = document.getElementById('carousel-dots');
    if (!section || !track) return;

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

    /* Dots are indicator-only — no click navigation */

    /* ── Runway helpers ──
       THE KEY: offsetWidth (live), never scrollWidth, never cached. */
    function getRunway() {
      return Math.max(0, track.offsetWidth - window.innerWidth);
    }

    /* ── Scroll compression ──
       SCROLL_RATIO < 1 means the user scrolls less to traverse the gallery.
       The track still moves the full runway; the scroll distance is compressed.
       0.55 = ~45% less dead-scrolling while preserving visual pacing. */
    var SCROLL_RATIO = 0.55;
    window.TashBrand.scrollRatio = SCROLL_RATIO;

    /* Zoom runway — viewport-height multiplier for the expansion phase.
       0.9 ≈ 2 scroll-wheel notches to complete the zoom. */
    var ZOOM_VH = 0.9;

    /* ── Viewport-based active item detection ──
       Uses real pixel positions so mixed-width items (wide vs square)
       switch at the correct visual moment — not a mathematical midpoint. */
    function getActiveIdx() {
      var trackX      = gsap.getProperty(track, 'x') || 0;
      var vw          = window.innerWidth;
      var bestIdx     = 0;
      var bestOverlap = -1;
      items.forEach(function (item, i) {
        var left    = item.offsetLeft + trackX;
        var right   = left + item.offsetWidth;
        var overlap = Math.max(0, Math.min(vw, right) - Math.max(0, left));
        if (overlap >= bestOverlap) {
          bestOverlap = overlap;
          bestIdx     = i;
        }
      });
      return bestIdx;
    }

    /* ── Progress handler: dots, typewriter, color-active, videos ── */
    function onScrollProgress() {
      var activeIdx = getActiveIdx();

      /* Sync carouselIndex so video-expand.js knows where we are */
      window.TashBrand.carouselIndex = activeIdx;

      updateDots(activeIdx);

      /* Typewriter — fire once per item on first reach */
      if (!typewriterFired[activeIdx] && typewriterFns[activeIdx]) {
        typewriterFns[activeIdx]();
        typewriterFired[activeIdx] = true;
      }

      /* Videos: play the item with most viewport overlap, pause all others */
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

    /* ── Zoom callback — set by video-expand.js ── */
    window.TashBrand._onVideoZoom = null;

    /* ── Build GSAP horizontal scroll — two-phase approach ──
       pin:true on the section — GSAP pins it and adds its own spacer.
       Phase 1: horizontal scroll (track.x animates)
       Phase 2: zoom expansion (last item → fullscreen)
       end includes both runways so the section stays pinned through both.
       We drive track.x manually via gsap.set() — no animation/scrub staleness. */
    var st = null;

    function buildScrollTrigger() {
      if (st) { st.kill(); st = null; }

      st = ScrollTrigger.create({
        trigger: section,
        start:   'top top',
        end:     function () {
          var scrollRunway = getRunway() * SCROLL_RATIO;
          var zoomRunway   = window.innerHeight * ZOOM_VH;
          return '+=' + (scrollRunway + zoomRunway);
        },
        scrub:   0,
        pin:     true,
        invalidateOnRefresh: true,

        onUpdate: function (self) {
          var p            = self.progress;
          var runway       = getRunway();
          var scrollRunway = runway * SCROLL_RATIO;
          var zoomRun      = window.innerHeight * ZOOM_VH;
          var total        = scrollRunway + zoomRun;
          if (total <= 0) return;

          /* hEnd = fraction of total progress where horizontal scroll ends */
          var hEnd = scrollRunway / total;

          if (p <= hEnd) {
            /* ── Phase 1: Horizontal scroll ──
               hProgress 0→1 maps to track.x 0→-runway (full visual distance)
               but driven by the compressed scroll distance. */
            var hProgress = hEnd > 0 ? (p / hEnd) : 1;
            gsap.set(track, { x: -runway * hProgress });
            onScrollProgress();

            /* Collapse zoom if it was active */
            if (window.TashBrand._onVideoZoom) {
              window.TashBrand._onVideoZoom(0);
            }
          } else {
            /* ── Phase 2: Zoom expansion ── */
            gsap.set(track, { x: -runway }); /* hold at end */
            onScrollProgress();
            /* Force last-item state — at wide viewports a tie in overlap
               can leave carouselIndex one short, blocking the zoom callback. */
            window.TashBrand.carouselIndex = lastIndex;

            var zoomP = hEnd < 1 ? ((p - hEnd) / (1 - hEnd)) : 1;
            zoomP = Math.max(0, Math.min(1, zoomP));

            if (window.TashBrand._onVideoZoom) {
              window.TashBrand._onVideoZoom(zoomP);
            }
          }
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
          if (dotsEl) dotsEl.classList.remove('visible');
        },
        onEnterBack: function () {
          section.classList.add('color-active');
          if (dotsEl) dotsEl.classList.add('visible');
        }
      });

      /* Expose for video-expand.js (zoom-in-hint click target) */
      window.TashBrand._galleryST = st;
    }

    buildScrollTrigger();

    /* ── ResizeObserver on the track ──
       Catches layout changes from images loading or font shifts.
       ScrollTrigger.refresh() triggers invalidateOnRefresh → lazy functions
       re-evaluate x and end with fresh track.offsetWidth. */
    var ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(function () {
        /* Suppress during video-expand reparenting to prevent runway recalc */
        if (window.TashBrand && window.TashBrand.suppressResize) return;
        ScrollTrigger.refresh();
      });
      ro.observe(track);
    }

    /* ── Window resize — debounced ── */
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
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
      if (ro) ro.disconnect();
      if (st) st.kill();
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
