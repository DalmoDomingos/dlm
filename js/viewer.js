/* ═══════════════════════════════════════════
   DLM Viewer — core logic
═══════════════════════════════════════════ */

/* ─── State ─── */
const vState = {
  data: null,
  currentAudio: null,
  currentDotId: null,
  npTimer: null,
};

/* ─── DOM refs ─── */
const openState    = document.getElementById('openState');
const viewState    = document.getElementById('viewState');
const openCard     = document.getElementById('openCard');
const vwPhoto      = document.getElementById('vwPhoto');
const hotspotLayer = document.getElementById('hotspotLayer');
const vwFilename   = document.getElementById('vwFilename');
const vwCount      = document.getElementById('vwCount');
const nowPlaying   = document.getElementById('nowPlaying');
const npTitle      = document.getElementById('npTitle');
const backBtn      = document.getElementById('backBtn');
const dlmInput     = document.getElementById('dlmInput');

/* ─── Open file ─── */
document.getElementById('openBtn').addEventListener('click', () => dlmInput.click());
document.getElementById('exampleBtn').addEventListener('click', () => {
  loadDLMFromUrl('examples/tirinhadlm.dlm', 'tirinhadlm');
});
dlmInput.addEventListener('change', e => {
  if (e.target.files[0]) loadDLM(e.target.files[0]);
  dlmInput.value = '';
});

// Drag & drop on the card
openCard.addEventListener('dragover', e => { e.preventDefault(); openCard.classList.add('drag-over'); });
openCard.addEventListener('dragleave', () => openCard.classList.remove('drag-over'));
openCard.addEventListener('drop', e => {
  e.preventDefault();
  openCard.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadDLM(file);
});

// Also accept drag onto the whole page
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && (file.name.endsWith('.dlm') || file.type === 'application/octet-stream' || file.type === 'application/json')) {
    loadDLM(file);
  }
});

// Back button
backBtn.addEventListener('click', showOpenState);

/* ─── Load DLM ─── */
async function loadDLM(file) {
  try {
    const text = await file.text();
    const name = file.name.replace('.dlm', '');
    parseDLMText(text, name);
  } catch(err) {
    alert('Could not open file. Make sure it is a valid .dlm file.');
  }
}

async function loadDLMFromUrl(url, name) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');
    const text = await res.text();
    parseDLMText(text, name);
  } catch(err) {
    alert('Could not load example file.');
  }
}

function parseDLMText(text, fallbackName) {
  const data = JSON.parse(text);
  if (data.format !== 'DLM') throw new Error('Not a DLM file');

  vState.data = data;
  stopCurrentAudio();

  vwPhoto.src = data.image;
  vwPhoto.onload = () => {
    showViewState();
    renderHotspots();

    const name = data.name || fallbackName;
    vwFilename.innerHTML = escHtml(name) + '<span class="ext">.dlm</span>';
    const n = (data.hotspots || []).length;
    vwCount.textContent = n + (n === 1 ? ' pin' : ' pins');
  };
}

/* ─── Show states ─── */
function showViewState() {
  openState.style.display = 'none';
  viewState.classList.add('visible');
}
function showOpenState() {
  stopCurrentAudio();
  viewState.classList.remove('visible');
  openState.style.display = '';
  vState.data = null;
}

/* ─── Render hotspots ─── */
function renderHotspots() {
  hotspotLayer.innerHTML = '';
  const hotspots = vState.data?.hotspots || [];

  hotspots.forEach((hs, i) => {
    const dot = document.createElement('div');
    dot.className = 'vw-dot' + (hs.audio ? '' : ' no-audio');
    dot.style.left = (hs.x * 100) + '%';
    dot.style.top  = (hs.y * 100) + '%';
    dot.dataset.id = hs.id;

    const label = hs.label || (hs.audio ? t('vw_playing') : t('vw_no_audio'));

    dot.innerHTML = `
      <div class="vw-dot-ring"></div>
      <div class="vw-dot-ring vw-dot-ring-2"></div>
      <div class="vw-dot-label">${escHtml(label)}</div>
      <div class="vw-dot-core">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 3.5v5M4 2v8M6 4v4M8 2.5v7M10 4v4" stroke="white" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="vw-dot-wave">
        <span></span><span></span><span></span><span></span><span></span>
      </div>`;

    if (hs.audio) {
      dot.addEventListener('click', () => playHotspot(hs));
    }

    hotspotLayer.appendChild(dot);
  });
}

/* ─── Play audio ─── */
function playHotspot(hs) {
  // If same pin playing → stop
  if (vState.currentDotId === hs.id && vState.currentAudio && !vState.currentAudio.paused) {
    stopCurrentAudio();
    return;
  }

  stopCurrentAudio();

  const dot = hotspotLayer.querySelector(`[data-id="${hs.id}"]`);
  if (dot) dot.classList.add('playing');
  vState.currentDotId = hs.id;

  const audio = new Audio(hs.audio);
  vState.currentAudio = audio;

  // Show now-playing strip
  npTitle.textContent = hs.label || t('vw_playing');
  nowPlaying.classList.add('visible');
  clearTimeout(vState.npTimer);

  audio.onended = () => {
    if (dot) dot.classList.remove('playing');
    vState.currentDotId = null;
    nowPlaying.classList.remove('visible');
  };

  audio.play().catch(() => {
    if (dot) dot.classList.remove('playing');
    vState.currentDotId = null;
  });
}

function stopCurrentAudio() {
  if (vState.currentAudio) {
    vState.currentAudio.pause();
    vState.currentAudio.currentTime = 0;
    vState.currentAudio = null;
  }
  if (vState.currentDotId) {
    const dot = hotspotLayer.querySelector(`[data-id="${vState.currentDotId}"]`);
    if (dot) dot.classList.remove('playing');
    vState.currentDotId = null;
  }
  nowPlaying.classList.remove('visible');
}

/* ─── Helpers ─── */
function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Check URL param (open from editor) ─── */
// Future: support ?file= param for direct sharing

/* ─── Init ─── */
initLang();
