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

    // Autoplay only on the very first fullscreen expansion — never again after that.
    var hasAutoplayedOnce = false;

    // Case Studies CTA — triggers player fullscreen expand
    var caseStudyCta = document.getElementById('view-case-studies-cta');
    if (caseStudyCta) {
      caseStudyCta.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
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

    // Hook into horizontal scroll's onUpdate to snapshot rect near completion
    var hTween = window.TashBrand && window.TashBrand.horizontalTween;
    if (hTween && hTween.scrollTrigger) {
      var origOnUpdate = hTween.scrollTrigger.vars.onUpdate;
      hTween.scrollTrigger.vars.onUpdate = function(self) {
        if (origOnUpdate) origOnUpdate(self);
        if (self.progress > 0.92 && !startRect && !isReparented) {
          var r = lastItem.getBoundingClientRect();
          if (r.left >= -r.width && r.left < window.innerWidth) {
            startRect = { left: r.left, top: r.top, width: r.width, height: r.height };
          }
        }
      };
    }

    function returnToTrack() {
      if (isReparented) {
        lastItem.classList.remove('hscroll__item--expanding');
        lastItem.style.left = '';
        lastItem.style.top = '';
        lastItem.style.width = '';
        lastItem.style.height = '';
        lastMedia.style.borderRadius = '';
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
          returnToTrack();
          return;
        }

        // Fallback rect if snapshot missed
        var w = startRect ? startRect.width : Math.min(vw * 0.38, 620);
        var h = startRect ? startRect.height : w;
        var naturalRect = startRect || {
          left: (vw - w) / 2,
          top: vh * 0.06,
          width: w,
          height: h
        };
        var centeredTop = (vh - h) / 2;

        // Reparent to body so position:fixed works outside pinned container
        if (!isReparented) {
          lastItem.classList.add('hscroll__item--expanding');
          lastItem.style.left = naturalRect.left + 'px';
          lastItem.style.top = naturalRect.top + 'px';
          lastItem.style.width = naturalRect.width + 'px';
          lastItem.style.height = naturalRect.height + 'px';
          document.body.appendChild(lastItem);
          isReparented = true;
        }

        // Phase 1 (0 → 0.3): float upward to vertical centre
        // Phase 2 (0.3 → 1): expand from centred position to full viewport
        var floatEnd = 0.3;

        if (p <= floatEnd) {
          var fp = p / floatEnd;
          var eased = fp * fp * (3 - 2 * fp); // smoothstep

          var curTop = naturalRect.top + (centeredTop - naturalRect.top) * eased;

          lastItem.style.left = naturalRect.left + 'px';
          lastItem.style.top = curTop + 'px';
          lastItem.style.width = naturalRect.width + 'px';
          lastItem.style.height = naturalRect.height + 'px';
          lastMedia.style.borderRadius = '6px';
        } else {
          var ep = (p - floatEnd) / (1 - floatEnd);

          var curLeft = naturalRect.left * (1 - ep);
          var curTop2 = centeredTop * (1 - ep);
          var curWidth = naturalRect.width + (vw - naturalRect.width) * ep;
          var curHeight = h + (vh - h) * ep;

          lastItem.style.left = curLeft + 'px';
          lastItem.style.top = curTop2 + 'px';
          lastItem.style.width = curWidth + 'px';
          lastItem.style.height = curHeight + 'px';
          lastMedia.style.borderRadius = (6 * (1 - ep)) + 'px';

          // Autoplay only the very first time the video reaches full expansion.
          if (heroVideo && !videoStarted && ep > 0.95) {
            if (!hasAutoplayedOnce) {
              heroVideo.currentTime = 0;
              heroVideo.play();
              videoStarted = true;
              hasAutoplayedOnce = true;
            }
          }

          // Swap logo + hamburger to white once video is near fullscreen
          if (!logoSwapped && ep > 0.8) {
            if (logoDark) gsap.to(logoDark, { opacity: 0, duration: 0.4, ease: 'power2.out' });
            if (logoLight) gsap.to(logoLight, { opacity: 1, duration: 0.4, ease: 'power2.out' });
            setMenuLight();
            logoSwapped = true;
          }
          if (logoSwapped && ep < 0.8) {
            if (logoDark) gsap.to(logoDark, { opacity: 1, duration: 0.3, ease: 'power2.out' });
            if (logoLight) gsap.to(logoLight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
            setMenuDark();
            logoSwapped = false;
          }
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
          window.TashBrand.togglePlayerExpanded();
        }
      });
    }

    // No-op stub so face-morph.js logo-tap doesn't error
    window.TashBrand = window.TashBrand || {};
    window.TashBrand.mobileCollapseFullscreen = function() {};
  });
})();
