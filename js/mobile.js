(function () {
  'use strict';

  if (!matchMedia('(max-width: 768px)').matches) return;

  var REDUCE_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.TashBrandMobile = {
    REDUCE_MOTION: REDUCE_MOTION
  };

  /* ── Task 2: Snap-scroll on #work-spotlight ─────────────── */

  function initSnapScroll() {
    var section = document.getElementById('work-spotlight');
    if (!section) return;

    section.classList.add('spotlight--mobile-snap');

    /* Chrome affordance tab on each card (static in Session 1) */
    var cards = section.querySelectorAll('.spotlight__card');
    cards.forEach(function (card) {
      var tab = document.createElement('div');
      tab.className = 'spotlight__card-chrome-tab';
      tab.setAttribute('aria-hidden', 'true');
      card.appendChild(tab);
    });

    /* Keyboard arrow-key navigation within the section */
    section.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (!section.contains(document.activeElement)) return;

      e.preventDefault();

      var cardArr = Array.from(cards);
      var active = document.activeElement;
      var currentCard = active.closest
        ? active.closest('.spotlight__card')
        : null;
      var idx = currentCard ? cardArr.indexOf(currentCard) : -1;

      var target;
      if (e.key === 'ArrowDown') {
        target = cardArr[Math.min(idx + 1, cardArr.length - 1)];
      } else {
        target = cardArr[Math.max(idx - 1, 0)];
      }

      if (target) {
        target.scrollIntoView({
          behavior: REDUCE_MOTION ? 'auto' : 'smooth',
          block: 'start'
        });
        /* Move focus to the card so next arrow key continues navigating */
        var focusable = target.querySelector('a, button, [tabindex]') || target;
        focusable.focus({ preventScroll: true });
      }
    });
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSnapScroll);
  } else {
    initSnapScroll();
  }

})();
