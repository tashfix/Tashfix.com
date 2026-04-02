/* ═══════════════════════════════════════════════════════════
   HORIZONTAL SCROLL — GSAP scroll, mesh canvas, typewriter, aura
   ═══════════════════════════════════════════════════════════ */
(function() {

  // ── Shared typewriter helper ──
  function setupTypewriter(el, trigger, opts) {
    if (!el) return;
    // Measure full width
    el.style.maxWidth = 'none';
    el.style.visibility = 'hidden';
    el.style.position = 'absolute';
    var fullWidth = el.scrollWidth + 2;
    el.style.maxWidth = '0';
    el.style.visibility = '';
    el.style.position = '';

    var chars = el.textContent.length;
    var steps = Math.max(10, chars);
    var duration = opts.duration || 0.8;
    var delay = opts.delay || 0.1;
    var onDone = opts.onComplete || null;
    var onReset = opts.onReset || null;

    var triggerOpts = {
      trigger: trigger,
      start: opts.start || 'top 85%',
    };
    if (opts.containerAnimation) {
      triggerOpts.containerAnimation = opts.containerAnimation;
      triggerOpts.start = opts.start || 'left 130%';
    }

    triggerOpts.onEnter = function() {
      gsap.to(el, {
        maxWidth: fullWidth,
        ease: 'steps(' + steps + ')',
        duration: duration,
        delay: delay,
        onComplete: function() {
          el.classList.add('done');
          el.style.maxWidth = 'none';
          if (onDone) onDone();
        }
      });
    };

    if (opts.containerAnimation) {
      triggerOpts.onLeaveBack = function() {
        gsap.killTweensOf(el);
        gsap.set(el, { maxWidth: 0 });
        el.classList.remove('done');
        if (onReset) onReset();
      };
    }

    ScrollTrigger.create(triggerOpts);
  }

  // ── Intro spacer reference ──
  var introSpacer = document.getElementById('hscroll-intro');

  // ── Horizontal scroll (desktop) ──
  var mm = gsap.matchMedia();

  mm.add('(min-width: 769px)', function() {
    var track = document.getElementById('hscroll-track');
    var section = document.getElementById('hscroll-gallery');
    var items = gsap.utils.toArray('.hscroll__item');

    function setTrackWidth() {
      var lastItem = items[items.length - 1];
      // End scroll when last item's center reaches viewport center
      var lastCenter = lastItem.offsetLeft + lastItem.offsetWidth * 0.5;
      track.style.width = (lastCenter + window.innerWidth * 0.5) + 'px';
    }
    setTrackWidth();

    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        setTrackWidth();
        ScrollTrigger.refresh();
        recalcProgress();
      }, 200);
    });

    function getScrollDistance() {
      return track.scrollWidth - window.innerWidth;
    }

    var horizontalTween = gsap.to(track, {
      x: function() { return -getScrollDistance(); },
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        pin: true,
        scrub: 0.8,
        start: 'top top',
        end: function() { return '+=' + getScrollDistance(); },
        invalidateOnRefresh: true,
      }
    });

    // Expose for video-expand.js to hook into onUpdate
    window.TashBrand = window.TashBrand || {};
    window.TashBrand.horizontalTween = horizontalTween;

    // Logo + hamburger: swap modes during horizontal scroll
    var siteLogo = document.getElementById('site-logo');
    var logoGlass = document.getElementById('site-logo-glass');
    var logoDark = siteLogo ? siteLogo.querySelector('.site-logo__dark') : null;
    var logoLight = siteLogo ? siteLogo.querySelector('.site-logo__light') : null;
    var menuBtn = document.getElementById('menu-btn');
    var menuLines = menuBtn ? menuBtn.querySelectorAll('.morph__menu-line') : [];

    function setMenuDark() {
      if (!menuBtn) return;
      gsap.to(menuBtn, { borderColor: 'rgba(26, 26, 26, 0.85)', duration: 0.3, ease: 'power2.out' });
      menuLines.forEach(function(l) { gsap.to(l, { backgroundColor: 'rgba(26, 26, 26, 0.85)', duration: 0.3, ease: 'power2.out' }); });
    }
    function setMenuLight() {
      if (!menuBtn) return;
      gsap.to(menuBtn, { borderColor: 'rgba(255, 255, 255, 0.45)', duration: 0.3, ease: 'power2.out' });
      menuLines.forEach(function(l) { gsap.to(l, { backgroundColor: 'rgba(255, 255, 255, 0.85)', duration: 0.3, ease: 'power2.out' }); });
    }

    function enterHScroll() {
      if (logoGlass) logoGlass.classList.add('visible');
      if (logoDark) gsap.to(logoDark, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      if (logoLight) gsap.to(logoLight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      setMenuDark();
    }
    function leaveHScrollForward() {
      if (logoGlass) logoGlass.classList.remove('visible');
      // Keep dark logo — video-expand.js handles the white swap
    }
    function leaveHScrollBack() {
      // Scrolling up into cobalt — swap to white for legibility
      if (logoGlass) logoGlass.classList.remove('visible');
      if (logoDark) gsap.to(logoDark, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      if (logoLight) gsap.to(logoLight, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      setMenuLight();
    }

    if (siteLogo) {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: function() { return '+=' + getScrollDistance(); },
        onEnter: enterHScroll,
        onLeave: leaveHScrollForward,
        onEnterBack: enterHScroll,
        onLeaveBack: leaveHScrollBack,
      });
    }

    // ── Progress indicator ──
    var progressEl = document.getElementById('hscroll-progress');
    var progressFill = document.getElementById('hscroll-progress-fill');
    var notchesEl = document.getElementById('hscroll-progress-notches');

    var totalItems = items.length;
    var scrollDist = getScrollDistance();
    var vpCenter = window.innerWidth * 0.5;
    var itemFractions = [];

    function recalcProgress() {
      if (!progressEl || !notchesEl) return;
      scrollDist = getScrollDistance();
      vpCenter = window.innerWidth * 0.5;
      itemFractions = items.map(function(item) {
        var center = item.offsetLeft + item.offsetWidth * 0.5;
        return Math.max(0, Math.min(1, (center - vpCenter) / scrollDist));
      });
      // Rebuild notches
      notchesEl.innerHTML = '';
      for (var i = 0; i < totalItems; i++) {
        var notch = document.createElement('div');
        notch.className = 'hscroll__progress-notch';
        notch.style.left = (itemFractions[i] * 100) + '%';
        notchesEl.appendChild(notch);
      }
    }

    if (progressEl && notchesEl) {
      recalcProgress();

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: function() { return '+=' + getScrollDistance(); },
        onEnter: function() { progressEl.classList.add('visible'); },
        onLeave: function() { progressEl.classList.remove('visible'); },
        onEnterBack: function() { progressEl.classList.add('visible'); },
        onLeaveBack: function() { progressEl.classList.remove('visible'); },
        onUpdate: function(self) {
          var p = self.progress;
          if (progressFill) progressFill.style.width = (p * 100) + '%';
          var notches = notchesEl.querySelectorAll('.hscroll__progress-notch');
          for (var i = 0; i < notches.length; i++) {
            if (p >= itemFractions[i]) {
              notches[i].classList.add('passed');
            } else {
              notches[i].classList.remove('passed');
            }
          }
        }
      });
    }

    // Per-item reveal + typewriter
    items.forEach(function(item) {
      var tw = item.querySelector('.hscroll__typewriter-text');

      gsap.fromTo(item,
        { opacity: 0, scale: 0.88, y: 35 },
        {
          opacity: 1, scale: 1, y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            containerAnimation: horizontalTween,
            start: 'left 130%',
            end: 'left 85%',
            scrub: true,
          }
        }
      );

      if (tw) {
        setupTypewriter(tw, item, {
          containerAnimation: horizontalTween,
          duration: 0.8,
          delay: 0.1,
        });
      }
    });

    // Per-testimonial reveal + typewriter
    var testimonials = gsap.utils.toArray('.hscroll__testimonial');
    testimonials.forEach(function(quote) {
      var quoteText = quote.querySelector('blockquote p');
      var citeEl = quote.querySelector('cite');

      gsap.fromTo(quote,
        { opacity: 0, y: 24 },
        {
          opacity: 1, y: 0,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: quote,
            containerAnimation: horizontalTween,
            start: 'left 130%',
            end: 'left 85%',
            scrub: true,
          }
        }
      );

      if (quoteText) {
        quoteText.style.overflow = 'hidden';
        quoteText.style.whiteSpace = 'nowrap';
        if (citeEl) citeEl.style.opacity = '0';

        setupTypewriter(quoteText, quote, {
          containerAnimation: horizontalTween,
          duration: 1.5,
          delay: 0.2,
          onComplete: function() {
            quoteText.style.whiteSpace = 'normal';
            if (citeEl) {
              gsap.to(citeEl, { opacity: 1, duration: 0.4, ease: 'power2.out' });
            }
          },
          onReset: function() {
            quoteText.style.whiteSpace = 'nowrap';
            if (citeEl) { gsap.set(citeEl, { opacity: 0 }); }
          }
        });
      }
    });
  });

  // ── Mobile fallback ──
  mm.add('(max-width: 768px)', function() {
    var items = gsap.utils.toArray('.hscroll__item');
    items.forEach(function(item) {
      var tw = item.querySelector('.hscroll__typewriter-text');
      gsap.fromTo(item,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none none',
            onEnter: function() {
              if (tw && !tw.classList.contains('done')) {
                setupTypewriter(tw, item, {
                  duration: 1.2,
                  delay: 0.3,
                });
              }
            }
          }
        }
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // MESH GRID ANIMATION
  // ═══════════════════════════════════════════════════════════
  var meshCanvas = document.getElementById('hscroll-mesh');
  if (!meshCanvas || window.innerWidth <= 768) return;
  var meshCtx = meshCanvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  var ROWS = 32;
  // Mesh starts after the second gallery item (~40vw) and spans to the end
  var MESH_START_VW = 40;
  var waves = [
    { cx: 0.35, cy: 0.4, amp: 55, freq: 0.0025, speed: 0.8 },
    { cx: 0.65, cy: 0.5, amp: 35, freq: 0.003, speed: -0.6 },
    { cx: 0.5, cy: 0.3, amp: 25, freq: 0.004, speed: 1.1 },
  ];
  var maxH = waves.reduce(function(sum, w) { return sum + w.amp; }, 0);
  var coolColor = window.TashBrand.coolColor;

  // Virtual grid spans the full track; canvas is viewport-sized and scrolls with it
  var meshStartPx = 0;
  var meshTotalW = 0;

  function getHeight(x, y, t, W, H) {
    var h = 0;
    for (var i = 0; i < waves.length; i++) {
      var w = waves[i];
      var dx = x - w.cx * W;
      var dy = y - w.cy * H;
      h += w.amp * Math.sin(Math.sqrt(dx * dx + dy * dy) * w.freq + t * w.speed);
    }
    return h;
  }

  function edgeAlpha(virtualX, row, totalW, H) {
    var fadeIn = 0.06;    // left edge fade-in
    var fadeOut = 0.02;   // right edge — grid runs to the end
    var fadeY = 0.28;     // generous top/bottom fade — no hard stop lines
    var cx = virtualX / totalW;
    var cy = row / ROWS;
    var ax = cx < fadeIn ? cx / fadeIn : cx > 1 - fadeOut ? (1 - cx) / fadeOut : 1;
    var ay = cy < fadeY ? cy / fadeY : cy > 1 - fadeY ? (1 - cy) / fadeY : 1;
    return ax * ay;
  }

  var meshTime = 0;
  var meshAnimId = null;
  var meshVisible = false;

  function sizeMeshCanvas() {
    var track = meshCanvas.parentElement;
    meshStartPx = Math.round(MESH_START_VW / 100 * window.innerWidth);
    meshTotalW = track.scrollWidth - meshStartPx;
    // Canvas is viewport-sized — we only draw the visible slice each frame
    var vw = window.innerWidth;
    var H = track.offsetHeight;
    meshCanvas.width = vw * dpr;
    meshCanvas.height = H * dpr;
    meshCanvas.style.width = vw + 'px';
    meshCanvas.style.height = H + 'px';
    meshCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMesh() {
    if (!meshVisible) { meshAnimId = null; return; }

    var vw = window.innerWidth;
    var H = meshCanvas.height / dpr;
    meshCtx.clearRect(0, 0, vw, H);
    meshTime += 0.015;

    // Get current track scroll offset from GSAP transform
    var track = meshCanvas.parentElement;
    var mat = getComputedStyle(track).transform;
    var scrollX = 0;
    if (mat && mat !== 'none') {
      var parts = mat.match(/matrix\((.+)\)/);
      if (parts) scrollX = -parseFloat(parts[1].split(',')[4]);
    }

    // Visible slice in virtual grid coordinates (relative to mesh start)
    var sliceLeft = scrollX - meshStartPx;
    var sliceRight = sliceLeft + vw;

    // If we're before the mesh start, nothing to draw
    if (sliceRight < 0 || sliceLeft > meshTotalW) {
      meshAnimId = requestAnimationFrame(drawMesh);
      return;
    }

    // Position canvas to cover the viewport
    meshCanvas.style.left = scrollX + 'px';

    // Square cells: compute cell size from row count and height, apply same spacing horizontally
    var cellSize = H / ROWS;
    var COLS = Math.round(meshTotalW / cellSize);
    var gridH = H;
    var oY = 0;

    // Find column range that's visible (with 1-col padding for line continuity)
    var colStart = Math.max(0, Math.floor((sliceLeft / meshTotalW) * COLS) - 1);
    var colEnd = Math.min(COLS, Math.ceil((sliceRight / meshTotalW) * COLS) + 1);

    // Pre-compute grid points for visible columns only
    var points = [], alphaGrid = [], heights = [];
    for (var r = 0; r <= ROWS; r++) {
      var rowP = [], rowA = [], rowH = [];
      for (var c = colStart; c <= colEnd; c++) {
        var virtualX = (c / COLS) * meshTotalW;
        var screenX = virtualX - sliceLeft;
        var y = oY + (r / ROWS) * gridH;
        var z = getHeight(virtualX, y, meshTime, meshTotalW, H);
        rowP.push({ x: screenX, y: y + z * 0.4 });
        rowA.push(edgeAlpha(virtualX, r, meshTotalW, H));
        rowH.push((z + maxH) / (2 * maxH));
      }
      points.push(rowP);
      alphaGrid.push(rowA);
      heights.push(rowH);
    }

    var breath = 0.45 + 0.2 * Math.sin(meshTime * 0.8);
    meshCtx.lineWidth = 1.0;
    var localCols = colEnd - colStart;

    // Horizontal lines
    for (var r = 0; r <= ROWS; r++) {
      for (var c = 0; c < localCols; c++) {
        var a = Math.min(alphaGrid[r][c], alphaGrid[r][c + 1]);
        if (a < 0.01) continue;
        var hN = (heights[r][c] + heights[r][c + 1]) / 2;
        var col = coolColor(hN);
        meshCtx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath).toFixed(3) + ')';
        meshCtx.beginPath();
        meshCtx.moveTo(points[r][c].x, points[r][c].y);
        meshCtx.lineTo(points[r][c + 1].x, points[r][c + 1].y);
        meshCtx.stroke();
      }
    }

    // Vertical lines
    for (var c = 0; c <= localCols; c++) {
      for (var r = 0; r < ROWS; r++) {
        var a = Math.min(alphaGrid[r][c], alphaGrid[r + 1][c]);
        if (a < 0.01) continue;
        var hN = (heights[r][c] + heights[r + 1][c]) / 2;
        var col = coolColor(hN);
        meshCtx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath).toFixed(3) + ')';
        meshCtx.beginPath();
        meshCtx.moveTo(points[r][c].x, points[r][c].y);
        meshCtx.lineTo(points[r + 1][c].x, points[r + 1][c].y);
        meshCtx.stroke();
      }
    }

    meshAnimId = requestAnimationFrame(drawMesh);
  }

  // Only animate mesh when the gallery section is visible
  var meshObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      meshVisible = entry.isIntersecting;
      if (meshVisible && !meshAnimId) {
        sizeMeshCanvas();
        drawMesh();
      }
    });
  }, { threshold: 0.01 });

  var gallerySection = document.getElementById('hscroll-gallery');
  if (gallerySection) meshObs.observe(gallerySection);

  // Defer initial sizing — track width is set asynchronously by GSAP matchMedia
  requestAnimationFrame(function() { sizeMeshCanvas(); });
  window.addEventListener('resize', function() { sizeMeshCanvas(); });

  // ═══════════════════════════════════════════════════════════
  // AURA LINES (horizontal scroll intro)
  // ═══════════════════════════════════════════════════════════
  var NUM_LINES = 7;
  var auraLines = [];
  for (var i = 0; i < NUM_LINES; i++) {
    auraLines.push({
      el: document.getElementById('hscroll-aura-' + i),
      baseY: 100 + i * 100 + (Math.random() - 0.5) * 60,
      amplitude: 40 + Math.random() * 80,
      frequency: 0.002 + Math.random() * 0.003,
      speed: 0.0003 + Math.random() * 0.0004,
      phase: Math.random() * Math.PI * 2,
      xOffset: (Math.random() - 0.5) * 100,
    });
  }

  var auraAnimId = null;

  function animateAura() {
    var t = Date.now();
    for (var i = 0; i < auraLines.length; i++) {
      var line = auraLines[i];
      if (!line.el) continue;
      var pts = [];
      var numPts = 8;
      for (var j = 0; j <= numPts; j++) {
        var x = line.xOffset + (j / numPts) * 1440;
        var wave1 = Math.sin(x * line.frequency + t * line.speed + line.phase);
        var wave2 = Math.sin(x * line.frequency * 1.5 + t * line.speed * 0.7 + line.phase + 1.3);
        var y = line.baseY + line.amplitude * wave1 + line.amplitude * 0.4 * wave2;
        pts.push({ x: x, y: y });
      }
      var d = 'M ' + pts[0].x + ' ' + pts[0].y;
      for (var j = 0; j < pts.length - 1; j++) {
        var p0 = pts[Math.max(0, j - 1)];
        var p1 = pts[j];
        var p2 = pts[j + 1];
        var p3 = pts[Math.min(pts.length - 1, j + 2)];
        d += ' C ' + (p1.x + (p2.x - p0.x) / 6) + ' ' + (p1.y + (p2.y - p0.y) / 6) +
             ', ' + (p2.x - (p3.x - p1.x) / 6) + ' ' + (p2.y - (p3.y - p1.y) / 6) +
             ', ' + p2.x + ' ' + p2.y;
      }
      line.el.setAttribute('d', d);
    }
    auraAnimId = requestAnimationFrame(animateAura);
  }

  // Always animate aura (lightweight SVG, no observer needed)
  animateAura();


})();
