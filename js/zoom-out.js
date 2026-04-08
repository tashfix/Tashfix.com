/* ═══════════════════════════════════════════════════════════
   ZOOM OUT — GSAP ScrollTrigger scroll-driven animation
   ═══════════════════════════════════════════════════════════ */
(function() {
  var hero          = document.getElementById('zoom-out');
  var heroBg        = document.getElementById('zoomout-bg');
  var portraitCtn   = document.getElementById('zoomout-portrait-ctn');
  var marqueeLayer  = document.getElementById('zoomout-marquee');
  var sigSvg        = document.getElementById('zoomout-signature');
  var morphOverlay  = document.getElementById('morph-overlay');
  var morphAura     = document.getElementById('morph-aura');
  var mobileGradient = document.getElementById('mobile-top-gradient');

  var tStrokes  = sigSvg.querySelectorAll('use.t');
  var aStrokes  = sigSvg.querySelectorAll('use.a');
  var xbStrokes = sigSvg.querySelectorAll('use.xb');

  // Initialize scroll progress tracker
  window.TashBrand.zoomProgress = 0;

  // ── Shared logo references ──────────────────────────────────
  var siteLogo = document.getElementById('site-logo');
  var logoDark  = siteLogo ? siteLogo.querySelector('.site-logo__dark')  : null;
  var logoLight = siteLogo ? siteLogo.querySelector('.site-logo__light') : null;
  var menuBtn   = document.getElementById('menu-btn');

  // ══════════════════════════════════════════════════════════════
  // MOBILE PATH — simple crossfade, no pin, no zoom animation
  // ══════════════════════════════════════════════════════════════
  if (window.innerWidth <= 768) {
    // Silence signature strokes so they never flash on mobile
    gsap.set([tStrokes, aStrokes, xbStrokes], { opacity: 0 });

    var mobileTl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.4,
        onUpdate: function(self) {
          window.TashBrand.zoomProgress = self.progress;
          if (mobileGradient) {
            mobileGradient.style.opacity = Math.max(0, 1 - self.progress * 5);
          }
        },
        onLeave: function() {
          if (mobileGradient) mobileGradient.style.opacity = '0';
        },
        onEnterBack: function() {
          if (mobileGradient) mobileGradient.style.opacity = '1';
        }
      }
    });

    // Hero text + aura: fade out during the first half of scroll
    mobileTl.to(morphOverlay, { autoAlpha: 0, duration: 0.45, ease: 'power1.in' }, 0);
    mobileTl.fromTo(morphAura, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: 'none' }, 0);

    // Portrait: no animation — scrolls off-screen like a static image.
    // The CSS mask-image + bg gradient handle the visual blend.

    // Background crossfade: beige → cobalt — starts mid-scroll, completes at 100%
    mobileTl.to(heroBg, {
      backgroundColor: '#0A1A4A',
      duration: 0.5,
      ease: 'power1.inOut',
    }, 0.5);

    // Logo: dark → light swap at ~40% scroll
    if (logoDark && logoLight) {
      mobileTl.to(logoDark,  { opacity: 0, duration: 0.25, ease: 'power2.inOut' }, 0.4);
      mobileTl.to(logoLight, { opacity: 1, duration: 0.25, ease: 'power2.inOut' }, 0.4);
    }

    // Menu button: crossfade to light
    if (menuBtn) {
      var menuLines = menuBtn.querySelectorAll('.morph__menu-line');
      mobileTl.to(menuBtn, {
        borderColor: 'rgba(255,255,255,0.45)',
        duration: 0.25,
        ease: 'power2.inOut',
      }, 0.4);
      menuLines.forEach(function(line) {
        mobileTl.to(line, {
          backgroundColor: 'rgba(255,255,255,0.85)',
          duration: 0.25,
          ease: 'power2.inOut',
        }, 0.4);
      });
    }

    return; // skip desktop animation
  }

  // ══════════════════════════════════════════════════════════════
  // DESKTOP PATH — full pin + zoom animation
  // ══════════════════════════════════════════════════════════════
  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      pin: '.zoomout__sticky',
      scrub: 0.6,
      anticipatePin: 1,
      onUpdate: function(self) {
        window.TashBrand.zoomProgress = self.progress;
        // Reveal logo on first scroll (CSS transition handles the fade-in)
        if (siteLogo && self.progress > 0.02 && !siteLogo.classList.contains('revealed')) {
          siteLogo.classList.add('revealed');
        }
      },
    }
  });

  // Phase 1: Portrait Scale Down
  tl.to(portraitCtn, {
    scale: 0.4,
    borderRadius: '1rem',
    duration: 0.4,
    ease: 'power2.inOut',
  }, 0);

  // Phase 2: Background Color Transition
  tl.to(heroBg, {
    backgroundColor: '#0A1A4A',
    duration: 0.38,
    ease: 'power1.inOut',
  }, 0.02);

  // Phase 3: Show static portrait over canvas + desaturate clip
  tl.to('#zoomout-portrait-static', {
    opacity: 1,
    duration: 0.15,
    ease: 'none',
  }, 0);

  tl.to('.zoomout__portrait-clip', {
    filter: 'grayscale(1)',
    duration: 0.35,
    ease: 'none',
  }, 0.05);

  // Phase 4: Fade out all face morph UI
  // autoAlpha sets visibility:hidden at opacity:0, preventing invisible
  // overlay children from intercepting pointer events on sections below
  tl.to(morphOverlay, {
    autoAlpha: 0,
    duration: 0.2,
    ease: 'power1.in',
  }, 0);

  // Phase 4b: Logo crossfade (dark → light) and shrink into corner
  if (siteLogo && logoDark && logoLight) {
    tl.to(logoDark,  { opacity: 0, duration: 0.2, ease: 'power2.inOut' }, 0.05);
    tl.to(logoLight, { opacity: 1, duration: 0.2, ease: 'power2.inOut' }, 0.05);
    tl.to(siteLogo, {
      scale: 0.55,
      duration: 0.25,
      ease: 'power2.inOut',
    }, 0.05);
  }

  // Phase 4c: Hamburger button shrinks + crossfades to light mode
  if (menuBtn) {
    var menuLines = menuBtn.querySelectorAll('.morph__menu-line');
    tl.to(menuBtn, {
      scale: 0.75,
      borderColor: 'rgba(255, 255, 255, 0.45)',
      duration: 0.25,
      ease: 'power2.inOut',
    }, 0.05);
    menuLines.forEach(function(line) {
      tl.to(line, {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        duration: 0.2,
        ease: 'power2.inOut',
      }, 0.05);
    });
  }

  tl.fromTo(morphAura,
    { opacity: 1 },
    { opacity: 0, duration: 0.15, ease: 'power1.in' },
    0
  );

  // Phase 5: Marquee Reveal
  tl.fromTo(marqueeLayer,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
    0.2
  );

  // Phase 6: Signature Draw-On
  gsap.set(tStrokes,  { opacity: 0, strokeDashoffset: 1000 });
  gsap.set(aStrokes,  { opacity: 0, strokeDashoffset: 1000 });
  gsap.set(xbStrokes, { opacity: 0, strokeDashoffset: 1000 });

  tl.to(sigSvg, { opacity: 1, duration: 0.01 }, 0.40);

  // T stroke
  tl.to(tStrokes, { opacity: 1, duration: 0.01 }, 0.40);
  tl.to(tStrokes, { strokeDashoffset: 0, duration: 0.14, ease: 'power2.inOut' }, 0.40);

  // A stroke
  tl.to(aStrokes, { opacity: 1, duration: 0.01 }, 0.54);
  tl.to(aStrokes, { strokeDashoffset: 0, duration: 0.10, ease: 'power2.inOut' }, 0.54);

  // Crossbar
  tl.to(xbStrokes, { opacity: 1, duration: 0.01 }, 0.64);
  tl.to(xbStrokes, { strokeDashoffset: 0, duration: 0.08, ease: 'power1.out' }, 0.64);
})();
