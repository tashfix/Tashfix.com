gsap.registerPlugin(ScrollTrigger);

// ---- DOM References ----
const hero          = document.getElementById('hero');
const heroBg        = document.getElementById('heroBg');
const portraitCtn   = document.getElementById('portraitContainer');
const portraitImg   = document.getElementById('portraitImg');
const marqueeLayer  = document.getElementById('marqueeLayer');
const sigSvg        = document.getElementById('signatureSvg');
const logo          = document.getElementById('logo');
const hamburger     = document.getElementById('hamburger');

// Signature stroke groups
const tStrokes  = sigSvg.querySelectorAll('use.t');
const aStrokes  = sigSvg.querySelectorAll('use.a');
const xbStrokes = sigSvg.querySelectorAll('use.xb');

// ---- Master Timeline ----
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: hero,
    start: 'top top',
    end: 'bottom bottom',
    pin: '.hero-sticky',
    scrub: 0.6,
    anticipatePin: 1,
  }
});

// --- Phase 1: Portrait Scale Down (0.00 – 0.40) ---
tl.to(portraitCtn, {
  scale: 0.4,
  borderRadius: '1rem',
  duration: 0.4,
  ease: 'power2.inOut',
}, 0);

// --- Phase 2: Background Color Transition (0.02 – 0.40) ---
tl.to(heroBg, {
  backgroundColor: '#0A1A4A',
  duration: 0.38,
  ease: 'power1.inOut',
}, 0.02);

// --- Phase 3: Image Desaturation (0.05 – 0.40) ---
tl.to(portraitImg, {
  filter: 'grayscale(1)',
  duration: 0.35,
  ease: 'none',
}, 0.05);

// --- Phase 4: Header Color Transition (0.05 – 0.25) ---
tl.to(logo, {
  color: '#F5F0EB',
  duration: 0.2,
  ease: 'none',
}, 0.05);

tl.to(hamburger, {
  backgroundColor: '#F5F0EB',
  duration: 0.2,
  ease: 'none',
}, 0.05);

// --- Phase 5: Marquee Reveal (0.20 – 0.38) ---
tl.fromTo(marqueeLayer,
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
  0.2
);

// --- Phase 6: Signature Draw-On (0.40 – 0.72) ---
// Hide each stroke group individually until its draw phase
gsap.set(tStrokes,  { opacity: 0, strokeDashoffset: 1000 });
gsap.set(aStrokes,  { opacity: 0, strokeDashoffset: 1000 });
gsap.set(xbStrokes, { opacity: 0, strokeDashoffset: 1000 });

// Show SVG container when T stroke begins
tl.to(sigSvg, { opacity: 1, duration: 0.01 }, 0.40);

// T stroke: reveal then draw
tl.to(tStrokes, { opacity: 1, duration: 0.01 }, 0.40);
tl.to(tStrokes, {
  strokeDashoffset: 0,
  duration: 0.14,
  ease: 'power2.inOut',
}, 0.40);

// A stroke: reveal then draw
tl.to(aStrokes, { opacity: 1, duration: 0.01 }, 0.54);
tl.to(aStrokes, {
  strokeDashoffset: 0,
  duration: 0.10,
  ease: 'power2.inOut',
}, 0.54);

// Crossbar: reveal then draw
tl.to(xbStrokes, { opacity: 1, duration: 0.01 }, 0.64);
tl.to(xbStrokes, {
  strokeDashoffset: 0,
  duration: 0.08,
  ease: 'power1.out',
}, 0.64);
