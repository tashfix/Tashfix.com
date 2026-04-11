(function() {
    var about = document.getElementById('about');
    if (!about) return;

    var timelineRun = false;
    var items = Array.from(about.querySelectorAll('.about__tl-item'));
    var itemsReversed = items.slice().reverse();

    itemsReversed.forEach(function(item) { gsap.set(item, { opacity: 0, y: 10 }); });

    function runTimeline() {
      if (timelineRun) return;
      timelineRun = true;
      about.classList.add('is-visible');

      var STEP = 0.14, ACCENT_HOLD = 0.3, FADE_OUT = 0.45;

      itemsReversed.forEach(function(item, i) {
        var delay = i * STEP;
        var year = item.querySelector('.about__tl-year');
        var role = item.querySelector('.about__tl-role');

        if (year) gsap.set(year, { color: '#FF6B35' });
        if (role) gsap.set(role, { color: '#FF6B35' });

        gsap.to(item, { opacity: 1, y: 0, duration: 0.28, delay: delay, ease: 'power2.out' });

        var fadeDelay = delay + 0.28 + ACCENT_HOLD;
        if (year) gsap.to(year, { color: 'rgba(26,26,26,0.35)', duration: FADE_OUT, delay: fadeDelay, ease: 'power1.inOut' });
        if (role) gsap.to(role, { color: 'rgba(26,26,26,0.88)', duration: FADE_OUT, delay: fadeDelay, ease: 'power1.inOut' });
      });
    }

    function checkVisible() {
      var rect = about.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        runTimeline();
        window.removeEventListener('scroll', checkVisible);
      }
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function(entries) {
        if (entries[0].isIntersecting) { runTimeline(); io.disconnect(); }
      }, { threshold: 0 });
      io.observe(about);
    }

    window.addEventListener('scroll', checkVisible, { passive: true });
    function rafCheck() {
      if (timelineRun) return;
      checkVisible();
      requestAnimationFrame(rafCheck);
    }
    requestAnimationFrame(rafCheck);

    // Logo dark/light swap
    var menuBtn = document.getElementById('menu-btn');
    var menuLines = menuBtn ? menuBtn.querySelectorAll('.morph__menu-line') : [];
    var isDark = false;

    function setDark() {
      if (isDark) return; isDark = true;
      window.TashBrand.setLogoColor('black');
      if (menuBtn) {
        gsap.to(menuBtn, { borderColor: 'rgba(26, 26, 26, 0.85)', duration: 0.3 });
        menuLines.forEach(function(l) { gsap.to(l, { backgroundColor: 'rgba(26, 26, 26, 0.85)', duration: 0.3 }); });
      }
    }
    function setLight() {
      if (!isDark) return; isDark = false;
      window.TashBrand.setLogoColor('white');
      if (menuBtn) {
        gsap.to(menuBtn, { borderColor: 'rgba(255, 255, 255, 0.45)', duration: 0.3 });
        menuLines.forEach(function(l) { gsap.to(l, { backgroundColor: 'rgba(255, 255, 255, 0.85)', duration: 0.3 }); });
      }
    }

    var intro = document.getElementById('hscroll-intro');
    window.addEventListener('scroll', function() {
      var trigger = intro || about;
      var rect = trigger.getBoundingClientRect();
      if (rect.bottom < 80) { setDark(); } else if (rect.top < window.innerHeight) { setLight(); }
    }, { passive: true });
  })();
