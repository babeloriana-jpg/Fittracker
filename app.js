// ─── REJESTRACJA SERVICE WORKER ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ─── MOTYW ─────────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('fittracker_theme');
  if (saved === 'light') applyTheme('light');
  else applyTheme('dark');
}

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
  localStorage.setItem('fittracker_theme', theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light');
  applyTheme(isLight ? 'dark' : 'light');
}

// ─── TIMER ─────────────────────────────────────────────────────────────────────
let timerInterval = null;
let timerRemaining = 0;
let timerTotal = 0;
let timerRunning = false;
let timerExId = null;

function startTimer(seconds, exId) {
  if (timerExId !== exId) {
    // Nowe ćwiczenie — resetuj
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    timerRemaining = seconds;
    timerTotal = seconds;
    timerExId = exId;
  }
  renderTimerUI();
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
  } else {
    if (timerRemaining <= 0) {
      timerRemaining = timerTotal;
    }
    timerRunning = true;
    timerInterval = setInterval(() => {
      timerRemaining--;
      renderTimerUI();
      if (timerRemaining <= 0) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerRemaining = 0;
        renderTimerUI();
        // Wibracja na koniec
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        showToast('⏱ Czas minął!');
      }
    }, 1000);
  }
  renderTimerUI();
}

function resetTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  timerRemaining = timerTotal;
  renderTimerUI();
}

function renderTimerUI() {
  const wrap = document.getElementById('timer-wrap');
  if (!wrap) return;

  const pct = timerTotal > 0 ? timerRemaining / timerTotal : 0;
  const r = 48;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const urgent = timerRemaining <= 5 && timerRemaining > 0;

  const mins = Math.floor(timerRemaining / 60);
  const secs = timerRemaining % 60;
  const display = mins > 0
    ? `${mins}:${secs.toString().padStart(2, '0')}`
    : `${timerRemaining}`;

  // Jeśli timer nie był jeszcze zbudowany — zbuduj szkielet
  if (!wrap.querySelector('.timer-ring-wrap')) {
    wrap.innerHTML = `
      <div class="timer-ring-wrap">
        <svg class="timer-ring" width="110" height="110" viewBox="0 0 110 110">
          <circle class="timer-ring-bg" cx="55" cy="55" r="${r}"/>
          <circle class="timer-ring-fill" cx="55" cy="55" r="${r}"
            stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
        </svg>
        <div class="timer-display">
          <span class="timer-number">${display}</span>
          <span class="timer-label">sek</span>
        </div>
      </div>
      <div class="timer-btns">
        <button class="btn-timer" id="btn-timer-toggle" onclick="toggleTimer()">▶ Start</button>
        <button class="btn-timer-reset" onclick="resetTimer()">↺</button>
      </div>`;
    return;
  }

  // Aktualizuj tylko wartości — nie niszcz DOM
  const fill = wrap.querySelector('.timer-ring-fill');
  if (fill) {
    fill.setAttribute('stroke-dashoffset', offset);
    fill.classList.toggle('urgent', urgent);
  }
  const numEl = wrap.querySelector('.timer-number');
  if (numEl) numEl.textContent = display;
  const dispEl = wrap.querySelector('.timer-display');
  if (dispEl) dispEl.classList.toggle('urgent', urgent);
  const btn = wrap.querySelector('#btn-timer-toggle');
  if (btn) {
    btn.textContent = timerRunning ? '⏸ Pauza' : timerRemaining < timerTotal && timerRemaining > 0 ? '▶ Wznów' : '▶ Start';
    btn.classList.toggle('running', timerRunning);
  }
}

// ─── DANE I STAN ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'fittracker_data';

function defaultData() {
  return {
    exercises: [],
    currentGroup: 'A',
    lastGroupDate: null,
    completions: {},
    postponed: {},
    dayGroups: {},   // { "YYYY-MM-DD": "A"|"B" }
  };
}

let data = defaultData();
let currentCardIndex = 0;
let editingExerciseId = null;
let currentType = 'reps';
let currentGroup = 'A';
let deletingExerciseId = null;
let activeListGroup = 'A';

// ─── ZAPIS / ODCZYT ────────────────────────────────────────────────────────────
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) data = { ...defaultData(), ...JSON.parse(raw) };
  } catch {
    data = defaultData();
  }
  autoAdvanceGroup();
}

// ─── AUTO-ZMIANA GRUPY ─────────────────────────────────────────────────────────
// Jeśli minął dzień od ostatniej zmiany, przełącz grupę
function autoAdvanceGroup() {
  const today = todayStr();
  if (data.lastGroupDate && data.lastGroupDate !== today) {
    const last = new Date(data.lastGroupDate);
    const now = new Date(today);
    const diff = Math.round((now - last) / 86400000);
    if (diff >= 1) {
      // Liczymy ile dni minęło — parzyste = ta sama grupa, nieparzyste = zmiana
      if (diff % 2 === 1) {
        data.currentGroup = data.currentGroup === 'A' ? 'B' : 'A';
      }
      data.lastGroupDate = today;
      save();
    }
  } else if (!data.lastGroupDate) {
    data.lastGroupDate = today;
    save();
  }
}

// ─── POMOCNICZE ────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function formatExerciseValue(ex) {
  if (ex.type === 'time') {
    const s = ex.seconds || 30;
    return s >= 60 ? `${Math.floor(s/60)} min ${s%60 > 0 ? s%60+'s' : ''}`.trim() : `${s} sek`;
  }
  return `${ex.sets || 3} serie × ${ex.reps || 10} powt.`;
}

// Ćwiczenia na dziś (własna grupa + przeniesione)
function todaysExercises() {
  const today = todayStr();
  const group = data.currentGroup;
  const own = data.exercises.filter(e => e.group === group);
  const postponedIds = (data.postponed[today] || []);
  const postponedExs = postponedIds
    .map(id => data.exercises.find(e => e.id === id))
    .filter(Boolean);
  // Unikalne (żeby nie dublować jeśli własne ćwiczenie też tu wpadło)
  const seen = new Set(own.map(e => e.id));
  const extra = postponedExs.filter(e => !seen.has(e.id));
  return [...own, ...extra];
}

function isCompleted(exId) {
  const today = todayStr();
  return !!(data.completions[today] && data.completions[today][exId]);
}

function completedCount() {
  return todaysExercises().filter(e => isCompleted(e.id)).length;
}

// ─── NAWIGACJA EKRANÓW ─────────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelector(`.nav-btn[data-screen="${name}"]`).classList.add('active');

  if (name === 'today') renderToday();
  if (name === 'exercises') renderExercises();
  if (name === 'history') renderHistory();
}

// ─── EKRAN DZIŚ ────────────────────────────────────────────────────────────────
function renderToday() {
  const today = todayStr();
  const exercises = todaysExercises();

  // Nagłówek
  const d = new Date(today + 'T12:00:00');
  document.getElementById('today-weekday').textContent =
    d.toLocaleDateString('pl-PL', { weekday: 'long' });
  document.getElementById('today-date').textContent =
    d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  const badge = document.getElementById('day-badge');
  badge.textContent = `Dzień ${data.currentGroup}`;
  badge.className = `day-badge day-${data.currentGroup}`;

  // Pasek postępu
  const total = exercises.length;
  const done = completedCount();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  const progressLabel = document.getElementById('progress-label');
  progressLabel.textContent = total > 0 ? `${done} / ${total}` : '';
  progressLabel.style.display = total === 0 ? 'none' : '';
  document.getElementById('progress-bar-wrap').style.display = total === 0 ? 'none' : 'flex';

  // Pilnuj indexu
  if (currentCardIndex >= exercises.length) currentCardIndex = Math.max(0, exercises.length - 1);

  renderCard(exercises);
  renderDots(exercises);
}

function renderCard(exercises) {
  const area = document.getElementById('card-area');

  if (exercises.length === 0) {
    area.innerHTML = `
      <div class="empty-card">
        <div class="empty-icon">💪</div>
        <p class="empty-title">Brak ćwiczeń na dziś</p>
        <p class="empty-sub">Dodaj ćwiczenia w zakładce<br><strong>Ćwiczenia</strong> i przypisz do grupy dnia</p>
      </div>`;
    document.getElementById('btn-prev').style.visibility = 'hidden';
    document.getElementById('btn-next').style.visibility = 'hidden';
    return;
  }

  const ex = exercises[currentCardIndex];
  const done = isCompleted(ex.id);
  const today = todayStr();
  const isPostponed = (data.postponed[today] || []).includes(ex.id);

  document.getElementById('btn-prev').style.visibility = currentCardIndex > 0 ? 'visible' : 'hidden';
  document.getElementById('btn-next').style.visibility = currentCardIndex < exercises.length - 1 ? 'visible' : 'hidden';

  area.innerHTML = `
    <div class="exercise-card ${done ? 'done' : ''}">
      <div class="card-top">
        <span class="card-group-badge group-${ex.group}">Dzień ${ex.group}</span>
        ${isPostponed ? '<span class="postponed-badge">przeniesione</span>' : ''}
      </div>
      <div class="card-name">${ex.name}</div>
      <div class="card-value">${formatExerciseValue(ex)}</div>
      ${ex.type === 'time' ? `<div class="timer-wrap" id="timer-wrap"></div>` : ''}
      ${ex.note ? `<div class="card-note">💡 ${ex.note}</div>` : ''}
      <div class="card-actions">
        <button class="btn-done ${done ? 'btn-done-active' : ''}" onclick="toggleDone('${ex.id}')">
          ${done ? '✅ Zrobione!' : '✓ Zrobione'}
        </button>
        <button class="btn-postpone" onclick="postpone('${ex.id}')" ${done ? 'disabled' : ''}>
          ➡ Jutro
        </button>
      </div>
    </div>`;

  // Inicjuj timer jeśli ćwiczenie na czas
  if (ex.type === 'time') {
    startTimer(ex.seconds || 30, ex.id);
  }
}

function renderDots(exercises) {
  const dots = document.getElementById('card-dots');
  dots.innerHTML = exercises.map((_, i) =>
    `<span class="dot ${i === currentCardIndex ? 'dot-active' : ''}" onclick="goToCard(${i})"></span>`
  ).join('');
}

function prevCard() {
  if (currentCardIndex > 0) { currentCardIndex--; renderToday(); }
}

function nextCard() {
  const ex = todaysExercises();
  if (currentCardIndex < ex.length - 1) { currentCardIndex++; renderToday(); }
}

function goToCard(i) {
  currentCardIndex = i;
  renderToday();
}

function toggleDone(exId) {
  const today = todayStr();
  if (!data.completions[today]) data.completions[today] = {};
  data.completions[today][exId] = !data.completions[today][exId];
  // Zapisz która grupa była aktywna tego dnia
  if (!data.dayGroups) data.dayGroups = {};
  data.dayGroups[today] = data.currentGroup;
  save();
  renderToday();

  // Jeśli właśnie oznaczono jako zrobione i jest następne — przejdź dalej
  if (data.completions[today][exId]) {
    const exercises = todaysExercises();
    if (currentCardIndex < exercises.length - 1) {
      setTimeout(() => { currentCardIndex++; renderToday(); }, 600);
    }
  }
}

function postpone(exId) {
  const today = todayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Dodaj do jutrzejszych przeniesionych
  if (!data.postponed[tomorrowStr]) data.postponed[tomorrowStr] = [];
  if (!data.postponed[tomorrowStr].includes(exId)) {
    data.postponed[tomorrowStr].push(exId);
  }

  // Oznacz jako "odłożone dziś" (żeby nie liczyć jako niezrobione)
  if (!data.completions[today]) data.completions[today] = {};
  data.completions[today][exId] = 'postponed';

  save();
  showToast('Przeniesiono na jutro ➡️');

  const exercises = todaysExercises();
  if (currentCardIndex < exercises.length - 1) {
    currentCardIndex++;
  }
  renderToday();
}

function toggleDayGroup() {
  data.currentGroup = data.currentGroup === 'A' ? 'B' : 'A';
  data.lastGroupDate = todayStr();
  currentCardIndex = 0;
  save();
  renderToday();
  showToast(`Przełączono na Dzień ${data.currentGroup}`);
}

// ─── EKRAN ĆWICZENIA ───────────────────────────────────────────────────────────
function renderExercises() {
  const list = document.getElementById('exercise-list');
  const exs = data.exercises.filter(e => e.group === activeListGroup);

  document.querySelectorAll('.group-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.group === activeListGroup)
  );

  if (exs.length === 0) {
    list.innerHTML = `<div class="empty-list">
      <p>Brak ćwiczeń w Dniu ${activeListGroup}</p>
      <p class="empty-sub">Kliknij <strong>+ Dodaj</strong> żeby dodać pierwsze ćwiczenie</p>
    </div>`;
    return;
  }

  list.innerHTML = exs.map(ex => `
    <div class="ex-row">
      <div class="ex-info">
        <div class="ex-name">${ex.name}</div>
        <div class="ex-meta">${formatExerciseValue(ex)}${ex.note ? ' · ' + ex.note : ''}</div>
      </div>
      <div class="ex-btns">
        <button class="icon-btn" onclick="openEditExercise('${ex.id}')">✏️</button>
        <button class="icon-btn" onclick="openDeleteConfirm('${ex.id}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function switchGroup(g) {
  activeListGroup = g;
  renderExercises();
}

// ─── MODAL ĆWICZENIA ───────────────────────────────────────────────────────────
function openAddExercise() {
  editingExerciseId = null;
  document.getElementById('modal-title').textContent = 'Nowe ćwiczenie';
  document.getElementById('ex-name').value = '';
  document.getElementById('ex-sets').value = 3;
  document.getElementById('ex-reps').value = 15;
  document.getElementById('ex-time').value = 45;
  document.getElementById('ex-note').value = '';
  setType('reps');
  setGroup(activeListGroup);
  document.getElementById('modal-exercise').classList.add('open');
  setTimeout(() => document.getElementById('ex-name').focus(), 100);
}

function openEditExercise(id) {
  const ex = data.exercises.find(e => e.id === id);
  if (!ex) return;
  editingExerciseId = id;
  document.getElementById('modal-title').textContent = 'Edytuj ćwiczenie';
  document.getElementById('ex-name').value = ex.name;
  document.getElementById('ex-sets').value = ex.sets || 3;
  document.getElementById('ex-reps').value = ex.reps || 15;
  document.getElementById('ex-time').value = ex.seconds || 45;
  document.getElementById('ex-note').value = ex.note || '';
  setType(ex.type || 'reps');
  setGroup(ex.group || 'A');
  document.getElementById('modal-exercise').classList.add('open');
}

function setType(t) {
  currentType = t;
  document.getElementById('type-reps').classList.toggle('active', t === 'reps');
  document.getElementById('type-time').classList.toggle('active', t === 'time');
  document.getElementById('reps-fields').style.display = t === 'reps' ? '' : 'none';
  document.getElementById('time-fields').style.display = t === 'time' ? '' : 'none';
}

function setGroup(g) {
  currentGroup = g;
  document.getElementById('group-A').classList.toggle('active', g === 'A');
  document.getElementById('group-B').classList.toggle('active', g === 'B');
}

function saveExercise() {
  const name = document.getElementById('ex-name').value.trim();
  if (!name) { showToast('Podaj nazwę ćwiczenia'); return; }

  const ex = {
    id: editingExerciseId || genId(),
    name,
    type: currentType,
    sets: parseInt(document.getElementById('ex-sets').value) || 3,
    reps: parseInt(document.getElementById('ex-reps').value) || 15,
    seconds: parseInt(document.getElementById('ex-time').value) || 45,
    group: currentGroup,
    note: document.getElementById('ex-note').value.trim(),
  };

  if (editingExerciseId) {
    const idx = data.exercises.findIndex(e => e.id === editingExerciseId);
    if (idx !== -1) data.exercises[idx] = ex;
  } else {
    data.exercises.push(ex);
  }

  save();
  closeModal();
  renderExercises();
  showToast(editingExerciseId ? 'Zapisano zmiany ✓' : 'Dodano ćwiczenie ✓');
}

function closeModal() {
  document.getElementById('modal-exercise').classList.remove('open');
}

// ─── MODAL USUWANIA ────────────────────────────────────────────────────────────
function openDeleteConfirm(id) {
  deletingExerciseId = id;
  const ex = data.exercises.find(e => e.id === id);
  document.getElementById('confirm-text').textContent = `„${ex?.name}" zostanie usunięte na stałe.`;
  document.getElementById('modal-confirm').classList.add('open');
}

function confirmDelete() {
  if (!deletingExerciseId) return;
  data.exercises = data.exercises.filter(e => e.id !== deletingExerciseId);
  save();
  closeConfirm();
  renderExercises();
  showToast('Ćwiczenie usunięte');
  deletingExerciseId = null;
}

function closeConfirm() {
  document.getElementById('modal-confirm').classList.remove('open');
}

function closeModalOnOverlay(e) {
  if (e.target === e.currentTarget) {
    closeModal();
    closeConfirm();
  }
}

// ─── EKRAN HISTORII ────────────────────────────────────────────────────────────
function renderHistory() {
  const cont = document.getElementById('history-content');
  const days = [];

  // Zbierz wszystkie daty z completions
  const dates = Object.keys(data.completions).sort().reverse().slice(0, 30);

  if (dates.length === 0) {
    cont.innerHTML = `<div class="empty-list"><p>Brak historii</p><p class="empty-sub">Tu pojawią się Twoje treningi</p></div>`;
    return;
  }

  cont.innerHTML = dates.map(date => {
    const comps = data.completions[date] || {};
    const ids = Object.keys(comps);
    const done = ids.filter(id => comps[id] === true).length;
    const postponed = ids.filter(id => comps[id] === 'postponed').length;
    const total = ids.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const group = (data.dayGroups && data.dayGroups[date]) || '?';

    return `
      <div class="history-row">
        <div class="history-date">${formatDateShort(date)}</div>
        <span class="history-group-badge group-${group}">Dzień ${group}</span>
        <div class="history-bar-wrap">
          <div class="history-bar-track">
            <div class="history-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="history-stats">
          <span class="hist-done">${done}✓</span>
          ${postponed > 0 ? `<span class="hist-post">${postponed}➡</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ─── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── START ─────────────────────────────────────────────────────────────────────
initTheme();
load();
renderToday();
