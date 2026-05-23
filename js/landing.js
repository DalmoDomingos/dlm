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

// Animate demo pins on click
document.querySelectorAll('.demo-pin').forEach(pin => {
  pin.addEventListener('click', () => {
    // Remove playing from all
    document.querySelectorAll('.demo-pin--playing').forEach(p => p.classList.remove('demo-pin--playing'));
    pin.classList.add('demo-pin--playing');
    setTimeout(() => pin.classList.remove('demo-pin--playing'), 3000);
  });
});

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
