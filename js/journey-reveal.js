(function() {
    var el = document.getElementById('journey-intro');
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter: function() { el.classList.add('is-visible'); }
    });
  })();
