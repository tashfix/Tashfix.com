/* ═════════════════════════════════════════════════════════════
   VIDEO EXPAND — last carousel item expands to fullscreen.
   Driven by horizontal.js Phase 2 callback (_onVideoZoom).
   No separate ScrollTrigger — zoom is part of the gallery pin.
   No reparenting needed during Phase 2 since section stays pinned,
   BUT we still reparent to <body> to escape CSS transform stacking.
   ═════════════════════════════════════════════════════════════ */
(function() {

  // ── Safari autoplay fix ──
  var safariVideosUnlocked = false;
  function unlockSafariVideos() {
    if (safariVideosUnlocked) return;
    safariVideosUnlocked = true;
    var lastItemEl = document.getElementById('hscroll-last-item');
    var galleryVideos = document.querySelectorAll('.hscroll__item video');
    galleryVideos.forEach(function(v) {
      if (lastItemEl && lastItemEl.contains(v)) return;
      var p = v.play();
      if (p && p.catch) p.catch(function() {});
    });
    document.removeEventListener('touchstart', unlockSafariVideos, true);
    document.removeEventListener('scroll', unlockSafariVideos, true);
  }
  document.addEventListener('touchstart', unlockSafariVideos, { once: true, capture: true });
  document.addEventListener('scroll', unlockSafariVideos, { once: true, capture: true });

  // ── Text scramble effect ──
  function TextScramble(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#';
    this.frameRequest = null;
    this.resolve = null;
    this.queue = [];
    this.frame = 0;
    var self = this;
    this.update = function() { self._update(); };
  }
  TextScramble.prototype.setText = function(newText) {
    var self = this;
    var promise = new Promise(function(resolve) { self.resolve = resolve; });
    self.queue = [];
    for (var i = 0; i < newText.length; i++) {
      var start = Math.floor(Math.random() * 30);
      var end = start + Math.floor(Math.random() * 30) + 10;
      self.queue.push({ to: newText[i], start: start, end: end, char: '' });
    }
    cancelAnimationFrame(self.frameRequest);
    self.frame = 0;
    self.update();
    return promise;
  };
  TextScramble.prototype._update = function() {
    var output = '';
    var complete = 0;
    for (var i = 0; i < this.queue.length; i++) {
      var item = this.queue[i];
      if (this.frame >= item.end) {
        complete++;
        output += item.to;
      } else if (this.frame >= item.start) {
        if (!item.char || Math.random() < 0.28) {
          item.char = this.chars[Math.floor(Math.random() * this.chars.length)];
        }
        output += '<span class="vq-dud">' + item.char + '</span>';
      } else {
        output += item.to === ' ' ? ' ' : '&nbsp;';
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  };

  var mm = gsap.matchMedia();

  mm.add('(min-width: 769px)', function() {
    var section      = document.getElementById('hscroll-gallery');
    var items        = gsap.utils.toArray('.hscroll__item');
    var lastItem     = items[items.length - 1];
    var lastMedia    = lastItem ? (lastItem.querySelector('video') || lastItem.querySelector('img')) : null;
    var heroVideo    = lastItem ? lastItem.querySelector('video') : null;
    var lastCaption  = lastItem ? lastItem.querySelector('.hscroll__caption') : null;
    var dotsEl       = document.getElementById('carousel-dots');
    /* originalParent: the track — we restore here on collapse */
    var originalParent = lastItem ? lastItem.parentElement : null;
    if (!lastItem || !lastMedia || !section || !originalParent) return;

    var lastIndex = items.length - 1;

    var videoQuotes = document.getElementById('video-quotes');
    var quotesShown = false;
    var zoomInHint  = document.getElementById('zoom-in-hint');
    if (zoomInHint) {
      zoomInHint.addEventListener('click', function() {
        /* Scroll to the end of the gallery ScrollTrigger (zoom fully expanded) */
        var galleryST = window.TashBrand && window.TashBrand._galleryST;
        if (galleryST) {
          var target = galleryST.end;
          window.scrollTo({ top: target, behavior: 'smooth' });
        }
      });
    }

    // Case Studies CTA
    var caseStudyCta = document.getElementById('view-case-studies-cta');
    if (caseStudyCta) {
      caseStudyCta.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
          window.TashBrand._returnToTop = true;
          window.TashBrand.togglePlayerExpanded();
        }
      });
    }

    var startRect    = null;
    var isExpanding  = false;
    var videoStarted = false;
    var isFullyExpanded = false;

    // ── Hero text reveal ──
    var heroTextShown   = false;
    var heroGlitchTimer = null;
    var heroTextEl    = document.getElementById('vq-hero-text');
    var heroHeadingEl = document.getElementById('vq-hero-heading');
    var heroEmailRow  = document.getElementById('vq-hero-email-row');
    var heroEmailBtn  = document.getElementById('vq-hero-email-btn');
    var heroEmailText = document.getElementById('vq-hero-email-text');
    var heroTooltip   = document.getElementById('vq-hero-tooltip');
    var headingFx     = heroHeadingEl ? new TextScramble(heroHeadingEl) : null;
    var emailFx       = heroEmailText ? new TextScramble(heroEmailText) : null;

    function showHeroText() {
      if (!heroTextEl || !headingFx || !emailFx) return;
      heroTextEl.classList.add('visible');
      headingFx.setText('CRAFTED. NOT GENERATED.').then(function() {
        setTimeout(function() {
          heroEmailRow.classList.add('visible');
          emailFx.setText('info@tashfix.com').then(function() {
            if (heroEmailBtn) heroEmailBtn.classList.add('ready');
          });
        }, 300);
        function scheduleGlitch() {
          var delay = 6000 + (Math.random() * 3000) - 1500;
          heroGlitchTimer = setTimeout(function() {
            if (headingFx && heroTextShown) {
              headingFx.setText('CRAFTED. NOT GENERATED.').then(scheduleGlitch);
            }
          }, delay);
        }
        scheduleGlitch();
      });
    }

    function hideHeroText() {
      if (!heroTextEl) return;
      heroTextEl.classList.remove('visible');
      if (heroEmailRow) heroEmailRow.classList.remove('visible');
      if (heroEmailBtn) heroEmailBtn.classList.remove('ready');
      if (heroHeadingEl) heroHeadingEl.innerHTML = '';
      if (heroEmailText) heroEmailText.innerHTML = '';
      if (heroGlitchTimer) { clearTimeout(heroGlitchTimer); heroGlitchTimer = null; }
      heroTextShown = false;
    }

    // Copy-to-clipboard
    if (heroEmailBtn && heroTooltip) {
      heroEmailBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!heroEmailBtn.classList.contains('ready')) return;
        navigator.clipboard.writeText(heroEmailBtn.dataset.email).then(function() {
          heroTooltip.textContent = 'Copied!';
          heroTooltip.classList.add('visible');
          setTimeout(function() {
            heroTooltip.classList.remove('visible');
            heroTooltip.textContent = 'Copy email';
          }, 2500);
        });
      });
    }

    // Grayscale + quote reveal tied to video playback
    if (heroVideo) {
      heroVideo.addEventListener('timeupdate', function() {
        if (!heroVideo.duration) return;
        var third = heroVideo.duration / 3;
        var elapsed = heroVideo.currentTime;
        if (elapsed >= third) {
          var t = (elapsed - third) / (heroVideo.duration - third);
          heroVideo.style.filter = 'grayscale(' + t + ')';
        } else {
          heroVideo.style.filter = '';
        }
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

    // ── Collapse back ──
    function collapseToCarousel() {
      if (!isExpanding) return;

      /* Suppress ResizeObserver while restoring item to track */
      window.TashBrand.suppressResize = true;

      // Restore lastItem to original parent (the horizontal track)
      if (lastItem.parentElement !== originalParent) {
        originalParent.appendChild(lastItem);
      }

      lastItem.classList.remove('hscroll__item--expanding');
      lastItem.classList.remove('is-zooming');
      lastItem.style.left   = '';
      lastItem.style.top    = '';
      lastItem.style.width  = '';
      lastItem.style.height = '';
      lastMedia.style.borderRadius = '';
      lastItem.style.filter = '';
      if (lastCaption) lastCaption.style.opacity = '';
      if (dotsEl) dotsEl.style.opacity = '';

      if (heroVideo) {
        heroVideo.pause();
        heroVideo.currentTime = 0;
        heroVideo.style.filter = '';
      }
      videoStarted = false;
      if (videoQuotes) { videoQuotes.classList.remove('visible'); quotesShown = false; }
      if (zoomInHint) zoomInHint.style.opacity = '';
      hideHeroText();
      isExpanding = false;
      startRect = null;
      isFullyExpanded = false;

      /* Re-enable ResizeObserver after restoring item to track */
      requestAnimationFrame(function () {
        window.TashBrand.suppressResize = false;
        ScrollTrigger.refresh();
      });
    }

    // ── Register zoom callback — called by horizontal.js Phase 2 ──
    window.TashBrand._onVideoZoom = function(p) {
      var vw = window.innerWidth;
      var vh = window.innerHeight;

      // Only zoom when carousel is on the last item
      var onLastItem = window.TashBrand && window.TashBrand.carouselIndex === lastIndex;
      if (!onLastItem) {
        if (isExpanding) collapseToCarousel();
        return;
      }

      if (p <= 0.001) {
        lastItem.classList.remove('is-zooming');
        lastItem.classList.add('glint-reset');
        requestAnimationFrame(function() { lastItem.classList.remove('glint-reset'); });
        collapseToCarousel();
        return;
      }

      lastItem.classList.add('is-zooming');

      // First frame: capture start position and reparent to <body>
      // Section is still pinned so getBoundingClientRect() is correct
      if (!isExpanding) {
        var rect = lastItem.getBoundingClientRect();
        startRect = {
          left:   rect.left,
          top:    rect.top,
          width:  rect.width,
          height: rect.height
        };

        /* Suppress ResizeObserver during reparenting so GSAP runway stays stable */
        window.TashBrand.suppressResize = true;

        // Reparent to <body> — escapes transformed ancestor stacking context
        document.body.appendChild(lastItem);

        lastItem.classList.add('hscroll__item--expanding');
        lastItem.style.left   = startRect.left   + 'px';
        lastItem.style.top    = startRect.top    + 'px';
        lastItem.style.width  = startRect.width  + 'px';
        lastItem.style.height = startRect.height + 'px';
        isExpanding = true;

        /* Re-enable ResizeObserver now that reparenting is done */
        requestAnimationFrame(function () {
          window.TashBrand.suppressResize = false;
        });
      }

      // Interpolate → full viewport
      var curLeft   = startRect.left   * (1 - p);
      var curTop    = startRect.top    * (1 - p);
      var curWidth  = startRect.width  + (vw - startRect.width)  * p;
      var curHeight = startRect.height + (vh - startRect.height) * p;

      lastItem.style.left   = curLeft   + 'px';
      lastItem.style.top    = curTop    + 'px';
      lastItem.style.width  = curWidth  + 'px';
      lastItem.style.height = curHeight + 'px';
      lastMedia.style.borderRadius = (6 * (1 - p)) + 'px';

      // Shadow
      var shadowFade = p < 0.85 ? 1 : (1 - (p - 0.85) / 0.15);
      var offset  = Math.round(p * 28  * shadowFade);
      var blur1   = Math.round(p * 20  * shadowFade);
      var blur2   = Math.round(p * 60  * shadowFade);
      var blur3   = Math.round(p * 120 * shadowFade);
      var a1 = (0.55 * p * shadowFade).toFixed(3);
      var a2 = (0.30 * p * shadowFade).toFixed(3);
      var a3 = (0.12 * p * shadowFade).toFixed(3);
      lastItem.style.filter =
        'drop-shadow(0 ' + offset + 'px ' + blur1 + 'px rgba(0,0,0,' + a1 + ')) ' +
        'drop-shadow(0 ' + Math.round(offset * 0.6) + 'px ' + blur2 + 'px rgba(0,0,0,' + a2 + ')) ' +
        'drop-shadow(0 ' + Math.round(offset * 0.3) + 'px ' + blur3 + 'px rgba(0,0,0,' + a3 + '))';

      // Video playback
      if (heroVideo && !videoStarted && p > 0.9) {
        heroVideo.currentTime = 0;
        heroVideo.play();
        videoStarted = true;
        if (zoomInHint) zoomInHint.style.opacity = '0';
      }

      isFullyExpanded = (p >= 0.98);

      if (isFullyExpanded && !heroTextShown) {
        heroTextShown = true;
        showHeroText();
      }

      if (!isFullyExpanded && quotesShown && videoQuotes) {
        videoQuotes.classList.remove('visible');
        quotesShown = false;
      }
      if (!isFullyExpanded && heroTextShown) { hideHeroText(); }
      if (lastCaption) lastCaption.style.opacity = Math.max(0, 1 - p * 3);
      if (dotsEl) dotsEl.style.opacity = Math.max(0, 1 - p * 5);
    };

  }); // end desktop

  // ── Mobile: no expand/collapse ──
  mm.add('(max-width: 768px)', function() {
    var caseStudyCtaMobile = document.getElementById('view-case-studies-cta');
    if (caseStudyCtaMobile) {
      caseStudyCtaMobile.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
          window.TashBrand._returnToTop = true;
          window.TashBrand.togglePlayerExpanded();
        }
      });
    }
    window.TashBrand = window.TashBrand || {};
    window.TashBrand.mobileCollapseFullscreen = function() {};
  });

})();
