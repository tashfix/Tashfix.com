/* ═══════════════════════════════════════════════════════════
   FACE MORPH — canvas eraser, idle strokes, aura, cursor, player
   ═══════════════════════════════════════════════════════════ */
(function() {
  var canvas = document.getElementById('morph-canvas');
  var ctx = canvas.getContext('2d');
  var metallicImg = document.getElementById('morph-metallic');
  var cursorEl = document.getElementById('morph-cursor');
  var section = document.getElementById('zoomout-sticky');

  var portraitImg = new Image();
  portraitImg.src = 'assets/images/portrait.png';

  var canvasW, canvasH, offsetX, offsetY;
  var mouse = { x: -1000, y: -1000, active: false, idleTimeout: null };
  var lastMouse = { x: -1000, y: -1000 };
  var idleTimer = 0;
  var isIdle = true;
  var IDLE_DELAY = 800;
  var lastTime = 0;
  var morphAnimId = null;
  var isVisible = true;

  var MOUSE_BRUSH_RADIUS = 90;
  var IDLE_BRUSH_RADIUS = 75;
  var FADE_BACK_ALPHA = 0.030;

  var strokes = [];
  var MAX_STROKES = 2;
  var STROKE_SPAWN_INTERVAL = 1800;
  var lastStrokeSpawn = 0;

  function IdleStroke(w, h) {
    var centerX = w / 2;
    var centerY = h / 2;
    var spreadX = w * 0.35;
    var spreadY = h * 0.4;
    var angle = Math.random() * Math.PI * 2;
    var startDist = Math.max(spreadX, spreadY) * (0.6 + Math.random() * 0.5);

    this.p0 = { x: centerX + Math.cos(angle) * startDist, y: centerY + Math.sin(angle) * startDist };
    this.p1 = { x: centerX + (Math.random() - 0.5) * spreadX * 1.5, y: centerY + (Math.random() - 0.5) * spreadY * 1.5 };
    this.p2 = { x: centerX + (Math.random() - 0.5) * spreadX * 1.5, y: centerY + (Math.random() - 0.5) * spreadY * 1.5 };
    var endAngle = angle + Math.PI + (Math.random() - 0.5) * 1.2;
    var endDist = Math.max(spreadX, spreadY) * (0.6 + Math.random() * 0.5);
    this.p3 = { x: centerX + Math.cos(endAngle) * endDist, y: centerY + Math.sin(endAngle) * endDist };

    this.t = 0;
    this.speed = 0.006 + Math.random() * 0.01;
    this.radius = IDLE_BRUSH_RADIUS * (0.8 + Math.random() * 0.7);
    this.alive = true;
  }

  IdleStroke.prototype.getPoint = function(t) {
    var mt = 1 - t;
    return {
      x: mt*mt*mt * this.p0.x + 3*mt*mt*t * this.p1.x + 3*mt*t*t * this.p2.x + t*t*t * this.p3.x,
      y: mt*mt*mt * this.p0.y + 3*mt*mt*t * this.p1.y + 3*mt*t*t * this.p2.y + t*t*t * this.p3.y
    };
  };

  IdleStroke.prototype.update = function() {
    this.t += this.speed;
    if (this.t >= 1) this.alive = false;
  };

  IdleStroke.prototype.draw = function(ctx) {
    if (!this.alive) return;
    var pt = this.getPoint(this.t);
    var edgeFade = Math.sin(this.t * Math.PI);
    var alpha = 0.4 + edgeFade * 0.5;
    drawSoftBrush(ctx, pt.x, pt.y, this.radius, alpha);
  };

  function drawSoftBrush(context, x, y, radius, alpha) {
    context.save();
    context.globalCompositeOperation = 'destination-out';
    var gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(0, 0, 0, ' + alpha + ')');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, ' + (alpha * 0.6) + ')');
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, ' + (alpha * 0.15) + ')');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function interpolateBrush(context, x1, y1, x2, y2, radius, alpha) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var steps = Math.max(1, Math.floor(dist / (radius * 0.3)));
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      drawSoftBrush(context, x1 + dx * t, y1 + dy * t, radius, alpha);
    }
  }

  function resize() {
    if (!portraitImg.naturalWidth) return;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var imgRatio = portraitImg.naturalWidth / portraitImg.naturalHeight;
    var viewRatio = vw / vh;

    if (viewRatio > imgRatio) {
      canvasW = vw;
      canvasH = vw / imgRatio;
    } else {
      canvasH = vh;
      canvasW = vh * imgRatio;
    }

    canvas.width = canvasW;
    canvas.height = canvasH;
    metallicImg.style.width = canvasW + 'px';
    metallicImg.style.height = canvasH + 'px';
    offsetX = (vw - canvasW) / 2;
    offsetY = (vh - canvasH) / 2;

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(portraitImg, 0, 0, canvasW, canvasH);
  }

  function animate(timestamp) {
    if (!isVisible) return;
    if (!lastTime) lastTime = timestamp;
    var dt = timestamp - lastTime;
    lastTime = timestamp;

    // Fade-back
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = FADE_BACK_ALPHA;
    ctx.drawImage(portraitImg, 0, 0, canvasW, canvasH);
    ctx.globalAlpha = 1;

    // Mouse brush
    if (mouse.active) {
      var mx = mouse.x - offsetX;
      var my = mouse.y - offsetY;
      var lx = lastMouse.x - offsetX;
      var ly = lastMouse.y - offsetY;
      interpolateBrush(ctx, lx, ly, mx, my, MOUSE_BRUSH_RADIUS, 0.65);
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      idleTimer = 0;
      isIdle = false;
    } else {
      idleTimer += dt;
      if (idleTimer > IDLE_DELAY) isIdle = true;
    }

    // Idle strokes
    if (isIdle) {
      lastStrokeSpawn += dt;
      if (lastStrokeSpawn > STROKE_SPAWN_INTERVAL && strokes.length < MAX_STROKES) {
        strokes.push(new IdleStroke(canvasW, canvasH));
        lastStrokeSpawn = 0;
      }
      for (var i = strokes.length - 1; i >= 0; i--) {
        strokes[i].update();
        strokes[i].draw(ctx);
        if (!strokes[i].alive) strokes.splice(i, 1);
      }
    }

    morphAnimId = requestAnimationFrame(animate);
  }

  // Mouse events — scoped to face morph section
  section.addEventListener('mousemove', function(e) {
    // Disable interaction once zoom-out scroll begins
    if (window.TashBrand && window.TashBrand.zoomProgress > 0.05) {
      mouse.active = false;
      cursorEl.classList.remove('visible');
      return;
    }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top = e.clientY + 'px';
    cursorEl.classList.add('visible');
    clearTimeout(mouse.idleTimeout);
    mouse.idleTimeout = setTimeout(function() { mouse.active = false; }, 100);
  });

  section.addEventListener('mouseleave', function() {
    mouse.active = false;
    cursorEl.classList.remove('visible');
  });

  window.addEventListener('resize', resize);

  // IntersectionObserver to pause when off-screen
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        isVisible = true;
        lastTime = 0;
        morphAnimId = requestAnimationFrame(animate);
        requestAnimationFrame(updateAura);
      } else {
        isVisible = false;
        if (morphAnimId) { cancelAnimationFrame(morphAnimId); morphAnimId = null; }
      }
    });
  }, { threshold: 0.01 });
  observer.observe(section);

  // Init
  portraitImg.onload = function() {
    resize();
    lastMouse.x = mouse.x;
    lastMouse.y = mouse.y;
    morphAnimId = requestAnimationFrame(animate);
  };

  // ═══════════════════════════════════════════════════════════
  // AURA LINES
  // ═══════════════════════════════════════════════════════════
  var NUM_LINES = 7;
  var auraPaths = [];
  var auraData = [];

  for (var i = 0; i < NUM_LINES; i++) {
    auraPaths.push(document.getElementById('morph-aura-' + i));
    auraData.push({
      baseY: 100 + (i * 100) + (Math.random() - 0.5) * 60,
      amplitude: 40 + Math.random() * 80,
      frequency: 0.002 + Math.random() * 0.003,
      speed: 0.0003 + Math.random() * 0.0004,
      phase: Math.random() * Math.PI * 2,
      xOffset: -100 + Math.random() * 100
    });
  }

  function updateAura(timestamp) {
    var t = timestamp * 0.001;
    for (var i = 0; i < NUM_LINES; i++) {
      var d = auraData[i];
      var points = [];
      var numPoints = 8;
      for (var j = 0; j <= numPoints; j++) {
        var xFrac = j / numPoints;
        var x = d.xOffset + xFrac * 1640;
        var wave1 = Math.sin(xFrac * Math.PI * 2 * (1 + d.frequency * 500) + t * d.speed * 1000 + d.phase);
        var wave2 = Math.sin(xFrac * Math.PI * 1.3 + t * d.speed * 600 + d.phase * 1.7) * 0.4;
        var y = d.baseY + (wave1 + wave2) * d.amplitude;
        points.push({ x: x, y: y });
      }
      var pathStr = 'M ' + points[0].x + ' ' + points[0].y;
      for (var j = 0; j < points.length - 1; j++) {
        var p0 = points[Math.max(0, j - 1)];
        var p1 = points[j];
        var p2 = points[j + 1];
        var p3 = points[Math.min(points.length - 1, j + 2)];
        var cp1x = p1.x + (p2.x - p0.x) / 6;
        var cp1y = p1.y + (p2.y - p0.y) / 6;
        var cp2x = p2.x - (p3.x - p1.x) / 6;
        var cp2y = p2.y - (p3.y - p1.y) / 6;
        pathStr += ' C ' + cp1x + ' ' + cp1y + ', ' + cp2x + ' ' + cp2y + ', ' + p2.x + ' ' + p2.y;
      }
      if (auraPaths[i]) auraPaths[i].setAttribute('d', pathStr);
    }
    requestAnimationFrame(updateAura);
  }
  requestAnimationFrame(updateAura);

  // ═══════════════════════════════════════════════════════════
  // MUSIC PLAYER
  // ═══════════════════════════════════════════════════════════
  var audio = new Audio('assets/audio/track.flac');
  audio.preload = 'auto';
  audio.volume = 0.7;

  var playBtn = document.getElementById('morph-play-btn');
  var playIcon = document.getElementById('morph-play-icon');
  var pauseIcon = document.getElementById('morph-pause-icon');
  var playRing = document.getElementById('morph-play-ring');
  var progressFill = document.getElementById('morph-progress-fill');
  var progressKnob = document.getElementById('morph-progress-knob');
  var timeDisplay = document.getElementById('morph-time-display');
  var volumeFill = document.getElementById('morph-volume-fill');
  var volumeKnob = document.getElementById('morph-volume-knob');
  var volumeTrack = document.getElementById('morph-volume-track');

  var isPlaying = false;
  var lcdStatus = document.getElementById('morph-lcd-status');

  // ── Web Audio API visualizer ──
  var vizCanvas = document.getElementById('morph-viz-canvas');
  var vizCtx = vizCanvas ? vizCanvas.getContext('2d') : null;
  var audioCtx = null;
  var analyser = null;
  var sourceNode = null;
  var vizAnimId = null;
  var freqData = null;
  var smoothBars = null;
  var vizActive = false;

  function initAudioContext() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    sourceNode = audioCtx.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    freqData = new Uint8Array(analyser.frequencyBinCount);
  }

  function drawVisualizer() {
    vizAnimId = requestAnimationFrame(drawVisualizer);
    if (!vizCanvas || !vizCtx) return;

    var dpr = window.devicePixelRatio || 1;
    var rect = vizCanvas.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;

    if (vizCanvas.width !== Math.floor(w * dpr) || vizCanvas.height !== Math.floor(h * dpr)) {
      vizCanvas.width = Math.floor(w * dpr);
      vizCanvas.height = Math.floor(h * dpr);
      vizCtx.scale(dpr, dpr);
    }

    vizCtx.clearRect(0, 0, w, h);

    var barCount = 64;
    if (!smoothBars) smoothBars = new Float32Array(barCount);

    var gap = 3;
    var barWidth = (w - (barCount - 1) * gap) / barCount;
    if (barWidth < 2) barWidth = 2;

    var targetVals = new Float32Array(barCount);
    if (analyser && freqData && vizActive) {
      analyser.getByteFrequencyData(freqData);
      var binCount = freqData.length;
      var sampleRate = audioCtx.sampleRate;
      var logMin = Math.log(30);
      var logMax = Math.log(Math.min(16000, sampleRate / 2));

      for (var i = 0; i < barCount; i++) {
        var freqLo = Math.exp(logMin + (logMax - logMin) * (i / barCount));
        var freqHi = Math.exp(logMin + (logMax - logMin) * ((i + 1) / barCount));
        var binLo = Math.max(0, Math.min(Math.floor(freqLo * binCount * 2 / sampleRate), binCount - 1));
        var binHi = Math.max(binLo + 1, Math.min(Math.ceil(freqHi * binCount * 2 / sampleRate), binCount));
        var sum = 0;
        for (var b = binLo; b < binHi; b++) sum += freqData[b];
        targetVals[i] = Math.pow((sum / (binHi - binLo)) / 255, 0.7);
      }
    }

    var allZero = true;
    for (var i = 0; i < barCount; i++) {
      var target = targetVals[i];
      var current = smoothBars[i];
      smoothBars[i] = target > current ? current + (target - current) * 0.35 : current + (target - current) * 0.08;
      if (smoothBars[i] < 0.005) smoothBars[i] = 0;
      if (smoothBars[i] > 0.005) allZero = false;
    }

    if (!vizActive && allZero) {
      cancelAnimationFrame(vizAnimId);
      vizAnimId = null;
      vizCtx.clearRect(0, 0, w, h);
      return;
    }

    for (var i = 0; i < barCount; i++) {
      var val = smoothBars[i];
      var barH = Math.max(val > 0 ? 2 : 0, val * h * 0.92);
      var grad = vizCtx.createLinearGradient(0, h, 0, h - barH);
      grad.addColorStop(0, 'rgba(180,96,0,0.3)');
      grad.addColorStop(0.5, 'rgba(255,140,0,0.35)');
      grad.addColorStop(1, 'rgba(255,200,80,0.4)');
      vizCtx.fillStyle = grad;
      vizCtx.shadowColor = 'rgba(255,140,0,0.12)';
      vizCtx.shadowBlur = 4;
      var x = i * (barWidth + gap);
      var radius = Math.min(barWidth / 2, 2);
      vizCtx.beginPath();
      vizCtx.moveTo(x, h);
      vizCtx.lineTo(x, h - barH + radius);
      vizCtx.quadraticCurveTo(x, h - barH, x + radius, h - barH);
      vizCtx.lineTo(x + barWidth - radius, h - barH);
      vizCtx.quadraticCurveTo(x + barWidth, h - barH, x + barWidth, h - barH + radius);
      vizCtx.lineTo(x + barWidth, h);
      vizCtx.closePath();
      vizCtx.fill();
    }
    vizCtx.shadowBlur = 0;
  }

  function startVisualizer() {
    vizActive = true;
    if (!vizAnimId) drawVisualizer();
  }

  function stopVisualizer() {
    vizActive = false;
  }

  function updateLcdStatus(state) {
    if (!lcdStatus) return;
    var trackInfo = '<span class="morph__status-track">\u2014 Claro Intelecto \u2014 When The Time Is Right</span>';
    if (state === 'playing') {
      lcdStatus.innerHTML = '<span class="morph__status-dot"></span>PLAYING ' + trackInfo;
    } else if (state === 'paused') {
      lcdStatus.innerHTML = '<span class="morph__status-dot"></span>PAUSED ' + trackInfo;
    } else {
      lcdStatus.innerHTML = '<span class="morph__status-dot"></span>READY';
    }
  }

  // Start playback (called after user click on loader dismisses it)
  function startPlayback() {
    audio.play().then(function() {
      isPlaying = true;
      playIcon.classList.remove('visible');
      pauseIcon.classList.add('visible');
      playRing.classList.add('glowing');
      initAudioContext();
      startVisualizer();
      updateLcdStatus('playing');
      requestAnimationFrame(updateProgress);
    }).catch(function() {});
  }

  // Wait for loader dismiss (user click provides gesture for audio)
  var audioReady = false;
  audio.addEventListener('canplaythrough', function() { audioReady = true; }, { once: true });

  window.TashBrand.onLoaderDone = function() {
    if (audioReady) {
      startPlayback();
    } else {
      audio.addEventListener('canplaythrough', function() { startPlayback(); }, { once: true });
    }
  };

  function formatTime(s) {
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
  }

  function updateProgress() {
    if (!audio.duration) return;
    var pct = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = pct + '%';
    progressKnob.style.left = pct + '%';
    timeDisplay.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    if (isPlaying) requestAnimationFrame(updateProgress);
  }

  if (playBtn) {
    playBtn.addEventListener('click', function() {
      if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playIcon.classList.add('visible');
        pauseIcon.classList.remove('visible');
        playRing.classList.remove('glowing');
        stopVisualizer();
        updateLcdStatus('paused');
      } else {
        audio.play();
        isPlaying = true;
        playIcon.classList.remove('visible');
        pauseIcon.classList.add('visible');
        playRing.classList.add('glowing');
        initAudioContext();
        startVisualizer();
        updateLcdStatus('playing');
        requestAnimationFrame(updateProgress);
      }
    });
  }

  // Volume slider
  if (volumeTrack) {
    volumeTrack.addEventListener('click', function(e) {
      var rect = volumeTrack.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audio.volume = pct;
      volumeFill.style.width = (pct * 100) + '%';
      volumeKnob.style.left = (pct * 100) + '%';
    });
  }

  // Draggable player
  var playerEl = document.getElementById('morph-player');
  if (playerEl) {
    var dragState = null;
    var playerScale = 1; // detected on drag start

    function getPlayerScale() {
      var cssW = playerEl.offsetWidth;
      var renderedW = playerEl.getBoundingClientRect().width;
      return cssW > 0 ? renderedW / cssW : 1;
    }

    function onDragStart(clientX, clientY) {
      if (playerEl.classList.contains('expanded')) return;
      if (playerEl.classList.contains('transitioning')) return;
      var rect = playerEl.getBoundingClientRect();
      playerScale = getPlayerScale();
      dragState = { offsetX: clientX - rect.left, offsetY: clientY - rect.top };
      // Disable transition so repositioning is instant
      playerEl.style.transition = 'none';
      // Switch to left/top positioning, preserve current scale
      playerEl.style.right = 'auto';
      playerEl.style.bottom = 'auto';
      playerEl.style.transformOrigin = 'top left';
      playerEl.style.transform = playerScale < 0.99 ? 'scale(' + playerScale + ')' : 'none';
      playerEl.style.left = rect.left + 'px';
      playerEl.style.top = rect.top + 'px';
      playerEl.offsetHeight; // force reflow so transition:none takes effect
      playerEl.dataset.dragged = '1';
      playerEl.classList.add('dragging');
    }

    function onDragMove(clientX, clientY) {
      if (!dragState) return;
      var newLeft = clientX - dragState.offsetX;
      var newTop = clientY - dragState.offsetY;
      var rect = playerEl.getBoundingClientRect();
      newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, newLeft));
      newTop = Math.max(0, Math.min(window.innerHeight - rect.height, newTop));
      playerEl.style.left = newLeft + 'px';
      playerEl.style.top = newTop + 'px';
    }

    function onDragEnd() {
      if (dragState) {
        dragState = null;
        playerEl.classList.remove('dragging');
        // Restore transition for expand/collapse animations
        playerEl.style.transition = '';
      }
    }

    playerEl.addEventListener('mousedown', function(e) {
      if (e.target.closest('.morph__play-btn') || e.target.closest('.morph__volume-slider-track') || e.target.closest('.morph__expand-close-btn') || e.target.closest('.morph__cs-card')) return;
      onDragStart(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) { if (dragState) onDragMove(e.clientX, e.clientY); });
    document.addEventListener('mouseup', onDragEnd);

    // Touch support
    playerEl.addEventListener('touchstart', function(e) {
      if (e.target.closest('.morph__play-btn') || e.target.closest('.morph__volume-slider-track') || e.target.closest('.morph__expand-close-btn') || e.target.closest('.morph__cs-card')) return;
      onDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchmove', function(e) { if (dragState) onDragMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener('touchend', onDragEnd);
  }

  // ═══════════════════════════════════════════════════════════
  // PLAYER — EXPANDED FULLSCREEN TOGGLE (X key debug)
  // ═══════════════════════════════════════════════════════════
  (function() {
    var player = document.getElementById('morph-player');
    var expandFlash = document.getElementById('morph-expand-flash');
    var expandCloseBtn = document.getElementById('morph-expand-close');
    if (!player || !expandFlash) return;

    var isExpanded = false;
    var isTransitioning = false;
    var savedPosition = { left: null, top: null };
    var savedScale = 1;

    function toggleExpanded() {
      if (isTransitioning) return;

      // Fire flash effect
      expandFlash.classList.remove('active');
      expandFlash.offsetHeight; // force reflow
      expandFlash.classList.add('active');

      if (!isExpanded) {
        isTransitioning = true;
        document.body.classList.add('player-expanded');
        // Add transitioning early so player becomes visible on mobile
        player.classList.add('transitioning');

        // Contract logo + hamburger into bezel area (desktop only — no bezels on mobile)
        var logoEl = document.getElementById('site-logo');
        var menuBtnEl = document.getElementById('menu-btn');
        var logoDark = logoEl ? logoEl.querySelector('.site-logo__dark') : null;
        var logoLight = logoEl ? logoEl.querySelector('.site-logo__light') : null;
        var logoGlass = document.getElementById('site-logo-glass');
        var menuLines = menuBtnEl ? menuBtnEl.querySelectorAll('.morph__menu-line') : [];
        var isMobile = window.innerWidth <= 768;

        if (logoEl) {
          gsap.set(logoEl, { clearProps: 'top,left,scale' });
          gsap.set(logoDark, { opacity: 0 });
          gsap.set(logoLight, { opacity: 1 });
          if (logoGlass) logoGlass.classList.remove('visible');
        }
        if (menuBtnEl) {
          gsap.set(menuBtnEl, { clearProps: 'top,right,scale' });
          gsap.set(menuBtnEl, { borderColor: 'rgba(255,255,255,0.45)' });
          menuLines.forEach(function(l) {
            gsap.set(l, { backgroundColor: 'rgba(255,255,255,0.85)' });
          });
        }

        // Save current position and scale before expanding
        var rect = player.getBoundingClientRect();
        savedPosition.left = player.style.left || (rect.left + 'px');
        savedPosition.top = player.style.top || (rect.top + 'px');
        var currentScale = player.offsetWidth > 0 ? rect.width / player.offsetWidth : 1;
        savedScale = currentScale;
        // Switch to left/top positioning at current spot
        player.style.right = 'auto';
        player.style.bottom = 'auto';
        player.style.transformOrigin = 'top left';
        player.style.transform = currentScale < 0.99 ? 'scale(' + currentScale + ')' : 'none';
        player.style.left = rect.left + 'px';
        player.style.top = rect.top + 'px';
        player.offsetHeight; // force reflow

        // Step 1: Animate to center of viewport
        var centerLeft = (window.innerWidth - rect.width) / 2;
        var centerTop = (window.innerHeight - rect.height) / 2;
        player.style.left = centerLeft + 'px';
        player.style.top = centerTop + 'px';

        // Step 2: After centering, expand to fullscreen
        setTimeout(function() {
          player.classList.add('expanded');
          isExpanded = true;

          setTimeout(function() {
            player.classList.remove('transitioning');
            isTransitioning = false;
            // Start grid after expand transition so canvas has correct dimensions
            if (window.TashBrand.csGridStart) window.TashBrand.csGridStart();
          }, 620);
        }, 350);

      } else {
        isTransitioning = true;
        player.classList.add('transitioning');

        // On mobile: collapse the video fullscreen first, THEN scroll to top
        // (body is position:fixed during video fullscreen — scrollTo gets overridden otherwise)
        if (window.innerWidth <= 768) {
          // Collapse video fullscreen overlay (hides testimonials, stops video)
          if (window.TashBrand && window.TashBrand.mobileCollapseFullscreen) {
            window.TashBrand.mobileCollapseFullscreen();
          }
          // Release body lock
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
          document.body.style.top = '';
          // Scroll to top of page
          window.scrollTo({ top: 0, behavior: 'instant' });
          // Clean up player state
          player.classList.remove('expanded', 'transitioning');
          player.style.left = '';
          player.style.top = '';
          player.style.right = '';
          player.style.bottom = '';
          player.style.transform = '';
          player.style.transformOrigin = '';
          player.style.width = '';
          player.style.height = '';
          document.body.classList.remove('player-expanded');
          isExpanded = false;
          isTransitioning = false;
          if (window.TashBrand.csGridStop) window.TashBrand.csGridStop();
          if (window.TashBrand.stopCaseStudyVideos) window.TashBrand.stopCaseStudyVideos();
          ScrollTrigger.refresh();
          return;
        }

        // Scroll to top so user lands on face morph hero after collapse
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Stop animated grid
        if (window.TashBrand.csGridStop) window.TashBrand.csGridStop();

        // Step 1: Collapse from fullscreen back to compact (centered)
        // Restore scale before removing expanded (so transition animates smoothly)
        player.style.transform = savedScale < 0.99 ? 'scale(' + savedScale + ')' : 'none';
        player.style.transformOrigin = 'top left';
        player.classList.remove('expanded');
        var compactW = 440 * savedScale;
        var compactH = 175 * savedScale;
        var centerLeft = (window.innerWidth - compactW) / 2;
        var centerTop = (window.innerHeight - compactH) / 2;
        player.style.left = centerLeft + 'px';
        player.style.top = centerTop + 'px';
        player.style.width = '';
        player.style.height = '';

        // Step 2: After collapsing to center, slide back to saved position
        setTimeout(function() {
          player.style.left = savedPosition.left;
          player.style.top = savedPosition.top;

          setTimeout(function() {
            player.classList.remove('transitioning');
            isTransitioning = false;
            // Always restore CSS defaults since we scroll to top on collapse
            player.style.left = '';
            player.style.top = '';
            player.style.right = '';
            player.style.bottom = '';
            player.style.transform = '';
            player.style.transformOrigin = '';
            delete player.dataset.dragged;
            player.style.width = '';
            player.style.height = '';
            // Restore logo + hamburger to default state (page is at top/hero)
            var logoEl = document.getElementById('site-logo');
            var menuBtnEl = document.getElementById('menu-btn');
            var logoDark = logoEl ? logoEl.querySelector('.site-logo__dark') : null;
            var logoLight = logoEl ? logoEl.querySelector('.site-logo__light') : null;
            var menuLines = menuBtnEl ? menuBtnEl.querySelectorAll('.morph__menu-line') : [];
            // Remove player-expanded FIRST so CSS !important rules stop overriding
            document.body.classList.remove('player-expanded');
            if (logoEl) {
              gsap.set(logoEl, { clearProps: 'top,left,scale' });
              if (logoDark) gsap.set(logoDark, { opacity: 1 });
              if (logoLight) gsap.set(logoLight, { opacity: 0 });
            }
            if (menuBtnEl) {
              gsap.set(menuBtnEl, { clearProps: 'top,right,scale,borderColor' });
              menuLines.forEach(function(l) { gsap.set(l, { clearProps: 'backgroundColor' }); });
            }
            // Stop any playing YouTube videos
            if (window.TashBrand.stopCaseStudyVideos) window.TashBrand.stopCaseStudyVideos();
            // Reset case study detail view back to grid
            var csDetail = document.getElementById('cs-detail');
            var csGrid = document.querySelector('.morph__cs-grid');
            var csHeading = document.querySelector('.morph__cs-heading');
            if (csDetail) csDetail.classList.remove('active');
            if (csGrid) csGrid.style.display = '';
            if (csHeading) csHeading.style.display = '';
            // Re-evaluate all ScrollTrigger positions at scroll=0 so
            // zoom-out animations work correctly on next scroll
            ScrollTrigger.refresh();
          }, 620);
        }, 400);

        isExpanded = false;
      }
    }

    // Escape key closes expanded player
    document.addEventListener('keydown', function(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && isExpanded) {
        toggleExpanded();
      }
    });

    // Close button
    if (expandCloseBtn) {
      expandCloseBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleExpanded();
      });
    }

    // Logo click collapses player when expanded
    var logoEl = document.getElementById('site-logo');
    if (logoEl) {
      logoEl.addEventListener('click', function() {
        if (isExpanded) {
          toggleExpanded(); // collapse player (which scrolls to top)
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    // Expose for future use
    window.TashBrand = window.TashBrand || {};
    window.TashBrand.togglePlayerExpanded = toggleExpanded;
    window.TashBrand.isPlayerExpanded = function() { return isExpanded; };

    // Wire hero CTA directly — guarantees binding regardless of load order
    var heroCta = document.querySelector('.morph__hero-cta');
    if (heroCta) {
      heroCta.addEventListener('click', function(e) {
        e.preventDefault();
        toggleExpanded();
      });
    }
  })();

  // ═══════════════════════════════════════════════════════════
  // CASE STUDY DETAIL VIEW — open/close within player
  // ═══════════════════════════════════════════════════════════
  (function() {
    var csGrid = document.querySelector('.morph__cs-grid');
    var csHeading = document.querySelector('.morph__cs-heading');
    var csDetail = document.getElementById('cs-detail');
    var csDetailBack = document.getElementById('cs-detail-back');
    var csDetailScroll = document.getElementById('cs-detail-scroll');
    if (!csGrid || !csDetail || !csDetailBack) return;

    var csCards = document.querySelectorAll('.morph__cs-card[data-cs]');
    var vizCanvas = document.getElementById('morph-viz-canvas');

    csCards.forEach(function(card) {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        // Hide grid + equalizer, show detail
        csGrid.style.display = 'none';
        if (csHeading) csHeading.style.display = 'none';
        if (vizCanvas) vizCanvas.style.opacity = '0';
        csDetail.classList.add('active');
        // Pause animated grid while case study is open
        if (window.TashBrand.csGridStop) window.TashBrand.csGridStop();
        // Reset scroll position on the detail panel itself
        csDetail.scrollTop = 0;
      });
    });

    csDetailBack.addEventListener('click', function() {
      stopCaseStudyVideos();
      csDetail.classList.remove('active');
      csGrid.style.display = '';
      if (csHeading) csHeading.style.display = '';
      if (vizCanvas) vizCanvas.style.opacity = '';
      // Resume animated grid when returning to selection screen
      if (window.TashBrand.csGridStart) window.TashBrand.csGridStart();
    });
  })();

  // ── YouTube ↔ site audio coordination ──
  // Stop all YouTube iframes inside case study detail
  function stopCaseStudyVideos() {
    var iframes = document.querySelectorAll('.morph__cs-detail-asset--video iframe');
    iframes.forEach(function(iframe) {
      try {
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
      } catch (e) {}
    });
  }
  // Expose so collapse logic can call it
  window.TashBrand.stopCaseStudyVideos = stopCaseStudyVideos;

  // Track whether site audio was playing before YouTube took over
  var siteAudioWasPlaying = false;

  // Listen for YouTube player state changes
  window.addEventListener('message', function(e) {
    try {
      var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (data.event === 'infoDelivery' && data.info && typeof data.info.playerState !== 'undefined') {
        var state = data.info.playerState;
        // 1 = playing
        if (state === 1) {
          if (isPlaying) {
            siteAudioWasPlaying = true;
            audio.pause();
            isPlaying = false;
            playIcon.classList.add('visible');
            pauseIcon.classList.remove('visible');
            playRing.classList.remove('glowing');
            stopVisualizer();
            updateLcdStatus('paused');
          }
        }
        // 2 = paused, 0 = ended — resume site audio if it was playing before
        if ((state === 2 || state === 0) && siteAudioWasPlaying) {
          siteAudioWasPlaying = false;
          audio.play();
          isPlaying = true;
          playIcon.classList.remove('visible');
          pauseIcon.classList.add('visible');
          playRing.classList.add('glowing');
          initAudioContext();
          startVisualizer();
          updateLcdStatus('playing');
          requestAnimationFrame(updateProgress);
        }
      }
    } catch (err) {}
  });

  // Listen on YouTube iframes to enable state change messages
  function listenToYouTubeIframes() {
    var iframes = document.querySelectorAll('.morph__cs-detail-asset--video iframe');
    iframes.forEach(function(iframe) {
      iframe.addEventListener('load', function() {
        iframe.contentWindow.postMessage('{"event":"listening","id":1}', '*');
      });
    });
  }
  listenToYouTubeIframes();

  // ── Asset lightbox ──
  (function() {
    var lightbox = document.getElementById('cs-lightbox');
    var lightboxImg = document.getElementById('cs-lightbox-img');
    var lightboxClose = document.getElementById('cs-lightbox-close');
    if (!lightbox || !lightboxImg || !lightboxClose) return;

    // Open lightbox when clicking an image inside a case study asset
    document.addEventListener('click', function(e) {
      var img = e.target.closest('.morph__cs-detail-asset:not(.morph__cs-detail-asset--video) img');
      if (!img) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('active');
    });

    // Close on X button
    lightboxClose.addEventListener('click', function() {
      lightbox.classList.remove('active');
    });

    // Close on clicking backdrop (outside the image)
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        lightbox.classList.remove('active');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        lightbox.classList.remove('active');
      }
    });
  })();

  // ═══════════════════════════════════════════════════════════
  // CASE STUDY SELECTION — animated breathing grid background
  // ═══════════════════════════════════════════════════════════
  (function() {
    var canvas = document.getElementById('cs-grid-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var COLS = 36;
    var ROWS = 22;
    var waves = [
      { cx: 0.3,  cy: 0.45, amp: 40, freq: 0.003,  speed: 0.7  },
      { cx: 0.7,  cy: 0.55, amp: 28, freq: 0.0035, speed: -0.5 },
      { cx: 0.5,  cy: 0.25, amp: 18, freq: 0.005,  speed: 1.0  },
    ];
    var maxH = waves.reduce(function(s, w) { return s + w.amp; }, 0);

    var W = 0, H = 0;
    var time = 0;
    var animId = null;
    var active = false;

    // Amber gradient: dark burnt-amber → warm gold
    function amberColor(t) {
      t = Math.max(0, Math.min(1, t));
      var r, g, b;
      if (t < 0.5) {
        var s = t / 0.5;
        r = 140 + s * 60;  // 140 → 200
        g = 60  + s * 50;  // 60  → 110
        b = 5   + s * 5;   // 5   → 10
      } else {
        var s = (t - 0.5) / 0.5;
        r = 200 + s * 40;  // 200 → 240
        g = 110 + s * 40;  // 110 → 150
        b = 10  + s * 10;  // 10  → 20
      }
      return [Math.round(r), Math.round(g), Math.round(b)];
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
      var viewH = H * 0.45;
      var depth = H * 1.2;
      var scale = depth / (depth + viewH - z);
      return {
        x: W / 2 + (x - W / 2) * scale,
        y: H * 0.55 + (y - H * 0.5) * scale * 0.55 - z * scale * 0.4,
      };
    }

    function edgeAlpha(col, row) {
      var fade = 0.12;
      var cx = col / COLS, cy = row / ROWS;
      var ax = 1, ay = 1;
      if (cx < fade) ax = cx / fade;
      else if (cx > 1 - fade) ax = (1 - cx) / fade;
      if (cy < fade) ay = cy / fade;
      else if (cy > 1 - fade) ay = (1 - cy) / fade;
      return ax * ay;
    }

    function resize() {
      var dpr = window.devicePixelRatio || 1;
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (!active) return;
      animId = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      time += 0.016;

      var gridW = W * 1.7;
      var gridH = H * 1.5;
      var offX  = (W - gridW) / 2;
      var offY  = (H - gridH) / 2;

      var points = [], alphaGrid = [], heights = [];
      for (var r = 0; r <= ROWS; r++) {
        var rowP = [], rowA = [], rowH = [];
        for (var c = 0; c <= COLS; c++) {
          var x = offX + (c / COLS) * gridW;
          var y = offY + (r / ROWS) * gridH;
          var z = getHeight(x, y, time);
          rowP.push(project(x, y, z));
          rowA.push(edgeAlpha(c, r));
          rowH.push((z + maxH) / (2 * maxH));
        }
        points.push(rowP);
        alphaGrid.push(rowA);
        heights.push(rowH);
      }

      // Gentle breath envelope: 0.13 – 0.22
      var breath = 0.13 + 0.09 * Math.sin(time * 0.7);
      ctx.lineWidth = 0.75;

      // Horizontal lines
      for (var r = 0; r <= ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var a = Math.min(alphaGrid[r][c], alphaGrid[r][c + 1]);
          if (a < 0.01) continue;
          var hN = (heights[r][c] + heights[r][c + 1]) / 2;
          var col = amberColor(hN);
          ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath) + ')';
          ctx.beginPath();
          ctx.moveTo(points[r][c].x,     points[r][c].y);
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
          var col = amberColor(hN);
          ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (a * breath) + ')';
          ctx.beginPath();
          ctx.moveTo(points[r][c].x,     points[r][c].y);
          ctx.lineTo(points[r + 1][c].x, points[r + 1][c].y);
          ctx.stroke();
        }
      }
    }

    window.TashBrand.csGridStart = function() {
      if (active) return;
      active = true;
      resize();
      draw();
    };

    window.TashBrand.csGridStop = function() {
      active = false;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', function() {
      if (active) resize();
    });
  })();

  /* ── Specs card: hover spin-to-flat ── */
  (function() {
    var segments = document.querySelectorAll('.morph__card-segment');
    segments.forEach(function(seg) {
      var svg = seg.querySelector('.morph__segment-icon-svg');
      if (!svg) return;

      seg.addEventListener('mouseenter', function() {
        // Grab current computed rotation
        var style = getComputedStyle(svg);
        var matrix = style.transform;
        var currentDeg = 0;
        if (matrix && matrix !== 'none') {
          // Parse rotateY from 3d matrix
          var m = matrix.match(/matrix3d\((.+)\)/);
          if (m) {
            var vals = m[1].split(',').map(Number);
            currentDeg = Math.round(Math.atan2(vals[8], vals[0]) * (180 / Math.PI));
            if (currentDeg < 0) currentDeg += 360;
          }
        }

        // Stop the CSS animation
        svg.style.animation = 'none';

        // Set current rotation so there's no snap
        svg.style.transition = 'none';
        svg.style.transform = 'rotateY(' + currentDeg + 'deg)';

        // Force reflow, then transition to the nearest flat orientation (0 or 360)
        void svg.offsetHeight;

        // Always rotate forward to the next 360 (full face)
        var target = currentDeg <= 180 ? 0 : 360;
        var duration = Math.abs(currentDeg - target) / 360 * 0.6; // proportional, max 0.6s
        duration = Math.max(duration, 0.15); // minimum 150ms

        svg.style.transition = 'transform ' + duration.toFixed(2) + 's cubic-bezier(0.25, 0.1, 0.25, 1)';
        svg.style.transform = 'rotateY(' + target + 'deg)';
      });

      seg.addEventListener('mouseleave', function() {
        // Clear inline styles, let the CSS animation resume from 0
        svg.style.transition = 'none';
        svg.style.transform = '';
        void svg.offsetHeight;
        svg.style.animation = '';
        svg.style.transition = '';
      });
    });
  })();

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION OVERLAY
  // ═══════════════════════════════════════════════════════════
  (function() {
    var menuBtn = document.getElementById('menu-btn');
    var navOverlay = document.getElementById('nav-overlay');
    var siteLogo = document.getElementById('site-logo');
    if (!menuBtn || !navOverlay) return;

    var isOpen = false;

    function openMenu() {
      isOpen = true;
      menuBtn.classList.add('open');
      navOverlay.classList.add('open');
      if (siteLogo) {
        siteLogo.classList.add('nav-open');
        siteLogo.style.opacity = '0';
        siteLogo.style.pointerEvents = 'none';
      }
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      isOpen = false;
      menuBtn.classList.remove('open');
      navOverlay.classList.remove('open');
      if (siteLogo) {
        siteLogo.classList.remove('nav-open');
        siteLogo.style.opacity = '';
        siteLogo.style.pointerEvents = '';
      }
      document.body.style.overflow = '';
    }

    menuBtn.addEventListener('click', function() {
      if (isOpen) closeMenu();
      else openMenu();
    });

    // Nav link handlers
    var navLinks = navOverlay.querySelectorAll('.nav-overlay__link');
    navLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        var action = link.dataset.nav;
        var playerExpanded = window.TashBrand && window.TashBrand.isPlayerExpanded && window.TashBrand.isPlayerExpanded();
        closeMenu();

        if (action === 'home') {
          if (playerExpanded) {
            // Collapse player first (which scrolls to top automatically)
            setTimeout(function() {
              if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
                window.TashBrand.togglePlayerExpanded();
              }
            }, 400);
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else if (action === 'my-journey') {
          if (playerExpanded) {
            setTimeout(function() {
              if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
                window.TashBrand.togglePlayerExpanded();
              }
              // After collapse finishes, scroll to journey section
              setTimeout(function() {
                var journeySection = document.getElementById('about');
                if (journeySection) journeySection.scrollIntoView({ behavior: 'smooth' });
              }, 1500);
            }, 400);
          } else {
            var journeySection = document.getElementById('about');
            if (journeySection) {
              journeySection.scrollIntoView({ behavior: 'smooth' });
            }
          }
        } else if (action === 'case-studies') {
          if (playerExpanded) {
            // Already showing case studies — just close the menu
            return;
          }
          // Delay so overlay closes first, then expand player
          setTimeout(function() {
            if (window.TashBrand && window.TashBrand.togglePlayerExpanded) {
              window.TashBrand.togglePlayerExpanded();
            }
          }, 500);
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && isOpen) closeMenu();
    });

    // Copy email to clipboard with tooltip feedback
    var copyEmailBtn = document.getElementById('copy-email-btn');
    var copyEmailTooltip = document.getElementById('copy-email-tooltip');
    if (copyEmailBtn && copyEmailTooltip) {
      copyEmailBtn.addEventListener('click', function(e) {
        e.preventDefault();
        var email = copyEmailBtn.dataset.email;
        navigator.clipboard.writeText(email).then(function() {
          copyEmailTooltip.classList.add('visible');
          setTimeout(function() {
            copyEmailTooltip.classList.remove('visible');
          }, 2500);
        });
      });
    }
  })();

})();
