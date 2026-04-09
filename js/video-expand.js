/* ═══════════════════════════════════════════════════════════
   VIDEO EXPAND — last gallery item expands to fullscreen
   Reparents item 14 to <body>, then manually interpolates
   position / size each frame via ScrollTrigger.onUpdate.
   ═══════════════════════════════════════════════════════════ */
(function() {

  // ── Safari autoplay fix ──
  // Safari blocks autoplay until a user gesture occurs. On first scroll/touch,
  // force-play all muted gallery videos so they don't show a play button.
  var safariVideosUnlocked = false;
  function unlockSafariVideos() {
    if (safariVideosUnlocked) return;
    safariVideosUnlocked = true;
    var lastItemEl = document.getElementById('hscroll-last-item');
    var galleryVideos = document.querySelectorAll('.hscroll__item video');
    galleryVideos.forEach(function(v) {
      // Skip item 14's hero video — it plays on expand, not in the gallery
      if (lastItemEl && lastItemEl.contains(v)) return;
      var p = v.play();
      if (p && p.catch) p.catch(function() {});
    });
    document.removeEventListener('touchstart', unlockSafariVideos, true);
    document.removeEventListener('scroll', unlockSafariVideos, true);
  }
  document.addEventListener('touchstart', unlockSafariVideos, { once: true, capture: true });
  document.addEventListener('scroll', unlockSafariVideos, { once: true, capture: true });

  var mm = gsap.matchMedia();

  mm.add('(min-width: 769px)', function() {
    var items       = gsap.utils.toArray('.hscroll__item');
    var lastItem    = items[items.length - 1];
    var lastMedia   = lastItem ? (lastItem.querySelector('video') || lastItem.querySelector('img')) : null;
    var heroVideo   = lastItem ? lastItem.querySelector('video') : null;
    var lastCaption = lastItem ? lastItem.querySelector('.hscroll__caption') : null;
    var zoomSpacer  = document.getElementById('video-expand');
    var progressEl  = document.getElementById('hscroll-progress');
    var originalParent = lastItem ? lastItem.parentElement : null;
    if (!lastItem || !lastMedia || !zoomSpacer) return;

    var videoQuotes = document.getElementById('video-quotes');
    var quotesShown = false;
    var zoomInHint  = document.getElementById('zoom-in-hint');
    if (zoomInHint) {
      zoomInHint.addEventListener('click', function() {
        // Scroll to end of spacer so p reaches 1 (full zoom + video plays)
        var target = zoomSpacer.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
    }

    // Case Studies CTA — triggers player fullscreen expand
    var caseStudyCta = document.getElementById('view-case-studies-cta');
    if (caseStudyCta) {
      caseStudyCta.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
          // Opened from testimonials end-screen — closing should return to face-morph hero
          window.TashBrand._returnToTop = true;
          window.TashBrand.togglePlayerExpanded();
        }
      });
    }
    var siteLogo    = document.getElementById('site-logo');
    var logoDark    = siteLogo ? siteLogo.querySelector('.site-logo__dark') : null;
    var logoLight   = siteLogo ? siteLogo.querySelector('.site-logo__light') : null;
    var menuBtn     = document.getElementById('menu-btn');
    var menuLines   = menuBtn ? menuBtn.querySelectorAll('.morph__menu-line') : [];
    var startRect   = null;
    var isReparented = false;
    var videoStarted = false;
    var logoSwapped  = false;

    function setMenuLight() {
      if (!menuBtn) return;
      gsap.to(menuBtn, { borderColor: 'rgba(255, 255, 255, 0.45)', duration: 0.4, ease: 'power2.out' });
      menuLines.forEach(function(l) { gsap.to(l, { backgroundColor: 'rgba(255, 255, 255, 0.85)', duration: 0.4, ease: 'power2.out' }); });
    }
    function setMenuDark() {
      if (!menuBtn) return;
      gsap.to(menuBtn, { borderColor: 'rgba(26, 26, 26, 0.85)', duration: 0.3, ease: 'power2.out' });
      menuLines.forEach(function(l) { gsap.to(l, { backgroundColor: 'rgba(26, 26, 26, 0.85)', duration: 0.3, ease: 'power2.out' }); });
    }

    // Track whether expansion is fully complete (scroll progress ≥ 0.98)
    var isFullyExpanded = false;

    // Fade to black & white + fade in testimonial quotes at 1/3 of video
    if (heroVideo) {
      heroVideo.addEventListener('timeupdate', function() {
        if (!heroVideo.duration) return;
        var third = heroVideo.duration / 3;
        var elapsed = heroVideo.currentTime;

        // Grayscale filter from 1/3 onward
        if (elapsed >= third) {
          var t = (elapsed - third) / (heroVideo.duration - third); // 0 → 1
          heroVideo.style.filter = 'grayscale(' + t + ')';
        } else {
          heroVideo.style.filter = '';
        }

        // Show quotes at 1/3 mark, but ONLY if fully expanded
        if (videoQuotes) {
          if (elapsed >= third && isFullyExpanded && !quotesShown) {
            videoQuotes.classList.add('visible');
            quotesShown = true;
          } else if ((elapsed < third || !isFullyExpanded) && quotesShown) {
            videoQuotes.classList.remove('visible');
            quotesShown = false;
          }
        }
      });
    }

    function returnToTrack() {
      if (isReparented) {
        lastItem.classList.remove('hscroll__item--expanding');
        lastItem.classList.remove('is-zooming');
        lastItem.style.left = '';
        lastItem.style.top = '';
        lastItem.style.width = '';
        lastItem.style.height = '';
        lastMedia.style.borderRadius = '';
        lastItem.style.filter = '';
        if (lastCaption) lastCaption.style.opacity = '';
        if (progressEl) progressEl.style.opacity = '';
        if (heroVideo) {
          heroVideo.pause();
          heroVideo.currentTime = 0;
          heroVideo.style.filter = '';
        }
        videoStarted = false;
        // Hide quotes overlay
        if (videoQuotes) {
          videoQuotes.classList.remove('visible');
          quotesShown = false;
        }
        if (zoomInHint) zoomInHint.style.opacity = '';
        originalParent.appendChild(lastItem);
        isReparented = false;
        startRect = null;
        // Restore logo + hamburger to dark mode
        if (logoSwapped) {
          if (logoDark) gsap.set(logoDark, { opacity: 1 });
          if (logoLight) gsap.set(logoLight, { opacity: 0 });
          setMenuDark();
          logoSwapped = false;
        }
      }
    }

    ScrollTrigger.create({
      trigger: zoomSpacer,
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: 0.5,
      invalidateOnRefresh: function() { startRect = null; },
      onUpdate: function(self) {
        var p = self.progress;
        var vw = window.innerWidth;
        var vh = window.innerHeight;

        // If scrolled all the way back, return item to track
        if (p <= 0.001) {
          lastItem.classList.remove('is-zooming');
          // Force glint animation to restart from opacity:0
          lastItem.classList.add('glint-reset');
          requestAnimationFrame(function() { lastItem.classList.remove('glint-reset'); });
          returnToTrack();
          return;
        }

        lastItem.classList.add('is-zooming');

        // On first frame: compute item's film-strip size and derive the centred
        // viewport position from it, rather than trusting getBoundingClientRect()
        // whose left/top value may still be drifting while the horizontal-scroll
        // GSAP scrub settles.  offsetWidth/offsetHeight are layout-accurate.
        if (!isReparented) {
          var iw = lastItem.offsetWidth;
          var ih = lastItem.offsetHeight;
          startRect = {
            left:   (vw - iw) / 2,
            top:    (vh - ih) / 2,
            width:  iw,
            height: ih
          };
          lastItem.classList.add('hscroll__item--expanding');
          lastItem.style.left   = startRect.left   + 'px';
          lastItem.style.top    = startRect.top    + 'px';
          lastItem.style.width  = startRect.width  + 'px';
          lastItem.style.height = startRect.height + 'px';
          document.body.appendChild(lastItem);
          isReparented = true;
        }

        // Single-phase expansion: grow from startRect → full viewport
        var curLeft   = startRect.left   * (1 - p);
        var curTop    = startRect.top    * (1 - p);
        var curWidth  = startRect.width  + (vw - startRect.width)  * p;
        var curHeight = startRect.height + (vh - startRect.height) * p;

        lastItem.style.left   = curLeft   + 'px';
        lastItem.style.top    = curTop    + 'px';
        lastItem.style.width  = curWidth  + 'px';
        lastItem.style.height = curHeight + 'px';
        lastMedia.style.borderRadius = (6 * (1 - p)) + 'px';

        // Lift shadow — grows with p to simulate tile rising off the surface.
        // Three layers: tight contact shadow (darkest), mid ambient spread, wide soft halo.
        // All fade to 0 as p approaches 1 (full viewport = no shadow needed).
        var shadowFade = p < 0.85 ? 1 : (1 - (p - 0.85) / 0.15); // hold full until 85%, then fade out
        var offset  = Math.round(p * 28  * shadowFade);  // vertical offset grows with height
        var blur1   = Math.round(p * 20  * shadowFade);  // tight shadow
        var blur2   = Math.round(p * 60  * shadowFade);  // ambient spread
        var blur3   = Math.round(p * 120 * shadowFade);  // wide halo
        var a1 = (0.55 * p * shadowFade).toFixed(3);
        var a2 = (0.30 * p * shadowFade).toFixed(3);
        var a3 = (0.12 * p * shadowFade).toFixed(3);
        lastItem.style.filter =
          'drop-shadow(0 ' + offset + 'px ' + blur1 + 'px rgba(0,0,0,' + a1 + ')) ' +
          'drop-shadow(0 ' + Math.round(offset * 0.6) + 'px ' + blur2 + 'px rgba(0,0,0,' + a2 + ')) ' +
          'drop-shadow(0 ' + Math.round(offset * 0.3) + 'px ' + blur3 + 'px rgba(0,0,0,' + a3 + '))';

        // Start video from beginning once nearly fully expanded
        if (heroVideo && !videoStarted && p > 0.9) {
          heroVideo.currentTime = 0;
          heroVideo.play();
          videoStarted = true;
          if (zoomInHint) zoomInHint.style.opacity = '0';
        }

        // Swap logo + hamburger to white once video is near fullscreen
        if (!logoSwapped && p > 0.7) {
          if (logoDark) gsap.to(logoDark, { opacity: 0, duration: 0.4, ease: 'power2.out' });
          if (logoLight) gsap.to(logoLight, { opacity: 1, duration: 0.4, ease: 'power2.out' });
          setMenuLight();
          logoSwapped = true;
        }
        if (logoSwapped && p < 0.7) {
          if (logoDark) gsap.to(logoDark, { opacity: 1, duration: 0.3, ease: 'power2.out' });
          if (logoLight) gsap.to(logoLight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
          setMenuDark();
          logoSwapped = false;
        }

        // Track full expansion state for quotes gating
        isFullyExpanded = (p >= 0.98);

        // Hide quotes immediately when scrolling back
        if (!isFullyExpanded && quotesShown && videoQuotes) {
          videoQuotes.classList.remove('visible');
          quotesShown = false;
        }

        // Fade caption quickly
        if (lastCaption) lastCaption.style.opacity = Math.max(0, 1 - p * 3);

        // Fade progress indicator
        if (progressEl) progressEl.style.opacity = Math.max(0, 1 - p * 5);
      },
      onLeaveBack: function() {
        returnToTrack();
      }
    });

  });

  /* ── Mobile: no expand/collapse — item 14 scrolls like any other item ── */
  mm.add('(max-width: 768px)', function() {
    // Case Studies CTA
    var caseStudyCtaMobile = document.getElementById('view-case-studies-cta');
    if (caseStudyCtaMobile) {
      caseStudyCtaMobile.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
          // Opened from testimonials end-screen — closing should return to face-morph hero
          window.TashBrand._returnToTop = true;
          window.TashBrand.togglePlayerExpanded();
        }
      });
    }

    // No-op stub so face-morph.js logo-tap doesn't error
    window.TashBrand = window.TashBrand || {};
    window.TashBrand.mobileCollapseFullscreen = function() {};
  });
})();
