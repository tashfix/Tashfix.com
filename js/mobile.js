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

  var busy = false;
  var lastCard = null;

  /* ── DOM refs (resolved after DOMContentLoaded) ──────────── */

  var panelLeft, panelRight, overlay, overlayContent, closeBtn, live;

  function resolveRefs() {
    panelLeft    = document.querySelector('.mvault-panel--left');
    panelRight   = document.querySelector('.mvault-panel--right');
    overlay      = document.getElementById('mobile-cs-overlay');
    overlayContent = document.getElementById('mobile-cs-content');
    closeBtn     = document.getElementById('mobile-cs-close');
    live         = document.getElementById('mobile-vault-live');
  }

  /* ── Panel helpers ───────────────────────────────────────── */

  function sealPanels(cb) {
    [panelLeft, panelRight].forEach(function (p) {
      p.classList.remove('mvault--opening');
      p.classList.add('mvault--sealing');
    });
    setTimeout(function () {
      [panelLeft, panelRight].forEach(function (p) {
        p.classList.remove('mvault--sealing');
        p.classList.add('mvault--sealed');
      });
      if (cb) cb();
    }, TIMINGS.close);
  }

  function splitPanels(cb) {
    [panelLeft, panelRight].forEach(function (p) {
      p.classList.remove('mvault--sealed', 'mvault--sealing');
    });
    if (cb) setTimeout(cb, TIMINGS.open);
  }

  /* ── Open: card → vault → case study ────────────────────── */

  function openVault(card) {
    if (busy) return;
    busy = true;
    lastCard = card;

    var csKey = card.dataset.cs;

    sealPanels(function () {
      /* Behind sealed panels: clone case study content */
      var source = document.querySelector(
        '.morph__cs-detail-content[data-cs="' + csKey + '"]'
      );

      overlayContent.innerHTML = '';

      if (source) {
        var clone = source.cloneNode(true);
        clone.removeAttribute('style'); /* clear any display:none from player */
        overlayContent.appendChild(clone);
      }

      /* Show overlay */
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');

      /* Announce */
      var h1 = overlayContent.querySelector('h1');
      var title = h1 ? h1.textContent.trim().slice(0, 60) : csKey;
      if (live) live.textContent = 'Case study: ' + title;

      /* Focus h1 */
      if (h1) {
        h1.setAttribute('tabindex', '-1');
        h1.focus();
      }

      /* Push URL so back button works */
      history.pushState({ mobileCs: csKey }, '', '#work/' + csKey);

      /* Hold, then unseal */
      setTimeout(function () {
        splitPanels(function () {
          busy = false;
        });
      }, TIMINGS.hold);
    });
  }

  /* ── Close: vault reverse → cards ───────────────────────── */

  function doClose() {
    /* Pause any cloned YouTube iframes */
    overlayContent.querySelectorAll('iframe').forEach(function (f) {
      try { f.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); } catch (e) {}
    });

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    overlayContent.innerHTML = '';
    if (live) live.textContent = '';

    setTimeout(function () {
      splitPanels(function () {
        busy = false;
        if (lastCard) lastCard.focus();
        /* Clear hash without adding a history entry */
        if (location.hash) {
          history.replaceState(null, '', location.pathname + location.search);
        }
      });
    }, TIMINGS.hold);
  }

  function closeVault() {
    if (busy) return;
    busy = true;
    sealPanels(doClose);
  }

  /* ── Intercept spotlight card clicks (capture phase) ─────── */

  function initVaultIntercept() {
    var spotlight = document.getElementById('work-spotlight');
    if (!spotlight) return;

    spotlight.addEventListener('click', function (e) {
      /* Find the clicked card (could be a child element) */
      var card = e.target.closest
        ? e.target.closest('.spotlight__card')
        : null;

      if (!card) return;

      /* Stop work-spotlight.js from firing togglePlayerExpanded */
      e.preventDefault();
      e.stopImmediatePropagation();

      openVault(card);
    }, true /* capture phase — fires before work-spotlight.js bubble listener */);

    /* Close button */
    if (closeBtn) {
      closeBtn.addEventListener('click', closeVault);
    }

    /* Escape key closes overlay */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
        closeVault();
      }
    });

    /* Back button — browser already popped the state, just run the close animation */
    window.addEventListener('popstate', function () {
      if (overlay && overlay.classList.contains('is-open') && !busy) {
        busy = true;
        sealPanels(doClose);
      }
    });
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

  /* ── Snap-scroll on #work-spotlight ─────────────────────── */

  function initSnapScroll() {
    var section = document.getElementById('work-spotlight');
    if (!section) return;

    section.classList.add('spotlight--mobile-snap');

    var cards = section.querySelectorAll('.spotlight__card');
    cards.forEach(function (card) {
      /* Chrome affordance tab */
      var tab = document.createElement('div');
      tab.className = 'spotlight__card-chrome-tab';
      tab.setAttribute('aria-hidden', 'true');
      card.appendChild(tab);
    });

    /* Keyboard arrow-key nav */
    section.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (!section.contains(document.activeElement)) return;
      e.preventDefault();

      var cardArr = Array.from(cards);
      var current = document.activeElement.closest
        ? document.activeElement.closest('.spotlight__card')
        : null;
      var idx = current ? cardArr.indexOf(current) : -1;

      var target = e.key === 'ArrowDown'
        ? cardArr[Math.min(idx + 1, cardArr.length - 1)]
        : cardArr[Math.max(idx - 1, 0)];

      if (target) {
        target.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block: 'start' });
        var focusable = target.querySelector('a, button, [tabindex]') || target;
        focusable.focus({ preventScroll: true });
      }
    });
  }

  /* ── Boot ────────────────────────────────────────────────── */

  function init() {
    resolveRefs();
    initHeroCta();
    initSnapScroll();
    initVaultIntercept();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
