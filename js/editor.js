/* ═══════════════════════════════════════════
   DLM Editor — core logic
═══════════════════════════════════════════ */

/* ─── State ─── */
const state = {
  photo: null,
  hotspots: [],
  selected: null,
  recording: false,
  mediaRecorder: null,
  audioChunks: [],
  recordingTarget: null,
  recTimer: null,
  recSeconds: 0,
};

/* ─── DOM refs ─── */
const uploadZone   = document.getElementById('uploadZone');
const photoStage   = document.getElementById('photoStage');
const photoImg     = document.getElementById('photoImg');
const photoOverlay = document.getElementById('photoOverlay');
const canvasHint   = document.getElementById('canvasHint');
const pinList      = document.getElementById('pinList');
const pinEmpty     = document.getElementById('pinEmpty');
const exportBtn    = document.getElementById('exportBtn');
const filenameInput= document.getElementById('filenameInput');
const recOverlay   = document.getElementById('recOverlay');
const recTimer     = document.getElementById('recTimer');
const toastEl      = document.getElementById('toast');

/* ─── Upload photo ─── */
document.getElementById('uploadPhotoBtn').addEventListener('click', () => {
  document.getElementById('photoFileInput').click();
});
document.getElementById('photoFileInput').addEventListener('change', e => {
  if (e.target.files[0]) loadPhoto(e.target.files[0]);
});

// Drag & drop on upload zone
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadPhoto(file);
});

function loadPhoto(file) {
  const reader = new FileReader();
  reader.onload = e => {
    state.photo = e.target.result;
    photoImg.src = state.photo;
    photoImg.onload = () => {
      uploadZone.style.display = 'none';
      photoStage.classList.add('visible');
      canvasHint.classList.remove('hidden');
    };
  };
  reader.readAsDataURL(file);
}

/* ─── Click to place hotspot ─── */
photoOverlay.addEventListener('click', e => {
  const rect = photoImg.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return;
  addHotspot(x, y);
  canvasHint.classList.add('hidden');
});

function addHotspot(x, y) {
  const id = Math.random().toString(36).slice(2, 9);
  const hs = { id, x, y, label: '', audio: null };
  state.hotspots.push(hs);
  state.selected = id;
  renderAll();
  return hs;
}

function removeHotspot(id) {
  state.hotspots = state.hotspots.filter(h => h.id !== id);
  if (state.selected === id) state.selected = state.hotspots.length ? state.hotspots[state.hotspots.length - 1].id : null;
  renderAll();
}

function selectHotspot(id) {
  state.selected = state.selected === id ? null : id;
  renderAll();
}

/* ─── Render ─── */
function renderAll() {
  renderDots();
  renderSidebar();
  exportBtn.disabled = !state.photo || state.hotspots.length === 0;
}

function renderDots() {
  photoOverlay.innerHTML = '';
  state.hotspots.forEach((hs, i) => {
    const dot = document.createElement('div');
    dot.className = 'hs-dot' + (state.selected === hs.id ? ' selected' : '') + (hs.audio ? ' has-audio' : '');
    dot.style.left = (hs.x * 100) + '%';
    dot.style.top  = (hs.y * 100) + '%';

    dot.innerHTML = `
      <div class="hs-dot-ring"></div>
      <div class="hs-dot-ring hs-dot-ring-2"></div>
      <div class="hs-dot-core">${i + 1}</div>`;

    // ── Drag to reposition ──
    let startClientX, startClientY, dragging = false;

    const onStart = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const p = e.touches ? e.touches[0] : e;
      startClientX = p.clientX;
      startClientY = p.clientY;
      dragging = false;
      dot.classList.add('dragging');

      const imgRect = photoImg.getBoundingClientRect();

      const onMove = (e2) => {
        const p2 = e2.touches ? e2.touches[0] : e2;
        if (!dragging && (Math.abs(p2.clientX - startClientX) > 4 || Math.abs(p2.clientY - startClientY) > 4)) {
          dragging = true;
        }
        if (!dragging) return;
        const x = Math.max(0, Math.min(1, (p2.clientX - imgRect.left)  / imgRect.width));
        const y = Math.max(0, Math.min(1, (p2.clientY - imgRect.top) / imgRect.height));
        hs.x = x;
        hs.y = y;
        dot.style.left = (x * 100) + '%';
        dot.style.top  = (y * 100) + '%';
      };

      const onEnd = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend',  onEnd);
        dot.classList.remove('dragging');
        if (!dragging) selectHotspot(hs.id);
        // just re-render sidebar to confirm new position
        renderSidebar();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend',  onEnd);
    };

    dot.addEventListener('mousedown',  onStart);
    dot.addEventListener('touchstart', onStart, { passive: false });

    photoOverlay.appendChild(dot);
  });
}

function renderSidebar() {
  pinList.innerHTML = '';

  if (state.hotspots.length === 0) {
    pinList.appendChild(pinEmpty);
    return;
  }

  state.hotspots.forEach((hs, i) => {
    const card = document.createElement('div');
    card.className = 'pin-card' + (state.selected === hs.id ? ' selected' : '');
    card.id = 'pin-' + hs.id;

    const hasAudio = !!hs.audio;

    card.innerHTML = `
      <div class="pin-card-header" data-id="${hs.id}">
        <div class="pin-badge">${i + 1}</div>
        <span class="pin-card-name ${hs.label ? '' : 'no-label'}">${hs.label || t('ed_pin_label')}</span>
        <div class="pin-status ${hasAudio ? 'has-audio' : ''}"></div>
      </div>
      <div class="pin-card-body">
        <div class="pin-field">
          <label data-i18n="ed_pin_label">${t('ed_pin_label')}</label>
          <input type="text" placeholder="${t('ed_pin_label')}" value="${escHtml(hs.label)}" data-id="${hs.id}">
        </div>
        <div class="audio-controls">
          <div class="audio-btn-row">
            <button class="btn btn-record" data-id="${hs.id}" data-i18n-btn="ed_record">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" fill="currentColor"/></svg>
              ${t('ed_record')}
            </button>
            <button class="btn btn-upload-audio" data-id="${hs.id}">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v6M3 5l3-3 3 3M2 10h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              ${t('ed_upload_aud')}
            </button>
          </div>
          <div class="audio-player-wrap ${hasAudio ? 'visible' : ''}" id="player-${hs.id}">
            <div class="audio-player-row">
              <button class="btn-play-audio" data-id="${hs.id}">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 2l7 4-7 4V2z" fill="white"/></svg>
              </button>
              <span class="audio-label">${hs.label || 'Audio'}</span>
              <button class="btn-clear-audio" data-id="${hs.id}">${t('ed_clear_aud')}</button>
            </div>
          </div>
        </div>
        <div class="pin-actions">
          <button class="btn-delete-pin" data-id="${hs.id}">${t('ed_delete_pin')}</button>
        </div>
      </div>`;

    // Events
    card.querySelector('.pin-card-header').addEventListener('click', () => selectHotspot(hs.id));
    card.querySelector('input').addEventListener('input', e => {
      hs.label = e.target.value;
      renderDots();
      // Update name display inline
      const nameEl = card.querySelector('.pin-card-name');
      nameEl.textContent = hs.label || t('ed_pin_label');
      nameEl.classList.toggle('no-label', !hs.label);
    });
    card.querySelector('.btn-record').addEventListener('click', e => { e.stopPropagation(); startRecording(hs.id); });
    card.querySelector('.btn-upload-audio').addEventListener('click', e => { e.stopPropagation(); openAudioUpload(hs.id); });
    if (hasAudio) {
      card.querySelector('.btn-play-audio').addEventListener('click', e => { e.stopPropagation(); playAudio(hs.audio); });
      card.querySelector('.btn-clear-audio').addEventListener('click', e => { e.stopPropagation(); clearAudio(hs.id); });
    }
    card.querySelector('.btn-delete-pin').addEventListener('click', e => { e.stopPropagation(); removeHotspot(hs.id); });

    pinList.appendChild(card);
  });

  // Scroll selected into view
  if (state.selected) {
    const sel = document.getElementById('pin-' + state.selected);
    if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* ─── Audio upload ─── */
function openAudioUpload(id) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'audio/*';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAudio(id, ev.target.result);
    reader.readAsDataURL(file);
  };
  input.click();
}

/* ─── Recording ─── */
async function startRecording(id) {
  if (state.recording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaRecorder = new MediaRecorder(stream);
    state.audioChunks = [];
    state.recordingTarget = id;

    state.mediaRecorder.ondataavailable = e => { if (e.data.size > 0) state.audioChunks.push(e.data); };
    state.mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = ev => setAudio(state.recordingTarget, ev.target.result);
      reader.readAsDataURL(blob);
    };

    state.mediaRecorder.start();
    state.recording = true;
    state.recSeconds = 0;

    // Show overlay
    recOverlay.classList.add('visible');
    updateRecTimer();
    state.recTimer = setInterval(() => {
      state.recSeconds++;
      updateRecTimer();
      if (state.recSeconds >= 60) stopRecording(); // max 60s
    }, 1000);

    document.getElementById('stopRecBtn').onclick = stopRecording;
  } catch(err) {
    showToast(t('ed_no_mic'));
  }
}

function stopRecording() {
  if (!state.recording) return;
  clearInterval(state.recTimer);
  state.mediaRecorder.stop();
  state.recording = false;
  recOverlay.classList.remove('visible');
}

function updateRecTimer() {
  const s = state.recSeconds;
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  recTimer.textContent = mm + ':' + ss;
}

function setAudio(id, data) {
  const hs = state.hotspots.find(h => h.id === id);
  if (hs) { hs.audio = data; renderAll(); }
}

function clearAudio(id) {
  const hs = state.hotspots.find(h => h.id === id);
  if (hs) { hs.audio = null; renderAll(); }
}

function playAudio(data) {
  const audio = new Audio(data);
  audio.play().catch(() => {});
}

/* ─── Open .dlm ─── */
document.getElementById('openDlmBtn').addEventListener('click', () => {
  document.getElementById('dlmFileInput').click();
});
document.getElementById('dlmFileInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await loadDLM(file);
  } catch(err) {
    showToast('Invalid .dlm file');
  }
});

async function loadDLM(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (data.format !== 'DLM') throw new Error('Not a DLM file');

  state.photo    = data.image;
  state.hotspots = data.hotspots || [];
  state.selected = null;

  filenameInput.value = data.name || 'untitled';

  photoImg.src = state.photo;
  photoImg.onload = () => {
    uploadZone.style.display = 'none';
    photoStage.classList.add('visible');
    canvasHint.classList.add('hidden');
    renderAll();
  };
}

/* ─── New file ─── */
document.getElementById('newBtn').addEventListener('click', () => {
  if (state.hotspots.length && !confirm('Start a new file? Unsaved changes will be lost.')) return;
  resetEditor();
});

function resetEditor() {
  state.photo = null;
  state.hotspots = [];
  state.selected = null;
  photoStage.classList.remove('visible');
  uploadZone.style.display = '';
  canvasHint.classList.remove('hidden');
  filenameInput.value = 'untitled';
  renderAll();
}

/* ─── Export .dlm ─── */
exportBtn.addEventListener('click', exportDLM);

function exportDLM() {
  const name = filenameInput.value.trim() || 'untitled';
  const data = {
    format:   'DLM',
    version:  '1.0',
    name,
    created:  new Date().toISOString(),
    image:    state.photo,
    hotspots: state.hotspots,
  };

  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/octet-stream' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name + '.dlm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('✓ Saved as ' + name + '.dlm');
}

/* ─── Toast ─── */
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

/* ─── Helpers ─── */
function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── Init ─── */
initLang();
renderAll();
