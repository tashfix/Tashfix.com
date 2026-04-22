/* ═══════════════════════════════════════════════════════════
   VANTA GLOBE — animated background for hscroll intro
   ═══════════════════════════════════════════════════════════ */
(function() {
  if (typeof VANTA === 'undefined') return;

  var isMobile = matchMedia('(max-width: 768px)').matches;

  var effect = VANTA.GLOBE({
    el: '#vanta-globe',
    THREE: THREE,
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200,
    minWidth: 200,
    scale: 1.00,
    scaleMobile: 1.00,
    color:       isMobile ? 0x1E3C70 : 0x6B85A8, /* darker blue on mobile — less clash with white text */
    color2:      isMobile ? 0xCC5220 : 0xFF6B35,  /* slightly muted tangerine on mobile */
    backgroundColor: 0x0A1A4A,
    size: 1.2,
    points: 10,
  });

  // Constrain vertical camera rotation to prevent globe clipping at top/bottom
  if (effect && effect.controls) {
    effect.controls.minPolarAngle = Math.PI * 0.35;
    effect.controls.maxPolarAngle = Math.PI * 0.65;
  }

})();

