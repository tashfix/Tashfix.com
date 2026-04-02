/* ═══════════════════════════════════════════════════════════
   WAVE BACKGROUND — interactive SVG wave lines
   Vanilla JS port of React Waves component
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Simplex 2D noise (self-contained) ────────────────── */
  var F2 = 0.5 * (Math.sqrt(3) - 1);
  var G2 = (3 - Math.sqrt(3)) / 6;
  var grad3 = [
    [1,1],[-1,1],[1,-1],[-1,-1],
    [1,0],[-1,0],[0,1],[0,-1]
  ];
  var perm = new Uint8Array(512);
  var permMod8 = new Uint8Array(512);

  // Seed once
  (function seed() {
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod8[i] = perm[i] & 7;
    }
  })();

  function noise2D(x, y) {
    var s = (x + y) * F2;
    var i = Math.floor(x + s);
    var j = Math.floor(y + s);
    var t = (i + j) * G2;
    var X0 = i - t, Y0 = j - t;
    var x0 = x - X0, y0 = y - Y0;
    var i1 = x0 > y0 ? 1 : 0;
    var j1 = x0 > y0 ? 0 : 1;
    var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    var ii = i & 255, jj = j & 255;
    var n0 = 0, n1 = 0, n2 = 0;
    var t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; var gi = permMod8[ii + perm[jj]]; n0 = t0 * t0 * (grad3[gi][0] * x0 + grad3[gi][1] * y0); }
    var t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; var gi1 = permMod8[ii + i1 + perm[jj + j1]]; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1); }
    var t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; var gi2 = permMod8[ii + 1 + perm[jj + 1]]; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2); }
    return 70 * (n0 + n1 + n2);
  }

  /* ── Config ───────────────────────────────────────────── */
  var STROKE_COLOR = 'rgba(0,0,0,0.18)';
  var X_GAP = 8;
  var Y_GAP = 8;

  /* ── State ────────────────────────────────────────────── */
  var container, svg;
  var paths = [];
  var lines = [];   // Array of arrays of Point objects
  var bounding = null;
  var raf = null;
  var mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };

  /* ── Init ─────────────────────────────────────────────── */
  function init() {
    container = document.getElementById('zoomout-bg');
    if (!container) return;

    // Create SVG element
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.style.cssText = 'display:block;width:100%;height:100%;position:absolute;top:0;left:0;';
    container.appendChild(svg);

    setSize();
    setLines();

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove);
    container.addEventListener('touchmove', onTouchMove, { passive: false });

    raf = requestAnimationFrame(tick);
  }

  function destroy() {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
    if (container) container.removeEventListener('touchmove', onTouchMove);
    if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
    paths = [];
    lines = [];
  }

  /* ── Size ──────────────────────────────────────────────── */
  function setSize() {
    if (!container || !svg) return;
    bounding = container.getBoundingClientRect();
    svg.style.width = bounding.width + 'px';
    svg.style.height = bounding.height + 'px';
  }

  /* ── Lines ─────────────────────────────────────────────── */
  function setLines() {
    if (!svg || !bounding) return;

    // Remove old paths
    paths.forEach(function (p) { p.remove(); });
    paths = [];
    lines = [];

    var w = bounding.width;
    var h = bounding.height;
    var oWidth = w + 200;
    var oHeight = h + 30;
    var totalLines = Math.ceil(oWidth / X_GAP);
    var totalPoints = Math.ceil(oHeight / Y_GAP);
    var xStart = (w - X_GAP * totalLines) / 2;
    var yStart = (h - Y_GAP * totalPoints) / 2;

    for (var i = 0; i < totalLines; i++) {
      var points = [];
      for (var j = 0; j < totalPoints; j++) {
        points.push({
          x: xStart + X_GAP * i,
          y: yStart + Y_GAP * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 }
        });
      }

      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', STROKE_COLOR);
      path.setAttribute('stroke-width', '1');
      svg.appendChild(path);
      paths.push(path);
      lines.push(points);
    }
  }

  /* ── Events ────────────────────────────────────────────── */
  function onResize() { setSize(); setLines(); }

  function onMouseMove(e) { updateMouse(e.pageX, e.pageY); }

  function onTouchMove(e) {
    e.preventDefault();
    var t = e.touches[0];
    updateMouse(t.clientX, t.clientY);
  }

  function updateMouse(x, y) {
    if (!bounding) return;
    mouse.x = x - bounding.left;
    mouse.y = y - bounding.top + window.scrollY;
    if (!mouse.set) {
      mouse.sx = mouse.x; mouse.sy = mouse.y;
      mouse.lx = mouse.x; mouse.ly = mouse.y;
      mouse.set = true;
    }
  }

  /* ── Move points ───────────────────────────────────────── */
  function movePoints(time) {
    for (var l = 0; l < lines.length; l++) {
      var pts = lines[l];
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];

        // Wave
        var move = noise2D(
          (p.x + time * 0.008) * 0.003,
          (p.y + time * 0.003) * 0.002
        ) * 8;
        p.wave.x = Math.cos(move) * 12;
        p.wave.y = Math.sin(move) * 6;

        // Cursor influence
        var dx = p.x - mouse.sx;
        var dy = p.y - mouse.sy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var limit = Math.max(175, mouse.vs);

        if (d < limit) {
          var s = 1 - d / limit;
          var f = Math.cos(d * 0.001) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * limit * mouse.vs * 0.00035;
          p.cursor.vy += Math.sin(mouse.a) * f * limit * mouse.vs * 0.00035;
        }

        p.cursor.vx += (0 - p.cursor.x) * 0.01;
        p.cursor.vy += (0 - p.cursor.y) * 0.01;
        p.cursor.vx *= 0.95;
        p.cursor.vy *= 0.95;
        p.cursor.x += p.cursor.vx;
        p.cursor.y += p.cursor.vy;
        p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
        p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
      }
    }
  }

  /* ── Draw ───────────────────────────────────────────────── */
  function drawLines() {
    for (var l = 0; l < lines.length; l++) {
      var pts = lines[l];
      if (pts.length < 2 || !paths[l]) continue;

      var first = pts[0];
      var d = 'M ' + first.x + ' ' + first.y;

      for (var i = 1; i < pts.length; i++) {
        var p = pts[i];
        var mx = p.x + p.wave.x + p.cursor.x;
        var my = p.y + p.wave.y + p.cursor.y;
        d += 'L ' + mx + ' ' + my;
      }

      paths[l].setAttribute('d', d);
    }
  }

  /* ── Tick ───────────────────────────────────────────────── */
  function tick(time) {
    // Smooth mouse
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;

    var dx = mouse.x - mouse.lx;
    var dy = mouse.y - mouse.ly;
    var d = Math.sqrt(dx * dx + dy * dy);
    mouse.v = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs = Math.min(100, mouse.vs);
    mouse.lx = mouse.x;
    mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);

    movePoints(time);
    drawLines();

    raf = requestAnimationFrame(tick);
  }

  /* ── Expose for external control ───────────────────────── */
  window.waveBackground = { init: init, destroy: destroy };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
