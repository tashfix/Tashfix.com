/**
 * <ta-signature> — Web Component
 *
 * Drop into any page (framework-agnostic). Requires no build step.
 *
 * Usage
 * ─────
 *   <script type="module" src="ta-signature.js"></script>
 *   <ta-signature></ta-signature>
 *
 * Attributes (reactive — update live)
 * ─────────────────────────────────────
 *   show-name   "true" (default)  | "false"
 *
 * Methods
 * ───────
 *   el.play()   Run / restart the draw animation
 *   el.reset()  Snap back to blank (unplayed) state
 *
 * Sizing
 * ──────
 *   The component is display:inline-block and fills its container width.
 *   Control size by setting a width on the element:
 *     ta-signature { width: 80px; }   ← corner logo
 *     ta-signature { width: 480px; }  ← hero mark
 *
 * GSAP
 * ────
 *   Loads GSAP 3 from CDN automatically if window.gsap is not already
 *   present. If your site already includes GSAP, it uses that instance.
 */

const GSAP_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js';

class TASignature extends HTMLElement {
  static observedAttributes = ['show-name'];

  #root;
  #tl        = null;
  #ready     = false;   // GSAP loaded
  #played    = false;   // animation has completed at least once
  #queued    = false;   // play() called before GSAP was ready

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────

  connectedCallback() {
    this.#render();
    this.#initGSAP();
  }

  disconnectedCallback() {
    this.#tl?.kill();
  }

  attributeChangedCallback(name, _old, val) {
    // Guard — shadow DOM not yet rendered on first attribute pass
    if (!this.#root.firstElementChild) return;

    if (name === 'show-name') this.#syncName();
  }

  // ─── Public API ───────────────────────────────────────────────────

  /** Run (or restart) the draw animation. */
  play() {
    if (!this.#ready && window.gsap) this.#onGSAPReady();
    if (!this.#ready) { this.#queued = true; return; }
    this.#play();
  }

  /** Snap back to blank state without animation. */
  reset() {
    this.#tl?.kill();
    this.#played = false;
    this.#resetState();
  }

  /** Immediately show the fully-drawn mark (no animation). */
  showInstant() {
    if (!this.#ready && window.gsap) this.#onGSAPReady();
    if (!this.#ready) { this.#queued = 'instant'; return; }
    this.#showInstant();
  }

  // ─── Rendering ───────────────────────────────────────────────────

  #render() {
    this.#root.innerHTML = `
      <style>
        :host {
          display: inline-block;
          line-height: 0;
          --c: #ffffff;
        }

        svg {
          display: block;
          width: 100%;
          height: auto;
          overflow: visible;
        }

        /* ── Pen strokes ── */
        [data-part="t"],
        [data-part="a"],
        [data-part="xb"] {
          fill: none;
          stroke: var(--c);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          opacity: 0;
        }

        /* Nib layer opacities — multiply with element opacity */
        [data-layer="n0"] { stroke-opacity: 1;    }
        [data-layer="n1"] { stroke-opacity: 0.72; }
        [data-layer="n2"] { stroke-opacity: 0.38; }

        /* ── Box ── */
        [data-part="box"] {
          stroke: var(--c);
          stroke-opacity: 0.45;
          fill: none;
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          opacity: 0;
        }

        /* ── Water fill — frosted glass ── */
        [data-part="fill"] {
          fill: var(--c);
          fill-opacity: 0.08;
          opacity: 0;
        }

        /* ── Name ── */
        [data-part="name"] {
          fill: var(--c);
          font-family: Inter, 'Helvetica Neue', Arial, sans-serif;
          font-weight: 200;
          opacity: 0;
        }

        /* prefers-reduced-motion: draw animation is brief and non-looping,
           intentionally not suppressed so the signature always renders visibly. */
      </style>

      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="-8 -8 295 300"
           role="img"
           aria-label="TA — Tashfiq Alam">
        <defs>
          <path id="tp" pathLength="1000"
            d="M 252,33 C 252,33 239.937,23.741 222,29
               C 222,29 112.974,57.844 34,96
               C 34,96 99.465,76.1 91,138
               C 91,138 78.415,221.344 62,242
               C 62,242 46.245,256.58 96,134
               L 145,26 C 156.243,5.905 129,87 129,87"/>
          <path id="ap" pathLength="1000"
            d="M 97,239 C 97,239 178.325,64.977 185,65
               L 154,220 C 154,220 150.052,233.522 162,210"/>
          <path id="xp" pathLength="1000"
            d="M 89,186 C 89,186 141.163,157.289 207,142"/>
        </defs>

        <!-- Water fill — behind strokes -->
        <rect data-part="fill" x="58" y="36" width="160" height="200"/>

        <!-- T — 5 nib layers -->
        <use data-part="t" data-layer="n2" href="#tp" stroke-width="1.1" transform="translate(-1.15,-1.15)"/>
        <use data-part="t" data-layer="n1" href="#tp" stroke-width="1.9" transform="translate(-0.58,-0.58)"/>
        <use data-part="t" data-layer="n0" href="#tp" stroke-width="2.5"/>
        <use data-part="t" data-layer="n1" href="#tp" stroke-width="1.9" transform="translate(0.58,0.58)"/>
        <use data-part="t" data-layer="n2" href="#tp" stroke-width="1.1" transform="translate(1.15,1.15)"/>

        <!-- A — 5 nib layers -->
        <use data-part="a" data-layer="n2" href="#ap" stroke-width="1.1" transform="translate(-1.15,-1.15)"/>
        <use data-part="a" data-layer="n1" href="#ap" stroke-width="1.9" transform="translate(-0.58,-0.58)"/>
        <use data-part="a" data-layer="n0" href="#ap" stroke-width="2.5"/>
        <use data-part="a" data-layer="n1" href="#ap" stroke-width="1.9" transform="translate(0.58,0.58)"/>
        <use data-part="a" data-layer="n2" href="#ap" stroke-width="1.1" transform="translate(1.15,1.15)"/>

        <!-- Crossbar — 5 nib layers -->
        <use data-part="xb" data-layer="n2" href="#xp" stroke-width="1.1" transform="translate(-1.15,-1.15)"/>
        <use data-part="xb" data-layer="n1" href="#xp" stroke-width="1.9" transform="translate(-0.58,-0.58)"/>
        <use data-part="xb" data-layer="n0" href="#xp" stroke-width="2.5"/>
        <use data-part="xb" data-layer="n1" href="#xp" stroke-width="1.9" transform="translate(0.58,0.58)"/>
        <use data-part="xb" data-layer="n2" href="#xp" stroke-width="1.1" transform="translate(1.15,1.15)"/>

        <!-- Box outline -->
        <path data-part="box" pathLength="1000"
              stroke-width="1.3" stroke-linecap="square" stroke-linejoin="miter"
              d="M 58,36 L 218,36 L 218,236 L 58,236 Z"/>

        <!-- Name — spanned to exact box width -->
        <text data-part="name"
              x="58" y="258" font-size="11"
              text-anchor="start" textLength="160"
              lengthAdjust="spacingAndGlyphs">TASHFIQ ALAM</text>
      </svg>
    `;
  }

  // ─── GSAP ─────────────────────────────────────────────────────────

  async #initGSAP() {
    if (window.gsap) {
      this.#onGSAPReady();
      return;
    }
    // Load from CDN once — reuse if another instance already fetched it
    if (!TASignature._gsapPromise) {
      TASignature._gsapPromise = new Promise((resolve, reject) => {
        const s = Object.assign(document.createElement('script'), {
          src: GSAP_CDN, onload: resolve, onerror: reject,
        });
        document.head.appendChild(s);
      });
    }
    await TASignature._gsapPromise;
    // If already initialized externally (e.g. play() called early with site GSAP), skip reset
    if (!this.#ready) this.#onGSAPReady();
  }

  #onGSAPReady() {
    this.#ready = true;
    this.#resetState();
    if (this.#queued === 'instant') { this.#queued = false; this.#showInstant(); }
    else if (this.#queued) { this.#queued = false; this.#play(); }
  }

  // ─── Animation ───────────────────────────────────────────────────

  #els() {
    const $ = (s) => this.#root.querySelectorAll(s);
    return {
      t:    $('[data-part="t"]'),
      a:    $('[data-part="a"]'),
      xb:   $('[data-part="xb"]'),
      box:  this.#root.querySelector('[data-part="box"]'),
      fill: this.#root.querySelector('[data-part="fill"]'),
      name: this.#root.querySelector('[data-part="name"]'),
    };
  }

  #resetState() {
    if (!window.gsap) return;
    const { t, a, xb, box, fill, name } = this.#els();
    gsap.set([t, a, xb, box], { opacity: 0, strokeDashoffset: 1000 });
    gsap.set(fill, { opacity: 0, scaleY: 0, svgOrigin: '138 236' });
    gsap.set(name, { opacity: 0, y: 5 });
  }

  #showInstant() {
    const { t, a, xb, box, fill, name } = this.#els();
    const showName = this.getAttribute('show-name') !== 'false';
    this.#tl?.kill();
    gsap.set([t, a, xb, box], { opacity: 1, strokeDashoffset: 0 });
    gsap.set(fill, { opacity: 1, scaleY: 1, svgOrigin: '138 236' });
    gsap.set(name, { opacity: showName ? 1 : 0, y: 0 });
    this.#played = true;
  }

  #play() {
    const { t, a, xb, box, fill, name } = this.#els();
    const showName = this.getAttribute('show-name') !== 'false';

    this.#tl?.kill();
    this.#resetState();

    this.#tl = gsap.timeline({
      onComplete: () => { this.#played = true; },
    })
      // Box traces
      .to(box,  { opacity: 1, duration: 0.02 }, 0)
      .to(box,  { strokeDashoffset: 0, duration: 0.38, ease: 'expo.out' }, 0)

      // Fill rises like water + signature draws simultaneously
      .to(fill, { opacity: 1, scaleY: 1, duration: 0.45, ease: 'power2.out', svgOrigin: '138 236' }, '+=0.08')
      .to(t,    { opacity: 1, duration: 0.04 }, '<')
      .to(t,    { strokeDashoffset: 0, duration: 0.28, ease: 'circ.in' }, '<')
      .to(a,    { opacity: 1, duration: 0.02 }, '>-0.02')
      .to(a,    { strokeDashoffset: 0, duration: 0.2,  ease: 'circ.in' }, '<')
      .to(xb,   { opacity: 1, duration: 0.02 }, '>-0.02')
      .to(xb,   { strokeDashoffset: 0, duration: 0.1,  ease: 'power4.in' }, '<');

    // Name — only if show-name is enabled
    if (showName) {
      this.#tl.to(name, { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }, '+=0.1');
    }
  }

  // ─── Attribute handlers ───────────────────────────────────────────

  #syncName() {
    const name = this.#root.querySelector('[data-part="name"]');
    const show = this.getAttribute('show-name') !== 'false';

    if (!this.#played || !window.gsap) return;

    // Animate name in/out after the signature has already been drawn
    gsap.to(name, {
      opacity: show ? 1 : 0,
      y:       show ? 0 : 5,
      duration: 0.4,
      ease: 'expo.out',
    });
  }
}

// Shared promise so multiple instances don't double-load GSAP
TASignature._gsapPromise = null;

customElements.define('ta-signature', TASignature);
