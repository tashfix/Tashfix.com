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

  var tStrokes  = sigSvg.querySelectorAll('use.t');
  var aStrokes  = sigSvg.querySelectorAll('use.a');
  var xbStrokes = sigSvg.querySelectorAll('use.xb');

  // Initialize scroll progress tracker
  window.TashBrand.zoomProgress = 0;

  var mobileGradient = document.getElementById('mobile-top-gradient');

  // On mobile, push the zoom-out start down so the first scroll doesn't
  // immediately swallow the "View My Work" button
  var zoomStart = window.innerWidth <= 768 ? 'top -15%' : 'top top';

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: zoomStart,
      end: 'bottom bottom',
      pin: '.zoomout__sticky',
      scrub: 0.6,
      anticipatePin: 1,
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

  // Phase 3: Show static portrait over canvas + desaturate clip (not container, so signature stays orange)
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
  tl.to(morphOverlay, {
    opacity: 0,
    duration: 0.2,
    ease: 'power1.in',
  }, 0);

  // Phase 4b: Logo crossfade (dark → light) and shrink into corner
  var siteLogo = document.getElementById('site-logo');
  if (siteLogo) {
    var logoDark = siteLogo.querySelector('.site-logo__dark');
    var logoLight = siteLogo.querySelector('.site-logo__light');

    tl.to(logoDark, { opacity: 0, duration: 0.2, ease: 'power2.inOut' }, 0.05);
    tl.to(logoLight, { opacity: 1, duration: 0.2, ease: 'power2.inOut' }, 0.05);
    tl.to(siteLogo, {
      scale: 0.55,
      duration: 0.25,
      ease: 'power2.inOut',
    }, 0.05);
  }

  // Phase 4c: Hamburger button shrinks + crossfades to light mode (mirrors logo)
  var menuBtn = document.getElementById('menu-btn');
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
