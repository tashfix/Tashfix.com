/* ═══════════════════════════════════════════════════════════
   VANTA GLOBE — animated background for hscroll intro
   ═══════════════════════════════════════════════════════════ */
(function() {
  if (typeof VANTA === 'undefined') return;

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
    color: 0xFF6B35,
    color2: 0x4A5568,
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
