/* ═══════════════════════════════════════════════════════════
   MAIN.JS — GSAP registration, shared utilities, loader
   ═══════════════════════════════════════════════════════════ */

// Register GSAP plugins once
gsap.registerPlugin(ScrollTrigger);

// Shared utilities namespace
window.TashBrand = {
  // Cool gradient: deep cobalt → blue → teal → cyan
  coolColor: function(t) {
    t = Math.max(0, Math.min(1, t));
    var r, g, b;
    if (t < 0.25) {
      var s = t / 0.25;
      r = 20 + s * 10; g = 40 + s * 30; b = 120 + s * 40;
    } else if (t < 0.5) {
      var s = (t - 0.25) / 0.25;
      r = 30 - s * 10; g = 70 + s * 60; b = 160 + s * 30;
    } else if (t < 0.75) {
      var s = (t - 0.5) / 0.25;
      r = 20 + s * 20; g = 130 + s * 60; b = 190 + s * 20;
    } else {
      var s = (t - 0.75) / 0.25;
      r = 40 + s * 60; g = 190 + s * 40; b = 210 + s * 30;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  }
};

// ═══════════════════════════════════════════════════════════
// LOADING SEQUENCE — canvas grid + counter overlay
// ═══════════════════════════════════════════════════════════
(function() {
  var overlay = document.getElementById('loader-overlay');
  var loaderDone = false;
  var progressInterval;
  var loaderAnimId;

  // Diagnostic trace — inspect via sessionStorage.getItem('tash_loader_trace').
  // On iPhone Safari, connecting Web Inspector and reading this reveals which
  // path completed the loader (normal progress, 4s fallback, or window error).
  var trace = [];
  function mark(step) {
    try {
      trace.push(step + '@' + Math.round(performance.now()) + 'ms');
      sessionStorage.setItem('tash_loader_trace', JSON.stringify(trace));
    } catch (e) {}
  }

  // Lock scrolling via class, not inline styles — a single toggle unlocks
  // from any safety-net path (normal, fallback, error).
  window.scrollTo(0, 0);
  document.body.classList.add('is-loading');
  mark('lock-applied');

  // Idempotent completion. Safe to call from the progress tick, the 4s
  // fallback, or the window error handler.
  function completeLoader(reason) {
    if (loaderDone) return;
    loaderDone = true;
    mark(reason);
    if (progressInterval) clearInterval(progressInterval);
    if (overlay) overlay.classList.add('fade-out');
    setTimeout(function() {
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.add('is-done');
      }
      if (loaderAnimId) cancelAnimationFrame(loaderAnimId);
      try { window.removeEventListener('resize', resize); } catch (e) {}
      document.body.classList.remove('is-loading');
      window.scrollTo(0, 0);
      mark('unlock-complete');
    }, 350);
    try { revealFaceMorph(); } catch (e) { mark('revealFaceMorph-threw'); }
  }

  // Safety nets — registered before canvas setup so they survive if setup throws.
  setTimeout(function() {
    if (!loaderDone) completeLoader('force-fallback-fired');
  }, 4000);

  window.addEventListener('error', function() {
    if (!loaderDone) completeLoader('window-error-caught');
  });

  var canvas = document.getElementById('loader-canvas');
  var ctx = canvas.getContext('2d');
  var W, H;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  var COLS = 48;
  var ROWS = 32;

  var waves = [
    { cx: 0.35, cy: 0.4, amp: 55, freq: 0.0025, speed: 0.8 },
    { cx: 0.65, cy: 0.5, amp: 35, freq: 0.003, speed: -0.6 },
    { cx: 0.5, cy: 0.3, amp: 25, freq: 0.004, speed: 1.1 },
  ];

  var coolColor = window.TashBrand.coolColor;
  var time = 0;
  var progress = 0;
  var maxH = waves.reduce(function(sum, w) { return sum + w.amp; }, 0);

  progressInterval = setInterval(function() {
    progress++;
    if (progress >= 100) completeLoader('progress-100');
  }, 10);
  mark('interval-started');

  function revealFaceMorph() {
    var player = document.getElementById('morph-player');
    var aura = document.getElementById('morph-aura');

    // Show audio consent modal — interface stays hidden behind frosted veil
    var consent = document.getElementById('audio-consent');
    var enableBtn = document.getElementById('audio-consent-enable');
    var skipBtn = document.getElementById('audio-consent-skip');

    var dismissed = false;
    function dismissConsent() {
      if (dismissed) return;
      dismissed = true;
      // Lift the veil — blur animates to clear
      consent.classList.add('fade-out');
      // Reveal interface elements in sync with the unveil
      var siteLogo = document.getElementById('site-logo');
      var menuBtn = document.getElementById('menu-btn');
      var heroIntro = document.getElementById('morph-hero-intro');
      // Logo reveal is scroll-driven in zoom-out.js — skip here
      if (menuBtn) menuBtn.classList.add('revealed');
      if (aura) aura.classList.add('revealed');
      setTimeout(function() {
        if (heroIntro) heroIntro.classList.add('revealed');
      }, 200);
      setTimeout(function() {
        if (player) player.classList.add('revealed');
      }, 400);
      setTimeout(function() { consent.style.display = 'none'; }, 900);
      window.removeEventListener('scroll', onScrollDismiss);
      // Play signature draw animation once the portrait is visible (~600ms after reveal)
      setTimeout(function() {
        var sig = document.getElementById('ta-sig');
        if (sig) sig.play();
      }, 600);
    }

    function onScrollDismiss() {
      dismissConsent();
    }

    // Skip consent on all devices — dismiss immediately and reveal interface
    dismissConsent();
    return;

    enableBtn.addEventListener('click', function() {
      if (window.TashBrand && window.TashBrand.onLoaderDone) {
        window.TashBrand.onLoaderDone();
      }
      dismissConsent();
    });

    skipBtn.addEventListener('click', function() {
      dismissConsent();
    });

    consent.addEventListener('click', function(e) {
      if (e.target === consent) {
        dismissConsent();
      }
    });
  }

  function getHeight(x, y, t) {
    var h = 0;
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      var dx = x - w.cx * W;
      var dy = y - w.cy * H;
      var dist = Math.sqrt(dx * dx + dy * dy);
      h += w.amp * Math.sin(dist * w.freq + t * w.speed);
    }
    return h;
  }

  function project(x, y, z) {
    var viewHeight = H * 0.45;
    var depth = H * 1.2;
    var scale = depth / (depth + viewHeight - z);
    return {
      x: W / 2 + (x - W / 2) * scale,
      y: H * 0.55 + (y - H * 0.5) * scale * 0.55 - z * scale * 0.4,
    };
  }

  function edgeAlpha(col, row) {
    var fade = 0.15;
    var cx = col / COLS;
    var cy = row / ROWS;
    var ax = 1, ay = 1;
    if (cx < fade) ax = cx / fade;
    else if (cx > 1 - fade) ax = (1 - cx) / fade;
    if (cy < fade) ay = cy / fade;
    else if (cy > 1 - fade) ay = (1 - cy) / fade;
    return ax * ay;
  }

  function draw() {
    if (loaderDone) return;
    ctx.clearRect(0, 0, W, H);
    time += 0.02;

    var gridW = W * 1.8;
    var gridH = H * 1.6;
    var offsetX = (W - gridW) / 2;
    var offsetY = (H - gridH) / 2;

    var points = [];
    var alphaGrid = [];
    var heights = [];

    for (var r = 0; r <= ROWS; r++) {
      var rowP = [], rowA = [], rowH = [];
      for (var c = 0; c <= COLS; c++) {
        var x = offsetX + (c / COLS) * gridW;
        var y = offsetY + (r / ROWS) * gridH;
        var z = getHeight(x, y, time);
        rowP.push(project(x, y, z));
        rowA.push(edgeAlpha(c, r));
        rowH.push((z + maxH) / (2 * maxH));
      }
      points.push(rowP);
      alphaGrid.push(rowA);
      heights.push(rowH);
    }

    var breath = 0.2 + 0.08 * Math.sin(time * 0.8);
    ctx.lineWidth = 0.8;

    // Horizontal lines
    for (var r = 0; r <= ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var a = Math.min(alphaGrid[r][c], alphaGrid[r][c + 1]);
        if (a < 0.01) continue;
        var hN = (heights[r][c] + heights[r][c + 1]) / 2;
        var col = coolColor(hN);
        ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath) + ')';
        ctx.beginPath();
        ctx.moveTo(points[r][c].x, points[r][c].y);
        ctx.lineTo(points[r][c + 1].x, points[r][c + 1].y);
        ctx.stroke();
      }
    }

    // Vertical lines
    for (var c = 0; c <= COLS; c++) {
      for (var r = 0; r < ROWS; r++) {
        var a = Math.min(alphaGrid[r][c], alphaGrid[r + 1][c]);
        if (a < 0.01) continue;
        var hN = (heights[r][c] + heights[r + 1][c]) / 2;
        var col = coolColor(hN);
        ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath) + ')';
        ctx.beginPath();
        ctx.moveTo(points[r][c].x, points[r][c].y);
        ctx.lineTo(points[r + 1][c].x, points[r + 1][c].y);
        ctx.stroke();
      }
    }

    // Counter
    var p = Math.max(1, progress);
    var counterText = (p < 10 ? '0' + p : String(p)) + '%';
    var fontSize = Math.max(32, Math.min(W * 0.05, 56));
    ctx.font = '700 ' + fontSize + 'px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var centerX = W / 2;
    var centerY = H / 2;

    // Ghost segments
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.fillText('88%', centerX, centerY);

    // Flicker
    var flicker = 0.93 + Math.random() * 0.07;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillText(counterText, centerX, centerY);
    ctx.restore();

    // CRT scanlines
    var textW = ctx.measureText('888%').width;
    var slTop = centerY - fontSize * 0.6;
    var slBottom = centerY + fontSize * 0.6;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (var sy = slTop; sy < slBottom; sy += 4) {
      ctx.fillRect(centerX - textW / 2 - 6, sy, textW + 12, 1.5);
    }

    // "INITIALIZING" label
    var subSize = Math.max(12, fontSize * 0.24);
    ctx.font = '400 ' + subSize + 'px Inter, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillText('I N I T I A L I Z I N G', centerX, centerY + fontSize * 0.55 + 10);

    loaderAnimId = requestAnimationFrame(draw);
  }

  document.fonts.ready.then(function() { draw(); });
})();

// Hero CTA — open case study selection screen
(function() {
  var cta = document.querySelector('.morph__hero-cta');
  if (!cta) return;
  cta.addEventListener('click', function(e) {
    e.preventDefault();
    if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
      window.TashBrand.togglePlayerExpanded();
    }
  });
})();
