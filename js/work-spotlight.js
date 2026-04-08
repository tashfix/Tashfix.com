(function() {
    var section = document.getElementById('work-spotlight');
    if (!section) return;


    // Scroll reveal + count-up together
    ScrollTrigger.create({
      trigger: section,
      start: 'top 82%',
      once: true,
      onEnter: function() {
        section.classList.add('is-visible');

        section.querySelectorAll('.spotlight__metric-num[data-count]').forEach(function(el) {
          var target   = parseFloat(el.dataset.count);
          var suffix   = el.dataset.suffix || '';
          var decimals = parseInt(el.dataset.decimals || '0', 10);
          var duration = 1400;
          var startTime = performance.now();
          function step(now) {
            var p = Math.min((now - startTime) / duration, 1);
            var e = 1 - Math.pow(1 - p, 3); // ease out cubic
            var val = e * target;
            el.textContent = (decimals ? val.toFixed(decimals) : Math.floor(val)) + suffix;
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = (decimals ? target.toFixed(decimals) : target) + suffix;
          }
          requestAnimationFrame(step);
        });
      }
    });

    // Logo swap — dark logo + frosted glass on beige sections
    var siteLogo = document.getElementById('site-logo');
    var logoGlass = document.getElementById('site-logo-glass');
    var logoDark = siteLogo ? siteLogo.querySelector('.site-logo__dark') : null;
    var logoLight = siteLogo ? siteLogo.querySelector('.site-logo__light') : null;
    var menuBtn = document.getElementById('menu-btn');
    var menuLines = menuBtn ? menuBtn.querySelectorAll('.morph__menu-line') : [];

    function toBeige() {
      if (logoGlass) logoGlass.classList.add('visible');
      if (logoDark) gsap.to(logoDark, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      if (logoLight) gsap.to(logoLight, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      menuLines.forEach(function(l) { l.style.background = 'rgba(26,26,26,0.75)'; });
    }
    function toDark() {
      if (logoGlass) logoGlass.classList.remove('visible');
      if (logoDark) gsap.to(logoDark, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      if (logoLight) gsap.to(logoLight, { opacity: 1, duration: 0.3, ease: 'power2.out' });
      menuLines.forEach(function(l) { l.style.background = ''; });
    }

    // Swap when work-spotlight top reaches viewport top; revert when scrolling back above it
    var journeyIntro = document.getElementById('journey-intro');
    var beigeEnd = journeyIntro || section;
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom top',
      onEnter: toBeige,
      onLeaveBack: toDark
    });
    // Journey intro section — stay in beige mode
    if (journeyIntro) {
      ScrollTrigger.create({
        trigger: journeyIntro,
        start: 'top top',
        end: 'bottom top',
        onEnter: toBeige,
        onLeaveBack: toBeige
      });
    }

    // Mesh grid animation — deferred until all scripts (incl. main.js) are loaded
    window.addEventListener('load', function() {
      var canvas = document.getElementById('spotlight-mesh');
      if (!canvas || window.innerWidth <= 768) return;
      var ctx = canvas.getContext('2d');
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var ROWS = 26;
      var waves = [
        { cx: 0.3,  cy: 0.4,  amp: 50, freq: 0.0028, speed:  0.7 },
        { cx: 0.72, cy: 0.55, amp: 32, freq: 0.0032, speed: -0.55 },
        { cx: 0.5,  cy: 0.25, amp: 22, freq: 0.0045, speed:  1.0 },
      ];
      var maxH = waves.reduce(function(s, w) { return s + w.amp; }, 0);
      var coolColor = window.TashBrand && window.TashBrand.coolColor;
      if (!coolColor) return;

      var meshTime = 0, animId = null, isVisible = false;

      function getH(x, y, t, W, H) {
        var h = 0;
        for (var i = 0; i < waves.length; i++) {
          var w = waves[i];
          var dx = x - w.cx * W, dy = y - w.cy * H;
          h += w.amp * Math.sin(Math.sqrt(dx * dx + dy * dy) * w.freq + t * w.speed);
        }
        return h;
      }

      // Fade all four edges — large top fade pushes grid below the heading
      function edgeAlpha(cx, cy) {
        var fSide = 0.10, fTop = 0.62, fBot = 0.10;
        var ax = cx < fSide ? cx / fSide : cx > 1 - fSide ? (1 - cx) / fSide : 1;
        var ay = cy < fTop  ? cy / fTop  : cy > 1 - fBot  ? (1 - cy) / fBot  : 1;
        return ax * ay;
      }

      function sizeCanvas() {
        var W = section.offsetWidth, H = section.offsetHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function draw() {
        if (!isVisible) { animId = null; return; }
        var W = canvas.width / dpr, H = canvas.height / dpr;
        ctx.clearRect(0, 0, W, H);
        meshTime += 0.012;

        var cellSize = H / ROWS;
        var COLS = Math.round(W / cellSize);
        var pts = [], ags = [], hts = [];

        for (var r = 0; r <= ROWS; r++) {
          var rp = [], ra = [], rh = [];
          for (var c = 0; c <= COLS; c++) {
            var x = (c / COLS) * W, y = (r / ROWS) * H;
            var z = getH(x, y, meshTime, W, H);
            rp.push({ x: x, y: y + z * 0.35 });
            ra.push(edgeAlpha(c / COLS, r / ROWS));
            rh.push((z + maxH) / (2 * maxH));
          }
          pts.push(rp); ags.push(ra); hts.push(rh);
        }

        var breath = (0.45 + 0.2 * Math.sin(meshTime * 0.8)) * 0.55;
        ctx.lineWidth = 1.0;

        // Horizontal lines
        for (var r = 0; r <= ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var a = Math.min(ags[r][c], ags[r][c + 1]);
            if (a < 0.01) continue;
            var col = coolColor((hts[r][c] + hts[r][c + 1]) / 2);
            ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(pts[r][c].x, pts[r][c].y); ctx.lineTo(pts[r][c + 1].x, pts[r][c + 1].y); ctx.stroke();
          }
        }

        // Vertical lines
        for (var c = 0; c <= COLS; c++) {
          for (var r = 0; r < ROWS; r++) {
            var a = Math.min(ags[r][c], ags[r + 1][c]);
            if (a < 0.01) continue;
            var col = coolColor((hts[r][c] + hts[r + 1][c]) / 2);
            ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath).toFixed(3) + ')';
            ctx.beginPath(); ctx.moveTo(pts[r][c].x, pts[r][c].y); ctx.lineTo(pts[r + 1][c].x, pts[r + 1][c].y); ctx.stroke();
          }
        }

        animId = requestAnimationFrame(draw);
      }

      sizeCanvas();
      var meshObs = new IntersectionObserver(function(entries) {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !animId) draw();
      }, { threshold: 0.01 });
      meshObs.observe(section);
      window.addEventListener('resize', sizeCanvas);
    });

    // Card clicks → expand player to that case study
    section.querySelectorAll('.spotlight__card').forEach(function(card) {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        var csId = card.dataset.cs;
        if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
          // Remember where we came from so X returns here
          window.TashBrand._fromSpotlight = true;
          window.TashBrand._spotlightScrollY = window.pageYOffset;
          // Mark the player so the back button stays hidden
          var playerEl = document.getElementById('morph-player');
          if (playerEl) playerEl.classList.add('spotlight-entry');
          // Hide grid immediately — we're going straight to case study detail, not selection screen
          var gridCanvas = document.getElementById('cs-grid-canvas');
          if (gridCanvas) gridCanvas.style.display = 'none';
          if (window.TashBrand.csGridStop) window.TashBrand.csGridStop();
          // Expand player, then fire the matching inner card click
          window.TashBrand.togglePlayerExpanded();
          setTimeout(function() {
            var inner = document.querySelector('.morph__cs-card[data-cs="' + csId + '"]');
            if (inner) inner.click();
          }, 700);
        }
      });
    });
  })();
