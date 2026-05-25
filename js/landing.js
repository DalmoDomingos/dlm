/* ═══════════════════════════════════════════
   DLM — Landing page JS
═══════════════════════════════════════════ */

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Mobile menu
function toggleMenu() {
  const drawer = document.getElementById('nav-drawer');
  const btn = document.getElementById('hamburger');
  const open = drawer.classList.toggle('open');
  btn.classList.toggle('open', open);
}
function closeMenu() {
  document.getElementById('nav-drawer').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}
document.addEventListener('click', (e) => {
  const drawer = document.getElementById('nav-drawer');
  const hamburger = document.getElementById('hamburger');
  if (drawer.classList.contains('open') && !drawer.contains(e.target) && !hamburger.contains(e.target)) {
    closeMenu();
  }
});

// Load demo DLM and render real pins with audio
let demoCurrentAudio = null;

async function loadDemoExample() {
  try {
    const res = await fetch('examples/tirinhadlm.dlm');
    if (!res.ok) return;
    const data = JSON.parse(await res.text());
    if (data.format !== 'DLM') return;

    const photo = document.getElementById('demoPhoto');
    const img = photo.querySelector('.demo-img');
    if (img) img.src = data.image;

    (data.hotspots || []).forEach((hs, i) => {
      if (!hs.audio) return;
      const pin = document.createElement('div');
      pin.className = 'demo-pin';
      pin.style.left = (hs.x * 100) + '%';
      pin.style.top  = (hs.y * 100) + '%';
      pin.innerHTML = `
        <div class="pin-ring"></div>
        <div class="pin-ring pin-ring-2"></div>
        <div class="pin-core">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 2v6M5 1v8M7 3v4" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <div class="pin-tooltip">${hs.label || ''}</div>
        <div class="pin-wave"><span></span><span></span><span></span><span></span><span></span></div>`;

      pin.addEventListener('click', () => {
        if (demoCurrentAudio) { demoCurrentAudio.pause(); demoCurrentAudio.currentTime = 0; }
        document.querySelectorAll('.demo-pin--playing').forEach(p => p.classList.remove('demo-pin--playing'));
        pin.classList.add('demo-pin--playing');
        const audio = new Audio(hs.audio);
        demoCurrentAudio = audio;
        audio.play();
        audio.onended = () => pin.classList.remove('demo-pin--playing');
      });

      photo.appendChild(pin);
    });
  } catch(e) {}
}

loadDemoExample();

// Scroll-based fade-in for sections
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = 'fade-up 0.6s ease both';
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.step, .feat-card').forEach(el => {
  el.style.opacity = '0';
  observer.observe(el);
});

// Init language
initLang();
