/* ╔═══════════════════════════════════════════════════════════════════╗
   ║  JUST DOSA — EFFECTS LIBRARY (effects.js)                          ║
   ║  Premium scroll/hover effects. Loads AFTER motion.js.             ║
   ╠═══════════════════════════════════════════════════════════════════╣
   ║  CONTENTS (numbered inline below)                                  ║
   ║   1. FRAME SEQUENCE .... Apple-style scroll flipbook (canvas)      ║
   ║   2. VIDEO HERO ........ fullscreen video bg (engine, optional)    ║
   ║   3. 3D TILT ........... depth tilt on .tilt3d elements            ║
   ║   4. PINNED ............ pin sections via data-pin                 ║
   ║   5. LINE-MASK TEXT .... headings rise from mask (.split-line)     ║
   ║   6. CURSOR-REACTIVE ... glow follows cursor + hover labels        ║
   ║                                                                   ║
   ║  HOW TO USE:                                                       ║
   ║   • 3D tilt  → add class "tilt3d" to any card/image               ║
   ║   • Reveal   → add class "split-line" to any heading              ║
   ║   • Pin      → add data-pin to wrapper, data-pin-panel to child   ║
   ║   • Cursor   → add data-cursor-text="Label" to an element         ║
   ╚═══════════════════════════════════════════════════════════════════╝ */

/* ═══════════════════════════════════════════════════════════════
   effects.js — PREMIUM EFFECTS LIBRARY
   Loads AFTER motion.js (needs GSAP + ScrollTrigger + Lenis).
   1. Scroll-frame image sequence (Apple flipbook)
   2. Full-screen video background hero
   3. 3D tilt / depth on cards & images
   4. Pinned sections
   5. Line-mask text reveal
   6. Cursor-reactive glow + magnetic labels
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(typeof window.gsap === 'undefined' || reduceMotion){
    // Make sure any hidden content is shown if we bail
    document.querySelectorAll('.linemask .lm-inner').forEach(el => { el.style.transform='none'; el.style.opacity='1'; });
    document.querySelectorAll('.frameseq-overlay').forEach(el => el.classList.add('lit'));
    return;
  }
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ═══════════════════════════════════════════════
     1. SCROLL-FRAME IMAGE SEQUENCE
     Markup:
       <section class="frameseq" id="dosaSeq"
                data-frames="72"
                data-path="assets/frames/dosa/frame_"
                data-ext=".jpg"
                data-pad="4">
         <div class="frameseq-sticky">
           <canvas class="frameseq-canvas"></canvas>
           <div class="frameseq-overlay">...</div>
           <div class="frameseq-progress"><span></span></div>
         </div>
       </section>
     Frames named: frame_0001.jpg ... frame_0072.jpg
     ═══════════════════════════════════════════════ */
  document.querySelectorAll('.frameseq').forEach((seq) => {
    const canvas = seq.querySelector('.frameseq-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const frameCount = parseInt(seq.dataset.frames) || 0;
    const path = seq.dataset.path || '';
    const ext  = seq.dataset.ext || '.jpg';
    const pad  = parseInt(seq.dataset.pad) || 4;
    const overlay = seq.querySelector('.frameseq-overlay');
    const progressBar = seq.querySelector('.frameseq-progress span');
    if(frameCount < 1 || !path){
      // No frames configured — reveal overlay text and skip
      if(overlay) overlay.classList.add('lit');
      return;
    }

    const images = [];
    let loaded = 0, firstDrawn = false;
    const state = { frame: 0 };

    function frameUrl(i){
      const n = String(i + 1).padStart(pad, '0');
      return `${path}${n}${ext}`;
    }
    function sizeCanvas(){
      const img = images[0];
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      if(img && img.complete) draw(state.frame);
    }
    function draw(i){
      const img = images[Math.max(0, Math.min(frameCount-1, Math.round(i)))];
      if(!img || !img.complete || !img.naturalWidth) return;
      const cw = canvas.width, ch = canvas.height;
      ctx.clearRect(0,0,cw,ch);
      // cover-fit
      const ir = img.naturalWidth/img.naturalHeight, cr = cw/ch;
      let dw, dh, dx, dy;
      if(ir > cr){ dh = ch; dw = ch*ir; dx = (cw-dw)/2; dy = 0; }
      else { dw = cw; dh = cw/ir; dx = 0; dy = (ch-dh)/2; }
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    // Preload frames
    for(let i=0;i<frameCount;i++){
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = () => {
        loaded++;
        if(!firstDrawn){ firstDrawn = true; sizeCanvas(); draw(0); }
      };
      img.onerror = () => { loaded++; };
      images.push(img);
    }

    window.addEventListener('resize', sizeCanvas, {passive:true});

    // Scrub frames to scroll
    gsap.to(state, {
      frame: frameCount - 1,
      ease: 'none',
      scrollTrigger: {
        trigger: seq,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        onUpdate: (self) => {
          if(progressBar) progressBar.style.width = (self.progress*100) + '%';
        }
      },
      onUpdate: () => draw(state.frame)
    });

    // Reveal overlay text when section enters
    if(overlay){
      ScrollTrigger.create({
        trigger: seq, start: 'top 60%',
        onEnter: () => overlay.classList.add('lit'), once: true
      });
    }
  });

  /* ═══════════════════════════════════════════════
     2. FULL-SCREEN VIDEO BACKGROUND HERO
     Any element with class .video-hero containing
     <video class="video-hero-bg" ...>
     ═══════════════════════════════════════════════ */
  document.querySelectorAll('.video-hero').forEach((hero) => {
    const vid = hero.querySelector('.video-hero-bg');
    if(!vid) return;
    vid.muted = true; vid.playsInline = true; vid.loop = true;
    ScrollTrigger.create({
      trigger: hero, start: 'top bottom', end: 'bottom top',
      onEnter: () => vid.play().catch(()=>{}),
      onEnterBack: () => vid.play().catch(()=>{}),
      onLeave: () => vid.pause(), onLeaveBack: () => vid.pause()
    });
    // Subtle parallax/zoom drift on scroll
    gsap.fromTo(vid, { scale: 1.12, yPercent: -4 }, {
      yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  });

  /* ═══════════════════════════════════════════════
     3. 3D TILT / DEPTH (desktop pointer only)
     Any element with class .tilt3d
     ═══════════════════════════════════════════════ */
  if(!isTouch){
    document.querySelectorAll('.tilt3d').forEach((card) => {
      // Add shine layer if missing
      if(!card.querySelector('.tilt3d-shine')){
        const shine = document.createElement('span');
        shine.className = 'tilt3d-shine';
        card.appendChild(shine);
      }
      const shine = card.querySelector('.tilt3d-shine');
      const MAX = 12; // degrees
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * MAX * 2;
        const ry = (px - 0.5) * MAX * 2;
        gsap.to(card, { rotateX: rx, rotateY: ry, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
        if(shine){ shine.style.setProperty('--mx', (px*100)+'%'); shine.style.setProperty('--my', (py*100)+'%'); }
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'elastic.out(1,0.5)' });
      });
    });
  }

  /* ═══════════════════════════════════════════════
     4. PINNED SECTIONS
     <section class="pinwrap" data-pin>
        <div class="pin-panel" data-pin-panel> ... </div>
     Pins the panel while the wrap scrolls past.
     ═══════════════════════════════════════════════ */
  document.querySelectorAll('[data-pin]').forEach((wrap) => {
    const panel = wrap.querySelector('[data-pin-panel]') || wrap;
    ScrollTrigger.create({
      trigger: wrap,
      start: 'top top',
      end: 'bottom bottom',
      pin: panel,
      pinSpacing: false,
      anticipatePin: 1
    });
    // Optional: fade panel content as it leaves
    const fadeTargets = wrap.querySelectorAll('[data-pin-fade]');
    fadeTargets.forEach(t => {
      gsap.to(t, {
        opacity: 0, y: -30, ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'center top', end: 'bottom top', scrub: true }
      });
    });
  });

  /* ═══════════════════════════════════════════════
     5. LINE-MASK TEXT REVEAL
     Add class .split-line to any heading. We split into
     lines automatically and reveal each on scroll.
     ═══════════════════════════════════════════════ */
  document.querySelectorAll('.split-line').forEach((el) => {
    // Wrap content in an inner span if not already
    if(!el.querySelector('.split-inner')){
      const inner = document.createElement('span');
      inner.className = 'split-inner';
      inner.innerHTML = el.innerHTML;
      el.innerHTML = '';
      el.appendChild(inner);
    }
    const inner = el.querySelector('.split-inner');
    let done = false;
    function reveal(){ if(done) return; done = true; gsap.to(inner, { yPercent: 0, opacity: 1, duration: 1, ease: 'power4.out', overwrite: true }); }
    gsap.set(inner, { yPercent: 105, opacity: 0 });
    ScrollTrigger.create({ trigger: el, start: 'top 90%', onEnter: reveal });
    // Reveal immediately if already in view on load
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      if(r.top < window.innerHeight * 0.9 && r.bottom > 0) reveal();
    });
    // Hard safety net
    setTimeout(() => reveal(), 1400);
  });

  // .linemask blocks (manual multi-line)
  document.querySelectorAll('.linemask').forEach((el) => {
    const inner = el.querySelector('.lm-inner');
    if(!inner) return;
    gsap.set(inner, { yPercent: 105, opacity: 0 });
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(inner, { yPercent: 0, opacity: 1, duration: 1, ease: 'power4.out' })
    });
  });

  /* ═══════════════════════════════════════════════
     6. CURSOR-REACTIVE GLOW + MAGNETIC LABELS
     (desktop only)
     ═══════════════════════════════════════════════ */
  if(!isTouch){
    // Soft glow that follows cursor
    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);
    let gx = window.innerWidth/2, gy = window.innerHeight/2, cgx = gx, cgy = gy;
    window.addEventListener('mousemove', (e) => {
      gx = e.clientX; gy = e.clientY; glow.classList.add('on');
    });
    window.addEventListener('mouseleave', () => glow.classList.remove('on'));
    (function glowLoop(){
      cgx += (gx - cgx) * 0.12; cgy += (gy - cgy) * 0.12;
      glow.style.transform = `translate(${cgx}px,${cgy}px) translate(-50%,-50%)`;
      requestAnimationFrame(glowLoop);
    })();

    // Custom label on elements with [data-cursor-text]
    const label = document.createElement('div');
    label.className = 'cursor-label';
    document.body.appendChild(label);
    document.querySelectorAll('[data-cursor-text]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        label.textContent = el.getAttribute('data-cursor-text');
        label.classList.add('on');
      });
      el.addEventListener('mousemove', (e) => {
        label.style.left = e.clientX + 'px';
        label.style.top  = e.clientY + 'px';
      });
      el.addEventListener('mouseleave', () => label.classList.remove('on'));
    });
  }

  // Re-measure after everything is set up
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

  console.log('[effects] Premium effects library active.');
})();
