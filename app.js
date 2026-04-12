const API_URL = 'https://worldtimeapi.org/api/ip';

const timeEl     = document.getElementById('time');
const dateEl     = document.getElementById('date');
const timezoneEl = document.getElementById('timezone');
const sourceEl   = document.getElementById('source');

// Offset in ms between server time and local performance.now() at fetch time
let serverEpochMs = null;
let localBaseMs   = null;

function pad(n) {
  return String(n).padStart(2, '0');
}

function tick() {
  if (serverEpochMs === null) return;

  const elapsed = performance.now() - localBaseMs;
  const now = new Date(serverEpochMs + elapsed);

  timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

async function fetchTime() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Record the anchor point as soon as we have the data
    localBaseMs   = performance.now();
    serverEpochMs = new Date(data.datetime).getTime();

    const d = new Date(data.datetime);
    dateEl.textContent     = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    timezoneEl.textContent = `${data.timezone}  (UTC${data.utc_offset})`;
    sourceEl.textContent   = `Source: ${API_URL}`;
    sourceEl.classList.remove('error');

    setInterval(tick, 1000);
    tick();
  } catch (err) {
    sourceEl.textContent = `Failed to reach time server: ${err.message}`;
    sourceEl.classList.add('error');
  }
}

fetchTime();
