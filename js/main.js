/* ==========================================================================
   ETERNIA SPACE, KARJAT — MAIN JS
   Vanilla JS + GSAP/ScrollTrigger + Lenis (all loaded via CDN, deferred)

   TABLE OF CONTENTS
   1. Lenis smooth scroll setup
   2. Nav: scroll state + mobile side panel
   3. Button hover — CSS-only now, see note in place of the old magnetic JS
   3b. <RollText> init — reusable hover text roll (info bar, Location rows)
   4. Trust strip count-up (IntersectionObserver)
   5. Generic scroll-reveal (data-reveal / data-reveal-head elements)
   6. Karjat Advantage — sticky media panel + scrolling stat rows
   7. Configurations — lightbox for floor plans
   8. Construction progress — scroll-driven horizontal timeline (GSAP ScrollTrigger)
   9. Testimonials — video lightbox with Next/Previous
   10. Site visit form — client-side validation + honeypot
   11. Custom "VIEW" cursor — pill that follows the pointer over Gallery/Testimonial media
   12. Split-text reveal — hero + CTA headline word-by-word entrance
   13. Scroll-zoom media — bidirectional scroll-linked image scale (Location + About)
   14. Testimonials — background parallax
   15. Amenities lightbox — Next/Previous photo viewer
   16. Enquiry modal
   17. Visibility safety net
   ========================================================================== */

(function () {
  'use strict';

  /* Flips on the CSS rules (.js …) that hide content until JS reveals it.
     If this script fails to load or errors out before reaching this line,
     that CSS is never armed and everything stays visible by default —
     see css/style.css §17 and the hero-sub/config-card/amenity-tile rules. */
  document.documentElement.classList.add('js');

  /* Every section below is wrapped in its own try/catch: a failure in one
     (e.g. a CDN script like GSAP/Lenis failing to load, or being blocked)
     must never stop the sections after it from running — that is what
     previously left amenity/config/testimonial images stuck invisible. */
  function safe(label, fn) {
    try {
      fn();
    } catch (err) {
      console.error('[main.js] ' + label + ' failed:', err);
    }
  }

  /* Performance: a few GSAP/ScrollTrigger setups (construction pin,
     scroll-zoom media, testimonials parallax) are pure scroll-driven
     decoration, not needed for first paint or first interaction, and their
     own setup cost (ScrollTrigger measuring layout, computing pin specs)
     was a real, measured contributor to Total Blocking Time. Deferring
     them to idle time lets the browser paint and respond to input first;
     they're still fully in place well before a user could scroll to them. */
  function whenIdle(fn) {
    if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 200);
  }

  /* Set by the "custom VIEW cursor" block below; called by the gallery and
     testimonial lightboxes so the pill cannot linger on screen once a
     modal opens on top of the media it was just hovering. A no-op until
     the cursor block runs (or on touch devices, where it never mounts). */
  let hideViewCursor = () => {};

  /* Shared swipe-left/swipe-right gesture, used by both the Amenities photo
     lightbox and the Testimonials video lightbox to move Next/Previous —
     the expected touch interaction for any full-screen mobile gallery, on
     top of (not instead of) the visible Next/Prev buttons. A horizontal
     swipe only counts once it clearly outruns any vertical movement (a
     30% margin) so an intentional up/down scroll or drag near the edge of
     the screen is never misread as "next photo". */
  function addSwipeNav(el, onPrev, onNext) {
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const MIN_DISTANCE = 40;

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      if (dx < 0) onNext(); else onPrev();
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     1. LENIS SMOOTH SCROLL
     Lenis handles inertia/smoothing site-wide. It hands its scroll ticks to
     GSAP's ScrollTrigger so pinned/scrubbed animations stay in sync.
     ------------------------------------------------------------------------ */
  safe('Lenis/GSAP setup', () => {
    let lenis;
    if (window.Lenis) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });

      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
    }

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }
  });

  /* ------------------------------------------------------------------------
     2. NAV — scroll state + mobile side panel
     ------------------------------------------------------------------------ */
  safe('nav', () => {
    const siteNav = document.querySelector('.site-nav');
    const navToggle = document.querySelector('.nav-toggle');
    const navPanel = document.querySelector('.nav-panel');
    const navScrim = document.querySelector('.nav-scrim');

    function updateNavScrollState() {
      if (!siteNav) return;
      if (window.scrollY > 40) {
        siteNav.classList.add('is-scrolled');
      } else {
        siteNav.classList.remove('is-scrolled');
      }
    }
    updateNavScrollState();
    window.addEventListener('scroll', updateNavScrollState, { passive: true });

    function toggleNavPanel(open) {
      navToggle.classList.toggle('is-active', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      navPanel.classList.toggle('is-open', open);
      navScrim.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }

    if (navToggle) {
      navToggle.addEventListener('click', () => {
        const willOpen = !navPanel.classList.contains('is-open');
        toggleNavPanel(willOpen);
      });
    }
    if (navScrim) navScrim.addEventListener('click', () => toggleNavPanel(false));
    document.querySelectorAll('.nav-panel-links a, .nav-panel .btn-primary').forEach((link) => {
      link.addEventListener('click', () => toggleNavPanel(false));
    });
  });

  /* ------------------------------------------------------------------------
     3. BUTTON HOVER
     Deliberately NOT here: the old "magnetic" mousemove-driven translate
     that used to nudge primary CTAs toward the cursor. It read as jittery/
     unprofessional and was removed outright — hover motion on every .btn
     is now handled purely in CSS via a colour/fill sweep (see
     css/style.css §5), never a position or scale change. No JS needed.
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     3b. <RollText> INIT
     Turns every [data-roll] element into a two-line roll: the element's
     existing children are moved into a .roll-original span, then cloned
     (a real DOM clone, so nested markup like the orange "₹24 Lacs" accent
     survives exactly) into an aria-hidden .roll-duplicate span appended
     right after it. css/style.css §17c does the rest — sliding one up and
     the other into place whenever the nearest .roll-trigger ancestor
     (info-bar cards, Location Advantage rows, Why Karjat cards) is hovered
     or focus-within. Runs once, before anything else touches [data-roll]
     content (notably the count-up below, which is filtered to skip the
     cloned duplicates).
     ------------------------------------------------------------------------ */
  safe('roll-text init', () => {
    document.querySelectorAll('[data-roll]').forEach((el) => {
      if (el.dataset.rollInit) return;
      el.dataset.rollInit = '1';

      const original = document.createElement('span');
      original.className = 'roll-original';
      while (el.firstChild) original.appendChild(el.firstChild);

      const duplicate = original.cloneNode(true);
      duplicate.className = 'roll-duplicate';
      duplicate.setAttribute('aria-hidden', 'true');

      el.classList.add('roll-text');
      el.appendChild(original);
      el.appendChild(duplicate);
    });
  });

  /* ------------------------------------------------------------------------
     4. TRUST STRIP COUNT-UP
     Runs once when the strip scrolls into view. Parses the target number out
     of each element's data-count-to attribute; renders "+" suffix if present.
     A stat inside a <RollText> line (see §3b) has been cloned into a hidden
     .roll-duplicate by this point — that clone also carries [data-count-to]
     and is left to count up independently rather than being skipped, so it
     never gets caught showing a stale "0" the moment it rolls into view on
     hover; both copies simply converge on the same final number.
     ------------------------------------------------------------------------ */
  safe('trust strip count-up', () => {
    const trustNumbers = document.querySelectorAll('[data-count-to]');
    if (trustNumbers.length) {
      const countObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseFloat(el.dataset.countTo);
            const suffix = el.dataset.countSuffix || '';
            const isDecimal = el.dataset.countTo.includes('.');
            const duration = 1600;
            const start = performance.now();

            function tick(now) {
              const progress = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
              const current = target * eased;
              el.textContent = (isDecimal ? current.toFixed(2) : Math.round(current)) + suffix;
              if (progress < 1) {
                requestAnimationFrame(tick);
              } else {
                // A stat living inside a <RollText> line (§3b) has an
                // aria-hidden clone that's permanently clipped by the line's
                // own overflow:hidden, so it never crosses this observer's
                // threshold on its own and would otherwise roll into view on
                // hover still frozen at "0". Copy the finished text over once.
                const rollText = el.closest('.roll-text');
                const dupTarget = rollText && rollText.querySelector('.roll-duplicate [data-count-to]');
                if (dupTarget) dupTarget.textContent = el.textContent;
              }
            }
            requestAnimationFrame(tick);
            countObserver.unobserve(el);
          });
        },
        { threshold: 0.4 }
      );
      trustNumbers.forEach((el) => countObserver.observe(el));
    }
  });

  /* ------------------------------------------------------------------------
     5. GENERIC SCROLL REVEAL
     Every [data-reveal] and [data-reveal-head] element animates with GSAP
     for butter-smooth, physics-quality easing — the same engine
     (power4.out) as the hero split-text and the construction timeline.
     Directional variants read data-reveal-direction="left|right" and slide
     on the X axis instead of Y; offset is capped on narrow viewports.

     The "when do I play" decision is IntersectionObserver, not
     ScrollTrigger's own trigger/start pixel-position bookkeeping. That
     bookkeeping is calculated once and only recalculated on an explicit
     .refresh() call — on a page this long, with a pinned/scrubbed section,
     async webfonts and dozens of images, several things reflow content
     after that calculation runs, and a stale start position can make a
     section's ScrollTrigger believe it's already been scrolled past before
     the visitor ever saw it, so its animation completes unseen. GSAP still
     renders the tween (still power4.out, still the same duration/stagger);
     IntersectionObserver just decides the moment to start it, and it
     re-checks against the live layout on every frame with no caching to go
     stale. Falls back to a CSS-transition + class-toggle path when GSAP
     isn't loaded (CDN blocked, slow connection). A window-load safety net
     at the bottom of this file force-reveals anything neither path catches.
     ------------------------------------------------------------------------ */
  safe('scroll reveal', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealEls = document.querySelectorAll('[data-reveal], [data-reveal-head]');
    if (!revealEls.length) return;

    if (prefersReducedMotion) {
      revealEls.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // X offset capped on narrow viewports — a 32 px horizontal translate on
    // a 375 px column is noticeable; 16 px reads as intentional motion only.
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const xOff = isMobile ? 16 : 32;

    function getFrom(el) {
      const dir    = el.dataset.revealDirection;
      const isHead = el.hasAttribute('data-reveal-head');
      if (dir === 'left')  return { opacity: 0, x: -xOff, y: 0 };
      if (dir === 'right') return { opacity: 0, x:  xOff, y: 0 };
      if (isHead)          return { opacity: 0, x: 0, y: -16 };
      return                       { opacity: 0, x: 0, y:  24 };
    }

    if (window.gsap && 'IntersectionObserver' in window) {
      /* ---------- Premium GSAP path — same engine as the hero ---------- */
      // rootMargin's negative bottom shrinks the observed box upward by
      // ~12% of the viewport, so intersection only fires once an element's
      // top has entered roughly the top 88% of the screen — the same beat
      // the old 'top 88%' ScrollTrigger start used to hit.
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            revealObserver.unobserve(el);
            const delay = parseInt(el.dataset.revealDelay || '0', 10) / 1000;
            gsap.to(el, {
              opacity: 1,
              x: 0,
              y: 0,
              duration: 1.15,
              delay,
              ease: 'power4.out',
              onComplete() { el.classList.add('is-visible'); },
            });
          });
        },
        { rootMargin: '0px 0px -12% 0px' }
      );
      revealEls.forEach((el) => {
        // Pin element in its hidden start position immediately so it never
        // flashes visible before its observer fires.
        gsap.set(el, getFrom(el));
        revealObserver.observe(el);
      });

    } else {
      /* ---------- CSS fallback path (GSAP not loaded) ---------- */
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el    = entry.target;
            const delay = parseInt(el.dataset.revealDelay || '0', 10);
            setTimeout(() => el.classList.add('is-visible'), delay);
            revealObserver.unobserve(el);
          });
        },
        { threshold: 0.12 }
      );
      revealEls.forEach((el) => revealObserver.observe(el));
    }
  });

  /* ------------------------------------------------------------------------
     6. KARJAT ADVANTAGE — sticky media panel + scrolling stat rows
     The photo panel is pure CSS position:sticky (see .advantage-media), so
     it stays put while the eight stat rows scroll past on the other side.
     This observer just lights each row up as it enters the viewport.
     ------------------------------------------------------------------------ */
  safe('advantage rows', () => {
    const advantageRows = document.querySelectorAll('.advantage-row');
    if (advantageRows.length) {
      const advantageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('is-active');
          });
        },
        { threshold: 0.4, rootMargin: '0px 0px -10% 0px' }
      );
      advantageRows.forEach((row) => advantageObserver.observe(row));
    }
  });

  /* ------------------------------------------------------------------------
     6b. TOUCH DOME-FILL TAP FEEDBACK
     The Location Advantage rows and Why Karjat cards each have a "dome
     fill" icon animation (css/style.css §9/§11b) gated to `@media
     (hover: hover)` so it never gets stuck permanently "on" on a touch
     device that has no real hover state — but that also meant it simply
     never played at all on a phone or tablet. This gives coarse-pointer
     devices an equivalent: tapping the row/card briefly fills the icon
     (a couple of seconds, or until another one is tapped), the same tap-
     to-flash-a-hover-state pattern touch UIs use elsewhere.
     ------------------------------------------------------------------------ */
  safe('touch dome-fill tap feedback', () => {
    const isCoarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (!isCoarse) return;
    const targets = document.querySelectorAll('.advantage-row, .why-karjat-card');
    if (!targets.length) return;
    let activeTimer = null;
    targets.forEach((el) => {
      el.addEventListener('touchstart', () => {
        targets.forEach((other) => { if (other !== el) other.classList.remove('is-tap-active'); });
        el.classList.add('is-tap-active');
        clearTimeout(activeTimer);
        activeTimer = setTimeout(() => el.classList.remove('is-tap-active'), 1400);
      }, { passive: true });
    });
  });

  /* ------------------------------------------------------------------------
     7. CONFIGURATIONS — floor plan lightbox
     ------------------------------------------------------------------------ */
  safe('floor plan lightbox', () => {
    const lightbox = document.querySelector('.lightbox');
    const lightboxImg = lightbox ? lightbox.querySelector('img') : null;
    const lightboxCaption = lightbox ? lightbox.querySelector('.lightbox-caption-text') : null;
    const lightboxClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;

    function openLightbox(src, caption) {
      if (!lightbox || !lightboxImg) return;
      lightboxImg.src = src;
      lightboxImg.alt = caption;
      if (lightboxCaption) lightboxCaption.textContent = caption;
      lightbox.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('.view-layout-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openLightbox(btn.dataset.fullImg, btn.dataset.caption || '');
      });
    });
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  });

  /* ------------------------------------------------------------------------
     8. CONSTRUCTION PROGRESS — scroll-driven horizontal timeline (desktop)
     / swipeable touch carousel (mobile & tablet)
     Desktop (>=992px): the section pins; the month track translates
     horizontally as a function of vertical scroll, and a thin progress bar
     fills alongside it — unchanged from before.
     Below that breakpoint the GSAP pin never engages (there's no room to
     pin a whole viewport-height section believably on a phone/tablet), so
     .construction-viewport becomes a native horizontal scroll-snap
     carousel instead: a real swipe-to-advance gesture, not a decorative
     one, with the SAME progress bar now shown, driven live by scroll
     position, and directly scrubbable (drag or tap anywhere on it to jump
     to a month) for anyone who'd rather drag than flick through nine
     screens' worth of photos.
     ------------------------------------------------------------------------ */
  whenIdle(() => safe('construction timeline', () => {
    const constructionPin = document.querySelector('.construction-pin');
    const constructionTrack = document.querySelector('.construction-track');
    const constructionViewport = document.querySelector('.construction-viewport');
    const constructionFill = document.querySelector('.construction-progress-fill');
    const constructionPercent = document.querySelector('.construction-progress-percent');
    const constructionBar = document.querySelector('.construction-progress-bar');

    // Single place that renders progress everywhere it's displayed (fill
    // width and the percent read-out's text) from one number, so the two
    // visuals can never drift apart. The percent label's own position is
    // fixed in CSS now (see .construction-progress-row) — only its digits
    // change here, which reads as steady/intentional rather than a number
    // sliding around mid-scroll.
    function renderProgress(progress) {
      const pct = progress * 100;
      if (constructionFill) constructionFill.style.width = `${pct.toFixed(1)}%`;
      if (constructionPercent) constructionPercent.textContent = `${Math.round(pct)}%`;
      if (constructionBar) constructionBar.setAttribute('aria-valuenow', String(Math.round(pct)));
    }

    const isDesktopPin = window.matchMedia('(min-width: 992px)').matches;

    if (constructionPin && constructionTrack && window.gsap && window.ScrollTrigger && isDesktopPin) {
      const getScrollDistance = () => Math.max(0, constructionTrack.scrollWidth - constructionPin.clientWidth);

      gsap.to(constructionTrack, {
        x: () => -getScrollDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: constructionPin,
          start: 'top top+=' + (document.querySelector('.site-nav')?.offsetHeight || 0),
          end: () => '+=' + (getScrollDistance() + window.innerHeight * 0.5),
          scrub: 0.6,
          pin: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => renderProgress(self.progress),
        },
      });
    } else if (constructionViewport && constructionTrack) {
      // ---- Touch carousel path ----
      const maxScroll = () => Math.max(0, constructionViewport.scrollWidth - constructionViewport.clientWidth);

      function renderFromScroll() {
        const max = maxScroll();
        // Math.min(1, …) clamps to exactly 1.0 at the last slide — without it,
        // sub-pixel rounding on iOS/Android means scrollLeft never reaches
        // maxScroll exactly, so the bar sticks at 97-99% on the last month.
        renderProgress(max > 0 ? Math.min(1, constructionViewport.scrollLeft / max) : 0);
      }

      // Native horizontal scroll (CSS scroll-snap does the swipe/flick/
      // momentum work — see css/style.css) drives the bar; rAF-throttled
      // so a fast flick doesn't flood layout reads.
      let scrollTicking = false;
      constructionViewport.addEventListener('scroll', () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => { renderFromScroll(); scrollTicking = false; });
      }, { passive: true });

      // The bar itself is a direct scrubber: press anywhere on it (or drag)
      // to jump the carousel to that point, in both directions, exactly
      // like a video seek bar — a "larger touch-friendly draggable handle"
      // as an equal alternative to swiping the photos themselves.
      const months = Array.from(constructionTrack.children);

      function goToMonth(index) {
        const clamped = Math.min(months.length - 1, Math.max(0, index));
        months[clamped].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
      function currentMonthIndex() {
        return Math.round((constructionViewport.scrollLeft / Math.max(1, maxScroll())) * (months.length - 1));
      }

      if (constructionBar) {
        let dragging = false;

        function scrubToClientX(clientX) {
          const rect = constructionBar.getBoundingClientRect();
          const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
          constructionViewport.scrollLeft = fraction * maxScroll();
          renderProgress(fraction);
        }

        constructionBar.addEventListener('pointerdown', (e) => {
          dragging = true;
          constructionBar.setPointerCapture(e.pointerId);
          scrubToClientX(e.clientX);
        });
        constructionBar.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          scrubToClientX(e.clientX);
        });
        function endDrag() {
          if (!dragging) return;
          dragging = false;
          // Snap the carousel to the nearest month after a manual scrub,
          // matching the resting point a swipe would have landed on.
          goToMonth(currentMonthIndex());
        }
        constructionBar.addEventListener('pointerup', endDrag);
        constructionBar.addEventListener('pointercancel', endDrag);

        // Keyboard equivalent for the slider role above (arrow keys step
        // one month at a time) — keeps the scrubber usable without touch
        // or a mouse, not just decorative ARIA.
        constructionBar.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); goToMonth(currentMonthIndex() + 1); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); goToMonth(currentMonthIndex() - 1); }
          if (e.key === 'Home') { e.preventDefault(); goToMonth(0); }
          if (e.key === 'End') { e.preventDefault(); goToMonth(months.length - 1); }
        });
      }

      renderFromScroll();
    } else {
      renderProgress(1);
    }
  }));

  /* ------------------------------------------------------------------------
     9. TESTIMONIALS — video lightbox with Next/Previous
     No iframe exists in the DOM until a card is clicked, protecting initial
     page performance (no auto-loaded YouTube embeds). Unlike the old
     in-place iframe swap, this opens a shared full-screen lightbox so a
     visitor can browse every resident's video back-to-back without ever
     closing the player — the same Next/Previous pattern as the Amenities
     photo lightbox above, applied to video.
     ------------------------------------------------------------------------ */
  safe('testimonial video lightbox', () => {
    const cards = Array.from(document.querySelectorAll('.testimonial-card')).filter((card) =>
      card.querySelector('[data-video-id]')
    );
    const modal = document.querySelector('.testimonial-lightbox');
    if (!cards.length || !modal) return;

    const frame = modal.querySelector('.testimonial-lightbox-frame');
    const nameEl = modal.querySelector('.testimonial-lightbox-name');
    const detailEl = modal.querySelector('.testimonial-lightbox-detail');
    const closeBtn = modal.querySelector('.testimonial-lightbox-close');
    const prevBtn = modal.querySelector('.testimonial-lightbox-nav.prev');
    const nextBtn = modal.querySelector('.testimonial-lightbox-nav.next');
    let currentIndex = 0;

    function renderIndex(i) {
      currentIndex = (i + cards.length) % cards.length;
      const card = cards[currentIndex];
      const videoId = card.querySelector('[data-video-id]').dataset.videoId;
      const name = card.querySelector('.name');
      const detail = card.querySelector('.detail');
      frame.innerHTML = `<iframe
          src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0"
          title="Eternia Space Karjat resident testimonial"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>`;
      if (nameEl) nameEl.textContent = name ? name.textContent : '';
      if (detailEl) detailEl.textContent = detail ? detail.textContent : '';
    }

    function openAt(i) {
      renderIndex(i);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      hideViewCursor();
    }
    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      frame.innerHTML = '';
      document.body.style.overflow = '';
    }

    cards.forEach((card, i) => {
      card.querySelector('[data-video-id]').addEventListener('click', () => openAt(i));
    });
    closeBtn.addEventListener('click', closeModal);
    prevBtn.addEventListener('click', () => renderIndex(currentIndex - 1));
    nextBtn.addEventListener('click', () => renderIndex(currentIndex + 1));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowRight') renderIndex(currentIndex + 1);
      if (e.key === 'ArrowLeft') renderIndex(currentIndex - 1);
    });
    // Swipe left/right to move Next/Previous, same as the Amenities
    // lightbox. NOTE: a cross-origin YouTube <iframe> captures touch input
    // that starts directly on the video itself (a browser-level isolation
    // no page-level listener can see into), so a swipe that begins over
    // the player won't register here — this still catches every swipe
    // that starts on the padding/caption around it, and the always-visible
    // Next/Prev buttons remain the reliable control either way.
    addSwipeNav(modal, () => renderIndex(currentIndex - 1), () => renderIndex(currentIndex + 1));
  });

  /* ------------------------------------------------------------------------
     10. SITE VISIT FORM — client-side validation + honeypot
     NOTE — SECURITY: this is a static front-end build. At deployment, add:
       - server-side revalidation of every field (never trust client JS)
       - Google reCAPTCHA v3 (or hCaptcha) scored server-side before accepting
       - HTTPS-only submission endpoint with CSRF protection
       - rate limiting on the submission endpoint
     ------------------------------------------------------------------------ */
  safe('site visit form', () => {
    const visitForm = document.querySelector('.visit-form');

    function setFieldError(row, message) {
      const errorEl = row.querySelector('.error-msg');
      row.classList.toggle('has-error', !!message);
      if (errorEl) errorEl.textContent = message || '';
    }

    function validatePhone(value) {
      // Accepts optional +91, spaces/dashes, 10-digit Indian mobile numbers
      const digits = value.replace(/[\s-]/g, '');
      return /^(\+91)?[6-9]\d{9}$/.test(digits);
    }

    if (visitForm) {
      const nameRow = visitForm.querySelector('[data-field="name"]');
      const phoneRow = visitForm.querySelector('[data-field="phone"]');
      const configRow = visitForm.querySelector('[data-field="config"]');
      const dateRow = visitForm.querySelector('[data-field="date"]');
      const statusEl = visitForm.querySelector('.form-status');
      const honeypot = visitForm.querySelector('.hp-field input');

      visitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let valid = true;

        // Honeypot check — bots tend to fill every field, humans never see this one
        if (honeypot && honeypot.value.trim() !== '') {
          if (statusEl) {
            statusEl.textContent = 'Submission blocked.';
            statusEl.classList.remove('is-success');
          }
          return;
        }

        const nameInput = nameRow.querySelector('input');
        const nameVal = nameInput.value.trim().replace(/[<>]/g, '');
        if (nameVal.length < 2) {
          setFieldError(nameRow, 'Please enter your full name.');
          valid = false;
        } else {
          setFieldError(nameRow, '');
        }

        const phoneInput = phoneRow.querySelector('input');
        const phoneVal = phoneInput.value.trim();
        if (!validatePhone(phoneVal)) {
          setFieldError(phoneRow, 'Enter a valid 10-digit mobile number.');
          valid = false;
        } else {
          setFieldError(phoneRow, '');
        }

        const configSelect = configRow.querySelector('select');
        if (!configSelect.value) {
          setFieldError(configRow, 'Please select a configuration.');
          valid = false;
        } else {
          setFieldError(configRow, '');
        }

        const dateInput = dateRow.querySelector('input');
        if (!dateInput.value) {
          setFieldError(dateRow, 'Please choose a preferred date.');
          valid = false;
        } else {
          setFieldError(dateRow, '');
        }

        if (!valid) {
          if (statusEl) {
            statusEl.textContent = 'Please fix the highlighted fields.';
            statusEl.classList.remove('is-success');
          }
          return;
        }

        // DATA DESTINATION: captures name, phone, configuration and
        // preferred visit date into this payload — currently only logged
        // to the console, nothing is sent anywhere.
        const payload = {
          name: nameVal,
          phone: phoneVal,
          configuration: configSelect.value,
          preferredDate: dateInput.value,
          source: 'site-visit-form',
          timestamp: new Date().toISOString(),
        };
        // TODO: POST this payload to the real CMS/backend endpoint, e.g.:
        //   fetch('/api/site-visits', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(payload),
        //   });
        // No backend wired up in this static build — simulate a successful
        // submission (see security note above for what to add before going live).
        console.log('[Site visit requested]', payload);
        if (statusEl) {
          statusEl.textContent = `Thank you, ${nameVal.split(' ')[0]}. Our team will call you shortly to confirm your visit.`;
          statusEl.classList.add('is-success');
        }
        visitForm.reset();
      });
    }
  });

  /* ------------------------------------------------------------------------
     11. CUSTOM "VIEW" CURSOR
     A single pill, mounted once, that only appears over [data-cursor="view"]
     media (the Amenities photo grid and Testimonial video cards — see
     css/style.css §16b for the cursor:none scoping). Position is tracked in
     plain variables (never React/DOM state) and applied every animation
     frame via a lerp toward the real pointer position for light smoothing;
     the show/hide opacity+scale transition is handled separately by CSS on
     the inner element, so the two never fight over the `transform` property.
     Fine-pointer + hover-capable devices only.
     ------------------------------------------------------------------------ */
  safe('custom view cursor', () => {
    const cursor = document.querySelector('.view-cursor');
    const supportsCustomCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!cursor) return;
    if (!supportsCustomCursor) {
      cursor.remove();
      return;
    }

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let visible = false;
    let needsRecheck = false;
    let rafId = null;
    const LERP = 0.18;
    const SETTLE_EPSILON = 0.05;

    function show() {
      if (visible) return;
      visible = true;
      cursor.classList.add('is-visible');
    }
    function hide() {
      if (!visible) return;
      visible = false;
      cursor.classList.remove('is-visible');
    }
    hideViewCursor = hide;

    // The loop drives a lerp toward the pointer, so it only needs to run
    // while the pill is still catching up (or a scroll recheck is pending) —
    // idling a requestAnimationFrame loop forever, even once the position
    // has converged, does needless work every frame for no visible change.
    // It's woken back up by pointermove/scroll below.
    function tick() {
      currentX += (targetX - currentX) * LERP;
      currentY += (targetY - currentY) * LERP;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

      // Scroll can move a [data-cursor="view"] element under/away from an
      // otherwise-still pointer; rAF-throttle a geometry re-check instead of
      // reacting to every scroll event.
      if (needsRecheck) {
        needsRecheck = false;
        const el = document.elementFromPoint(targetX, targetY);
        if (el && el.closest('[data-cursor="view"]')) show();
        else hide();
      }

      const settled = Math.abs(targetX - currentX) < SETTLE_EPSILON && Math.abs(targetY - currentY) < SETTLE_EPSILON;
      if (settled && !needsRecheck) {
        rafId = null;
      } else {
        rafId = requestAnimationFrame(tick);
      }
    }
    function wake() {
      if (rafId === null) rafId = requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      wake();
    }, { passive: true });

    window.addEventListener('scroll', () => { needsRecheck = true; wake(); }, { passive: true });

    document.querySelectorAll('[data-cursor="view"]').forEach((el) => {
      el.addEventListener('pointerenter', (e) => {
        // Jump to the pointer immediately so the pill doesn't animate in
        // from a stale position (e.g. the top-left corner) on first hover.
        targetX = e.clientX;
        targetY = e.clientY;
        currentX = targetX;
        currentY = targetY;
        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        show();
        wake();
      });
      el.addEventListener('pointerleave', hide);
    });

    window.addEventListener('mouseout', (e) => { if (!e.relatedTarget) hide(); });
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  });

  /* ------------------------------------------------------------------------
     12. SPLIT-TEXT REVEAL
     Wraps each word of [data-split] elements in nested spans (outer clips
     via overflow:hidden, inner slides up) then animates them in with a
     stagger. Runs once on load for the hero, and once via IntersectionObserver
     for the CTA headline further down the page. Skips entirely for
     prefers-reduced-motion, leaving the plain text in place.
     ------------------------------------------------------------------------ */
  safe('split-text reveal', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function splitIntoWords(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach((textNode) => {
      const words = textNode.textContent.split(/(\s+)/).filter((w) => w.length);
      const frag = document.createDocumentFragment();
      words.forEach((word) => {
        if (/^\s+$/.test(word)) {
          frag.appendChild(document.createTextNode(word));
          return;
        }
        const line = document.createElement('span');
        line.className = 'split-line';
        const inner = document.createElement('span');
        inner.className = 'split-word';
        inner.textContent = word;
        line.appendChild(inner);
        frag.appendChild(line);
      });
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  function revealSplit(el, opts) {
    const words = el.querySelectorAll('.split-word');
    if (!words.length) return;
    if (window.gsap) {
      gsap.fromTo(
        words,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.035, delay: opts.delay || 0 }
      );
    } else {
      words.forEach((w, i) => {
        setTimeout(() => { w.style.transform = 'translateY(0)'; }, (opts.delay || 0) * 1000 + i * 35);
      });
    }
  }

  if (!prefersReducedMotion) {
    const splitEls = document.querySelectorAll('[data-split]');
    splitEls.forEach((el) => splitIntoWords(el));

    // Hero: animate in immediately on load, then reveal the subtext.
    const heroEyebrow = document.querySelector('.hero-eyebrow[data-split]');
    const heroTitle = document.querySelector('.hero-title[data-split]');
    const heroSub = document.querySelector('.hero-sub');

    if (heroEyebrow) revealSplit(heroEyebrow, { delay: 0.1 });
    if (heroTitle) revealSplit(heroTitle, { delay: 0.28 });
    if (heroSub) setTimeout(() => heroSub.classList.add('is-revealed'), 700);

    // CTA headline: reveal once it scrolls into view.
    const ctaTitle = document.querySelector('#contact h2[data-split]');
    if (ctaTitle) {
      const ctaObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            revealSplit(ctaTitle, { delay: 0 });
            ctaObserver.unobserve(ctaTitle);
          });
        },
        { threshold: 0.5 }
      );
      ctaObserver.observe(ctaTitle);
    }
  } else {
    document.querySelectorAll('.hero-sub').forEach((el) => el.classList.add('is-revealed'));
  }
  });

  /* ------------------------------------------------------------------------
     13. SCROLL-ZOOM MEDIA — bidirectional scroll-linked image growth
     Every [data-scroll-zoom] image starts at scale(1.05) (set in CSS) so
     there's headroom to grow further; as its own nearest <section> scrolls
     through, GSAP scrubs it up to scale(1.4). scrub: true (not a smoothed
     numeric value) ties the scale directly and exactly to scroll position —
     no lag, no "settling" — so it tracks both forward AND backward scroll
     1:1 and reverses instantly when the visitor scrolls back up. Used by
     the Location Advantage photo and the About/Eternia photo. Degrades to
     the static CSS scale if GSAP/ScrollTrigger aren't available.
     ------------------------------------------------------------------------ */
  whenIdle(() => safe('scroll zoom media', () => {
    if (!window.gsap || !window.ScrollTrigger) return;
    document.querySelectorAll('[data-scroll-zoom]').forEach((media) => {
      const section = media.closest('section');
      if (!section) return;
      gsap.fromTo(
        media,
        { scale: 1.05 },
        {
          scale: 1.4,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    });
  }));

  /* ------------------------------------------------------------------------
     TESTIMONIALS — background parallax
     The hill-contour motif and the oversized quotation mark behind the
     testimonial cards drift at two different slow speeds as the section
     scrolls (a small, contained motion-graphics touch, not a full-page
     background-attachment:fixed hack, which fights Lenis + iOS Safari).
     Degrades to a static background if GSAP/ScrollTrigger aren't available.
     ------------------------------------------------------------------------ */
  whenIdle(() => safe('testimonials parallax', () => {
    const section = document.querySelector('.testimonials-section');
    if (!section || !window.gsap || !window.ScrollTrigger) return;
    const scrollCfg = { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 0.8 };

    const contours = section.querySelector('[data-parallax-bg]');
    if (contours) gsap.fromTo(contours, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: scrollCfg });

    const mark = section.querySelector('[data-parallax-bg-slow]');
    if (mark) gsap.fromTo(mark, { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: scrollCfg });
  }));

  /* ------------------------------------------------------------------------
     AMENITIES LIGHTBOX — click any photo in the Amenities bento grid to open
     a full-resolution viewer with Next/Previous, cycling through every
     amenity photo without closing the popup. (This is the same lightbox
     mechanism originally built for a standalone gallery section; that
     section duplicated the Amenities grid's own real project photos and was
     removed — the interaction now lives only here.)
     ------------------------------------------------------------------------ */
  safe('amenities lightbox', () => {
    const grid = document.querySelector('[data-amenity-grid]');
    if (!grid) return;

    const allItems = Array.from(grid.querySelectorAll('.amenity-tile'));

    const lightbox = document.querySelector('.gallery-lightbox');
    const lightboxImg = lightbox.querySelector('img');
    const captionText = lightbox.querySelector('.gallery-lightbox-caption-text');
    const captionCount = lightbox.querySelector('.gallery-lightbox-count');
    const closeBtn = lightbox.querySelector('.gallery-lightbox-close');
    const prevBtn = lightbox.querySelector('.gallery-lightbox-nav.prev');
    const nextBtn = lightbox.querySelector('.gallery-lightbox-nav.next');
    let currentIndex = 0;

    function renderIndex(i) {
      if (!allItems.length) return;
      currentIndex = (i + allItems.length) % allItems.length;
      const item = allItems[currentIndex];
      const img = item.querySelector('img');
      const label = item.querySelector('.tile-label');
      lightboxImg.src = item.dataset.full || img.src;
      lightboxImg.alt = img.alt;
      captionText.textContent = label ? label.textContent : img.alt;
      captionCount.textContent = `${currentIndex + 1} / ${allItems.length}`;
    }

    function openLightboxAt(item) {
      const idx = allItems.indexOf(item);
      renderIndex(idx === -1 ? 0 : idx);
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      hideViewCursor();
    }
    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    allItems.forEach((item) => {
      item.addEventListener('click', () => openLightboxAt(item));
    });
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', () => renderIndex(currentIndex - 1));
    nextBtn.addEventListener('click', () => renderIndex(currentIndex + 1));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') renderIndex(currentIndex + 1);
      if (e.key === 'ArrowLeft') renderIndex(currentIndex - 1);
    });
    // Swipe left/right on the photo itself to move Next/Previous — see the
    // shared addSwipeNav() helper up top.
    addSwipeNav(lightbox, () => renderIndex(currentIndex - 1), () => renderIndex(currentIndex + 1));
  });

  /* ------------------------------------------------------------------------
     ENQUIRY MODAL
     Opens from the hero's "Enquire Now" metric (data-open-enquiry), or
     automatically once per browser tab session the first time a visitor
     scrolls past the hero (sessionStorage flag so it never nags on the
     same visit twice, and never fires again once dismissed/submitted).

     DATA DESTINATION: this form does NOT currently send data anywhere.
     onSubmit builds a plain JSON payload and logs it to the console — see
     the "// TODO: POST" comment below for exactly where a real backend/CMS
     endpoint call belongs once one exists.
     ------------------------------------------------------------------------ */
  safe('enquiry modal', () => {
    const modal = document.querySelector('.enquiry-modal');
    if (!modal) return;
    const form = modal.querySelector('.enquiry-form');
    const statusEl = modal.querySelector('.form-status');
    const SESSION_KEY = 'eternia_enquiry_auto_shown';

    function openModal() {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-open-enquiry]').forEach((btn) => {
      btn.addEventListener('click', openModal);
    });
    modal.querySelectorAll('[data-close-enquiry]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    // Auto-trigger once per session, first time the visitor scrolls past the hero.
    const hero = document.querySelector('.hero');
    if (hero && !sessionStorage.getItem(SESSION_KEY)) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) return; // still in the hero — wait
            if (sessionStorage.getItem(SESSION_KEY)) return;
            sessionStorage.setItem(SESSION_KEY, '1');
            openModal();
            heroObserver.disconnect();
          });
        },
        { threshold: 0 }
      );
      heroObserver.observe(hero);
    }

    function validatePhone(value) {
      const digits = value.replace(/[\s-]/g, '');
      return /^(\+91)?[6-9]\d{9}$/.test(digits);
    }

    if (form) {
      const honeypot = form.querySelector('.hp-field input');

      form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Same honeypot check as the main site-visit form (js/main.js §10):
        // a filled hidden field means a bot, not a visitor.
        if (honeypot && honeypot.value.trim() !== '') {
          statusEl.textContent = 'Submission blocked.';
          statusEl.classList.remove('is-success');
          return;
        }

        let valid = true;
        const nameRow = form.querySelector('[data-field="name"]');
        const mobileRow = form.querySelector('[data-field="mobile"]');
        const configRow = form.querySelector('[data-field="configuration"]');

        const nameInput = nameRow.querySelector('input');
        const nameVal = nameInput.value.trim().replace(/[<>]/g, '');
        if (nameVal.length < 2) {
          nameRow.classList.add('has-error');
          nameRow.querySelector('.error-msg').textContent = 'Please enter your full name.';
          valid = false;
        } else {
          nameRow.classList.remove('has-error');
          nameRow.querySelector('.error-msg').textContent = '';
        }

        const mobileInput = mobileRow.querySelector('input');
        const mobileVal = mobileInput.value.trim();
        if (!validatePhone(mobileVal)) {
          mobileRow.classList.add('has-error');
          mobileRow.querySelector('.error-msg').textContent = 'Enter a valid 10-digit mobile number.';
          valid = false;
        } else {
          mobileRow.classList.remove('has-error');
          mobileRow.querySelector('.error-msg').textContent = '';
        }

        const configSelect = configRow.querySelector('select');
        if (!configSelect.value) {
          configRow.classList.add('has-error');
          configRow.querySelector('.error-msg').textContent = 'Please select a configuration.';
          valid = false;
        } else {
          configRow.classList.remove('has-error');
          configRow.querySelector('.error-msg').textContent = '';
        }

        if (!valid) {
          statusEl.textContent = 'Please fix the highlighted fields.';
          statusEl.classList.remove('is-success');
          return;
        }

        const payload = {
          name: nameVal,
          mobile: mobileVal,
          configuration: configSelect.value,
          source: 'scroll-popup',
          timestamp: new Date().toISOString(),
        };

        // TODO: POST this payload to the real CMS/backend endpoint, e.g.:
        //   fetch('/api/enquiries', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(payload),
        //   });
        // Currently there is no backend wired up — this is a static build,
        // so the payload is only logged for now.
        console.log('[Enquiry submitted]', payload);

        statusEl.textContent = `Thank you, ${nameVal.split(' ')[0]}. Our team will call you shortly.`;
        statusEl.classList.add('is-success');
        form.reset();
        setTimeout(closeModal, 1800);
      });
    }
  });

  /* Refresh ScrollTrigger after all images/fonts settle, so pinned math is accurate */
  safe('ScrollTrigger refresh on load', () => {
    window.addEventListener('load', () => {
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
    // The Google Fonts <link> above deliberately loads async (media="print"
    // swapped to "all") so it never blocks 'load' — which also means it can
    // finish swapping the real webfont in well AFTER the refresh above
    // already ran. That swap reflows text throughout this long page
    // (heading line counts, paragraph wrapping), shifting every element
    // below it. Without a second refresh afterward, every reveal
    // ScrollTrigger below the first reflowed block keeps stale start/end
    // pixel positions from the fallback-font layout — which is exactly the
    // kind of drift that can make a trigger think a section far below the
    // fold is already behind the current scroll position the moment
    // refresh() next runs, firing its animation to completion unseen.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    }
  });

  /* Footer copyright year — used to be an inline <script> in index.html;
     moved here so the page has zero inline scripts (see the CSP note in
     .htaccess, which needs this to drop 'unsafe-inline' from script-src). */
  safe('footer year', () => {
    const el = document.getElementById('footerYear');
    if (el) el.textContent = new Date().getFullYear();
  });

  /* ------------------------------------------------------------------------
     13. VISIBILITY SAFETY NET
     Belt-and-braces: whatever the cause (an observer that never crosses its
     threshold because an ancestor briefly had zero height, a section above
     throwing before it got here, a slow/blocked CDN script, etc.), nothing
     on this page should stay invisible forever ONCE THE VISITOR ACTUALLY
     SCROLLS TO IT. This used to be a single global timer that force-revealed
     every [data-reveal]/[data-reveal-head] element on the whole page a few
     seconds after load — harmless on a short page, but on one this long it
     meant every section below the fold silently finished "animating" before
     the visitor ever scrolled near it, so nothing appeared to happen when
     they actually arrived. Watch each element with its own IntersectionObserver
     instead, and only arm the fallback once that specific element is near
     the viewport — so sections stay properly hidden until you scroll to
     them, exactly like the primary GSAP reveal is meant to behave.
     ------------------------------------------------------------------------ */
  safe('visibility safety net', () => {
    function forceReveal(el) {
      if (el.classList.contains('is-visible')) return;
      el.classList.add('is-visible');
      if (window.gsap) {
        // Kill the still-pending scrollTrigger too, not just the tween —
        // otherwise a later ScrollTrigger.refresh() (a lazy image settling,
        // a resize, etc.) re-renders this untriggered tween's progress-0
        // "from" state right back over the clearProps below.
        if (window.ScrollTrigger) {
          ScrollTrigger.getAll().filter((st) => st.trigger === el).forEach((st) => st.kill());
        }
        gsap.killTweensOf(el);
        gsap.set(el, { clearProps: 'opacity,transform,translate,rotate,scale' });
      }
    }

    const watchList = document.querySelectorAll('[data-reveal], [data-reveal-head]');
    if (watchList.length && 'IntersectionObserver' in window) {
      // Generous rootMargin so the fallback timer arms a little before the
      // element is actually on screen, same spirit as the primary reveal's
      // "top 88%" trigger — not the moment it's merely somewhere on the page.
      const nearViewport = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            nearViewport.unobserve(el);
            // Give the primary GSAP scroll-trigger a couple of seconds to do
            // its own animation first; only step in if it genuinely never did.
            setTimeout(() => forceReveal(el), 2000);
          });
        },
        { rootMargin: '0px 0px -10% 0px' }
      );
      watchList.forEach((el) => nearViewport.observe(el));
    } else {
      // No IntersectionObserver support at all — fall back to the old
      // blanket behavior rather than leaving content permanently hidden.
      watchList.forEach(forceReveal);
    }

    document.querySelectorAll('.advantage-row:not(.is-active)').forEach((el) => el.classList.add('is-active'));
    document.querySelectorAll('.hero-sub:not(.is-revealed)').forEach((el) => el.classList.add('is-revealed'));
  });
})();
