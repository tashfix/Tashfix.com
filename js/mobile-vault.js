(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────── */

  var HAPTICS_ON = false; /* off by default; flip to true to test */
  var REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TIMINGS = REDUCE
    ? { close: 200, hold: 0, open: 200 }
    : { close: 400, hold: 100, open: 350 };

  /* ── State ───────────────────────────────────────────────── */

  var busy = false;      /* guard: ignore taps mid-animation */
  var lastCard = null;   /* originating card for focus return */

  /* ── DOM refs ────────────────────────────────────────────── */

  var panels     = Array.from(document.querySelectorAll('.mvault-panel'));
  var panelLeft  = document.querySelector('.mvault-panel--left');
  var panelRight = document.querySelector('.mvault-panel--right');
  var study      = document.querySelector('.mvault-study');
  var studyTitle = study ? study.querySelector('.mvault-study__title') : null;
  var closeBtn   = study ? study.querySelector('.mvault-study__close') : null;
  var live       = document.querySelector('.mvault-live');
  var cards      = Array.from(document.querySelectorAll('.mvault-card'));
  var refireBtn  = document.querySelector('.mvault-refire');

  /* ── Helpers ─────────────────────────────────────────────── */

  function sealPanels() {
    panels.forEach(function (p) {
      p.classList.remove('is-opening');
      p.classList.add('is-sealing');
    });
    /* After the transition, lock in sealed state */
    setTimeout(function () {
      panels.forEach(function (p) {
        p.classList.remove('is-sealing');
        p.classList.add('is-sealed');
      });
    }, TIMINGS.close);
  }

  function splitPanels() {
    /* Remove sealed, let CSS transition handle the exit */
    panels.forEach(function (p) {
      p.classList.remove('is-sealed', 'is-sealing');
    });
  }

  function showStudy(card) {
    var title = card.getAttribute('data-title') || ('Case study: ' + card.getAttribute('data-cs'));
    if (studyTitle) studyTitle.textContent = title;
    study.classList.add('is-open');
    study.setAttribute('aria-hidden', 'false');
    if (live) live.textContent = title;
    /* Move focus to the heading */
    if (studyTitle) {
      studyTitle.setAttribute('tabindex', '-1');
      studyTitle.focus();
    }
  }

  function hideStudy() {
    study.classList.remove('is-open');
    study.setAttribute('aria-hidden', 'true');
    if (live) live.textContent = '';
  }

  /* ── Open vault (card tap → case study) ─────────────────── */

  function openVault(card) {
    if (busy) return;
    busy = true;
    lastCard = card;

    if (HAPTICS_ON && navigator.vibrate) navigator.vibrate(15);

    sealPanels();

    setTimeout(function () {
      /* Mid-hold: mount content behind the sealed panels */
      showStudy(card);

      setTimeout(function () {
        splitPanels();

        setTimeout(function () {
          busy = false;
        }, TIMINGS.open);
      }, TIMINGS.hold);

    }, TIMINGS.close);
  }

  /* ── Close vault (study → cards) ────────────────────────── */

  function closeVault() {
    if (busy) return;
    busy = true;

    sealPanels();

    setTimeout(function () {
      /* Mid-hold: hide study behind sealed panels */
      hideStudy();

      setTimeout(function () {
        splitPanels();

        /* Return focus to the originating card */
        if (lastCard) lastCard.focus();

        setTimeout(function () {
          busy = false;
        }, TIMINGS.open);
      }, TIMINGS.hold);

    }, TIMINGS.close);
  }

  /* ── Wire events ─────────────────────────────────────────── */

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      openVault(card);
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openVault(card);
      }
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeVault);
  }

  /* Dev refire: re-triggers with the last used card (or first card) */
  if (refireBtn) {
    refireBtn.addEventListener('click', function () {
      if (!study.classList.contains('is-open')) {
        openVault(lastCard || cards[0]);
      } else {
        closeVault();
      }
    });
  }

  /* Keyboard: Escape closes the study */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && study.classList.contains('is-open')) {
      closeVault();
    }
  });

})();
