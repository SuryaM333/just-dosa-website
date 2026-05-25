/* ═══════════════════════════════════════════════════════════
   SQUARE ONLINE ORDERING CONFIG — UPDATE THIS ONE LINE ONLY
   
   ▸ CURRENT (pre-domain-swap):  'https://www.justdosa.com.au/'
   ▸ AFTER you migrate to Option 2 (custom site = justdosa.com.au,
     Square = order.justdosa.com.au), change to:
     'https://order.justdosa.com.au/'
   ═══════════════════════════════════════════════════════════ */
const SQUARE_ORDER_URL = 'https://www.justdosa.com.au/'; // ← Square lives here today
const RESTAURANT_PHONE = '61403829539'; // WhatsApp E.164 format (no +, no spaces)
const RESTAURANT_NAME  = 'Just Dosa';

/* Auto-wires every "Order" button on the site to your Square link */
document.querySelectorAll('a[data-order="square"]').forEach(a => {
  a.href = SQUARE_ORDER_URL;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
});

/* ═══════════════════════════════════════════════════════════
   🛒 CART SYSTEM
   - Auto-injects "Add to Cart" buttons onto every .mc menu card
   - Persists in localStorage
   - Checkout opens WhatsApp with formatted order
   ═══════════════════════════════════════════════════════════ */
const CART_KEY = 'justDosaCart';
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');

function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); }

function addToCart(name, price, btn){
  const existing = cart.find(i => i.name === name);
  if(existing) existing.qty++;
  else cart.push({name, price, qty:1});
  saveCart();
  // Visual feedback
  if(btn){
    const orig = btn.textContent;
    btn.textContent = '✓ Added';
    btn.classList.add('added');
    setTimeout(() => {btn.textContent = orig; btn.classList.remove('added');}, 1200);
  }
  showToast(name + ' added');
  const badge = document.getElementById('cartBadge');
  if(badge){badge.classList.remove('cart-pop'); void badge.offsetWidth; badge.classList.add('cart-pop');}
}

function changeQty(name, delta){
  const item = cart.find(i => i.name === name);
  if(!item) return;
  item.qty += delta;
  if(item.qty <= 0) cart = cart.filter(i => i.name !== name);
  saveCart();
}

function removeItem(name){ cart = cart.filter(i => i.name !== name); saveCart(); }
function clearCart(){ if(confirm('Clear all items from cart?')){cart = []; saveCart();} }

function renderCart(){
  const itemsEl = document.getElementById('cartItems');
  const footEl  = document.getElementById('cartFoot');
  const badge   = document.getElementById('cartBadge');
  const cartBtn = document.getElementById('cartBtn');
  if(!itemsEl) return;
  const totalQty = cart.reduce((s,i) => s + i.qty, 0);
  const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  // Badge
  if(badge) badge.textContent = totalQty;
  if(cartBtn) cartBtn.classList.toggle('has-items', totalQty > 0);
  // Items
  if(cart.length === 0){
    itemsEl.innerHTML = '<div class="cart-empty"><div class="ce-ic">🛒</div><p>Your cart is empty<br/>Browse the menu to add dishes</p></div>';
    if(footEl) footEl.style.display = 'none';
    return;
  }
  itemsEl.innerHTML = cart.map(i => `
    <div class="ci">
      <div class="ci-info">
        <div class="ci-name">${escapeHtml(i.name)}</div>
        <div class="ci-price">A$${(i.price * i.qty).toFixed(2)} <span style="color:var(--muted);font-weight:400;">· A$${i.price.toFixed(2)} ea</span></div>
        <div class="ci-controls">
          <div class="ci-qty">
            <button onclick="changeQty('${escapeJs(i.name)}', -1)" aria-label="Decrease">−</button>
            <span>${i.qty}</span>
            <button onclick="changeQty('${escapeJs(i.name)}', 1)" aria-label="Increase">+</button>
          </div>
          <button class="ci-rm" onclick="removeItem('${escapeJs(i.name)}')">Remove</button>
        </div>
      </div>
    </div>`).join('');
  if(footEl){
    footEl.style.display = 'block';
    const gst = subtotal - (subtotal / 1.1);
    document.getElementById('cartSubtotal').textContent = 'A$' + (subtotal - gst).toFixed(2);
    document.getElementById('cartGst').textContent      = 'A$' + gst.toFixed(2);
    document.getElementById('cartTotal').textContent    = 'A$' + subtotal.toFixed(2);
  }
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeJs(s){ return String(s).replace(/['\\]/g, '\\$&'); }

function showToast(msg){
  const t = document.getElementById('cartToast');
  if(!t) return;
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('on');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

function openCart(){
  document.getElementById('cartDrawer')?.classList.add('on');
  document.getElementById('cartOverlay')?.classList.add('on');
  document.body.style.overflow = 'hidden';
}
function closeCart(){
  document.getElementById('cartDrawer')?.classList.remove('on');
  document.getElementById('cartOverlay')?.classList.remove('on');
  document.body.style.overflow = '';
}

function checkoutWhatsApp(){
  if(cart.length === 0) return;
  const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const lines = cart.map(i => `• ${i.qty}× ${i.name} — A$${(i.price * i.qty).toFixed(2)}`).join('\n');
  const msg = `🍽️ *New Order — ${RESTAURANT_NAME}*\n\n${lines}\n\n*Total: A$${subtotal.toFixed(2)}* (GST incl.)\n\n— Pickup / Dine-in: _please confirm_\n— Name: \n— Time: \n— Notes: `;
  const url = `https://wa.me/${RESTAURANT_PHONE}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

/* ── Phase 10: Square API checkout via serverless function ── */
async function checkoutSquare(){
  if(cart.length === 0) return;
  const btn = document.getElementById('cartCheckoutSquare');
  const errEl = document.getElementById('cartError');
  if(errEl){errEl.style.display='none'; errEl.textContent='';}
  if(btn){btn.classList.add('loading');}
  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        items: cart.map(i => ({name: i.name, price: i.price, qty: i.qty}))
      })
    });
    const data = await res.json();
    if(!res.ok || !data.paymentUrl) throw new Error(data.error || 'Could not create payment link');
    // Redirect to Square checkout (Square will redirect to /order-success.html after payment)
    window.location.href = data.paymentUrl;
  } catch(err) {
    console.error(err);
    if(errEl){
      errEl.textContent = `⚠️ ${err.message}. Try WhatsApp or call us on 0403 829 539.`;
      errEl.style.display = 'block';
    }
    if(btn) btn.classList.remove('loading');
  }
}

/* Inject "Add to Cart" button onto every .mc menu card with a price */
function injectAddToCartButtons(){
  document.querySelectorAll('.mc').forEach(card => {
    if(card.querySelector('.atc')) return; // already injected
    const nameEl  = card.querySelector('.mc-name');
    const priceEl = card.querySelector('.price');
    if(!nameEl || !priceEl) return;
    const name  = nameEl.textContent.trim();
    const priceMatch = priceEl.textContent.match(/[\d.]+/);
    if(!priceMatch) return;
    const price = parseFloat(priceMatch[0]);
    const btn = document.createElement('button');
    btn.className = 'atc';
    btn.textContent = '+ Add to Cart';
    btn.onclick = (e) => {e.stopPropagation(); addToCart(name, price, btn);};
    card.appendChild(btn);
  });
}

/* Wire up cart UI */
document.addEventListener('DOMContentLoaded', () => {
  injectAddToCartButtons();
  renderCart();
  document.getElementById('cartBtn')?.addEventListener('click', openCart);
  document.getElementById('cartClose')?.addEventListener('click', closeCart);
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  document.getElementById('cartCheckoutSquare')?.addEventListener('click', checkoutSquare);
  document.getElementById('cartCheckoutWA')?.addEventListener('click', checkoutWhatsApp);
  document.getElementById('cartClear')?.addEventListener('click', clearCart);
  document.addEventListener('keydown', e => {if(e.key === 'Escape') closeCart();});
});
/* In case DOMContentLoaded already fired (script loaded late): */
if(document.readyState !== 'loading'){injectAddToCartButtons(); renderCart();}

const cd=document.getElementById('cur-dot'),cr=document.getElementById('cur-ring');
let mx=0,my=0,rx=0,ry=0;
window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cd.style.left=mx+'px';cd.style.top=my+'px';});
(function anim(){rx+=(mx-rx)*.13;ry+=(my-ry)*.13;cr.style.left=rx+'px';cr.style.top=ry+'px';requestAnimationFrame(anim);})();
document.querySelectorAll('a,button,.mc,.ocard,.wcard,.fcard,.ctile,.kp,.fb-item,.a-card').forEach(el=>{el.addEventListener('mouseenter',()=>document.body.classList.add('h'));el.addEventListener('mouseleave',()=>document.body.classList.remove('h'));});

window.addEventListener('scroll',()=>{
  document.getElementById('nav').classList.toggle('up',scrollY>70);
  document.body.classList.toggle('scrolled',scrollY>50);
});

function st(id,btn){
  document.querySelectorAll('.pnl').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('on'));
  const p=document.getElementById('pnl-'+id);if(p)p.classList.add('on');
  if(btn)btn.classList.add('on');
}

let cur=0,N=6,timer=null;
const slides=document.querySelectorAll('.slide');
const dots=document.querySelectorAll('.sdot');
const caps=document.querySelectorAll('.slide-cap');
const bar=document.querySelector('.hero-bar');
const num=document.getElementById('hnum');
const DUR=6500;
function goTo(n){
  slides[cur].classList.remove('on');slides[cur].classList.add('out');
  dots[cur].classList.remove('on');caps[cur].classList.remove('on');
  const prev=cur;cur=((n%N)+N)%N;
  setTimeout(()=>slides[prev].classList.remove('out'),2000);
  slides[cur].classList.add('on');dots[cur].classList.add('on');caps[cur].classList.add('on');
  if(num)num.textContent=String(cur+1).padStart(2,'0');
  resetBar();
}
function resetBar(){
  if(timer)clearTimeout(timer);
  if(bar){bar.style.transition='none';bar.style.width='0%';requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.transition='width '+DUR+'ms linear';bar.style.width='100%';}))};
  timer=setTimeout(()=>goTo(cur+1),DUR);
}
slides[0].classList.add('on');dots[0].classList.add('on');caps[0].classList.add('on');resetBar();
document.getElementById('hl').onclick=()=>goTo(cur-1);
document.getElementById('hr').onclick=()=>goTo(cur+1);
dots.forEach((d,i)=>d.addEventListener('click',()=>goTo(i)));
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')goTo(cur-1);if(e.key==='ArrowRight')goTo(cur+1);});
let tx=0;
const he=document.querySelector('.hero');
he.addEventListener('touchstart',e=>tx=e.touches[0].clientX,{passive:true});
he.addEventListener('touchend',e=>{const d=tx-e.changedTouches[0].clientX;if(Math.abs(d)>50)goTo(d>0?cur+1:cur-1);},{passive:true});

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const t=document.querySelector(a.getAttribute('href'));
    if(t)t.scrollIntoView({behavior:'smooth',block:'start'});
  });
});

const obs=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');obs.unobserve(e.target);}});
},{threshold:.1});
document.querySelectorAll('.rv,.rvl,.rvr,.rvs,.stg').forEach(el=>obs.observe(el));

/* ── 3D CARD TILT ── */
document.querySelectorAll('.mc,.ocard,.fcard,.chef-card,.ctile').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(600px) rotateY(${x*12}deg) rotateX(${-y*12}deg) translateY(-6px) scale(1.02)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

/* ── PARALLAX HERO ON MOUSE MOVE ── */
const heroTxt = document.querySelector('.hero-txt');
document.querySelector('.hero').addEventListener('mousemove', e => {
  if(!heroTxt) return;
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 10;
  heroTxt.style.transform = `perspective(1000px) rotateY(${x*0.3}deg) rotateX(${-y*0.3}deg) translate(${x*0.3}px,${y*0.3}px)`;
});
document.querySelector('.hero').addEventListener('mouseleave', () => {
  if(heroTxt) heroTxt.style.transform = '';
});

/* ── SPICE PARTICLES ── */
const spices = ['🌶️','✨','🍃','⭐','🌿','🔥','💛','🌾'];
const heroEl = document.querySelector('.hero');
function addSpice() {
  const s = document.createElement('div');
  s.className = 'spice-particle';
  s.textContent = spices[Math.floor(Math.random()*spices.length)];
  s.style.left = Math.random()*100+'%';
  s.style.top = Math.random()*100+'%';
  s.style.setProperty('--dur', (3+Math.random()*4)+'s');
  s.style.setProperty('--delay', (Math.random()*3)+'s');
  heroEl.appendChild(s);
  setTimeout(()=>s.remove(), 8000);
}
setInterval(addSpice, 1200);
for(let i=0;i<8;i++) setTimeout(addSpice, i*200);

/* ── ADD rv3d CLASS TO SECTIONS ── */
document.querySelectorAll('.wcard,.kp,.a-card').forEach(el => {
  el.classList.add('rv3d');
  observer.observe(el);
});
