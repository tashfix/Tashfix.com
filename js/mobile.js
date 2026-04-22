(function () {
  'use strict';

  if (!matchMedia('(max-width: 768px)').matches) return;

  var REDUCE_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.TashBrandMobile = {
    REDUCE_MOTION: REDUCE_MOTION
  };

  /* ── Vault timing ────────────────────────────────────────── */

  var TIMINGS = REDUCE_MOTION
    ? { close: 200, hold: 0, open: 200 }
    : { close: 400, hold: 100, open: 350 };

  /* ── State ───────────────────────────────────────────────── */

  var busy        = false;
  var lastCard    = null;
  var fromList    = false; /* true when case study was opened from the list overlay */

  /* ── DOM refs (resolved after DOMContentLoaded) ──────────── */

  var panelLeft, panelRight, overlay, overlayContent, closeBtn, live;
  var csList, csListItems, csListClose, csBackBtn;

  function resolveRefs() {
    panelLeft      = document.querySelector('.mvault-panel--left');
    panelRight     = document.querySelector('.mvault-panel--right');
    overlay        = document.getElementById('mobile-cs-overlay');
    overlayContent = document.getElementById('mobile-cs-content');
    closeBtn       = document.getElementById('mobile-cs-close');
    live           = document.getElementById('mobile-vault-live');
    csList         = document.getElementById('mobile-cs-list');
    csListItems    = document.getElementById('mobile-cs-list-items');
    csListClose    = document.getElementById('mobile-cs-list-close');
    csBackBtn      = document.getElementById('mobile-cs-back');
  }

  /* ── Diagnostic trace ─────────────────────────────────────
     Read via sessionStorage.getItem('tash_vault_trace') in Web Inspector
     to see the exact sequence of calls. Trimmed to last 30 entries. */

  var vtrace = [];
  function vmark(step) {
    try {
      vtrace.push(step + '@' + Math.round(performance.now()) + 'ms');
      if (vtrace.length > 30) vtrace.shift();
      sessionStorage.setItem('tash_vault_trace', JSON.stringify(vtrace));
    } catch (e) {}
  }

  /* ── Panel helpers ───────────────────────────────────────── */

  function sealPanels(cb) {
    vmark('sealPanels-start');
    if (!panelLeft || !panelRight) { vmark('sealPanels-missing-refs'); if (cb) cb(); return; }
    [panelLeft, panelRight].forEach(function (p) {
      p.classList.remove('mvault--opening');
      p.classList.add('mvault--sealing');
    });
    setTimeout(function () {
      [panelLeft, panelRight].forEach(function (p) {
        p.classList.remove('mvault--sealing');
        p.classList.add('mvault--sealed');
      });
      vmark('sealPanels-sealed');
      if (cb) {
        try { cb(); } catch (e) { vmark('sealPanels-cb-threw:' + (e && e.message)); }
      }
    }, TIMINGS.close);
  }

  function splitPanels(cb) {
    vmark('splitPanels-start');
    if (!panelLeft || !panelRight) { vmark('splitPanels-missing-refs'); if (cb) cb(); return; }
    [panelLeft, panelRight].forEach(function (p) {
      p.classList.remove('mvault--sealed', 'mvault--sealing');
    });
    if (cb) setTimeout(function () {
      vmark('splitPanels-complete');
      try { cb(); } catch (e) { vmark('splitPanels-cb-threw:' + (e && e.message)); }
    }, TIMINGS.open);
  }

  /* ── Case study list overlay ─────────────────────────────── */

  /* Build the list cards from ALL morph__cs-card elements (6 total).
     These carry the full case study roster, while spotlight__card only has 4. */
  function initCsList() {
    if (!csListItems) return;

    /* Build a map from spotlight cards: logo HTML, date, readtime */
    var spMap = {};
    document.querySelectorAll('#work-spotlight .spotlight__card').forEach(function (sc) {
      var key = sc.dataset.cs;
      if (!key) return;

      /* Clone the logo element and rewrite class names to cs-list-card__ prefix */
      var logoEl  = sc.querySelector('.spotlight__logo');
      var logoImg = logoEl ? logoEl.querySelector('img') : null;
      var logoHtml = '';
      if (logoEl && logoImg) {
        var logoClass = logoEl.className
          .replace(/\bspotlight__logo\b/g, 'cs-list-card__logo')
          .replace(/\bspotlight__logo--/g, 'cs-list-card__logo--');
        logoHtml =
          '<div class="' + logoClass + '">' +
            '<img src="' + logoImg.src + '" alt="' + (logoImg.alt || '').replace(/"/g, '&quot;') +
            '" class="cs-list-card__logo-img" loading="lazy">' +
          '</div>';
      }

      var rtEl   = sc.querySelector('.spotlight__readtime');
      var dateEl = sc.querySelector('.spotlight__date');
      spMap[key] = {
        logoHtml : logoHtml,
        date     : dateEl ? dateEl.textContent.trim() : '',
        rt       : rtEl   ? rtEl.textContent.trim().replace(/\s+/g, ' ') : ''
      };
    });

    var sourceCards = document.querySelectorAll('.morph__cs-card');
    var html = '';

    sourceCards.forEach(function (card) {
      var csKey    = card.dataset.cs || '';
      var thumbEl  = card.querySelector('.morph__cs-thumb-img');
      var thumbSrc = thumbEl ? thumbEl.src : '';
      var thumbAlt = thumbEl ? (thumbEl.alt || '') : '';
      var client   = (card.querySelector('.morph__cs-client') || {}).textContent || '';
      var title    = (card.querySelector('.morph__cs-title')  || {}).textContent || '';
      var sp       = spMap[csKey] || {};
      var logoHtml = sp.logoHtml ||
        /* Fallback: circle with company initial */
        '<div class="cs-list-card__logo">' + (client ? client.charAt(0) : '?') + '</div>';

      var tagEls = card.querySelectorAll('.morph__cs-tags span');
      var pillsHtml = '';
      tagEls.forEach(function (t) {
        pillsHtml += '<span class="cs-list-card__pill">' + t.textContent + '</span>';
      });

      var clockSvg =
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
        ' stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/>' +
        '<path d="M12 6v6l4 2"/></svg>';

      html +=
        '<div class="cs-list-card" data-cs="' + csKey + '" role="button" tabindex="0"' +
        ' aria-label="Open ' + title.replace(/"/g, '&quot;') + '">' +
          '<div class="cs-list-card__thumb">' +
            '<img src="' + thumbSrc + '" alt="' + thumbAlt.replace(/"/g, '&quot;') + '" loading="lazy">' +
          '</div>' +
          '<div class="cs-list-card__content">' +
            '<p class="cs-list-card__title">' + title + '</p>' +
            '<div class="cs-list-card__pills">' + pillsHtml + '</div>' +
            '<footer class="cs-list-card__footer">' +
              '<div class="cs-list-card__byline">' +
                logoHtml +
                '<div class="cs-list-card__byline-text">' +
                  '<span class="cs-list-card__company">' + client + '</span>' +
                  (sp.date ? '<span class="cs-list-card__date">' + sp.date + '</span>' : '') +
                '</div>' +
              '</div>' +
              (sp.rt ?
                '<span class="cs-list-card__readtime">' + clockSvg + sp.rt + '</span>'
              : '') +
            '</footer>' +
          '</div>' +
        '</div>';
    });

    csListItems.innerHTML = html;

    csListItems.querySelectorAll('.cs-list-card').forEach(function (row) {
      function handleRowActivate() { openVaultFromList(row.dataset.cs); }
      row.addEventListener('click', handleRowActivate);
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowActivate(); }
      });
    });
  }

  /* Open the list overlay through the vault panels */
  function openCsList() {
    if (busy) return;
    busy = true;
    lockScroll(); /* prevents main page from scrolling while vault is open */

    sealPanels(function () {
      if (csList) {
        csList.classList.add('is-open');
        csList.setAttribute('aria-hidden', 'false');
        var firstCard = csList.querySelector('.cs-list-card');
        if (firstCard) firstCard.focus();
      }
      history.pushState({ mobileCsList: true }, '', '#/case-studies');

      setTimeout(function () {
        splitPanels(function () { busy = false; });
      }, TIMINGS.hold);
    });
  }

  /* Close the list overlay through the vault panels — back to spotlight */
  function closeCsList() {
    if (busy) return;
    busy = true;

    sealPanels(function () {
      if (csList) {
        csList.classList.remove('is-open');
        csList.setAttribute('aria-hidden', 'true');
      }
      history.replaceState(null, '', location.pathname + location.search);

      setTimeout(function () {
        splitPanels(function () {
          busy = false;
          unlockScroll(); /* restore main-page scroll */
          var trigger = document.getElementById('mobile-cs-list-trigger');
          if (trigger) trigger.focus();
        });
      }, TIMINGS.hold);
    });
  }

  /* ── Open: card → vault → case study ────────────────────── */

  /* ── Body scroll lock ────────────────────────────────────── */

  function lockScroll()   { document.body.classList.add('is-vault-open'); }
  function unlockScroll() { document.body.classList.remove('is-vault-open'); }

  /* ── Open: list card tap → vault → case study ────────────── */

  /* Accepts a csKey string (from list) or a DOM card element (from spotlight) */
  function openVaultFromList(csKeyOrCard) {
    fromList = true;
    openVault(csKeyOrCard);
  }

  function openVault(csKeyOrCard) {
    vmark('openVault-enter');
    if (busy) { vmark('openVault-busy-bail'); return; }
    busy = true;
    lockScroll(); /* prevent main-page scroll for the entire vaulted session */

    var csKey, domCard;
    if (typeof csKeyOrCard === 'string') {
      csKey   = csKeyOrCard;
      domCard = document.querySelector('#work-spotlight .spotlight__card[data-cs="' + csKey + '"]');
    } else {
      domCard = csKeyOrCard;
      csKey   = domCard ? domCard.dataset.cs : '';
    }
    lastCard = domCard;
    vmark('openVault-csKey:' + csKey);

    /* Hide list overlay behind sealing panels */
    if (csList && csList.classList.contains('is-open')) {
      csList.classList.remove('is-open');
      csList.setAttribute('aria-hidden', 'true');
    }

    /* Safety net: if anything inside the sealed callback throws (missing
       DOM ref, bad content clone), force-release busy + scroll lock so the
       user isn't stuck with a covered viewport and an unresponsive page. */
    function bail(where) {
      vmark('openVault-bail:' + where);
      splitPanels(function () {
        busy = false;
        unlockScroll();
      });
    }

    sealPanels(function () {
      try {
        if (!overlayContent || !overlay) { bail('missing-overlay-refs'); return; }

        var source = document.querySelector('.morph__cs-detail-content[data-cs="' + csKey + '"]');
        overlayContent.innerHTML = '';
        if (source) {
          var clone = source.cloneNode(true);
          clone.removeAttribute('style');
          overlayContent.appendChild(clone);
        } else {
          vmark('openVault-no-source:' + csKey);
        }

        if (csBackBtn) {
          if (fromList) csBackBtn.removeAttribute('hidden');
          else          csBackBtn.setAttribute('hidden', '');
        }

        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');

        var h1 = overlayContent.querySelector('h1');
        var title = h1 ? h1.textContent.trim().slice(0, 60) : csKey;
        if (live) live.textContent = 'Case study: ' + title;
        if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus(); }

        history.pushState({ mobileCs: csKey }, '', '#/case-studies/' + csKey);
        vmark('openVault-content-ready');

        setTimeout(function () {
          splitPanels(function () { busy = false; vmark('openVault-done'); });
        }, TIMINGS.hold);
      } catch (e) {
        vmark('openVault-threw:' + (e && e.message));
        bail('caught-throw');
      }
    });
  }

  /* ── Close: vault reverse → list or main page ────────────── */

  function doClose(returnToList) {
    overlayContent.querySelectorAll('iframe').forEach(function (f) {
      try { f.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); } catch (e) {}
    });

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    overlayContent.innerHTML = '';
    if (live) live.textContent = '';

    if (returnToList) {
      /* Vault back to the list — body stays locked, bar stays hidden */
      setTimeout(function () {
        if (csList) {
          csList.classList.add('is-open');
          csList.setAttribute('aria-hidden', 'false');
          var firstCard = csList.querySelector('.cs-list-card');
          if (firstCard) firstCard.focus();
        }
        history.pushState({ mobileCsList: true }, '', '#/case-studies');
        splitPanels(function () { busy = false; });
      }, TIMINGS.hold);
    } else {
      fromList = false;
      /* Returning to main page — restore scroll */
      setTimeout(function () {
        splitPanels(function () {
          busy = false;
          unlockScroll();
          if (lastCard) lastCard.focus();
          history.replaceState(null, '', location.pathname + location.search);
        });
      }, TIMINGS.hold);
    }
  }

  function closeVault() {
    if (busy) return;
    busy = true;
    sealPanels(function () { doClose(fromList); });
  }

  function closeVaultFully() {
    if (busy) return;
    busy = true;
    fromList = false;
    if (csList) { csList.classList.remove('is-open'); csList.setAttribute('aria-hidden', 'true'); }
    sealPanels(function () { doClose(false); });
  }

  /* ── Intercept spotlight card clicks (capture phase) ─────── */

  function initVaultIntercept() {
    var spotlight = document.getElementById('work-spotlight');
    if (!spotlight) return;

    spotlight.addEventListener('click', function (e) {
      var card = e.target.closest
        ? e.target.closest('.spotlight__card')
        : null;
      if (!card) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      /* Always set fromList=true so the case study reading view consistently
         shows both the X (close all) and the back-to-list button. */
      fromList = true;
      openVault(card);
    }, true);

    /* "View all case studies" button */
    var listTrigger = document.getElementById('mobile-cs-list-trigger');
    if (listTrigger) listTrigger.addEventListener('click', openCsList);

    /* List overlay close (X) — closes everything */
    if (csListClose) csListClose.addEventListener('click', closeCsList);

    /* Case study close (X) — full close, even if from list */
    if (closeBtn) closeBtn.addEventListener('click', closeVaultFully);

    /* Back button — return to list */
    if (csBackBtn) {
      csBackBtn.addEventListener('click', function () {
        if (busy) return;
        busy = true;
        fromList = false;
        sealPanels(function () { doClose(true); });
      });
    }

    /* Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (overlay && overlay.classList.contains('is-open')) { closeVaultFully(); return; }
      if (csList  && csList.classList.contains('is-open'))  { closeCsList();     return; }
    });

    /* "All Case Studies" nav link — opens vault list after nav menu closes */
    var navVaultLink = document.querySelector('.nav-overlay__link[data-nav="case-studies-vault"]');
    if (navVaultLink) {
      navVaultLink.addEventListener('click', function () {
        /* face-morph.js closes the nav (and clears body overflow inline style).
           Delay so the nav close animation completes before vault opens. */
        setTimeout(openCsList, 380);
      });
    }

    /* Browser back button */
    window.addEventListener('popstate', function () {
      if (overlay && overlay.classList.contains('is-open') && !busy) {
        /* Back from a case study — go to list if that's where we came from */
        closeVault();
        return;
      }
      if (csList && csList.classList.contains('is-open') && !busy) {
        closeCsList();
      }
    });

    /* Prevent touch events on the list overlay from scrolling the main page */
    if (csList) {
      csList.addEventListener('touchmove', function (e) {
        /* Allow scrolling within the list itself; block propagation to body */
        e.stopPropagation();
      }, { passive: true });
    }
  }

  /* ── TextScramble (inlined from video-expand.js IIFE) ───────── */

  function TextScramble(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#';
    this.frameRequest = null;
    this.resolve = null;
    this.queue = [];
    this.frame = 0;
    var self = this;
    this.update = function() { self._update(); };
  }
  TextScramble.prototype.setText = function(newText) {
    var self = this;
    var promise = new Promise(function(resolve) { self.resolve = resolve; });
    self.queue = [];
    for (var i = 0; i < newText.length; i++) {
      var start = Math.floor(Math.random() * 30);
      var end = start + Math.floor(Math.random() * 30) + 10;
      self.queue.push({ to: newText[i], start: start, end: end, char: '' });
    }
    cancelAnimationFrame(self.frameRequest);
    self.frame = 0;
    self.update();
    return promise;
  };
  TextScramble.prototype._update = function() {
    var output = '';
    var complete = 0;
    for (var i = 0; i < this.queue.length; i++) {
      var item = this.queue[i];
      if (this.frame >= item.end) {
        complete++;
        output += item.to;
      } else if (this.frame >= item.start) {
        if (!item.char || Math.random() < 0.28) {
          item.char = this.chars[Math.floor(Math.random() * this.chars.length)];
        }
        output += '<span class="vq-dud">' + item.char + '</span>';
      } else {
        output += item.to === ' ' ? ' ' : '&nbsp;';
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  };

  /* ── Portrait morph (flesh → chrome as hero scrolls) ────────── */

  function initPortraitMorph() {
    var hero     = document.getElementById('zoom-out');
    var flesh    = document.getElementById('zoomout-portrait-static');
    var chrome   = document.getElementById('morph-metallic');
    if (!hero || !flesh) return;

    /* ── Swap to mobile-optimised portrait images ──────────── */
    function swapSrc(img, mobileSrc) {
      if (!img) return;
      /* Nullify the <source> webp so the browser uses our new img.src */
      var picture = img.closest ? img.closest('picture') : img.parentNode;
      if (picture && picture.tagName === 'PICTURE') {
        var source = picture.querySelector('source');
        if (source) source.removeAttribute('srcset');
      }
      img.src = mobileSrc;
    }
    swapSrc(flesh,  'assets/images/Portrait (mobile).png');
    swapSrc(chrome, 'assets/images/metallic (mobile).png');

    /* Morph plays as the hero scrolls away — top-to-bottom wipe,
       head first then neck → shoulders → torso.
       Uses window.scrollY directly (GSAP's ScrollTrigger can pin the element
       and freeze getBoundingClientRect, so measuring DOM position is unreliable).
       Hero always starts at scrollY=0. Morph completes at 40% of viewport height
       scrolled — the full transition is visible before the hero is even half gone.
       Ease-out power curve makes early scroll drive fast morph progress:
       at 25% of one scroll the head is already transitioning. */
    var ticking = false;

    function update() {
      ticking = false;
      var heroH    = window.innerHeight; /* hero is 100dvh */
      var scrolled = window.scrollY;     /* hero starts at scrollY=0 */
      /* Raw linear 0→1 over the first 30% of the viewport height */
      var raw      = Math.max(0, Math.min(1, scrolled / (heroH * 0.30)));
      /* Ease-out: early scroll → fast morph; slows near the end */
      var progress = 1 - Math.pow(1 - raw, 1.4);

      if (REDUCE_MOTION) {
        /* Instant swap at 50% — no animation */
        var hidden = 'linear-gradient(to bottom, transparent 0%, transparent 100%)';
        flesh.style.webkitMaskImage = progress >= 0.5 ? hidden : '';
        flesh.style.maskImage       = flesh.style.webkitMaskImage;
        return;
      }

      if (progress <= 0) {
        /* Fully flesh — clear any lingering mask */
        flesh.style.webkitMaskImage = '';
        flesh.style.maskImage       = '';
        return;
      }

      if (progress >= 1) {
        /* Fully metallic — flesh fully hidden */
        var gone = 'linear-gradient(to bottom, transparent 0%, transparent 100%)';
        flesh.style.webkitMaskImage = gone;
        flesh.style.maskImage       = gone;
        return;
      }

      /* Partial reveal: flesh hides from the top (head first), metallic shows through.
         Wider soft zone (12%) gives a smooth, organic wipe edge. */
      var soft      = 12;
      var wipePct   = progress * 100;
      var edgeStart = Math.max(0,   wipePct - soft);
      var edgeEnd   = Math.min(100, wipePct + soft);
      var gradient  =
        'linear-gradient(to bottom, ' +
        'transparent 0%, ' +
        'transparent ' + edgeStart + '%, ' +
        'black '        + edgeEnd   + '%, ' +
        'black 100%)';
      flesh.style.webkitMaskImage = gradient;
      flesh.style.maskImage       = gradient;
    }

    window.addEventListener('scroll', function() {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });

    update();
  }

  /* ── Site-wide scroll progress indicator ───────────────────── */

  var _scrollProgressTrack = null;
  var _scrollProgressFill  = null;
  var _overlayScrollHandler = null;

  function initScrollProgress() {
    var track = document.createElement('div');
    track.className = 'scroll-progress';
    track.setAttribute('aria-hidden', 'true');

    var fill = document.createElement('div');
    fill.className = 'scroll-progress__fill';
    track.appendChild(fill);
    document.body.appendChild(track);

    _scrollProgressTrack = track;
    _scrollProgressFill  = fill;

    var ticking = false;
    function updatePage() {
      ticking = false;
      var scrollTop  = window.scrollY;
      var docHeight  = document.documentElement.scrollHeight - window.innerHeight;
      var progress   = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
      fill.style.height = (progress * 100) + '%';
    }

    window.addEventListener('scroll', function() {
      if (!ticking) { requestAnimationFrame(updatePage); ticking = true; }
    }, { passive: true });

    updatePage();
  }

  /* Switch to overlay mode — track the case study overlay's scroll instead */
  function scrollProgressEnterOverlay(overlayEl) {
    if (!_scrollProgressTrack || !_scrollProgressFill) return;
    _scrollProgressTrack.classList.add('is-overlay');
    _scrollProgressFill.style.height = '0%';

    function updateOverlay() {
      var scrollTop    = overlayEl.scrollTop;
      var scrollHeight = overlayEl.scrollHeight - overlayEl.clientHeight;
      var progress     = scrollHeight > 0 ? Math.min(1, scrollTop / scrollHeight) : 0;
      _scrollProgressFill.style.height = (progress * 100) + '%';
    }

    _overlayScrollHandler = updateOverlay;
    overlayEl.addEventListener('scroll', updateOverlay, { passive: true });
    updateOverlay();
  }

  /* Return to page-scroll tracking */
  function scrollProgressExitOverlay(overlayEl) {
    if (!_scrollProgressTrack) return;
    if (_overlayScrollHandler) {
      overlayEl.removeEventListener('scroll', _overlayScrollHandler);
      _overlayScrollHandler = null;
    }
    _scrollProgressTrack.classList.remove('is-overlay');
    /* Immediately re-sync to page scroll position */
    var scrollTop  = window.scrollY;
    var docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    var progress   = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;
    if (_scrollProgressFill) _scrollProgressFill.style.height = (progress * 100) + '%';
  }

  /* ── TextScramble section headers ───────────────────────────── */

  function initTextScramble() {
    if (REDUCE_MOTION) return;

    /* vq-mobile-header__title is injected by initTestimonialHeader — that
       must run first (see boot order in init()). */
    var targets = [
      document.querySelector('.spotlight__heading'),
      document.querySelector('.journey-intro__statement'),
      document.querySelector('.vq-mobile-header__title')
    ].filter(Boolean);

    targets.forEach(function(el) {
      var savedHTML = el.innerHTML;
      var plainText = el.textContent.trim();
      var fired = false;

      var obs = new IntersectionObserver(function(entries) {
        if (!entries[0].isIntersecting || fired) return;
        fired = true;
        obs.disconnect();
        var fx = new TextScramble(el);
        fx.setText(plainText).then(function() {
          el.innerHTML = savedHTML;
        });
      }, { threshold: 0.4 });

      obs.observe(el);
    });
  }

  /* ── Testimonials section header (mobile-only inject) ──────── */

  function initTestimonialHeader() {
    var container = document.getElementById('video-quotes');
    if (!container) return;
    /* Guard: don't double-inject on hot reloads */
    if (container.querySelector('.vq-mobile-header')) return;

    var header = document.createElement('header');
    header.className = 'vq-mobile-header';

    var title = document.createElement('span');
    title.className = 'vq-mobile-header__title';
    title.textContent = 'A word from my colleagues';

    var desc = document.createElement('p');
    desc.className = 'vq-mobile-header__desc';
    desc.textContent = 'Perspectives from the people I\u2019ve shipped product with.';

    header.appendChild(title);
    header.appendChild(desc);
    container.insertBefore(header, container.firstChild);
  }

  /* ── Testimonial cleanup (remove Sanad card on mobile) ──────── */

  function initTestimonialCleanup() {
    var items = document.querySelectorAll('#video-quotes .video-quotes__item');
    items.forEach(function(item) {
      var nameEl = item.querySelector('.vq-name');
      if (nameEl && nameEl.textContent.trim() === 'Sanad Arida') {
        item.setAttribute('hidden', '');
        item.style.display = 'none';
      }
    });
  }

  /* ── Hero scroll hint — "Scroll down" at bottom centre of hero ── */

  function initScrollHint() {
    /* Mount on the full-viewport overlay so it sits centred at the hero bottom */
    var mountEl = document.getElementById('morph-overlay') ||
                  document.getElementById('zoomout-sticky') ||
                  document.getElementById('zoom-out');
    if (!mountEl) return;
    if (mountEl.querySelector('.mobile-scroll-hint')) return;

    var hint = document.createElement('div');
    hint.className = 'mobile-scroll-hint';
    hint.setAttribute('aria-hidden', 'true');

    var label = document.createElement('span');
    label.className = 'mobile-scroll-hint__label';
    label.textContent = 'Scroll down';

    var icon = document.createElement('span');
    icon.className = 'mobile-scroll-hint__icon';
    /* Chevron-down arrow */
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

    hint.appendChild(label);
    hint.appendChild(icon);
    mountEl.appendChild(hint);

    /* Fade out as soon as the user begins scrolling */
    var hero = document.getElementById('zoom-out');
    if (!hero) return;
    var dismissed = false;
    window.addEventListener('scroll', function() {
      if (dismissed) return;
      if (-hero.getBoundingClientRect().top > 10) {
        dismissed = true;
        hint.classList.add('is-hidden');
      }
    }, { passive: true });
  }

  /* ── "View My Work" CTA → scroll to spotlight ───────────── */

  function initHeroCta() {
    var cta = document.querySelector('.morph__hero-cta');
    if (!cta) return;
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var spotlight = document.getElementById('work-spotlight');
      if (spotlight) {
        spotlight.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'start' });
      }
    }, true /* capture — fires before face-morph.js toggleExpanded handler */);
  }

  /* ── Spotlight: move pills into content column for horizontal layout ── */

  function initSpotlightHorizontal() {
    document.querySelectorAll('#work-spotlight .spotlight__card').forEach(function (card) {
      var pills   = card.querySelector('.spotlight__pills');
      var title   = card.querySelector('.spotlight__title');
      var content = card.querySelector('.spotlight__content');
      if (!pills || !title || !content) return;
      /* Relocate pills from inside .spotlight__thumb → .spotlight__content,
         positioned immediately after the title so the order is: title → pills → footer */
      content.insertBefore(pills, title.nextSibling);
    });
  }

  /* ── Crafted-end signature draw animation ───────────────── */

  function initCraftedEndSig() {
    var sig     = document.querySelector('.mobile-crafted-end__sig');
    var section = document.getElementById('mobile-crafted-end');
    if (!sig || !section) return;

    var obs = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      sig.classList.add('is-drawing');
    }, { threshold: 0.35 });

    obs.observe(section);
  }

  /* ── Boot ────────────────────────────────────────────────── */

  function init() {
    resolveRefs();
    initPortraitMorph();
    initTestimonialHeader();
    initTestimonialCleanup();
    initTextScramble();
    initScrollHint();
    initHeroCta();
    initSpotlightHorizontal(); /* move pills before initVaultIntercept wires cards */
    initCsList();              /* builds list cards before wiring intercepts */
    initVaultIntercept();
    initCraftedEndSig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
