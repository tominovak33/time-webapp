import { getTime, getTimeWarning, getTimeDrift, checkTimeDrift } from './time.js';
import { saveEntry, deleteEntry, renderData } from './tracking.js';

const STORAGE_KEY = 'preferred-timezone';

const timeEl     = document.getElementById('time');
const dateEl     = document.getElementById('date');
const timezoneEl = document.getElementById('timezone');
const warningEl  = document.getElementById('time-warning');
const driftEl    = document.getElementById('drift-value');
const cogBtn     = document.getElementById('cog-btn');
const tzPanel    = document.getElementById('tz-panel');
const tzSelect   = document.getElementById('tz-select');

let currentTz = localStorage.getItem(STORAGE_KEY)
  ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

const PINNED = [
  { value: 'UTC',           label: 'UTC' },
  { value: 'GMT',           label: 'GMT' },
  { value: 'Europe/London', label: 'BST / Europe/London' },
];

function getOffsetLabel(tz) {
  const raw = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    timeZoneName: 'shortOffset'
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? '';
  return raw.replace('GMT', 'UTC');
}

function makeOption(value, label) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = `${label}  ${getOffsetLabel(value)}`;
  if (value === currentTz) opt.selected = true;
  return opt;
}

// Pinned group
const pinnedGroup = document.createElement('optgroup');
pinnedGroup.label = 'Common';
PINNED.forEach(({ value, label }) => pinnedGroup.appendChild(makeOption(value, label)));
tzSelect.appendChild(pinnedGroup);

// All timezones group
const allGroup = document.createElement('optgroup');
allGroup.label = 'All timezones';
Intl.supportedValuesOf('timeZone').forEach(tz => allGroup.appendChild(makeOption(tz, tz)));
tzSelect.appendChild(allGroup);

function updateTimezoneLabel() {
  const offsetStr = new Intl.DateTimeFormat('en', {
    timeZone: currentTz,
    timeZoneName: 'shortOffset'
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? '';
  timezoneEl.textContent = `${currentTz}  (${offsetStr.replace('GMT', 'UTC')})`;
}

function tick() {
  const now = getTime();

  // Use formatToParts so the separator is always ':' regardless of locale
  const tp = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: currentTz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(now).map(p => [p.type, p.value])
  );
  timeEl.textContent = `${tp.hour}:${tp.minute}:${tp.second}`;

  dateEl.textContent = new Intl.DateTimeFormat(undefined, {
    timeZone: currentTz,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now);

  warningEl.textContent = getTimeWarning() ?? '';

  const drift = getTimeDrift();
  if (drift !== null) {
    const sign = drift > 0 ? '+' : '';
    driftEl.textContent = `${sign}${drift}ms (${sign}${(drift / 1000).toFixed(2)}s) vs time.now`;
  } else {
    driftEl.textContent = 'Checking…';
  }
}

// Cog toggle
cogBtn.addEventListener('click', e => {
  e.stopPropagation();
  tzPanel.classList.toggle('open');
});

document.addEventListener('click', () => tzPanel.classList.remove('open'));
tzPanel.addEventListener('click', e => e.stopPropagation());

// Timezone change
tzSelect.addEventListener('change', () => {
  currentTz = tzSelect.value;
  localStorage.setItem(STORAGE_KEY, currentTz);
  updateTimezoneLabel();
  checkTimeDrift();
});

updateTimezoneLabel();
setInterval(tick, 1000);
tick();

// --- Tracking ---
const trackForm    = document.getElementById('track-form');
const trackLabel   = document.getElementById('track-label');
const trackValue   = document.getElementById('track-value');
const trackedData  = document.getElementById('tracked-data');

trackForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const label = trackLabel.value.trim();
  const value = trackValue.value.trim();
  if (!label || !value) return;

  saveEntry(label, value);
  renderData(trackedData);
  trackValue.value = '';
  trackLabel.focus();
});

trackedData.addEventListener('click', (e) => {
  const btn = e.target.closest('.track-delete');
  if (!btn) return;
  deleteEntry(btn.dataset.label, Number(btn.dataset.index));
  renderData(trackedData);
});

renderData(trackedData);
