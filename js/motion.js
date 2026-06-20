/* ╔═══════════════════════════════════════════════════════════════════╗
   ║  JUST DOSA — MOTION ENGINE (motion.js)                             ║
   ║  Smooth scroll (Lenis) + scroll animations (GSAP ScrollTrigger).  ║
   ║  Loads AFTER main.js. Needs GSAP + ScrollTrigger + Lenis (CDN).    ║
   ╠═══════════════════════════════════════════════════════════════════╣
   ║  CONTENTS (numbered inline below)                                  ║
   ║   1. LENIS ............. buttery smooth scroll                     ║
   ║   2. ANCHOR LINKS ...... #links routed through Lenis               ║
   ║   3. NAV + PROGRESS .... nav state + top progress bar              ║
   ║   4. REVEALS ........... fade-ups, statement words, legacy .rv     ║
   ║   5. SHOWCASE .......... scrubbed reveals + image parallax         ║
   ║   6. STATEMENT BG ...... dosa frame-sequence behind tagline        ║
   ║   7. SECTION ENTRANCE .. heading rise on scroll                    ║
   ║   8. MAGNETIC/LIQUID ... button hover effects                      ║
   ║   9. REFRESH ........... ScrollTrigger recalculation               ║
   ║                                                                   ║
   ║  If libs fail to load, sets nothing and main.js fallback runs.    ║
   ╚═══════════════════════════════════════════════════════════════════╝ */

/* ═══════════════════════════════════════════════════════════════
   motion.js — PREMIUM MOTION STACK
   GSAP + ScrollTrigger + Lenis smooth scroll
   Loads AFTER main.js. Sets window.__lenisActive so main.js
   stands down on scroll-driven effects to avoid double-handling.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP  = typeof window.gsap !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  // If libraries failed to load (offline/CDN block), bail and let main.js fallback run.
  if(!hasGSAP || !hasLenis || reduceMotion){
    console.warn('[motion] Premium stack inactive (libs missing or reduced-motion). Using fallback.');
    return;
  }

  window.__lenisActive = true;
  document.documentElement.classList.add('gsap-active');
  gsap.registerPlugin(ScrollTrigger);

  /* ─────────────────────────────────────────────
     1. LENIS — buttery smooth scroll
     ───────────────────────────────────────────── */
  const lenis = new Lenis({
    duration: 1.15,                       // higher = silkier/slower glide
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
    smoothWheel: true,
    smoothTouch: false,                   // native touch feels better on mobile
    touchMultiplier: 1.6,
    wheelMultiplier: 1.0
  });
  window.__lenis = lenis;

  // Drive Lenis from GSAP's ticker so scroll + animation share one clock (key to smoothness)
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ─────────────────────────────────────────────
     2. ANCHOR LINKS — route through Lenis
     ───────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if(!href || href === '#') return;
      const target = document.querySelector(href);
      if(!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    });
  });

  /* ─────────────────────────────────────────────
     3. NAV STATE + SCROLL PROGRESS BAR (via Lenis)
     ───────────────────────────────────────────── */
  let progressBar = document.querySelector('.scroll-progress');
  if(!progressBar){
    progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    document.body.appendChild(progressBar);
  }
  const nav = document.getElementById('nav');
  lenis.on('scroll', ({ scroll, limit }) => {
    if(nav){
      nav.classList.toggle('up', scroll > 70);
      document.body.classList.toggle('scrolled', scroll > 50);
    }
    const pct = limit > 0 ? (scroll / limit) * 100 : 0;
    progressBar.style.width = pct + '%';
  });

  /* ─────────────────────────────────────────────
     4. REVEALS — staggered, scroll-triggered
     ───────────────────────────────────────────── */
  // Generic fade-ups
  gsap.utils.toArray('.fade-up').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 85%',
      onEnter: () => el.classList.add('lit'),
      once: true
    });
  });
  gsap.utils.toArray('.mask-reveal').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 82%',
      onEnter: () => el.classList.add('lit'),
      once: true
    });
  });

  // Statement band — word-by-word with GSAP stagger
  const statementInner = document.querySelector('.statement-inner');
  const statementSec = document.querySelector('.statement');
  if(statementInner && statementSec){
    const words = statementInner.querySelectorAll('.statement-line .sw');
    const sub   = statementInner.querySelector('.statement-sub');
    let revealed = false;
    function revealStatement(){
      if(revealed) return;
      revealed = true;
      statementInner.querySelectorAll('.statement-line').forEach(l => l.classList.add('lit'));
      gsap.to(words, {
        yPercent: 0, rotate: 0, opacity: 1,
        duration: 1.1, ease: 'power4.out', stagger: 0.06, overwrite: true
      });
      if(sub) gsap.to(sub, { opacity: 1, y: 0, duration: 1, delay: 0.5, ease: 'power3.out', overwrite: true });
    }
    // Set initial hidden state
    gsap.set(words, { yPercent: 110, rotate: 4, opacity: 0 });
    if(sub) gsap.set(sub, { opacity: 0, y: 20 });
    // Trigger when the section enters
    ScrollTrigger.create({
      trigger: '.statement', start: 'top 85%', end: 'bottom 15%',
      onEnter: revealStatement, onEnterBack: revealStatement
    });
    // If section is ALREADY in view on load, reveal right away
    requestAnimationFrame(() => {
      const rect = statementSec.getBoundingClientRect();
      if(rect.top < window.innerHeight * 0.85 && rect.bottom > 0) revealStatement();
    });
    // Hard safety net — reveal no matter what after 1s
    setTimeout(() => { if(!revealed) revealStatement(); }, 1000);
  }

  // Legacy reveal classes (.rv etc.) — keep them working under Lenis
  gsap.utils.toArray('.rv,.rvl,.rvr,.rvs,.stg').forEach((el) => {
    ScrollTrigger.create({
      trigger: el, start: 'top 88%',
      onEnter: () => el.classList.add('on'),
      once: true
    });
  });

  /* ─────────────────────────────────────────────
     5. SHOWCASE — scrubbed reveals + parallax images
     ───────────────────────────────────────────── */
  gsap.utils.toArray('.sc-item').forEach((item) => {
    // Reveal the text block + clip the image as it enters
    ScrollTrigger.create({
      trigger: item, start: 'top 78%',
      onEnter: () => item.classList.add('lit'),
      once: true
    });
    // Parallax the background image, scrubbed to scroll
    const bg = item.querySelector('.sc-visual-bg');
    if(bg){
      gsap.fromTo(bg,
        { yPercent: -12 },
        { yPercent: 12, ease: 'none',
          scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true }
        });
    }
  });

  /* Generic [data-speed] parallax elements (showcase bgs already covered above) */
  gsap.utils.toArray('.parallax').forEach((el) => {
    const speed = parseFloat(el.dataset.speed) || 0.15;
    gsap.to(el, {
      yPercent: speed * 100, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* ─────────────────────────────────────────────
     6. STATEMENT FRAME-SEQUENCE BACKGROUND
     Plays dosa frames behind the statement text,
     scrubbed to scroll. Falls back to static image
     until frames are added (data-frames > 0).
     ───────────────────────────────────────────── */
  const stmtSection = document.getElementById('statement');
  const stmtCanvas = document.getElementById('statementCanvas');
  if(stmtSection && stmtCanvas){
    const frameCount = parseInt(stmtSection.dataset.frames) || 0;
    const path = stmtSection.dataset.path || '';
    const ext  = stmtSection.dataset.ext || '.jpg';
    const pad  = parseInt(stmtSection.dataset.pad) || 4;
    const fallback = stmtSection.querySelector('.statement-fallback');

    if(frameCount > 0 && path){
      const ctx = stmtCanvas.getContext('2d');
      const images = [];
      const seqState = { frame: 0 };
      let firstDrawn = false;
      function frameUrl(i){ return `${path}${String(i+1).padStart(pad,'0')}${ext}`; }
      function sizeCanvas(){
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = stmtCanvas.getBoundingClientRect();
        stmtCanvas.width = rect.width * dpr;
        stmtCanvas.height = rect.height * dpr;
        drawFrame(seqState.frame);
      }
      function drawFrame(i){
        const img = images[Math.max(0,Math.min(frameCount-1,Math.round(i)))];
        if(!img || !img.complete || !img.naturalWidth) return;
        const cw = stmtCanvas.width, ch = stmtCanvas.height;
        ctx.clearRect(0,0,cw,ch);
        const ir = img.naturalWidth/img.naturalHeight, cr = cw/ch;
        let dw,dh,dx,dy;
        if(ir > cr){ dh=ch; dw=ch*ir; dx=(cw-dw)/2; dy=0; }
        else { dw=cw; dh=cw/ir; dx=0; dy=(ch-dh)/2; }
        ctx.drawImage(img,dx,dy,dw,dh);
      }
      for(let i=0;i<frameCount;i++){
        const img = new Image();
        img.src = frameUrl(i);
        img.onload = () => { if(!firstDrawn){ firstDrawn = true; if(fallback) fallback.style.opacity='0'; sizeCanvas(); drawFrame(0); } };
        images.push(img);
      }
      window.addEventListener('resize', sizeCanvas, {passive:true});
      // Scrub frames as the statement scrolls through viewport
      gsap.to(seqState, {
        frame: frameCount - 1, ease: 'none',
        scrollTrigger: { trigger: stmtSection, start: 'top bottom', end: 'bottom top', scrub: 0.5 },
        onUpdate: () => drawFrame(seqState.frame)
      });
    } else {
      // No frames yet — gentle parallax drift on the fallback image
      if(fallback){
        gsap.fromTo(fallback, { yPercent: -6, scale: 1.08 }, {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: stmtSection, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    }
  }

  /* ─────────────────────────────────────────────
     7. SECTION ENTRANCE — subtle rise for major sections
     ───────────────────────────────────────────── */
  gsap.utils.toArray('section.sec, .showcase, .testimonials').forEach((sec) => {
    const heading = sec.querySelector('.sec-h2, .showcase-head');
    if(!heading) return;
    gsap.from(heading, {
      y: 40, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: sec, start: 'top 75%', once: true }
    });
  });

  /* ─────────────────────────────────────────────
     8. MAGNETIC + LIQUID BUTTONS
     ───────────────────────────────────────────── */
  const magneticBtns = document.querySelectorAll('.btn-gold, .sq-pay-btn, .n-btn, .cart-checkout, .btn-outline');
  magneticBtns.forEach((btn) => {
    btn.classList.add('magnetic');
    const strength = 0.4;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width/2) * strength;
      const y = (e.clientY - r.top - r.height/2) * strength;
      gsap.to(btn, { x, y, duration: 0.4, ease: 'power3.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    });
  });

  /* Liquid hover blob for primary gold buttons */
  document.querySelectorAll('.btn-gold, .sq-pay-btn').forEach((btn) => {
    if(getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.classList.add('liquid-btn');
    const blob = document.createElement('span');
    blob.className = 'liquid-blob';
    btn.appendChild(blob);
    btn.addEventListener('mouseenter', (e) => {
      const r = btn.getBoundingClientRect();
      gsap.set(blob, { left: e.clientX - r.left, top: e.clientY - r.top });
      gsap.to(blob, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' });
    });
    btn.addEventListener('mouseleave', (e) => {
      const r = btn.getBoundingClientRect();
      gsap.to(blob, { scale: 0, opacity: 0, duration: 0.45, ease: 'power3.in',
        left: e.clientX - r.left, top: e.clientY - r.top });
    });
  });

  /* ─────────────────────────────────────────────
     9. Refresh ScrollTrigger after everything settles
     ───────────────────────────────────────────── */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  // Re-measure when fonts/images change layout
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(() => ScrollTrigger.refresh()); }

  console.log('[motion] Premium stack active — Lenis + GSAP ScrollTrigger.');
})();
