/* ═══════════════════════════════════════════════════════════
   SPOTLIGHT — sync global pointer coords to all [data-glow] elements
   background-attachment:fixed means viewport coords are shared
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  function syncPointer(e) {
    var x = e.clientX;
    var y = e.clientY;
    var xp = (x / window.innerWidth).toFixed(4);
    var yp = (y / window.innerHeight).toFixed(4);

    var els = document.querySelectorAll('[data-glow]');
    for (var i = 0; i < els.length; i++) {
      els[i].style.setProperty('--x', x);
      els[i].style.setProperty('--y', y);
      els[i].style.setProperty('--xp', xp);
      els[i].style.setProperty('--yp', yp);
    }
  }

  document.addEventListener('pointermove', syncPointer);
})();
