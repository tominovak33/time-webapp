import { loadData } from './tracking.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseNum(v) {
  return parseFloat(String(v).replace(/[^0-9.\-+]/g, '')) || 0;
}

function formatShortDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function openChart(label, { modal, title, summary, canvas, close }) {
  const data = loadData();
  const entries = data[label];
  if (!entries || entries.length === 0) return;

  title.textContent = label;
  summary.innerHTML = buildSummary(entries);
  modal.hidden = false;

  drawChart(canvas, entries);

  const onClose = () => {
    modal.hidden = true;
    close.removeEventListener('click', onClose);
    modal.removeEventListener('click', onBackdrop);
    document.removeEventListener('keydown', onKey);
  };
  const onBackdrop = (e) => { if (e.target === modal) onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') onClose(); };

  close.addEventListener('click', onClose);
  modal.addEventListener('click', onBackdrop);
  document.addEventListener('keydown', onKey);
}

function buildSummary(entries) {
  const now = Date.now();
  const last24 = entries.filter(e => now - new Date(e.datetime).getTime() < DAY_MS);
  const diff24 = last24.reduce((s, e) => s + parseNum(e.value), 0);
  const total = entries.reduce((s, e) => s + parseNum(e.value), 0);

  const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(2).replace(/\.00$/, '');

  return `<span>24h: <strong>${fmt(diff24)}</strong></span>`
       + `<span>Total: <strong>${fmt(total)}</strong></span>`
       + `<span>Entries: <strong>${entries.length}</strong></span>`;
}

function drawChart(canvas, entries) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth - 48;  // modal padding
  const h = 260;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const sorted = [...entries].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const vals = sorted.map(e => parseNum(e.value));
  const cumulative = [];
  vals.reduce((sum, v, i) => { cumulative[i] = sum + v; return cumulative[i]; }, 0);

  // Determine y range (include both raw values and cumulative)
  const allVals = [...vals, ...cumulative];
  let yMin = Math.min(0, ...allVals);
  let yMax = Math.max(0, ...allVals);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const yPad = (yMax - yMin) * 0.1;
  yMin -= yPad;
  yMax += yPad;

  const pad = { top: 20, right: 16, bottom: 44, left: 48 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const n = sorted.length;
  const barW = Math.max(2, Math.min(28, (plotW / n) * 0.7));
  const gap = plotW / n;

  const toX = (i) => pad.left + gap * i + gap / 2;
  const toY = (v) => pad.top + plotH * (1 - (v - yMin) / (yMax - yMin));
  const zeroY = toY(0);

  // Grid lines
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const v = yMin + (yMax - yMin) * (i / gridSteps);
    const y = toY(v);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(1), pad.left - 6, y);
  }

  // Zero line
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(w - pad.right, zeroY);
  ctx.stroke();

  // Bars
  for (let i = 0; i < n; i++) {
    const x = toX(i) - barW / 2;
    const v = vals[i];
    const barTop = v >= 0 ? toY(v) : zeroY;
    const barH = Math.max(1, Math.abs(toY(v) - zeroY));

    ctx.fillStyle = v >= 0 ? '#3a8' : '#c55';
    ctx.beginPath();
    ctx.roundRect(x, barTop, barW, barH, 2);
    ctx.fill();
  }

  // Cumulative line
  ctx.strokeStyle = '#7af';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = toX(i);
    const y = toY(cumulative[i]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Cumulative dots
  ctx.fillStyle = '#7af';
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(toX(i), toY(cumulative[i]), 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // X-axis labels (show a subset to avoid overlap)
  ctx.fillStyle = '#555';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxLabels = Math.floor(plotW / 60);
  const step = Math.max(1, Math.ceil(n / maxLabels));
  for (let i = 0; i < n; i += step) {
    const x = toX(i);
    ctx.fillText(formatShortDate(sorted[i].datetime), x, h - pad.bottom + 6);
    ctx.fillText(formatTime(sorted[i].datetime), x, h - pad.bottom + 19);
  }
}
