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

// Load demo DLM and make pins play real audio
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

    const pins = photo.querySelectorAll('.demo-pin');
    pins.forEach((pin, i) => {
      const hs = data.hotspots[i];
      if (!hs || !hs.audio) return;
      pin.addEventListener('click', () => {
        if (demoCurrentAudio) { demoCurrentAudio.pause(); demoCurrentAudio.currentTime = 0; }
        document.querySelectorAll('.demo-pin--playing').forEach(p => p.classList.remove('demo-pin--playing'));
        pin.classList.add('demo-pin--playing');
        const audio = new Audio(hs.audio);
        demoCurrentAudio = audio;
        audio.play();
        audio.onended = () => pin.classList.remove('demo-pin--playing');
      });
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
