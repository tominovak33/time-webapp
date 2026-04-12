import { getTime, getTimeWarning, getTimeDrift } from './time.js';

const timeEl     = document.getElementById('time');
const dateEl     = document.getElementById('date');
const timezoneEl = document.getElementById('timezone');
const warningEl  = document.getElementById('time-warning');
const driftEl    = document.getElementById('drift-value');

function pad(n) {
  return String(n).padStart(2, '0');
}

function tick() {
  const now = getTime();

  timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const warning = getTimeWarning();
  warningEl.textContent = warning ?? '';

  const drift = getTimeDrift();
  if (drift !== null) {
    const sign = drift > 0 ? '+' : '';
    driftEl.textContent = `${sign}${drift}ms (${sign}${(drift / 1000).toFixed(2)}s) vs time.now`;
  } else {
    driftEl.textContent = 'Checking…';
  }
}

// Show timezone once
const offset = -new Date().getTimezoneOffset();
const sign   = offset >= 0 ? '+' : '-';
const hh     = pad(Math.floor(Math.abs(offset) / 60));
const mm     = pad(Math.abs(offset) % 60);
timezoneEl.textContent = `${Intl.DateTimeFormat().resolvedOptions().timeZone}  (UTC${sign}${hh}:${mm})`;

setInterval(tick, 1000);
tick();
